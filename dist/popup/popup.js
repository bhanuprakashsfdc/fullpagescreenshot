// src/shared/storage.ts
var STORAGE_KEY = "fullpage-screenshot-settings";
var DEFAULT_SETTINGS = {
  format: "png",
  quality: 90,
  filenameTemplate: "screenshot-{date}-{title}",
  scrollDelay: 200,
  theme: "light",
  windowId: 0
};
async function getSettings() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
}

// src/utils/export.ts
async function downloadImage(dataUrl, filename, format, quality) {
  const blob = await dataUrlToBlob(dataUrl, format, quality);
  const url = URL.createObjectURL(blob);
  await chrome.downloads.download({
    url,
    filename,
    saveAs: true
  });
  URL.revokeObjectURL(url);
}
async function copyToClipboard(dataUrl) {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob })
    ]);
    return true;
  } catch {
    return false;
  }
}
function generateFilename(template, format) {
  const now = /* @__PURE__ */ new Date();
  const date = now.toISOString().slice(0, 10);
  const title = document.title.replace(/[^a-z0-9]/gi, "-").slice(0, 50) || "page";
  const timestamp = now.toISOString().replace(/[:.]/g, "-");
  let filename = template.replace("{date}", date).replace("{title}", title).replace("{timestamp}", timestamp);
  return `${filename}.${format}`;
}
async function dataUrlToBlob(dataUrl, format, quality) {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return blob;
}

// src/utils/annotate.ts
function createAnnotationCanvas(width, height, baseImage) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  const state = {
    tool: null,
    color: "#ff0000",
    size: 3,
    history: [],
    historyIndex: 0
  };
  const img = new Image();
  img.src = baseImage;
  const ready = new Promise((resolve) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      state.history = [canvas.toDataURL("image/png")];
      state.historyIndex = 0;
      resolve();
    };
  });
  return { canvas, ctx, state, ready };
}
function saveAnnotationState(canvas, state) {
  const dataUrl = canvas.toDataURL("image/png");
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(dataUrl);
  state.historyIndex = state.history.length - 1;
}
function undoAnnotation(canvas, ctx, state) {
  if (state.historyIndex > 0) {
    state.historyIndex--;
    restoreState(canvas, ctx, state.history[state.historyIndex]);
  }
}
function redoAnnotation(canvas, ctx, state) {
  if (state.historyIndex < state.history.length - 1) {
    state.historyIndex++;
    restoreState(canvas, ctx, state.history[state.historyIndex]);
  }
}
function restoreState(canvas, ctx, dataUrl) {
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
  img.src = dataUrl;
}

