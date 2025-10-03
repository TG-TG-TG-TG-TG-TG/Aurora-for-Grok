// content.js — Modernized for Aurora for Grok
(() => {
  const getAssetUrl = (relativePath) => (typeof chrome !== 'undefined' && chrome?.runtime?.getURL) ? chrome.runtime.getURL(relativePath) : relativePath;

  const ID = 'grok-ambient-bg';
  const STYLE_ID = 'grok-ambient-styles';
  const QS_BUTTON_ID = 'grok-qs-btn';
  const QS_PANEL_ID = 'grok-qs-panel';
  const HTML_CLASS = 'grok-ambient-on';
  const LEGACY_CLASS = 'grok-legacy-composer';
  const LIGHT_CLASS = 'grok-light-mode';
  const ANIMATIONS_DISABLED_CLASS = 'grok-animations-disabled';
  const FOCUS_CLASS = 'grok-focus-mode-on';
  const LOCAL_BG_KEY = 'customBgData';
  const CHATGPT_SENTINEL = '__chatgpt__';
  const CHATGPT_MODE_CLASS = 'grok-chatgpt-bg';
  const APPEARANCE_CLEAR_CLASS = 'grok-appearance-clear';

  const HIDE_USAGE_CLASS = 'grok-hide-usage-notice';
  const HIDE_UPGRADE_CLASS = 'grok-hide-upgrade-promo';
  const HIDE_IMAGINE_CLASS = 'grok-hide-imagine-promo';

  const USAGE_LIMIT_MATCHERS = ['usage limit', 'limit reached', 'try again later', 'come back later', 'quota'];
  const UPGRADE_PROMO_MATCHERS = ['upgrade', 'supergrok', 'subscription', 'plan', 'pro tier'];
  const IMAGINE_PROMO_MATCHERS = ['imagine anything', 'generate images', 'image generation', 'grok imagine'];

  const USAGE_SELECTORS = ['[role="alert"]', '[aria-live]', 'section', 'aside', 'div[data-testid]', 'div[role="dialog"]'];
  const UPGRADE_SELECTORS = ['[data-testid*="upgrade"]', '[role="dialog"]', 'section', 'aside', 'a', 'button'];
  const IMAGINE_SELECTORS = ['section', 'article', 'div[data-testid]', 'a'];
  
  const DEFAULT_BACKGROUND_IMAGE = getAssetUrl('Aurora/grok-4.webp');
  const CHATGPT_BACKGROUND_IMAGE = getAssetUrl('Aurora/Chatgpt.webp');

  let settings = {};
  let observersStarted = false;

  const getMessage = (key) => {
    try {
      if (typeof chrome !== 'undefined' && chrome?.i18n?.getMessage) {
        const text = chrome.i18n.getMessage(key);
        if (text) return text;
      }
    } catch (e) {}
    return key;
  };

  const isChatPath = () => {
    const path = location.pathname || '/';
    if (path === '/' || path === '/ask') return false;
    return /\/(chat|thread|conversation|c)\b/i.test(path);
  };

  const shouldShow = () => !settings.showInNewChatsOnly || !isChatPath();

  function ensureAppOnTop() {
    const app = document.querySelector('#root, main, [data-testid*="app"], body > div:first-child');
    if (app) {
      if (getComputedStyle(app).position === 'static') app.style.position = 'relative';
      if (!app.style.zIndex || parseInt(app.style.zIndex) < 0) app.style.zIndex = '0';
    }
  }

  function makeBgNode() {
    const wrap = document.createElement('div');
    wrap.id = ID;
    wrap.setAttribute('aria-hidden', 'true');
    const createLayerContent = () => `
      <div class="animated-bg">
        <div class="blob"></div><div class="blob"></div><div class="blob"></div>
      </div>
      <video playsinline autoplay muted loop></video>
      <picture>
        <source type="image/webp" srcset="">
        <img alt="" aria-hidden="true" loading="eager" sizes="100vw" src="">
      </picture>`;
    wrap.innerHTML = `
      <div class="media-layer active" data-layer-id="a">${createLayerContent()}</div>
      <div class="media-layer" data-layer-id="b">${createLayerContent()}</div>
      <div class="haze"></div>
      <div class="overlay"></div>`;
    return wrap;
  }
  
  let activeLayerId = 'a';
  let isTransitioning = false;

  function updateBackgroundImage() {
    const bgNode = document.getElementById(ID);
    if (!bgNode || isTransitioning) return;

    const url = (settings.customBgUrl || '').trim();
    document.documentElement.classList.toggle(CHATGPT_MODE_CLASS, url === CHATGPT_SENTINEL);

    const inactiveLayerId = activeLayerId === 'a' ? 'b' : 'a';
    const activeLayer = bgNode.querySelector(`.media-layer[data-layer-id="${activeLayerId}"]`);
    const inactiveLayer = bgNode.querySelector(`.media-layer[data-layer-id="${inactiveLayerId}"]`);

    if (!activeLayer || !inactiveLayer) return;

    inactiveLayer.classList.remove('gpt5-active');

    const inactiveImg = inactiveLayer.querySelector('img');
    const inactiveSource = inactiveLayer.querySelector('source');
    const inactiveVideo = inactiveLayer.querySelector('video');

    const transitionToInactive = () => {
      isTransitioning = true;
      inactiveLayer.classList.add('active');
      activeLayer.classList.remove('active');
      activeLayerId = inactiveLayerId;
      setTimeout(() => { isTransitioning = false; }, 800);
    };

    if (url === '__gpt5_animated__') {
      inactiveLayer.classList.add('gpt5-active');
      transitionToInactive();
      return;
    }

    const applyMedia = (mediaUrl) => {
      const isVideo = /\.(mp4|webm|m4v|mov)$/i.test(mediaUrl) || mediaUrl.startsWith('data:video');
      inactiveImg.style.display = isVideo ? 'none' : 'block';
      inactiveVideo.style.display = isVideo ? 'block' : 'none';
      const mediaEl = isVideo ? inactiveVideo : inactiveImg;
      const eventType = isVideo ? 'loadeddata' : 'load';
      const onMediaReady = () => {
        transitionToInactive();
        mediaEl.removeEventListener(eventType, onMediaReady);
        mediaEl.removeEventListener('error', onMediaReady);
      };
      mediaEl.addEventListener(eventType, onMediaReady, { once: true });
      mediaEl.addEventListener('error', onMediaReady, { once: true });
      if (isVideo) {
        inactiveVideo.src = mediaUrl;
        inactiveVideo.load();
        inactiveVideo.play().catch(()=>{});
        inactiveImg.src = ''; inactiveImg.srcset = ''; inactiveSource.srcset = '';
      } else {
        inactiveImg.src = mediaUrl; inactiveImg.srcset = ''; inactiveSource.srcset = '';
        inactiveVideo.src = '';
      }
    };
    
    const applyDefault = (defaultUrl = DEFAULT_BACKGROUND_IMAGE) => {
        inactiveVideo.style.display = 'none';
        inactiveImg.style.display = 'block';
        const onMediaReady = () => {
            transitionToInactive();
            inactiveImg.removeEventListener('load', onMediaReady);
            inactiveImg.removeEventListener('error', onMediaReady);
        };
        inactiveImg.addEventListener('load', onMediaReady, { once: true });
        inactiveImg.addEventListener('error', onMediaReady, { once: true });
        inactiveImg.src = defaultUrl;
        inactiveImg.srcset = defaultUrl;
        inactiveSource.srcset = defaultUrl;
    };
    
    if (!url) {
      applyDefault();
    } else if (url === CHATGPT_SENTINEL) {
      applyDefault(CHATGPT_BACKGROUND_IMAGE);
    } else if (url === '__local__') {
      chrome.storage.local.get([LOCAL_BG_KEY], (res) => {
        if (!res?.[LOCAL_BG_KEY]) applyDefault();
        else applyMedia(res[LOCAL_BG_KEY]);
      });
    } else {
      applyMedia(url);
    }
  }

  function applyCustomStyles() {
    let styleNode = document.getElementById(STYLE_ID);
    if (!styleNode) {
      styleNode = document.createElement('style');
      styleNode.id = STYLE_ID;
      document.head.appendChild(styleNode);
    }
    styleNode.textContent = `
      html.${HTML_CLASS} {
        --grok-bg-blur-radius: ${settings.backgroundBlur || '60'}px;
        --grok-bg-scaling: ${settings.backgroundScaling || 'cover'};
      }
      #grok-ambient-bg .media-layer {
        opacity: 0;
        transition: opacity 750ms ease-in-out;
      }
      #grok-ambient-bg .media-layer.active {
        opacity: 1;
      }
      #grok-ambient-bg .media-layer.gpt5-active {
        opacity: 1;
        transition: none;
      }
    `;
  }

  const findElementsByText = (matchers, selectors) => {
    const loweredMatchers = matchers.map(m => m.toLowerCase());
    const results = [];
    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(node => {
        if (node.closest(`#${QS_PANEL_ID}, #${QS_BUTTON_ID}`)) return;
        if ((node.textContent || '').toLowerCase().includes(...loweredMatchers)) {
          results.push(node);
        }
      });
    });
    return [...new Set(results)];
  };
  
  const applyHideClass = (matchers, selectors, className, shouldHide) => {
    document.querySelectorAll(`.${className}`).forEach(node => node.classList.remove(className));
    if (shouldHide) {
      findElementsByText(matchers, selectors).forEach(node => node.classList.add(className));
    }
  };

  const manageUsageLimitNotices = () => applyHideClass(USAGE_LIMIT_MATCHERS, USAGE_SELECTORS, HIDE_USAGE_CLASS, settings.hideUsageLimit);
  const manageUpgradePromos = () => applyHideClass(UPGRADE_PROMO_MATCHERS, UPGRADE_SELECTORS, HIDE_UPGRADE_CLASS, settings.hideUpgradePromos);
  const manageImaginePromo = () => applyHideClass(IMAGINE_PROMO_MATCHERS, IMAGINE_SELECTORS, HIDE_IMAGINE_CLASS, settings.hideImaginePromo);

  function manageQuickSettingsUI() {
    let btn = document.getElementById(QS_BUTTON_ID);
    let panel = document.getElementById(QS_PANEL_ID);

    const shouldRender = shouldShow() && !settings.hideQuickSettings;

    if (!shouldRender) {
      if (btn) btn.remove();
      if (panel) panel.remove();
      return;
    }

    if (!btn) {
      btn = document.createElement('button');
      btn.id = QS_BUTTON_ID;
      btn.title = getMessage('quickSettingsButtonTitle');
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5A3.5 3.5 0 0 1 15.5 12A3.5 3.5 0 0 1 12 15.5M19.43 12.98C19.47 12.65 19.5 12.33 19.5 12S19.47 11.35 19.43 11L21.54 9.37C21.73 9.22 21.78 8.95 21.66 8.73L19.66 5.27C19.54 5.05 19.27 4.96 19.05 5.05L16.56 6.05C16.04 5.66 15.5 5.32 14.87 5.07L14.5 2.42C14.46 2.18 14.25 2 14 2H10C9.75 2 9.54 2.18 9.5 2.42L9.13 5.07C8.5 5.32 7.96 5.66 7.44 6.05L4.95 5.05C4.73 4.96 4.46 5.05 4.34 5.27L2.34 8.73C2.21 8.95 2.27 9.22 2.46 9.37L4.57 11C4.53 11.35 4.5 11.67 4.5 12S4.53 12.65 4.57 12.98L2.46 14.63C2.27 14.78 2.21 15.05 2.34 15.27L4.34 18.73C4.46 18.95 4.73 19.04 4.95 18.95L7.44 17.94C7.96 18.34 8.5 18.68 9.13 18.93L9.5 21.58C9.54 21.82 9.75 22 10 22H14C14.25 22 14.46 21.82 14.5 21.58L14.87 18.93C15.5 18.68 16.04 18.34 16.56 17.94L19.05 18.95C19.27 19.04 19.54 18.95 19.66 18.73L21.66 15.27C21.78 15.05 21.73 14.78 21.54 14.63L19.43 12.98Z"></path></svg>`;
      document.body.appendChild(btn);
      
      panel = document.createElement('div');
      panel.id = QS_PANEL_ID;
      document.body.appendChild(panel);
      panel.setAttribute('data-state', 'closed');
      
      panel.addEventListener('animationend', (e) => {
        if (e.animationName === 'qs-panel-close' && panel.getAttribute('data-state') === 'closing') {
          panel.setAttribute('data-state', 'closed');
        }
      });
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const state = panel.getAttribute('data-state');
        if (state === 'closed') panel.setAttribute('data-state', 'open');
        else if (state === 'open') panel.setAttribute('data-state', 'closing');
      });
      document.addEventListener('click', (e) => {
        if (panel.getAttribute('data-state') === 'open' && !panel.contains(e.target)) {
          panel.setAttribute('data-state', 'closing');
        }
      });
    }

    const toggleConfig = [
      { key: 'focusMode', labelKey: 'quickSettingsLabelFocusMode' },
      { key: 'hideUpgradePromos', labelKey: 'quickSettingsLabelHideUpgradePromos' },
      { key: 'hideImaginePromo', labelKey: 'quickSettingsLabelHideImaginePromo' },
      { key: 'hideUsageLimit', labelKey: 'quickSettingsLabelHideUsageLimit' },
    ];
    
    panel.innerHTML = `
        <div class="qs-section-title">${getMessage('quickSettingsSectionVisibility')}</div>
        ${toggleConfig.map(item => `
            <div class="qs-row">
                <label for="qs-${item.key}">${getMessage(item.labelKey)}</label>
                <label class="switch"><input type="checkbox" id="qs-${item.key}"><span class="track"><span class="thumb"></span></span></label>
            </div>`).join('')}
        <div class="qs-row">
            <label>${getMessage('quickSettingsLabelGlassStyle')}</label>
            <div class="qs-pill-group" role="group">
                <button type="button" class="qs-pill" data-appearance="clear">${getMessage('appearanceOptionClear')}</button>
                <button type="button" class="qs-pill" data-appearance="dimmed">${getMessage('appearanceOptionDimmed')}</button>
            </div>
        </div>`;
    
    toggleConfig.forEach(({ key }) => {
      const el = document.getElementById(`qs-${key}`);
      if (el) {
        el.checked = !!settings[key];
        el.addEventListener('change', () => chrome.storage.sync.set({ [key]: el.checked }));
      }
    });

    const appearanceButtons = panel.querySelectorAll('[data-appearance]');
    appearanceButtons.forEach(button => {
        const isActive = (settings.appearance || 'dimmed') === button.dataset.appearance;
        button.classList.toggle('active', isActive);
        button.addEventListener('click', () => {
            chrome.storage.sync.set({ appearance: button.dataset.appearance });
        });
    });
  }

  function applyRootFlags() {
    const root = document.documentElement;
    const show = shouldShow();
    root.classList.toggle(HTML_CLASS, show);
    root.classList.toggle(LEGACY_CLASS, !!settings.legacyComposer);
    root.classList.toggle(ANIMATIONS_DISABLED_CLASS, !!settings.disableAnimations);
    root.classList.toggle(FOCUS_CLASS, !!settings.focusMode);
    root.classList.toggle('grok-hide-left-nav', !!settings.hideLeftNav || !!settings.focusMode);
    root.classList.toggle(APPEARANCE_CLEAR_CLASS, settings.appearance === 'clear');
    
    const isLight = settings.theme === 'light' || (settings.theme === 'auto' && (root.classList.contains('light') || root.getAttribute('data-theme') === 'light'));
    root.classList.toggle(LIGHT_CLASS, isLight);
  }

  function showBg() {
    let node = document.getElementById(ID);
    if (!node) {
      node = makeBgNode();
      const add = () => {
        document.body.prepend(node);
        ensureAppOnTop();
      };
      if (document.body) add();
      else document.addEventListener('DOMContentLoaded', add, { once: true });
    }
  }

  function hideBg() {
    const node = document.getElementById(ID);
    if (node) node.remove();
  }

  function applyAllSettings() {
    if (shouldShow()) {
      showBg();
    } else {
      hideBg();
    }
    applyRootFlags();
    applyCustomStyles();
    updateBackgroundImage();
    manageQuickSettingsUI();
    manageUsageLimitNotices();
    manageUpgradePromos();
    manageImaginePromo();
  }
  
  function startObservers() {
    if (observersStarted) return;
    observersStarted = true;

    new MutationObserver((_, obs) => {
      if (document.querySelector('main')) {
        applyAllSettings();
        obs.disconnect();
      }
    }).observe(document.documentElement, { childList: true, subtree: true });

    window.addEventListener('focus', applyAllSettings, { passive: true });
    
    let lastUrl = location.href;
    const checkUrl = () => {
      if (location.href === lastUrl) return;
      lastUrl = location.href;
      applyAllSettings();
    };
    window.addEventListener('popstate', checkUrl, { passive: true });
    const originalPushState = history.pushState;
    history.pushState = function(...args) { originalPushState.apply(this, args); setTimeout(checkUrl, 0); };
    
    const domObserver = new MutationObserver(() => {
      manageUsageLimitNotices();
      manageUpgradePromos();
      manageImaginePromo();
    });
    if (document.body) domObserver.observe(document.body, { childList: true, subtree: true });
    else document.addEventListener('DOMContentLoaded', () => domObserver.observe(document.body, { childList: true, subtree: true }));

    new MutationObserver(() => {
      if (settings.theme === 'auto') applyRootFlags();
    }).observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
  }

  const refreshSettingsAndApply = () => {
    chrome.runtime.sendMessage({ type: 'GET_SETTINGS' }, (freshSettings) => {
      if (chrome.runtime.lastError) {
        console.error("Aurora/Grok Error: Could not get settings.", chrome.runtime.lastError.message);
        return;
      }
      settings = freshSettings;
      applyAllSettings();
    });
  };

  if (chrome?.runtime?.sendMessage) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        refreshSettingsAndApply();
        startObservers();
      }, { once: true });
    } else {
      refreshSettingsAndApply();
      startObservers();
    }
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' || (area === 'local' && changes[LOCAL_BG_KEY])) {
        refreshSettingsAndApply();
      }
    });
  }
})();
