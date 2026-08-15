// src/shared/messaging.ts
async function sendMessageToTab(tabId, message) {
  const response = await chrome.tabs.sendMessage(tabId, message);
  return response;
}
async function executeScriptInTab(tabId, func) {
  await chrome.scripting.executeScript({
    target: { tabId },
    func,
    world: "MAIN"
  });
}
function createMessagePort(tabId) {
  return chrome.runtime.connect({ name: "capture", targetTabId: tabId });
}
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active tab found");
  return tab;
}
async function requestCapture(settings) {
  const tab = await getActiveTab();
  const response = await sendMessageToTab(tab.id, {
    type: "start-capture",
    settings
  });
  if ("error" in response) {
    throw new Error(response.error);
  }
  if (response.type === "capture-complete") {
    return response.dataUrl;
  }
  throw new Error("Unexpected response");
}
export {
  createMessagePort,
  executeScriptInTab,
  getActiveTab,
  requestCapture,
  sendMessageToTab
};
