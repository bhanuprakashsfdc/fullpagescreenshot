// src/utils/scroll-capture.ts
async function* scrollCapture(windowId, scrollDelay) {
  const scrollHeight = document.documentElement.scrollHeight;
  const viewportHeight = window.innerHeight;
  let currentScroll = 0;
  while (currentScroll < scrollHeight) {
    window.scrollTo(0, currentScroll);
    await new Promise((resolve) => setTimeout(resolve, scrollDelay));
    const dataUrl = await chrome.tabs.captureVisibleTab(windowId, { format: "png" });
    yield {
      dataUrl,
      scrollY: currentScroll,
      viewportHeight
    };
    currentScroll += viewportHeight - 100;
    if (currentScroll >= scrollHeight - viewportHeight) {
      break;
    }
  }
}

// src/utils/stitch.ts
function stitchImages(captures) {
  return new Promise((resolve, reject) => {
    const images = [];
    let loadedCount = 0;
    const total = captures.length;
    if (total === 0) {
      reject(new Error("No captures to stitch"));
      return;
    }
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      reject(new Error("Canvas not supported"));
      return;
    }
    captures.forEach((cap) => {
      const img = new Image();
      img.onload = () => {
        loadedCount++;
        if (loadedCount === total) {
          finishStitch(ctx, canvas, images, captures);
        }
      };
      img.onerror = () => reject(new Error("Failed to load capture image"));
      img.src = cap.dataUrl;
      images.push(img);
    });
    function finishStitch(ctx2, canvas2, images2, captures2) {
      const maxHeight = Math.max(
        ...captures2.map((c) => c.scrollY + c.viewportHeight)
      );
      canvas2.width = images2[0].width;
      canvas2.height = maxHeight;
      ctx2.fillStyle = "#ffffff";
      ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
      captures2.forEach((cap, index) => {
        const img = images2[index];
        ctx2.drawImage(img, 0, cap.scrollY);
      });
      resolve(canvas2.toDataURL("image/png"));
    }
  });
}

// src/content/capture.ts
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "start-capture") {
    handleCapture(message.settings, sendResponse);
    return true;
  }
});
async function handleCapture(settings, sendResponse) {
  try {
    if (!settings.windowId && settings.windowId !== 0) {
      throw new Error("Invalid window ID");
    }
    const captures = [];
    for await (const capture of scrollCapture(settings.windowId, settings.scrollDelay)) {
      captures.push(capture);
      const percent = Math.min(90, 10 + Math.floor(captures.length / 10 * 80));
      chrome.runtime.sendMessage({
        type: "capture-progress",
        phase: "capturing",
        percent,
        message: `Captured ${captures.length} viewport(s)...`
      });
    }
    chrome.runtime.sendMessage({
      type: "capture-progress",
      phase: "stitching",
      percent: 95,
      message: "Stitching images..."
    });
    const dataUrl = await stitchImages(captures);
    const img = new Image();
    img.src = dataUrl;
    sendResponse({
      type: "capture-complete",
      dataUrl,
      width: img.width || document.documentElement.scrollWidth,
      height: img.height || document.documentElement.scrollHeight
    });
  } catch (err) {
    sendResponse({
      type: "capture-error",
      error: err instanceof Error ? err.message : "Capture failed"
    });
  }
}
