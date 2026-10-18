const DEFAULT_SETTINGS = {
  enabled: true,
  delayMs: 1200,
  showToast: true,
};

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get('settings');
  if (!stored.settings) {
    await chrome.storage.local.set({ settings: DEFAULT_SETTINGS });
  }
});
