import { getSettings } from '../shared/storage';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'capture-full-page',
    title: 'Capture Full Page Screenshot',
    contexts: ['page', 'image', 'video']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'capture-full-page' && tab?.id) {
    const settings = await getSettings();
    chrome.tabs.sendMessage(tab.id, {
      type: 'start-capture',
      settings: { ...settings, windowId: tab.windowId }
    });
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  if (tab?.id) {
    const settings = await getSettings();
    chrome.tabs.sendMessage(tab.id, {
      type: 'start-capture',
      settings: { ...settings, windowId: tab.windowId }
    });
  }
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'capture-page') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      const settings = await getSettings();
      chrome.tabs.sendMessage(tab.id, {
        type: 'start-capture',
        settings: { ...settings, windowId: tab.windowId }
      });
    }
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'capture-progress' && sender.tab) {
    chrome.runtime.sendMessage(message);
  }
});
