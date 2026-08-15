import type { CaptureFormat } from '../shared/types';

export async function downloadImage(
  dataUrl: string,
  filename: string,
  format: CaptureFormat,
  quality: number
): Promise<void> {
  const blob = await dataUrlToBlob(dataUrl, format, quality);
  const url = URL.createObjectURL(blob);

  await chrome.downloads.download({
    url,
    filename,
    saveAs: true
  });

  URL.revokeObjectURL(url);
}

export async function copyToClipboard(dataUrl: string): Promise<boolean> {
  try {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);
    return true;
  } catch {
    return false;
  }
}

export function generateFilename(
  template: string,
  format: CaptureFormat
): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const title = document.title.replace(/[^a-z0-9]/gi, '-').slice(0, 50) || 'page';
  const timestamp = now.toISOString().replace(/[:.]/g, '-');

  let filename = template
    .replace('{date}', date)
    .replace('{title}', title)
    .replace('{timestamp}', timestamp);

  return `${filename}.${format}`;
}

async function dataUrlToBlob(
  dataUrl: string,
  format: CaptureFormat,
  quality: number
): Promise<Blob> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return blob;
}
