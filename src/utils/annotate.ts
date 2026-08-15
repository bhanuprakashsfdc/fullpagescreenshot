export interface AnnotationState {
  tool: 'pen' | 'text' | 'arrow' | 'rect' | 'blur' | null;
  color: string;
  size: number;
  history: string[];
  historyIndex: number;
}

export function createAnnotationCanvas(
  width: number,
  height: number,
  baseImage: string
): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; state: AnnotationState; ready: Promise<void> } {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  const state: AnnotationState = {
    tool: null,
    color: '#ff0000',
    size: 3,
    history: [],
    historyIndex: 0
  };

  const img = new Image();
  img.src = baseImage;

  const ready = new Promise<void>((resolve) => {
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      state.history = [canvas.toDataURL('image/png')];
      state.historyIndex = 0;
      resolve();
    };
  });

  return { canvas, ctx, state, ready };
}

export function saveAnnotationState(
  canvas: HTMLCanvasElement,
  state: AnnotationState
): void {
  const dataUrl = canvas.toDataURL('image/png');
  state.history = state.history.slice(0, state.historyIndex + 1);
  state.history.push(dataUrl);
  state.historyIndex = state.history.length - 1;
}

export function undoAnnotation(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  state: AnnotationState
): void {
  if (state.historyIndex > 0) {
    state.historyIndex--;
    restoreState(canvas, ctx, state.history[state.historyIndex]);
  }
}

export function redoAnnotation(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  state: AnnotationState
): void {
  if (state.historyIndex < state.history.length - 1) {
    state.historyIndex++;
    restoreState(canvas, ctx, state.history[state.historyIndex]);
  }
}

function restoreState(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
  dataUrl: string
): void {
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
  img.src = dataUrl;
}
