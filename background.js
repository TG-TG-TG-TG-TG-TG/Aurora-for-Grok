// background.js - Single Source of Truth for settings

const DEFAULTS = {
  legacyComposer: false,
  theme: 'auto',
  hideUsageLimit: false,
  hideUpgradePromos: false,
  disableAnimations: false,
  focusMode: false,
  hideQuickSettings: false,
  customBgUrl: '',
  backgroundBlur: '60',
  backgroundScaling: 'cover',
  appearance: 'dimmed',
  showInNewChatsOnly: false,
  hideImaginePromo: false,
  hideLeftNav: false
};

// On install, ensure all settings have a value, using DEFAULTS as the base.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(DEFAULTS, (settings) => {
    chrome.storage.sync.set(settings);
  });
});

// Listen for requests from other parts of the extension.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'GET_SETTINGS') {
    // Retrieve all settings, applying defaults for any missing values.
    chrome.storage.sync.get(DEFAULTS, (settings) => {
      sendResponse(settings);
    });
    // Return true to indicate that the response will be sent asynchronously.
    return true;
  }
  if (request.type === 'GET_DEFAULTS') {
    // Send back the hardcoded defaults object.
    sendResponse(DEFAULTS);
    return true;
  }
});