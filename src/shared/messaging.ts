import type { CaptureMessage, CaptureResponse, ScreenshotSettings } from './types';

const MESSAGE_TIMEOUT = 30000;

export async function sendMessageToTab<T = CaptureResponse>(
  tabId: number,
  message: CaptureMessage
): Promise<T> {
  const response = await chrome.tabs.sendMessage(tabId, message);
  return response as T;
}

export async function executeScriptInTab(
  tabId: number,
  func: () => void
): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func,
    world: 'MAIN'
  });
}

export function createMessagePort(tabId: number): chrome.runtime.Port {
  return chrome.runtime.connect({ name: 'capture', targetTabId: tabId } as chrome.runtime.ConnectInfo);
}

export async function getActiveTab(): Promise<chrome.tabs.Tab> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error('No active tab found');
  return tab;
}

export async function requestCapture(settings: ScreenshotSettings): Promise<string> {
  const tab = await getActiveTab();
  const response = await sendMessageToTab<CaptureResponse>(tab.id!, {
    type: 'start-capture',
    settings
  });

  if ('error' in response) {
    throw new Error(response.error);
  }

  if (response.type === 'capture-complete') {
    return response.dataUrl;
  }

  throw new Error('Unexpected response');
}
