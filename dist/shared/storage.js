// src/shared/storage.ts
var STORAGE_KEY = "fullpage-screenshot-settings";
var DEFAULT_SETTINGS = {
  format: "png",
  quality: 90,
  filenameTemplate: "screenshot-{date}-{title}",
  scrollDelay: 200,
  theme: "light",
  windowId: 0
};
async function getSettings() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
}
async function saveSettings(settings) {
  const current = await getSettings();
  await chrome.storage.local.set({
    [STORAGE_KEY]: { ...current, ...settings }
  });
}
async function resetSettings() {
  await chrome.storage.local.set({ [STORAGE_KEY]: DEFAULT_SETTINGS });
}
export {
  getSettings,
  resetSettings,
  saveSettings
};
