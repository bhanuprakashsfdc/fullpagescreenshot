import { getSettings } from '../shared/storage';
import { downloadImage, copyToClipboard, generateFilename } from '../utils/export';
import { createAnnotationCanvas, saveAnnotationState, undoAnnotation, redoAnnotation } from '../utils/annotate';
import type { CaptureResponse } from '../shared/types';

let currentDataUrl: string | null = null;
let annotationCanvas: HTMLCanvasElement | null = null;
let annotationCtx: CanvasRenderingContext2D | null = null;
let annotationState: { state: ReturnType<typeof createAnnotationCanvas>['state']; ready: Promise<void> } | null = null;
let currentTool: string = 'select';
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let activeTabId: number | null = null;

const elements = {
  captureBtn: document.getElementById('capture-btn') as HTMLButtonElement,
  progressContainer: document.getElementById('progress-container') as HTMLDivElement,
  progressFill: document.getElementById('progress-fill') as HTMLDivElement,
  progressText: document.getElementById('progress-text') as HTMLParagraphElement,
  previewSection: document.getElementById('preview-section') as HTMLDivElement,
  canvasContainer: document.getElementById('canvas-container') as HTMLDivElement,
  annotationCanvas: document.getElementById('annotation-canvas') as HTMLCanvasElement,
  downloadBtn: document.getElementById('download-btn') as HTMLButtonElement,
  copyBtn: document.getElementById('copy-btn') as HTMLButtonElement,
  colorPicker: document.getElementById('color-picker') as HTMLInputElement,
  sizeSlider: document.getElementById('size-slider') as HTMLInputElement,
  undoBtn: document.getElementById('undo-btn') as HTMLButtonElement,
  redoBtn: document.getElementById('redo-btn') as HTMLButtonElement,
  toolBtns: document.querySelectorAll('.tool-btn')
};

async function init(): Promise<void> {
  elements.captureBtn.addEventListener('click', startCapture);
  elements.downloadBtn.addEventListener('click', handleDownload);
  elements.copyBtn.addEventListener('click', handleCopy);
  elements.undoBtn.addEventListener('click', handleUndo);
  elements.redoBtn.addEventListener('click', handleRedo);

  elements.toolBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      elements.toolBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.getAttribute('data-tool') || 'select';
    });
  });

  elements.colorPicker.addEventListener('input', (e) => {
    if (annotationState) {
      annotationState.state.color = (e.target as HTMLInputElement).value;
    }
  });

  elements.sizeSlider.addEventListener('input', (e) => {
    if (annotationState) {
      annotationState.state.size = parseInt((e.target as HTMLInputElement).value, 10);
    }
  });

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'capture-progress' && activeTabId !== null) {
      updateProgress(message.percent, message.message);
    }
  });
}

function setupCanvasEvents(): void {
  const canvas = annotationCanvas;
  const ctx = annotationCtx;
  const state = annotationState?.state;
  if (!canvas) return;

  canvas.addEventListener('mousedown', (e) => {
    if (!ctx || !state || currentTool === 'select') return;

    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    lastX = (e.clientX - rect.left) * scaleX;
    lastY = (e.clientY - rect.top) * scaleY;

    if (currentTool === 'pen') {
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.strokeStyle = state.color;
      ctx.lineWidth = state.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!isDrawing || !ctx || !state) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (currentTool === 'pen') {
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    lastX = x;
    lastY = y;
  });

  canvas.addEventListener('mouseup', () => {
    if (isDrawing && state && canvas) {
      saveAnnotationState(canvas, state);
    }
    isDrawing = false;
  });

  canvas.addEventListener('mouseleave', () => {
    if (isDrawing && state && canvas) {
      saveAnnotationState(canvas, state);
    }
    isDrawing = false;
  });
}

async function startCapture(): Promise<void> {
  elements.captureBtn.disabled = true;
  elements.progressContainer.classList.remove('hidden');
  updateProgress(0, 'Starting capture...');

  try {
    const settings = await getSettings();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.id || tab.windowId == null) {
      throw new Error('No active tab or window');
    }

    activeTabId = tab.id;

    updateProgress(10, 'Capturing page...');

    let response: CaptureResponse;
    try {
      response = (await chrome.tabs.sendMessage(tab.id, {
        type: 'start-capture',
        settings: { ...settings, windowId: tab.windowId }
      })) as CaptureResponse;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Capture failed';
      if (errorMessage.includes('receiving end does not exist')) {
        updateProgress(20, 'Injecting capture script...');
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content/capture.js']
          });
          await new Promise((resolve) => setTimeout(resolve, 300));
          response = (await chrome.tabs.sendMessage(tab.id, {
            type: 'start-capture',
            settings: { ...settings, windowId: tab.windowId }
          })) as CaptureResponse;
        } catch (injectionErr) {
          const injectionMsg = injectionErr instanceof Error ? injectionErr.message : 'Injection failed';
          throw new Error(`Cannot inject capture script: ${injectionMsg}`);
        }
      } else {
        throw err;
      }
    }

    activeTabId = null;

    if (response.type === 'capture-error') {
      throw new Error(response.error);
    }

    if (response.type === 'capture-complete') {
      showPreview(response.dataUrl, response.width, response.height);
    }
  } catch (err) {
    activeTabId = null;
    const message = err instanceof Error ? err.message : 'Capture failed';
    updateProgress(0, message);
    setTimeout(() => {
      elements.progressContainer.classList.add('hidden');
      elements.captureBtn.disabled = false;
    }, 2000);
  }
}

function showPreview(dataUrl: string, width: number, height: number): void {
  currentDataUrl = dataUrl;
  elements.progressContainer.classList.add('hidden');
  elements.previewSection.classList.remove('hidden');

  const result = createAnnotationCanvas(width, height, dataUrl);
  annotationCanvas = result.canvas;
  annotationCtx = result.ctx;
  annotationState = { state: result.state, ready: result.ready };

  elements.canvasContainer.innerHTML = '';
  elements.canvasContainer.appendChild(annotationCanvas);

  result.ready.then(() => {
    setupCanvasEvents();
  });
}

async function handleDownload(): Promise<void> {
  if (!currentDataUrl || !annotationCanvas) return;

  const settings = await getSettings();
  const filename = generateFilename(settings.filenameTemplate, 'png');

  downloadImage(annotationCanvas.toDataURL('image/png'), filename, 'png', 90);
}

async function handleCopy(): Promise<void> {
  if (!annotationCanvas) return;
  const success = await copyToClipboard(annotationCanvas.toDataURL('image/png'));
  if (success) {
    alert('Copied to clipboard!');
  } else {
    alert('Failed to copy. Try downloading instead.');
  }
}

function handleUndo(): void {
  if (annotationCanvas && annotationCtx && annotationState) {
    undoAnnotation(annotationCanvas, annotationCtx, annotationState.state);
  }
}

function handleRedo(): void {
  if (annotationCanvas && annotationCtx && annotationState) {
    redoAnnotation(annotationCanvas, annotationCtx, annotationState.state);
  }
}

function updateProgress(percent: number, message: string): void {
  elements.progressFill.style.width = `${percent}%`;
  elements.progressText.textContent = message;
}

init();
