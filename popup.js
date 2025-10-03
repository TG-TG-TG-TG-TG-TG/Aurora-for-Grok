// popup.js - Aurora for Grok settings
const LOCAL_BG_KEY = 'customBgData';
const BLUE_WALLPAPER_URL = 'https://img.freepik.com/free-photo/abstract-luxury-gradient-blue-background-smooth-dark-blue-with-black-vignette-studio-banner_1258-54581.jpg?semt=ais_hybrid&w=740&q=80';
const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const CHATGPT_SENTINEL = '__chatgpt__';

const getMessage = (key, substitutions) => {
  try {
    if (chrome?.i18n?.getMessage) {
      const text = chrome.i18n.getMessage(key, substitutions);
      if (text) return text;
    }
  } catch (e) { console.warn(`Error getting message for key: ${key}`, e); }
  return key;
};

document.addEventListener('DOMContentLoaded', () => {
  let settingsCache = {};
  let DEFAULTS_CACHE = {};
  let searchableSettings = [];

  const applyStaticLocalization = () => {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = getMessage(key);
    });
     document.querySelectorAll('span[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (key) el.textContent = getMessage(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', getMessage(key));
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (key) el.setAttribute('title', getMessage(key));
    });
  };

  applyStaticLocalization();
  
  const tabs = document.querySelectorAll('.tab-link');
  const panes = document.querySelectorAll('.tab-pane');
  const mainContent = document.querySelector('.tab-content');
  const tabNav = document.querySelector('.tab-nav');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      panes.forEach(pane => pane.classList.toggle('active', pane.id === tab.dataset.tab));
    });
  });

  const searchInput = document.getElementById('settingsSearch');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  let noResultsMessage = null;

  function buildSearchableData() {
    searchableSettings = [];
    document.querySelectorAll('.tab-pane .row').forEach(row => {
      const label = row.querySelector('.label')?.getAttribute('data-i18n');
      const tooltip = row.querySelector('[data-i18n-title]')?.getAttribute('data-i18n-title');
      const pane = row.closest('.tab-pane');
      if (!pane) return;

      const tabId = pane.id;
      const tabTitle = document.querySelector(`.tab-link[data-tab="${tabId}"] span`)?.textContent || '';
      
      let keywords = `${tabTitle} `;
      if (label) keywords += getMessage(label) + ' ';
      if (tooltip) keywords += getMessage(tooltip) + ' ';

      searchableSettings.push({
        element: row,
        tab: tabId,
        keywords: keywords.toLowerCase().trim()
      });
    });
  }

  function handleSearch() {
    const query = searchInput.value.toLowerCase().trim();
    const matchedTabs = new Set();
    let matchCount = 0;
    clearSearchBtn.hidden = !query;

    if (!query) {
      resetSearchView();
      return;
    }

    panes.forEach(p => p.classList.remove('active'));
    tabs.forEach(t => t.classList.add('is-hidden'));

    searchableSettings.forEach(setting => {
      const isMatch = setting.keywords.includes(query);
      setting.element.classList.toggle('is-hidden', !isMatch);
      if (isMatch) {
        matchedTabs.add(setting.tab);
        matchCount++;
      }
    });

    if (matchCount > 0) {
      tabNav.hidden = false;
      if (noResultsMessage) noResultsMessage.style.display = 'none';
      tabs.forEach(tab => {
        tab.classList.toggle('is-hidden', !matchedTabs.has(tab.dataset.tab));
      });
      const firstMatchedTab = document.querySelector('.tab-link:not(.is-hidden)');
      if (firstMatchedTab) firstMatchedTab.click();
    } else {
      tabNav.hidden = true;
      if (!noResultsMessage) {
        noResultsMessage = document.createElement('div');
        noResultsMessage.className = 'no-results-message';
        noResultsMessage.textContent = getMessage('noResults');
        mainContent.appendChild(noResultsMessage);
      }
      noResultsMessage.style.display = 'block';
    }
  }

  function resetSearchView() {
    tabNav.hidden = false;
    if (noResultsMessage) noResultsMessage.style.display = 'none';
    searchableSettings.forEach(setting => setting.element.classList.remove('is-hidden'));
    tabs.forEach(tab => tab.classList.remove('is-hidden'));
    const activeTab = document.querySelector('.tab-link.active');
    if (!activeTab || activeTab.classList.contains('is-hidden')) {
      tabs[0]?.click();
    } else {
      activeTab.click();
    }
  }

  searchInput.addEventListener('input', handleSearch);
  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    handleSearch();
    searchInput.focus();
  });

  const TOGGLE_CONFIG = [
    { id: 'legacyComposer', key: 'legacyComposer' },
    { id: 'disableAnimations', key: 'disableAnimations' },
    { id: 'focusMode', key: 'focusMode' },
    { id: 'hideQuickSettings', key: 'hideQuickSettings' },
    { id: 'showInNewChatsOnly', key: 'showInNewChatsOnly' },
    { id: 'hideLeftNav', key: 'hideLeftNav' },
    { id: 'hideUsageLimit', key: 'hideUsageLimit' },
    { id: 'hideUpgradePromos', key: 'hideUpgradePromos' },
    { id: 'hideImaginePromo', key: 'hideImaginePromo' },
  ];

  TOGGLE_CONFIG.forEach(({ id, key }) => {
    const element = document.getElementById(id);
    if (element) {
      element.addEventListener('change', () => {
        chrome.storage.sync.set({ [key]: element.checked });
      });
    }
  });

  const tbBgUrl = document.getElementById('bgUrl');
  const fileBg = document.getElementById('bgFile');
  const btnClearBg = document.getElementById('clearBg');
  const blurSlider = document.getElementById('blurSlider');
  const blurValue = document.getElementById('blurValue');

  function createCustomSelect(containerId, options, storageKey, onPresetChange) {
    const container = document.getElementById(containerId);
    if (!container) return { update: () => {} };
    const trigger = container.querySelector('.select-trigger');
    const label = container.querySelector('.select-label');
    const optionsContainer = container.querySelector('.select-options');

    const resolveLabel = (option) => option.labelKey ? getMessage(option.labelKey) : (option.label || option.value);

    function renderOptions(selectedValue) {
      optionsContainer.innerHTML = options
        .filter(option => !option.hidden)
        .map(option => `
            <div class="select-option" role="option" data-value="${option.value}" aria-selected="${option.value === selectedValue ? 'true' : 'false'}">
              <span class="option-label">${resolveLabel(option)}</span>
            </div>
        `).join('');
      optionsContainer.querySelectorAll('.select-option').forEach(optionEl => {
        optionEl.addEventListener('click', () => {
          const newValue = optionEl.dataset.value;
          if (storageKey) {
            chrome.storage.sync.set({ [storageKey]: newValue });
          }
          if (onPresetChange) onPresetChange(newValue);
          closeAllSelects();
        });
      });
    }

    function updateSelectorState(value) {
      const selectedOption = options.find(opt => opt.value === value) || options[0];
      label.textContent = resolveLabel(selectedOption);
      renderOptions(value);
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
      closeAllSelects();
      if (!isExpanded) {
        container.classList.add('is-open');
        trigger.setAttribute('aria-expanded', 'true');
        optionsContainer.style.display = 'block';
      }
    });

    return { update: updateSelectorState };
  }

  function closeAllSelects() {
    document.querySelectorAll('.custom-select.is-open').forEach(sel => {
        sel.classList.remove('is-open');
        const trigger = sel.querySelector('.select-trigger');
        const optionsContainer = sel.querySelector('.select-options');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
        // FIX: The line below was incorrect. It has been corrected to properly hide the element.
        if (optionsContainer) optionsContainer.style.display = 'none';
    });
  }
  document.addEventListener('click', closeAllSelects);

  const bgPresetOptions = [
    { value: 'default', labelKey: 'bgPresetOptionDefault' },
    { value: '__gpt5_animated__', labelKey: 'bgPresetOptionGpt5Animated' },
    { value: 'chatgpt', labelKey: 'bgPresetOptionChatgpt' },
    { value: 'blue', labelKey: 'bgPresetOptionBlue' },
    { value: 'custom', labelKey: 'bgPresetOptionCustom', hidden: true }
  ];
  const bgPresetSelect = createCustomSelect('bgPreset', bgPresetOptions, null, (value) => {
    let newUrl = '';
    if (value === 'chatgpt') newUrl = CHATGPT_SENTINEL;
    else if (value === 'blue') newUrl = BLUE_WALLPAPER_URL;
    else if (value === '__gpt5_animated__') newUrl = '__gpt5_animated__';
    
    if (value !== 'custom') {
      chrome.storage.local.remove(LOCAL_BG_KEY);
      chrome.storage.sync.set({ customBgUrl: newUrl });
    }
  });

  const bgScalingSelect = createCustomSelect('bgScalingSelector', [
    { value: 'contain', labelKey: 'bgScalingOptionContain' },
    { value: 'cover', labelKey: 'bgScalingOptionCover' }
  ], 'backgroundScaling');

  const themeSelect = createCustomSelect('themeSelector', [
    { value: 'auto', labelKey: 'themeOptionAuto' },
    { value: 'light', labelKey: 'themeOptionLight' },
    { value: 'dark', labelKey: 'themeOptionDark' }
  ], 'theme');

  const appearanceSelect = createCustomSelect('appearanceSelector', [
    { value: 'dimmed', labelKey: 'appearanceOptionDimmed' },
    { value: 'clear', labelKey: 'appearanceOptionClear' }
  ], 'appearance');

  async function updateUi(settings) {
    document.documentElement.classList.toggle('theme-light', settings.theme === 'light');

    TOGGLE_CONFIG.forEach(({ id, key }) => {
      const element = document.getElementById(id);
      if (element) element.checked = !!settings[key];
    });
    
    blurSlider.value = settings.backgroundBlur;
    blurValue.textContent = settings.backgroundBlur;
    bgScalingSelect.update(settings.backgroundScaling);
    themeSelect.update(settings.theme);
    appearanceSelect.update(settings.appearance);

    const url = settings.customBgUrl;
    tbBgUrl.disabled = false;
    tbBgUrl.value = '';

    if (!url) {
      bgPresetSelect.update('default');
    } else if (url === CHATGPT_SENTINEL) {
      bgPresetSelect.update('chatgpt');
      tbBgUrl.value = getMessage('statusChatgptPreset');
      tbBgUrl.disabled = true;
    } else if (url === BLUE_WALLPAPER_URL) {
      bgPresetSelect.update('blue');
    } else if (url === '__local__') {
      bgPresetSelect.update('custom');
      tbBgUrl.value = getMessage('statusLocalFileInUse');
      tbBgUrl.disabled = true;
    } else {
      bgPresetSelect.update('custom');
      tbBgUrl.value = url;
    }
  }
  
  chrome.runtime.sendMessage({ type: 'GET_DEFAULTS' }, (defaults) => {
    if (chrome.runtime.lastError) {
      console.error("Aurora Popup Error (DEFAULTS):", chrome.runtime.lastError.message);
      DEFAULTS_CACHE = { customBgUrl: '', backgroundBlur: '60', backgroundScaling: 'cover' };
    } else {
      DEFAULTS_CACHE = defaults;
    }
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
      if (chrome.runtime.lastError) {
        console.error("Aurora Popup Error (SETTINGS):", chrome.runtime.lastError.message);
        document.body.innerHTML = `<div style="padding: 20px;">${getMessage('errorLoadingSettings')}</div>`;
        return;
      }
      settingsCache = settings;
      updateUi(settings);
      buildSearchableData();
    });
  });

  blurSlider.addEventListener('input', () => {
    const newBlurValue = blurSlider.value;
    blurValue.textContent = newBlurValue;
    chrome.storage.sync.set({ backgroundBlur: newBlurValue });
  });

  tbBgUrl.addEventListener('change', () => {
    const urlValue = tbBgUrl.value.trim();
    if (urlValue !== '__local__') {
      chrome.storage.local.remove(LOCAL_BG_KEY);
    }
    chrome.storage.sync.set({ customBgUrl: urlValue });
  });

  fileBg.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE_BYTES) {
      alert(getMessage('alertFileTooLarge', String(MAX_FILE_SIZE_MB)));
      fileBg.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      chrome.storage.local.set({ [LOCAL_BG_KEY]: e.target.result }, () => {
        chrome.storage.sync.set({ customBgUrl: '__local__' });
      });
    };
    reader.readAsDataURL(file);
    fileBg.value = '';
  });

  btnClearBg.addEventListener('click', () => {
    if (!DEFAULTS_CACHE) return;
    const settingsToReset = {
      customBgUrl: DEFAULTS_CACHE.customBgUrl,
      backgroundBlur: DEFAULTS_CACHE.backgroundBlur,
      backgroundScaling: DEFAULTS_CACHE.backgroundScaling,
    };
    chrome.storage.sync.set(settingsToReset);
    chrome.storage.local.remove(LOCAL_BG_KEY);
  });

  chrome.storage.onChanged.addListener(() => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (settings) => {
      if (chrome.runtime.lastError) return;
      settingsCache = settings;
      updateUi(settings);
    });
  });
});