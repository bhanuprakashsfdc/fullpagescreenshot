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
export {
  createAnnotationCanvas,
  redoAnnotation,
  saveAnnotationState,
  undoAnnotation
};
