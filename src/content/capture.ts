import { scrollCapture } from '../utils/scroll-capture';
import { stitchImages } from '../utils/stitch';
import type { ScreenshotSettings, CaptureResponse } from '../shared/types';

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'start-capture') {
    handleCapture(message.settings, sendResponse);
    return true;
  }
});

async function handleCapture(
  settings: ScreenshotSettings,
  sendResponse: (response: CaptureResponse) => void
): Promise<void> {
  try {
    if (!settings.windowId && settings.windowId !== 0) {
      throw new Error('Invalid window ID');
    }

    const captures: { dataUrl: string; scrollY: number; viewportHeight: number }[] = [];

    for await (const capture of scrollCapture(settings.windowId, settings.scrollDelay)) {
      captures.push(capture);

      const percent = Math.min(90, 10 + Math.floor((captures.length / 10) * 80));
      chrome.runtime.sendMessage({
        type: 'capture-progress',
        phase: 'capturing',
        percent,
        message: `Captured ${captures.length} viewport(s)...`
      });
    }

    chrome.runtime.sendMessage({
      type: 'capture-progress',
      phase: 'stitching',
      percent: 95,
      message: 'Stitching images...'
    });

    const dataUrl = await stitchImages(captures);

    const img = new Image();
    img.src = dataUrl;

    sendResponse({
      type: 'capture-complete',
      dataUrl,
      width: img.width || document.documentElement.scrollWidth,
      height: img.height || document.documentElement.scrollHeight
    });
  } catch (err) {
    sendResponse({
      type: 'capture-error',
      error: err instanceof Error ? err.message : 'Capture failed'
    });
  }
}
