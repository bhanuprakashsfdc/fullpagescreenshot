import type { ScreenshotSettings } from './types';

const STORAGE_KEY = 'fullpage-screenshot-settings';

const DEFAULT_SETTINGS: ScreenshotSettings = {
  format: 'png',
  quality: 90,
  filenameTemplate: 'screenshot-{date}-{title}',
  scrollDelay: 200,
  theme: 'light',
  windowId: 0
};

export async function getSettings(): Promise<ScreenshotSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return { ...DEFAULT_SETTINGS, ...(result[STORAGE_KEY] as Partial<ScreenshotSettings> | undefined) };
}

export async function saveSettings(settings: Partial<ScreenshotSettings>): Promise<void> {
  const current = await getSettings();
  await chrome.storage.local.set({
    [STORAGE_KEY]: { ...current, ...settings }
  });
}

export async function resetSettings(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });
}
