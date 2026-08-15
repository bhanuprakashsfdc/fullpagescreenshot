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
export {
  copyToClipboard,
  downloadImage,
  generateFilename
};
