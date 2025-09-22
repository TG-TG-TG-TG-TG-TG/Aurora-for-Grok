// popup.js - Aurora for Grok settings
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
  backgroundScaling: 'contain',
  appearance: 'dimmed',
  showInNewChatsOnly: false,
  hideImaginePromo: false,
  hideLeftNav: false
};

const LOCAL_BG_KEY = 'customBgData';
const BLUE_WALLPAPER_URL = 'https://img.freepik.com/free-photo/abstract-luxury-gradient-blue-background-smooth-dark-blue-with-black-vignette-studio-banner_1258-54581.jpg?semt=ais_hybrid&w=740&q=80';
const MAX_FILE_SIZE_MB = 15;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const CHATGPT_SENTINEL = '__chatgpt__';

const getMessage = (key, substitutions) => {
  if (chrome?.i18n?.getMessage) {
    const text = chrome.i18n.getMessage(key, substitutions);
    if (text) return text;
  }
  return key;
};

document.addEventListener('DOMContentLoaded', () => {
  document.title = getMessage('popupTitle');

  const applyStaticLocalization = () => {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const message = getMessage(key);
      if (message) el.textContent = message;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const message = getMessage(key);
      if (message) el.setAttribute('placeholder', message);
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      const message = getMessage(key);
      if (message) el.setAttribute('title', message);
    });
  };

  applyStaticLocalization();

  // --- Get all UI elements ---
  const cbLegacy = document.getElementById('legacyComposer');
  const cbHideUsageLimit = document.getElementById('hideUsageLimit');
  const cbHideUpgradePromos = document.getElementById('hideUpgradePromos');
  const cbDisableAnimations = document.getElementById('disableAnimations');
  const cbFocusMode = document.getElementById('focusMode');
  const cbHideQuickSettings = document.getElementById('hideQuickSettings');
  const cbShowInNewChatsOnly = document.getElementById('showInNewChatsOnly');
  const cbHideImaginePromo = document.getElementById('hideImaginePromo');
  const cbHideLeftNav = document.getElementById('hideLeftNav');

  const tbBgUrl = document.getElementById('bgUrl');
  const fileBg = document.getElementById('bgFile');
  const btnClearBg = document.getElementById('clearBg');
  const blurSlider = document.getElementById('blurSlider');
  const blurValue = document.getElementById('blurValue');

  // --- Reusable Custom Select Functionality (from ChatGPT version) ---
  function createCustomSelect(containerId, options, storageKey, onPresetChange) {
    const container = document.getElementById(containerId);
    if (!container) return { update: () => {} };
    const trigger = container.querySelector('.select-trigger');
    const label = container.querySelector('.select-label');
    const optionsContainer = container.querySelector('.select-options');
    const dotInTrigger = trigger.querySelector('.color-dot');

    const resolveLabel = (option) => option.labelKey ? getMessage(option.labelKey) : (option.label || option.value);

    function renderOptions(selectedValue) {
      optionsContainer.innerHTML = options
        .filter(option => !option.hidden)
        .map(option => {
            const colorDotHtml = option.color ? `<span class="color-dot" style="background-color: ${option.color}; display: block;"></span>` : '';
            const optionLabel = resolveLabel(option);
            const isSelected = option.value === selectedValue ? 'true' : 'false';
            return `
            <div class="select-option" role="option" data-value="${option.value}" aria-selected="${isSelected}">
              ${colorDotHtml}
              <span class="option-label">${optionLabel}</span>
            </div>
            `;
        }).join('');

      optionsContainer.querySelectorAll('.select-option').forEach(optionEl => {
        optionEl.addEventListener('click', () => {
          const newValue = optionEl.dataset.value;
          if (storageKey) {
            chrome.storage.sync.set({ [storageKey]: newValue });
          }
          if (onPresetChange) {
            onPresetChange(newValue);
          }
          closeAllSelects();
        });
      });
    }

    function updateSelectorState(value) {
      const selectedOption = options.find(opt => opt.value === value) || options[0];
      const selectedLabel = resolveLabel(selectedOption);

      if (dotInTrigger) {
        if (selectedOption.color) {
          dotInTrigger.style.backgroundColor = selectedOption.color;
          dotInTrigger.style.display = 'block';
        } else {
          dotInTrigger.style.display = 'none';
        }
      }

      label.textContent = selectedLabel;
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
    document.querySelectorAll('.custom-select').forEach(sel => {
        sel.classList.remove('is-open');
        const trigger = sel.querySelector('.select-trigger');
        const optionsContainer = sel.querySelector('.select-options');
        if (trigger) trigger.setAttribute('aria-expanded', 'false');
        if (optionsContainer) optionsContainer.style.display = 'none';
    });
  }
  document.addEventListener('click', closeAllSelects);

  // --- Initialize Custom Selects ---
  const bgPresetOptions = [
    { value: 'default', labelKey: 'bgPresetOptionDefault' },
    { value: 'chatgpt', labelKey: 'bgPresetOptionChatgpt' },
    { value: 'blue', labelKey: 'bgPresetOptionBlue' },
    { value: 'custom', labelKey: 'bgPresetOptionCustom', hidden: true }
  ];
  const bgPresetSelect = createCustomSelect('bgPreset', bgPresetOptions, null, (value) => {
    let newUrl = '';
    if (value === 'default') {
      newUrl = '';
    } else if (value === 'chatgpt') {
      newUrl = CHATGPT_SENTINEL;
    } else if (value === 'blue') {
      newUrl = BLUE_WALLPAPER_URL;
    }

    if (value !== 'custom') {
      chrome.storage.local.remove(LOCAL_BG_KEY);
      chrome.storage.sync.set({ customBgUrl: newUrl });
    }
  });

  const bgScalingOptions = [
    { value: 'contain', labelKey: 'bgScalingOptionContain' },
    { value: 'cover', labelKey: 'bgScalingOptionCover' }
  ];
  const bgScalingSelect = createCustomSelect('bgScalingSelector', bgScalingOptions, 'backgroundScaling');

  const themeOptions = [
    { value: 'auto', labelKey: 'themeOptionAuto' },
    { value: 'light', labelKey: 'themeOptionLight' },
    { value: 'dark', labelKey: 'themeOptionDark' }
  ];
  const themeSelect = createCustomSelect('themeSelector', themeOptions, 'theme');

  const appearanceOptions = [
    { value: 'dimmed', labelKey: 'appearanceOptionDimmed' },
    { value: 'clear', labelKey: 'appearanceOptionClear' }
  ];
  const appearanceSelect = createCustomSelect('appearanceSelector', appearanceOptions, 'appearance');

  // --- Function to update the UI based on current settings ---
  async function updateUi(settings) {
    if (settings.theme === 'auto') {
      // Logic to detect system theme could be added here if needed
      // For now, popup just reflects the 'auto' setting
      document.documentElement.classList.remove('theme-light');
    } else {
      document.documentElement.classList.toggle('theme-light', settings.theme === 'light');
    }

    cbLegacy.checked = !!settings.legacyComposer;
    cbHideUsageLimit.checked = !!settings.hideUsageLimit;
    cbHideUpgradePromos.checked = !!settings.hideUpgradePromos;
    cbDisableAnimations.checked = !!settings.disableAnimations;
    cbFocusMode.checked = !!settings.focusMode;
    cbHideQuickSettings.checked = !!settings.hideQuickSettings;
    cbShowInNewChatsOnly.checked = !!settings.showInNewChatsOnly;
    cbHideImaginePromo.checked = !!settings.hideImaginePromo;
    cbHideLeftNav.checked = !!settings.hideLeftNav;

    blurSlider.value = settings.backgroundBlur;
    blurValue.textContent = settings.backgroundBlur;

    bgScalingSelect.update(settings.backgroundScaling);
    themeSelect.update(settings.theme);
    appearanceSelect.update(settings.appearance || 'dimmed');

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

  // --- Initial Load ---
  chrome.storage.sync.get(DEFAULTS, updateUi);

  // --- Event Listeners for Toggles ---
  const addCheckboxListener = (element, key) => {
    if (element) {
      element.addEventListener('change', () => chrome.storage.sync.set({ [key]: element.checked }));
    }
  };

  addCheckboxListener(cbLegacy, 'legacyComposer');
  addCheckboxListener(cbHideUsageLimit, 'hideUsageLimit');
  addCheckboxListener(cbHideUpgradePromos, 'hideUpgradePromos');
  addCheckboxListener(cbDisableAnimations, 'disableAnimations');
  addCheckboxListener(cbFocusMode, 'focusMode');
  addCheckboxListener(cbHideQuickSettings, 'hideQuickSettings');
  addCheckboxListener(cbShowInNewChatsOnly, 'showInNewChatsOnly');
  addCheckboxListener(cbHideImaginePromo, 'hideImaginePromo');
  addCheckboxListener(cbHideLeftNav, 'hideLeftNav');

  // --- Event Listeners for Custom Background ---
  blurSlider.addEventListener('input', () => {
    blurValue.textContent = blurSlider.value;
  });
  blurSlider.addEventListener('change', () => {
    chrome.storage.sync.set({ backgroundBlur: blurSlider.value });
  });

  tbBgUrl.addEventListener('change', () => {
    const urlValue = tbBgUrl.value.trim();
    const newSettings = { customBgUrl: urlValue };
    if (urlValue !== '__local__') {
      chrome.storage.local.remove(LOCAL_BG_KEY);
    }
    chrome.storage.sync.set(newSettings);
  });

  fileBg.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      alert(getMessage('alertFileTooLarge', MAX_FILE_SIZE_MB.toString()));
      fileBg.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      chrome.storage.local.set({ [LOCAL_BG_KEY]: dataUrl }, () => {
        chrome.storage.sync.set({ customBgUrl: '__local__' });
      });
    };
    reader.readAsDataURL(file);
    fileBg.value = '';
  });

  btnClearBg.addEventListener('click', () => {
    chrome.storage.sync.set({
      customBgUrl: '',
      backgroundBlur: DEFAULTS.backgroundBlur,
      backgroundScaling: DEFAULTS.backgroundScaling
    });
    chrome.storage.local.remove(LOCAL_BG_KEY);
  });

  // --- Listen for changes and update UI ---
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' || area === 'local') {
      chrome.storage.sync.get(DEFAULTS, updateUi);
    }
  });
});