# Aurora for Grok V1.0.0

Wrap xAI's Grok interface in a soft, glassy aurora background with quick controls to keep the chat canvas calm and clutter-free. Aurora is an independent community project and is not affiliated with xAI.

---

<p align="center">
  <img src="https://github.com/user-attachments/assets/b3236272-b015-4e15-922c-181f810620eb" width="70%">
</p>

<h2 align="center">⚠️ Work in Progress ⚠️</h2>

<p align="center">
This extension is still under active development.<br>
Some features are unfinished and bugs may occur.<br><br>
💡 If you’d like to help this project grow, please report any issues directly on <a href="https://github.com/TG-TG-TG-TG-TG-TG/Aurora-for-Grok/issues">GitHub Issues</a>.<br><br>
🙏 Thanks for supporting us!
</p>


---

## Highlights

- Ambient aurora layer - blurred gradient glow that sits behind Grok without breaking the layout
- Custom backgrounds - presets, direct URLs, or local images and videos with adjustable blur and scaling
- Quick settings button - in-page toggle bubble to flip focus mode, hide promos, and more without leaving Grok
- Focus and layout controls - collapse navigation, limit the effect to new chats, or revert to the legacy composer
- Promo blockers - hide usage limit notices, SuperGrok upgrade panels, and Imagine promos when you need a calmer UI
- Private by design - no network calls, analytics, or remote config; preferences live in Chrome's `storage.sync`

---

## Install (unpacked)

1. Download or `git clone` this repo.
2. Open Chrome (or any Chromium browser) and visit `chrome://extensions`.
3. Enable Developer mode in the top-right corner.
4. Click Load unpacked and select the project folder.
5. Pin Aurora from the puzzle icon so the toolbar button stays handy.
6. Open Grok at `chat.x.ai` and enjoy the aurora glow.

These steps mirror the Chrome "Hello World" tutorial flow at <https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world?hl=en>.

---

## Install from Chrome Web Store (coming soon)

This section will be updated once Aurora for Grok is published on the Chrome Web Store.

---

## Usage

- Toolbar popup - click the Aurora icon to flip focus mode, enable the legacy composer, disable animations, tweak blur, or pick a background preset.
- Custom imagery - paste a direct image or video URL, or upload a local file (stored privately via `chrome.storage.local`).
- Light or dark glass - force light mode, stick to Grok's theme, or pick between "Dimmed" and "Clear" glass appearances.
- Show only when fresh - optionally limit the aurora layer to new conversations so existing threads stay untouched.

---

## Quick Settings Bubble

Aurora adds a floating button inside Grok's UI. Tap it to reveal lightweight switches for:

- Focus mode - hide navigation chrome and shrink headers while you write.
- Hide SuperGrok promos - mute upgrade banners and upsell toasts.
- Hide Imagine promo - remove image-generation marketing panels.
- Hide usage limit notices - silence quota warnings until you need them again.

You can also disable the quick settings bubble entirely from the popup if you prefer a cleaner page.

---

## Custom Background Options

- Built-in presets - default Grok aurora or the ChatGPT-inspired variant.
- Link a URL - point to any hosted image or looping video (MP4 or WebM).
- Upload a file - Aurora stores a base64 copy locally (15 MB max) so nothing ever leaves your machine.
- Tune it - adjust blur radius and image scaling (`cover`, `contain`, `fill`) to match your vibe.

---

## Focused Interface Controls

- Legacy composer - swap Grok's rich editor for a classic `<textarea>` if you prefer minimal typing friction.
- Hide left nav - collapse navigation rails manually or automatically when focus mode is on.
- Disable animations - freeze background motion for performance or motion-sensitivity comfort.

---

## Permissions

```json
"permissions": ["storage"],
"host_permissions": [
  "https://x.ai/*",
  "https://www.x.ai/*",
  "https://chat.x.ai/*",
  "https://grok.com/*",
  "https://www.grok.com/*",
  "https://grok.x.ai/*"
]
```

- `storage` - remember your background, focus, and toggle preferences across devices.
- `host_permissions` - run only on Grok and X.ai domains; Aurora injects CSS and a helper script locally.

No network requests are made by the extension.

---

## How it works (nerdy notes)

- Injects a CSS-driven background layer plus an optional video element behind Grok's root container.
- Listens for URL and DOM mutations so the background stays applied as you move between chats.
- Adds a floating quick settings button that writes to `chrome.storage.sync` and updates instantly.
- Searches for promo or usage copy in Grok's DOM, tagging matches with hide classes instead of deleting nodes.

---

## License

Released under the Aurora-for-Grok Non-Commercial License - personal use, forks, and modifications are welcome, but selling or otherwise monetizing the project requires written permission from TESTtm. See `LICENSE` for the full text.

---

## Credits

Crafted by @test_tm7873 on X. Thanks to everyone who likes their Grok chats just a little more magical.

---