// src/popup/popup.ts
var currentDataUrl = null;
var annotationCanvas = null;
var annotationCtx = null;
var annotationState = null;
var currentTool = "select";
var isDrawing = false;
var lastX = 0;
var lastY = 0;
var activeTabId = null;
var elements = {
  captureBtn: document.getElementById("capture-btn"),
  progressContainer: document.getElementById("progress-container"),
  progressFill: document.getElementById("progress-fill"),
  progressText: document.getElementById("progress-text"),
  previewSection: document.getElementById("preview-section"),
  canvasContainer: document.getElementById("canvas-container"),
  annotationCanvas: document.getElementById("annotation-canvas"),
  downloadBtn: document.getElementById("download-btn"),
  copyBtn: document.getElementById("copy-btn"),
  colorPicker: document.getElementById("color-picker"),
  sizeSlider: document.getElementById("size-slider"),
  undoBtn: document.getElementById("undo-btn"),
  redoBtn: document.getElementById("redo-btn"),
  toolBtns: document.querySelectorAll(".tool-btn")
};
async function init() {
  elements.captureBtn.addEventListener("click", startCapture);
  elements.downloadBtn.addEventListener("click", handleDownload);
  elements.copyBtn.addEventListener("click", handleCopy);
  elements.undoBtn.addEventListener("click", handleUndo);
  elements.redoBtn.addEventListener("click", handleRedo);
  elements.toolBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      elements.toolBtns.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentTool = btn.getAttribute("data-tool") || "select";
    });
  });
  elements.colorPicker.addEventListener("input", (e) => {
    if (annotationState) {
      annotationState.state.color = e.target.value;
    }
  });
  elements.sizeSlider.addEventListener("input", (e) => {
    if (annotationState) {
      annotationState.state.size = parseInt(e.target.value, 10);
    }
  });
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "capture-progress" && activeTabId !== null) {
      updateProgress(message.percent, message.message);
    }
  });
}
function setupCanvasEvents() {
  const canvas = annotationCanvas;
  const ctx = annotationCtx;
  const state = annotationState?.state;
  if (!canvas) return;
  canvas.addEventListener("mousedown", (e) => {
    if (!ctx || !state || currentTool === "select") return;
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    lastX = (e.clientX - rect.left) * scaleX;
    lastY = (e.clientY - rect.top) * scaleY;
    if (currentTool === "pen") {
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.strokeStyle = state.color;
      ctx.lineWidth = state.size;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
    }
  });
  canvas.addEventListener("mousemove", (e) => {
    if (!isDrawing || !ctx || !state) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    if (currentTool === "pen") {
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    lastX = x;
    lastY = y;
  });
  canvas.addEventListener("mouseup", () => {
    if (isDrawing && state && canvas) {
      saveAnnotationState(canvas, state);
    }
    isDrawing = false;
  });
  canvas.addEventListener("mouseleave", () => {
    if (isDrawing && state && canvas) {
      saveAnnotationState(canvas, state);
    }
    isDrawing = false;
  });
}
async function startCapture() {
  elements.captureBtn.disabled = true;
  elements.progressContainer.classList.remove("hidden");
  updateProgress(0, "Starting capture...");
  try {
    const settings = await getSettings();
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || tab.windowId == null) {
      throw new Error("No active tab or window");
    }
    activeTabId = tab.id;
    updateProgress(10, "Capturing page...");
    let response;
    try {
      response = await chrome.tabs.sendMessage(tab.id, {
        type: "start-capture",
        settings: { ...settings, windowId: tab.windowId }
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Capture failed";
      if (errorMessage.includes("receiving end does not exist")) {
        updateProgress(20, "Injecting capture script...");
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ["content/capture.js"]
          });
          await new Promise((resolve) => setTimeout(resolve, 300));
          response = await chrome.tabs.sendMessage(tab.id, {
            type: "start-capture",
            settings: { ...settings, windowId: tab.windowId }
          });
        } catch (injectionErr) {
          const injectionMsg = injectionErr instanceof Error ? injectionErr.message : "Injection failed";
          throw new Error(`Cannot inject capture script: ${injectionMsg}`);
        }
      } else {
        throw err;
      }
    }
    activeTabId = null;
    if (response.type === "capture-error") {
      throw new Error(response.error);
    }
    if (response.type === "capture-complete") {
      showPreview(response.dataUrl, response.width, response.height);
    }
  } catch (err) {
    activeTabId = null;
    const message = err instanceof Error ? err.message : "Capture failed";
    updateProgress(0, message);
    setTimeout(() => {
      elements.progressContainer.classList.add("hidden");
      elements.captureBtn.disabled = false;
    }, 2e3);
  }
}
function showPreview(dataUrl, width, height) {
  currentDataUrl = dataUrl;
  elements.progressContainer.classList.add("hidden");
  elements.previewSection.classList.remove("hidden");
  const result = createAnnotationCanvas(width, height, dataUrl);
  annotationCanvas = result.canvas;
  annotationCtx = result.ctx;
  annotationState = { state: result.state, ready: result.ready };
  elements.canvasContainer.innerHTML = "";
  elements.canvasContainer.appendChild(annotationCanvas);
  result.ready.then(() => {
    setupCanvasEvents();
  });
}
async function handleDownload() {
  if (!currentDataUrl || !annotationCanvas) return;
  const settings = await getSettings();
  const filename = generateFilename(settings.filenameTemplate, "png");
  downloadImage(annotationCanvas.toDataURL("image/png"), filename, "png", 90);
}
async function handleCopy() {
  if (!annotationCanvas) return;
  const success = await copyToClipboard(annotationCanvas.toDataURL("image/png"));
  if (success) {
    alert("Copied to clipboard!");
  } else {
    alert("Failed to copy. Try downloading instead.");
  }
}
function handleUndo() {
  if (annotationCanvas && annotationCtx && annotationState) {
    undoAnnotation(annotationCanvas, annotationCtx, annotationState.state);
  }
}
function handleRedo() {
  if (annotationCanvas && annotationCtx && annotationState) {
    redoAnnotation(annotationCanvas, annotationCtx, annotationState.state);
  }
}
function updateProgress(percent, message) {
  elements.progressFill.style.width = `${percent}%`;
  elements.progressText.textContent = message;
}
init();
