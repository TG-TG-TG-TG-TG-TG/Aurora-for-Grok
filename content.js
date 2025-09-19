// content.js — Ambient Blur + scoped transparency + robust hide/show + legacy toggle
(() => {
  const ID = 'cgpt-ambient-bg';
  const STYLE_ID = 'cgpt-ambient-styles';
  const QS_BUTTON_ID = 'cgpt-qs-btn';
  const QS_PANEL_ID = 'cgpt-qs-panel';
  const HTML_CLASS = 'cgpt-ambient-on';
  const LEGACY_CLASS = 'cgpt-legacy-composer';
  const LIGHT_CLASS = 'cgpt-light-mode';
  const ANIMATIONS_DISABLED_CLASS = 'cgpt-animations-disabled';
  const DEFAULTS = { legacyComposer: false, theme: 'auto', hideGpt5Limit: false, hideUpgradeButtons: false, disableAnimations: false, focusMode: false, hideQuickSettings: false, customBgUrl: '', hideSoraButton: false, hideGptsButton: false, backgroundBlur: '60', backgroundScaling: 'contain', voiceColor: 'default', cuteVoiceUI: false, showInNewChatsOnly: false };
  let settings = { ...DEFAULTS };

  const LOCAL_BG_KEY = 'customBgData';
  const HIDE_LIMIT_CLASS = 'cgpt-hide-gpt5-limit';
  const HIDE_UPGRADE_CLASS = 'cgpt-hide-upgrade';
  const HIDE_SORA_CLASS = 'cgpt-hide-sora';
  const HIDE_GPTS_CLASS = 'cgpt-hide-gpts';
  const TIMESTAMP_KEY = 'gpt5LimitHitTimestamp';
  const FIVE_MINUTES_MS = 5 * 60 * 1000;

  const getMessage = (key) => {
    if (chrome?.i18n?.getMessage) {
      const text = chrome.i18n.getMessage(key);
      if (text) return text;
    }
    return key;
  };
  function manageGpt5LimitPopup() {
    const popup = document.querySelector('div[class*="text-token-text-primary"]');
    if (popup && !popup.textContent.toLowerCase().includes('you\'ve reached the gpt-5 limit')) return;
    if (!settings.hideGpt5Limit) {
      if (popup) popup.classList.remove(HIDE_LIMIT_CLASS); return;
    }
    if (!chrome?.runtime?.id) return;
    if (popup) {
      chrome.storage.local.get([TIMESTAMP_KEY], (result) => {
        if (chrome.runtime.lastError) return;
        if (!result[TIMESTAMP_KEY]) {
          chrome.storage.local.set({ [TIMESTAMP_KEY]: Date.now() }, () => { if (chrome.runtime.lastError) {} });
        } else if (Date.now() - result[TIMESTAMP_KEY] > FIVE_MINUTES_MS) {
          popup.classList.add(HIDE_LIMIT_CLASS);
        }
      });
    } else {
      chrome.storage.local.remove([TIMESTAMP_KEY], () => { if (chrome.runtime.lastError) {} });
    }
  }
  function manageUpgradeButtons() {
    const panelButton = Array.from(document.querySelectorAll('.__menu-item')).find(el => el.textContent.toLowerCase().includes('upgrade'));
    const topButtonContainer = document.querySelector('.start-1\\/2.absolute');

    // The previous class-based selector was brittle. This search is more robust.
    let accountUpgradeSection = null;
    const allSettingRows = document.querySelectorAll('div.py-2.border-b');
    for (const row of allSettingRows) {
        const hasTitle = Array.from(row.querySelectorAll('div')).some(d => d.textContent.trim() === 'Get ChatGPT Plus');
        const hasButton = row.querySelector('button')?.textContent.trim() === 'Upgrade';
        if (hasTitle && hasButton) {
            accountUpgradeSection = row;
            break;
        }
    }

    if (panelButton) panelButton.classList.toggle(HIDE_UPGRADE_CLASS, settings.hideUpgradeButtons);
    if (topButtonContainer) topButtonContainer.classList.toggle(HIDE_UPGRADE_CLASS, settings.hideUpgradeButtons);
    if (accountUpgradeSection) accountUpgradeSection.classList.toggle(HIDE_UPGRADE_CLASS, settings.hideUpgradeButtons);
  }
  function manageSidebarButtons() {
    const soraButton = document.getElementById('sora');
    const gptsButton = document.querySelector('a[href="/gpts"]');
    if (soraButton) soraButton.classList.toggle(HIDE_SORA_CLASS, settings.hideSoraButton);
    if (gptsButton) gptsButton.classList.toggle(HIDE_GPTS_CLASS, settings.hideGptsButton);
  }
  const isChatPage = () => location.pathname.startsWith('/c/');
  function ensureAppOnTop() {
    const app = document.getElementById('__next') || document.querySelector('#root') || document.querySelector('main') || document.body.firstElementChild;
    if (!app) return;
    const cs = getComputedStyle(app);
    if (cs.position === 'static') app.style.position = 'relative';
    if (!app.style.zIndex || parseInt(app.style.zIndex || '0', 10) < 0) app.style.zIndex = '0';
  }
  function makeBgNode() {
    const wrap = document.createElement('div');
    wrap.id = ID;
    wrap.setAttribute('aria-hidden', 'true');
    Object.assign(wrap.style, { position: 'fixed', inset: '0', zIndex: '-1', pointerEvents: 'none' });
    wrap.innerHTML = `<video playsinline autoplay muted loop></video><picture><source type="image/webp" srcset=""><img alt="" aria-hidden="true" sizes="100vw" loading="eager" fetchpriority="high" src="" srcset=""></picture><div class="haze"></div><div class="overlay"></div>`;
    return wrap;
  }
  function updateBackgroundImage() {
    const bgNode = document.getElementById(ID);
    if (!bgNode) return;
    const img = bgNode.querySelector('img');
    const source = bgNode.querySelector('source');
    const video = bgNode.querySelector('video');
    if (!img || !source || !video) return;
    const defaultWebpSrcset = `https://persistent.oaistatic.com/burrito-nux/640.webp 640w, https://persistent.oaistatic.com/burrito-nux/1280.webp 1280w, https://persistent.oaistatic.com/burrito-nux/1920.webp 1920w`;
    const defaultImgSrc = "https://persistent.oaistatic.com/burrito-nux/640.webp";
    const videoExtensions = ['.mp4', '.webm', '.ogv'];
    const applyMedia = (url) => {
      const isVideo = videoExtensions.some(ext => url.includes(ext)) || url.startsWith('data:video');
      img.style.display = isVideo ? 'none' : 'block';
      video.style.display = isVideo ? 'block' : 'none';
      if (isVideo) {
        video.src = url;
        img.src = ''; img.srcset = ''; source.srcset = '';
      } else {
        img.src = url; img.srcset = ''; source.srcset = '';
      }
    };
    const applyDefault = () => {
      img.style.display = 'block';
      video.style.display = 'none';
      video.src = '';
      img.src = defaultImgSrc;
      img.srcset = defaultWebpSrcset;
      source.srcset = defaultWebpSrcset;
    };
    if (settings.customBgUrl) {
      if (settings.customBgUrl === '__local__') {
        if (!chrome?.storage?.local) return;
        chrome.storage.local.get(LOCAL_BG_KEY, (res) => {
          if (!chrome.runtime.lastError && res[LOCAL_BG_KEY]) {
            applyMedia(res[LOCAL_BG_KEY]);
          } else {
            applyDefault();
          }
        });
      } else {
        applyMedia(settings.customBgUrl);
      }
    } else {
      applyDefault();
    }
  }
  function applyCustomStyles() {
    // Ensure <head> exists before injecting styles when running at document_start
    const ensureAndApply = () => {
      let styleNode = document.getElementById(STYLE_ID);
      if (!styleNode) {
        styleNode = document.createElement('style');
        styleNode.id = STYLE_ID;
        (document.head || document.documentElement || document.body)?.appendChild(styleNode);
      }
      const blurPx = `${settings.backgroundBlur || '60'}px`;
      const scaling = settings.backgroundScaling || 'contain';
      styleNode.textContent = `
        #${ID} img, #${ID} video {
          --cgpt-bg-blur-radius: ${blurPx};
          object-fit: ${scaling};
        }
      `;
    };
    if (!document.head && !document.body) {
      document.addEventListener('DOMContentLoaded', ensureAndApply, { once: true });
      return;
    }
    ensureAndApply();
  }

  let qsInitScheduled = false;
  function manageQuickSettingsUI() {
    // If body is not yet available (run_at: document_start), wait for DOMContentLoaded once
    if (!document.body) {
      if (!qsInitScheduled) {
        qsInitScheduled = true;
        document.addEventListener('DOMContentLoaded', () => { qsInitScheduled = false; manageQuickSettingsUI(); }, { once: true });
      }
      return;
    }
    let btn = document.getElementById(QS_BUTTON_ID);
    let panel = document.getElementById(QS_PANEL_ID);

    if (!btn) {
      btn = document.createElement('button');
      btn.id = QS_BUTTON_ID;
      btn.title = getMessage('quickSettingsButtonTitle');
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5A3.5 3.5 0 0 1 15.5 12A3.5 3.5 0 0 1 12 15.5M19.43 12.98C19.47 12.65 19.5 12.33 19.5 12S19.47 11.35 19.43 11L21.54 9.37C21.73 9.22 21.78 8.95 21.66 8.73L19.66 5.27C19.54 5.05 19.27 4.96 19.05 5.05L16.56 6.05C16.04 5.66 15.5 5.32 14.87 5.07L14.5 2.42C14.46 2.18 14.25 2 14 2H10C9.75 2 9.54 2.18 9.5 2.42L9.13 5.07C8.5 5.32 7.96 5.66 7.44 6.05L4.95 5.05C4.73 4.96 4.46 5.05 4.34 5.27L2.34 8.73C2.21 8.95 2.27 9.22 2.46 9.37L4.57 11C4.53 11.35 4.5 11.67 4.5 12S4.53 12.65 4.57 12.98L2.46 14.63C2.27 14.78 2.21 15.05 2.34 15.27L4.34 18.73C4.46 18.95 4.73 19.04 4.95 18.95L7.44 17.94C7.96 18.34 8.5 18.68 9.13 18.93L9.5 21.58C9.54 21.82 9.75 22 10 22H14C14.25 22 14.46 21.82 14.5 21.58L14.87 18.93C15.5 18.68 16.04 18.34 16.56 17.94L19.05 18.95C19.27 19.04 19.54 18.95 19.66 18.73L21.66 15.27C21.78 15.05 21.73 14.78 21.54 14.63L19.43 12.98Z"></path></svg>`;
      document.body.appendChild(btn);

      panel = document.createElement('div');
      panel.id = QS_PANEL_ID;
      document.body.appendChild(panel);

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        panel.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!panel.contains(e.target) && panel.classList.contains('active')) {
          panel.classList.remove('active');
        }
        const selectContainer = document.getElementById('qs-voice-color-select');
        if (selectContainer && !selectContainer.contains(e.target)) {
            const selectTrigger = selectContainer.querySelector('.qs-select-trigger');
            if (selectTrigger && selectTrigger.getAttribute('aria-expanded') === 'true') {
                const selectOptions = selectContainer.querySelector('.qs-select-options');
                selectTrigger.setAttribute('aria-expanded', 'false');
                if (selectOptions) selectOptions.style.display = 'none';
            }
        }
      });
    }

        panel.innerHTML = `
      <div class="qs-section-title">${getMessage('quickSettingsSectionVisibility')}</div>
      <div class="qs-row" data-setting="focusMode">
          <label>${getMessage('labelFocusMode')}</label>
          <label class="switch"><input type="checkbox" id="qs-focusMode"><span class="track"><span class="thumb"></span></span></label>
      </div>
      <div class="qs-row" data-setting="hideUpgradeButtons">
          <label>${getMessage('quickSettingsLabelHideUpgradeButtons')}</label>
          <label class="switch"><input type="checkbox" id="qs-hideUpgradeButtons"><span class="track"><span class="thumb"></span></span></label>
      </div>
      <div class="qs-row" data-setting="hideGptsButton">
          <label>${getMessage('quickSettingsLabelHideGptsButton')}</label>
          <label class="switch"><input type="checkbox" id="qs-hideGptsButton"><span class="track"><span class="thumb"></span></span></label>
      </div>
      <div class="qs-section-title">${getMessage('quickSettingsSectionVoice')}</div>
      <div class="qs-row" data-setting="voiceColor">
          <label>${getMessage('quickSettingsLabelVoiceColor')}</label>
          <div class="qs-custom-select" id="qs-voice-color-select">
              <button type="button" class="qs-select-trigger" aria-haspopup="listbox" aria-expanded="false">
                  <span class="qs-color-dot"></span>
                  <span class="qs-select-label"></span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
              <div class="qs-select-options" role="listbox" style="display: none;"></div>
          </div>
      </div>
      <div class="qs-row" data-setting="cuteVoiceUI">
          <label>${getMessage('quickSettingsLabelCuteVoice')}</label>
          <label class="switch"><input type="checkbox" id="qs-cuteVoiceUI"><span class="track"><span class="thumb"></span></span></label>
      </div>
    `;

    document.getElementById('qs-focusMode').checked = !!settings.focusMode;
    document.getElementById('qs-hideUpgradeButtons').checked = !!settings.hideUpgradeButtons;
    document.getElementById('qs-hideGptsButton').checked = !!settings.hideGptsButton;
    document.getElementById('qs-cuteVoiceUI').checked = !!settings.cuteVoiceUI;

    const addCheckboxListener = (id, settingName) => {
      const el = document.getElementById(id);
      if(el) el.addEventListener('change', () => {
        chrome.storage.sync.set({ [settingName]: el.checked });
      });
    };
    addCheckboxListener('qs-focusMode', 'focusMode');
    addCheckboxListener('qs-hideUpgradeButtons', 'hideUpgradeButtons');
    addCheckboxListener('qs-hideGptsButton', 'hideGptsButton');
    addCheckboxListener('qs-cuteVoiceUI', 'cuteVoiceUI');

    const voiceColorOptions = [
        { value: 'default', labelKey: 'voiceColorOptionDefault', color: '#8EBBFF' },
        { value: 'orange', labelKey: 'voiceColorOptionOrange', color: '#FF9900' },
        { value: 'yellow', labelKey: 'voiceColorOptionYellow', color: '#FFD700' },
        { value: 'pink', labelKey: 'voiceColorOptionPink', color: '#FF69B4' },
        { value: 'green', labelKey: 'voiceColorOptionGreen', color: '#32CD32' },
        { value: 'dark', labelKey: 'voiceColorOptionDark', color: '#555555' }
    ];
    const selectContainer = document.getElementById('qs-voice-color-select');
    const trigger = selectContainer.querySelector('.qs-select-trigger');
    const optionsContainer = selectContainer.querySelector('.qs-select-options');
    const triggerDot = trigger.querySelector('.qs-color-dot');
    const triggerLabel = trigger.querySelector('.qs-select-label');

    const resolveVoiceLabel = (option) => getMessage(option.labelKey);

    const renderVoiceOptions = (selectedValue) => {
        optionsContainer.innerHTML = voiceColorOptions.map(option => `
        <div class="qs-select-option" role="option" data-value="${option.value}" aria-selected="${option.value === selectedValue}">
            <span class="qs-color-dot" style="background-color: ${option.color};"></span>
            <span class="qs-select-label">${resolveVoiceLabel(option)}</span>
            <svg class="qs-checkmark" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        </div>
    `).join('');
        optionsContainer.querySelectorAll('.qs-select-option').forEach(optionEl => {
            optionEl.addEventListener('click', () => {
                const newValue = optionEl.dataset.value;
                chrome.storage.sync.set({ voiceColor: newValue });
                trigger.setAttribute('aria-expanded', 'false');
                optionsContainer.style.display = 'none';
            });
        });
    };

    const updateSelectorState = (value) => {
        const selectedOption = voiceColorOptions.find(opt => opt.value === value) || voiceColorOptions[0];
        triggerDot.style.backgroundColor = selectedOption.color;
        triggerLabel.textContent = resolveVoiceLabel(selectedOption);
        renderVoiceOptions(value);
    };

    updateSelectorState(settings.voiceColor);

    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', String(!isExpanded));
        optionsContainer.style.display = isExpanded ? 'none' : 'block';
    });
  }

  function applyRootFlags() {
    document.documentElement.classList.toggle(HTML_CLASS, shouldShow());
    document.documentElement.classList.toggle(LEGACY_CLASS, !!settings.legacyComposer);
    document.documentElement.classList.toggle(ANIMATIONS_DISABLED_CLASS, !!settings.disableAnimations);
    document.documentElement.classList.toggle('cgpt-cute-voice-on', !!settings.cuteVoiceUI);
    document.documentElement.classList.toggle('cgpt-focus-mode-on', !!settings.focusMode);
    let applyLightMode = (settings.theme === 'light') || (settings.theme === 'auto' && document.documentElement.classList.contains('light'));
    document.documentElement.classList.toggle(LIGHT_CLASS, applyLightMode);
    document.documentElement.setAttribute('data-voice-color', settings.voiceColor || 'default');
  }

  function showBg() {
    if (!document.getElementById(ID)) {
      const node = makeBgNode();
      const add = () => {
        document.body.prepend(node);
        ensureAppOnTop();
        // After the node exists, ensure styles and media sources are applied
        try { applyCustomStyles(); } catch {}
        try { updateBackgroundImage(); } catch {}
      };
      if (document.body) add(); else document.addEventListener('DOMContentLoaded', add, { once: true });
    }
  }
  function hideBg() {
    const node = document.getElementById(ID);
    if (node) node.remove();
  }
  function shouldShow() {
    if (settings.showInNewChatsOnly) {
      return !isChatPage();
    }
    return true;
  }

  function applyAllSettings() {
    if (shouldShow()) {
      showBg();
    } else {
      hideBg();
    }

    // Manage Quick Settings UI visibility
    if (shouldShow() && !settings.hideQuickSettings) {
      manageQuickSettingsUI();
    } else {
      const btn = document.getElementById(QS_BUTTON_ID);
      const panel = document.getElementById(QS_PANEL_ID);
      if (btn) btn.remove();
      if (panel) panel.remove();
    }

    applyRootFlags();
    applyCustomStyles();
    updateBackgroundImage();
    manageGpt5LimitPopup();
    manageUpgradeButtons();
    manageSidebarButtons();
  }

  let observersStarted = false;
  let observersInitScheduled = false;
  function startObservers() {
    if (observersStarted) return; // prevent double init
    if (!document.body) {
      if (!observersInitScheduled) {
        observersInitScheduled = true;
        document.addEventListener('DOMContentLoaded', () => { observersInitScheduled = false; startObservers(); }, { once: true });
      }
      return;
    }
    observersStarted = true;
    window.addEventListener('focus', applyAllSettings, { passive: true });
    let lastUrl = location.href;
    const checkUrl = () => { if (location.href === lastUrl) return; lastUrl = location.href; applyAllSettings(); };
    window.addEventListener('popstate', checkUrl, { passive: true });
    const originalPushState = history.pushState;
    history.pushState = function(...args) { originalPushState.apply(this, args); setTimeout(checkUrl, 0); };
    const originalReplaceState = history.replaceState;
    history.replaceState = function(...args) { originalReplaceState.apply(this, args); setTimeout(checkUrl, 0); };
    const domObserver = new MutationObserver(() => {
      manageGpt5LimitPopup();
      manageUpgradeButtons();
      manageSidebarButtons();
    });
    // document.body is guaranteed here due to guard above
    domObserver.observe(document.body, { childList: true, subtree: true });
    const themeObserver = new MutationObserver(() => { if (settings.theme === 'auto') applyRootFlags(); });
    const rootNode = document.documentElement || document.body;
    if (rootNode) themeObserver.observe(rootNode, { attributes: true, attributeFilter: ['class'] });
  }
  if (chrome?.storage?.sync) {
    chrome.storage.sync.get(DEFAULTS, (res) => {
      settings = { ...DEFAULTS, ...res };
      applyAllSettings();
      startObservers();
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync') {
        let needsUpdate = false;
        for (let key in changes) { if (key in settings) { settings[key] = changes[key].newValue; needsUpdate = true; } }
        if (needsUpdate) applyAllSettings();
      } else if (area === 'local' && changes[LOCAL_BG_KEY]) {
        applyAllSettings();
      }
    });
  } else {
    applyAllSettings();
    startObservers();
  }
})();






