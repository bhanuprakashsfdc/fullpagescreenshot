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
export {
  scrollCapture
};
