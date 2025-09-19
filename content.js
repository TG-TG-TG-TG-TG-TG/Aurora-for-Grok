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
  const DEFAULT_BACKGROUND_IMAGE = getAssetUrl('Aurora/grok-4.webp');
  const CHATGPT_BACKGROUND_IMAGE = getAssetUrl('Aurora/Chatgpt.webp');
  const CHATGPT_SENTINEL = '__chatgpt__';
  const CHATGPT_MODE_CLASS = 'grok-chatgpt-bg';

  const HIDE_USAGE_CLASS = 'grok-hide-usage-notice';
  const HIDE_UPGRADE_CLASS = 'grok-hide-upgrade-promo';
  const HIDE_IMAGINE_CLASS = 'grok-hide-imagine-promo';

  const USAGE_LIMIT_MATCHERS = ['usage limit', 'limit reached', 'try again later', 'come back later', 'quota'];
  const UPGRADE_PROMO_MATCHERS = ['upgrade', 'supergrok', 'subscription', 'plan', 'pro tier'];
  const IMAGINE_PROMO_MATCHERS = ['imagine anything', 'generate images', 'image generation', 'grok imagine'];

  const USAGE_SELECTORS = ['[role="alert"]', '[aria-live]', 'section', 'aside', 'div[data-testid]', 'div[role="dialog"]'];
  const UPGRADE_SELECTORS = ['[data-testid*="upgrade"]', '[role="dialog"]', 'section', 'aside', 'a', 'button'];
  const IMAGINE_SELECTORS = ['section', 'article', 'div[data-testid]', 'a'];

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
    showInNewChatsOnly: false,
    hideImaginePromo: false,
    hideLeftNav: false
  };

  const QUICK_SETTINGS_CONFIG = [
    {
      titleKey: 'quickSettingsSectionVisibility',
      items: [
        { setting: 'focusMode', labelKey: 'quickSettingsLabelFocusMode' },
        { setting: 'hideUpgradePromos', labelKey: 'quickSettingsLabelHideUpgradePromos' },
        { setting: 'hideImaginePromo', labelKey: 'quickSettingsLabelHideImaginePromo' },
        { setting: 'hideUsageLimit', labelKey: 'quickSettingsLabelHideUsageLimit' }
      ]
    }
  ];

  let settings = { ...DEFAULTS };
  let docClickHandler = null;
  let observersStarted = false;
  let observersInitScheduled = false;

  const getMessage = (key) => {
    if (typeof chrome !== 'undefined' && chrome?.i18n?.getMessage) {
      const text = chrome.i18n.getMessage(key);
      if (text) return text;
    }
    return key;
  };

  const isVideoUrl = (url) => /\.(mp4|webm|m4v|mov)$/i.test(url);

  const isChatPath = () => {
    const path = location.pathname || '/';
    if (path === '/' || path === '/ask') return false;
    return /\/(chat|thread|conversation|c)\b/i.test(path);
  };

  const shouldShow = () => {
    if (settings.showInNewChatsOnly) {
      return !isChatPath();
    }
    return true;
  };

  function ensureAppOnTop() {
    const app = document.querySelector('#root, main, [data-testid*="app"], body > div:first-child');
    if (!app) return;
    const styles = window.getComputedStyle(app);
    if (styles.position === 'static') {
      app.style.position = 'relative';
    }
    if (!app.style.zIndex || Number.parseInt(app.style.zIndex, 10) < 0) {
      app.style.zIndex = '0';
    }
  }

  function makeBgNode() {
    const wrap = document.createElement('div');
    wrap.id = ID;
    wrap.setAttribute('aria-hidden', 'true');
    wrap.innerHTML = `
      <video playsinline autoplay muted loop></video>
      <picture>
        <source type="image/webp" srcset="">
        <img alt="" aria-hidden="true" loading="eager" sizes="100vw" src="">
      </picture>
      <div class="haze"></div>
      <div class="overlay"></div>
    `;
    return wrap;
  }

  function applyCustomStyles() {
    const blurValue = Math.max(0, Math.min(200, Number.parseInt(settings.backgroundBlur, 10) || Number.parseInt(DEFAULTS.backgroundBlur, 10)));
    const scaling = settings.backgroundScaling || DEFAULTS.backgroundScaling;
    let styleNode = document.getElementById(STYLE_ID);
    if (!styleNode) {
      styleNode = document.createElement('style');
      styleNode.id = STYLE_ID;
      document.head.appendChild(styleNode);
    }
    styleNode.textContent = `
      html.${HTML_CLASS} {
        --grok-bg-blur-radius: ${blurValue}px;
        --grok-bg-scaling: ${scaling};
      }
    `;
  }

  function applyMediaSources({ imageSrc = '', videoSrc = '' }) {
    const bgNode = document.getElementById(ID);
    if (!bgNode) return;
    const picture = bgNode.querySelector('picture');
    const img = picture?.querySelector('img');
    const source = picture?.querySelector('source');
    const video = bgNode.querySelector('video');
    if (!picture || !img || !source || !video) return;

    if (videoSrc) {
      picture.style.display = 'none';
      video.style.display = 'block';
      if (video.src !== videoSrc) {
        video.src = videoSrc;
        video.load();
      }
    } else {
      if (video.src) {
        video.removeAttribute('src');
        video.load();
      }
      video.style.display = 'none';
      picture.style.display = 'block';
      if (source.srcset !== imageSrc) {
        source.srcset = imageSrc;
      }
      if (img.src !== imageSrc) {
        img.src = imageSrc;
      }
    }
  }

  function updateBackgroundImage() {
    const url = (settings.customBgUrl || '').trim();
    const root = document.documentElement;
    const isChatgptPreset = url === CHATGPT_SENTINEL;
    const shouldApplyChatgptClass = isChatgptPreset && root.classList.contains(HTML_CLASS);
    root.classList.toggle(CHATGPT_MODE_CLASS, shouldApplyChatgptClass);

    if (!url) {
      applyMediaSources({ imageSrc: DEFAULT_BACKGROUND_IMAGE });
      return;
    }

    if (isChatgptPreset) {
      applyMediaSources({ imageSrc: CHATGPT_BACKGROUND_IMAGE });
      return;
    }

    if (url === '__local__') {
      if (typeof chrome === 'undefined' || !chrome?.storage?.local) {
        applyMediaSources({ imageSrc: DEFAULT_BACKGROUND_IMAGE });
        return;
      }
      chrome.storage.local.get([LOCAL_BG_KEY], (res) => {
        if (chrome.runtime?.lastError) return;
        const dataUrl = res?.[LOCAL_BG_KEY];
        if (!dataUrl) {
          applyMediaSources({ imageSrc: DEFAULT_BACKGROUND_IMAGE });
          return;
        }
        if (dataUrl.startsWith('data:video')) {
          applyMediaSources({ videoSrc: dataUrl });
        } else {
          applyMediaSources({ imageSrc: dataUrl });
        }
      });
      return;
    }

    if (isVideoUrl(url)) {
      applyMediaSources({ videoSrc: url });
    } else {
      applyMediaSources({ imageSrc: url });
    }
  }

  function findElementsByText(matchers, selectors) {
    const loweredMatchers = matchers.map((m) => m.toLowerCase());
    const seen = new Set();
    const results = [];
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((node) => {
        if (seen.has(node)) return;
        const text = (node.textContent || '').toLowerCase();
        if (!text) return;
        if (loweredMatchers.some((matcher) => text.includes(matcher))) {
          seen.add(node);
          results.push(node);
        }
      });
    });
    return { matches: results, matchSet: new Set(results) };
  }

  function applyHideClass(matchers, selectors, className, shouldHide) {
    const { matches, matchSet } = findElementsByText(matchers, selectors);
    document.querySelectorAll(`.${className}`).forEach((node) => {
      if (!shouldHide || !matchSet.has(node)) {
        node.classList.remove(className);
      }
    });
    if (shouldHide) {
      matches.forEach((node) => node.classList.add(className));
    }
  }

  function manageUsageLimitNotices() {
    applyHideClass(USAGE_LIMIT_MATCHERS, USAGE_SELECTORS, HIDE_USAGE_CLASS, !!settings.hideUsageLimit);
  }

  function manageUpgradePromos() {
    applyHideClass(UPGRADE_PROMO_MATCHERS, UPGRADE_SELECTORS, HIDE_UPGRADE_CLASS, !!settings.hideUpgradePromos);
  }

  function manageImaginePromo() {
    applyHideClass(IMAGINE_PROMO_MATCHERS, IMAGINE_SELECTORS, HIDE_IMAGINE_CLASS, !!settings.hideImaginePromo);
  }

  function renderQuickSettingsState() {
    const panel = document.getElementById(QS_PANEL_ID);
    if (!panel) return;
    QUICK_SETTINGS_CONFIG.forEach((section) => {
      section.items.forEach((item) => {
        const input = panel.querySelector(`input[data-setting="${item.setting}"]`);
        if (input) {
          input.checked = !!settings[item.setting];
        }
      });
    });
  }

  function populateQuickSettings(panel) {
    panel.innerHTML = '';
    QUICK_SETTINGS_CONFIG.forEach((section) => {
      const title = document.createElement('div');
      title.className = 'qs-section-title';
      title.textContent = getMessage(section.titleKey);
      panel.appendChild(title);

      section.items.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'qs-row';

        const labelEl = document.createElement('label');
        labelEl.className = 'qs-label';
        const inputId = `qs-${item.setting}`;
        labelEl.setAttribute('for', inputId);
        labelEl.textContent = getMessage(item.labelKey);

        const switchWrap = document.createElement('div');
        switchWrap.className = 'switch';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = inputId;
        input.dataset.setting = item.setting;

        const track = document.createElement('span');
        track.className = 'track';

        const thumb = document.createElement('span');
        thumb.className = 'thumb';
        track.appendChild(thumb);
        switchWrap.append(input, track);

        input.addEventListener('change', () => {
          const next = !!input.checked;
          if (chrome?.storage?.sync) {
            chrome.storage.sync.set({ [item.setting]: next });
          } else {
            settings[item.setting] = next;
            applyAllSettings();
            renderQuickSettingsState();
          }
        });

        row.append(labelEl, switchWrap);
        panel.appendChild(row);
      });
    });
    renderQuickSettingsState();
  }

  function buildQuickSettings() {
    if (document.getElementById(QS_BUTTON_ID) || !document.body) return;

    const btn = document.createElement('button');
    btn.id = QS_BUTTON_ID;
    btn.type = 'button';
    btn.title = getMessage('quickSettingsButtonTitle');
    btn.setAttribute('aria-label', getMessage('quickSettingsButtonTitle'));
    btn.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3a2 2 0 0 1 1.94 1.5l.14.5h2.35a1 1 0 0 1 .98.8l.03.2.34 1.8 1.62.94a1 1 0 0 1 .45 1.16l-.06.18-1 1.73.62 1.8a1 1 0 0 1-.45 1.16l-.17.08-1.62.94-.34 1.8a1 1 0 0 1-.82.8l-.19.01h-2.35l-.14.5A2 2 0 0 1 12 21a2 2 0 0 1-1.94-1.5l-.14-.5H7.57a1 1 0 0 1-.98-.8l-.03-.2-.34-1.8-1.62-.94a1 1 0 0 1-.45-1.16l.06-.18 1-1.73-.62-1.8a1 1 0 0 1 .45-1.16l.17-.08 1.62-.94.34-1.8a1 1 0 0 1 .82-.8L7.57 6h2.35l.14-.5A2 2 0 0 1 12 3Z" fill="currentColor"/>
      </svg>
    `;

    const panel = document.createElement('div');
    panel.id = QS_PANEL_ID;
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-hidden', 'true');
    panel.setAttribute('aria-label', getMessage('quickSettingsButtonTitle'));
    populateQuickSettings(panel);

    const closePanel = () => {
      panel.classList.remove('active');
      panel.setAttribute('aria-hidden', 'true');
    };

    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      const willOpen = !panel.classList.contains('active');
      if (willOpen) {
        panel.classList.add('active');
        panel.setAttribute('aria-hidden', 'false');
      } else {
        closePanel();
      }
    });

    panel.addEventListener('click', (event) => {
      event.stopPropagation();
    });

    if (!docClickHandler) {
      docClickHandler = (event) => {
        const target = event.target;
        if (!panel.contains(target) && target !== btn) {
          closePanel();
        }
      };
      document.addEventListener('click', docClickHandler);
    }

    document.body.append(btn, panel);
  }

  function destroyQuickSettings() {
    const btn = document.getElementById(QS_BUTTON_ID);
    const panel = document.getElementById(QS_PANEL_ID);
    if (panel) panel.remove();
    if (btn) btn.remove();
    if (docClickHandler) {
      document.removeEventListener('click', docClickHandler);
      docClickHandler = null;
    }
  }

  function manageQuickSettingsUI(show) {
    if (!show || settings.hideQuickSettings) {
      destroyQuickSettings();
      return;
    }
    buildQuickSettings();
    renderQuickSettingsState();
  }

  function applyRootFlags(show) {
    const root = document.documentElement;
    root.classList.toggle(HTML_CLASS, show);
    root.classList.toggle(LEGACY_CLASS, !!settings.legacyComposer);
    root.classList.toggle(ANIMATIONS_DISABLED_CLASS, !!settings.disableAnimations);
    root.classList.toggle(FOCUS_CLASS, !!settings.focusMode);
    root.classList.toggle('grok-hide-left-nav', !!settings.hideLeftNav || !!settings.focusMode);

    let forceLight = false;
    if (settings.theme === 'light') {
      forceLight = true;
    } else if (settings.theme === 'dark') {
      forceLight = false;
    } else {
      const classList = root.classList;
      const siteLight = classList.contains('light') || classList.contains('theme-light') || root.getAttribute('data-theme') === 'light';
      forceLight = siteLight;
    }
    root.classList.toggle(LIGHT_CLASS, forceLight);
  }

  function showBg() {
    if (!document.getElementById(ID)) {
      const node = makeBgNode();
      const attach = () => {
        document.body.prepend(node);
        ensureAppOnTop();
        applyCustomStyles();
        updateBackgroundImage();
      };
      if (document.body) {
        attach();
      } else {
        document.addEventListener('DOMContentLoaded', attach, { once: true });
      }
    } else {
      applyCustomStyles();
      updateBackgroundImage();
    }
  }

  function hideBg() {
    const node = document.getElementById(ID);
    if (node) node.remove();
  }

  function applyAllSettings() {
    const show = shouldShow();
    if (show) {
      showBg();
    } else {
      hideBg();
    }

    manageQuickSettingsUI(show);
    applyRootFlags(show);
    applyCustomStyles();
    updateBackgroundImage();
    manageUsageLimitNotices();
    manageUpgradePromos();
    manageImaginePromo();
  }

  function startObservers() {
    if (observersStarted) return;
    if (!document.body) {
      if (!observersInitScheduled) {
        observersInitScheduled = true;
        document.addEventListener('DOMContentLoaded', () => {
          observersInitScheduled = false;
          startObservers();
        }, { once: true });
      }
      return;
    }
    observersStarted = true;

    window.addEventListener('focus', applyAllSettings, { passive: true });

    let lastUrl = location.href;
    const checkUrl = () => {
      if (location.href === lastUrl) return;
      lastUrl = location.href;
      applyAllSettings();
    };

    window.addEventListener('popstate', checkUrl, { passive: true });

    const originalPushState = history.pushState;
    history.pushState = function pushState(...args) {
      originalPushState.apply(this, args);
      setTimeout(checkUrl, 0);
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function replaceState(...args) {
      originalReplaceState.apply(this, args);
      setTimeout(checkUrl, 0);
    };

    const domObserver = new MutationObserver(() => {
      manageUsageLimitNotices();
      manageUpgradePromos();
      manageImaginePromo();
    });
    domObserver.observe(document.body, { childList: true, subtree: true });

    const themeObserver = new MutationObserver(() => {
      if (settings.theme === 'auto') {
        applyRootFlags(shouldShow());
      }
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'data-theme'] });
  }

  if (chrome?.storage?.sync) {
    chrome.storage.sync.get(DEFAULTS, (res) => {
      if (chrome.runtime?.lastError) {
        settings = { ...DEFAULTS };
      } else {
        settings = { ...DEFAULTS, ...res };
      }
      applyAllSettings();
      startObservers();
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync') {
        let needsApply = false;
        Object.keys(changes).forEach((key) => {
          if (key in settings) {
            settings[key] = changes[key].newValue;
            needsApply = true;
          }
        });
        if (needsApply) {
          applyAllSettings();
          renderQuickSettingsState();
        }
      } else if (area === 'local' && changes[LOCAL_BG_KEY]) {
        updateBackgroundImage();
      }
    });
  } else {
    applyAllSettings();
    startObservers();
  }
})();





