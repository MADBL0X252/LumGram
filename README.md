# LumGram

### Your Instagram, your style.

LumGram is a browser extension that customizes Instagram Web with themes, local backgrounds, adjustable opacity, and fonts—with separate appearance settings for the website, navigation bar, and individual chats.

**Current version:** 1.3.3  
**Developed by:** MADBLOX252

## How to install:
 Download the zip
<img width="511" height="452" alt="{12F6004C-47F1-4C0F-B595-C745DC50BD7E}" src="https://github.com/user-attachments/assets/36bbac13-0cdb-4dc9-b13a-8743a190750d" />

Click on code, Download zip, and Extract it's contents

<img width="636" height="239" alt="{A998725B-566C-4D1E-BA73-41E3C86181EA}" src="https://github.com/user-attachments/assets/fd06fdf3-b7d8-4831-af21-b29e1b31b4ef" />

Save it to a location in where you won't delete it (Documents)
Open Chrome, and click on manage extentions
<img width="348" height="584" alt="image (1)" src="https://github.com/user-attachments/assets/c17b365b-6567-44c2-a703-75463b76fc71" />

On top, turn on developer mode, and load unpacked.

<img width="1365" height="198" alt="{31E5942D-8D11-4C37-845F-C3433EEDFC4C}" src="https://github.com/user-attachments/assets/f7cdfad3-0c1f-4efb-b743-f756170fdd9b" />

Select the 'LumGram' Folder, pin the extention, for easier use!
Now enjoy instagram web!





---

## ✨ Features

### Three appearance destinations

| Destination | What it controls |
|---|---|
| **Overall / site** | Shared appearance for Home, Feed, Explore, Reels surroundings, Profiles, Notifications, Create, and the Direct inbox |
| **Navigation bar** | Independent background and opacity for the desktop dock and responsive bottom bar |
| **Individual chats** | Separately saved backgrounds, themes, opacity, and fonts for each customized conversation |

Chats without a saved appearance inherit the overall settings. The inbox listing your users and groups always follows the overall appearance—not the selected chat.

### Themes and personal presets

- **71 built-in palettes**
- Searchable theme library
- Create, edit, save, apply, and delete personal presets
- Custom gradient colors, direction, and accent
- Optional background-image and adjustment snapshots
- Dark and light interface modes

### Custom backgrounds

Choose a theme, solid color, or image for each appearance destination.

Image adjustments include:

- Fill, fit, and stretch
- Zoom and positioning
- Image opacity
- Blur
- Brightness, contrast, and saturation
- Canvas color
- Separate background tint

Images are processed locally. PNG, JPEG, WebP, and GIF uploads are supported; GIFs are converted to still images.

### Opacity controls

- **Site and chats:** 0–100% panel-tint opacity
- **Navigation:** independent 0–95% background opacity
- Optional advanced controls for eight site/chat surface groups

Navigation opacity affects only its background—not its icons or text. Transparent navigation naturally reveals the page behind it, but its saved settings remain independent.

### Fonts

Eight locally bundled font families:

- Inter
- Roboto
- Nunito
- Montserrat
- Outfit
- Source Sans 3
- Lora
- JetBrains Mono

You can also enter the name of a font installed on your device. Optional font discovery depends on browser support and permission.

### Subtle animations

- Small navigation hover movement
- Short dialog fades
- Search-focus transitions
- Dashboard transitions

Animations have a global toggle and respect reduced-motion preferences. LumGram does not add message-arrival or video animations.

---

## 🛡️ What stays native

LumGram aims to preserve Instagram’s content and interactions:

- Notes colors and typography
- Rounded message-bubble fills
- Reactions and native controls
- Photos, videos, avatars, and Story rings
- Reels playback and overlaid media controls
- Inbox row hover and selection states
- Unread and presence indicators

Dedicated Stories and authentication pages remain unmodified.

---

## 📦 Installation

### Chrome / Edge — Load unpacked

1. Download and extract the extension ZIP.
2. Open your browser’s extension manager:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode**.
4. Select **Load unpacked**.
5. Choose the **LumGram** folder containing `manifest.json`.
6. Refresh Instagram.
7. Open LumGram from your browser toolbar.

> Opening `dashboard.html` directly is only a dashboard preview. It does not install the extension or apply styling to Instagram.

### Updating an existing installation

To preserve your saved appearances:

1. Replace **all files** inside your original installed LumGram folder with the new release files.
2. Keep that folder’s original location.
3. Click **Reload** on LumGram’s extension card.
4. Refresh **every open Instagram tab**.
5. Confirm the new version in the popup.

**Do not uninstall the extension or clear its storage.** Doing so deletes its locally saved settings.

Keep only one LumGram copy enabled.

---

## 🎨 Getting started

### Customize the website

1. Open the LumGram popup.
2. Select **Overall / site appearance** under **Appearance destination**.
3. Choose a theme, solid color, or custom image.
4. Adjust the opacity and other appearance controls.

The users/groups inbox panel follows these settings too.

### Customize navigation

1. Select **Navigation bar**.
2. Choose its background.
3. Adjust **Navigation background opacity**.

The default navigation background is `#18181b` at **55% opacity**.

### Customize a chat

1. Open a Direct conversation on Instagram.
2. Open LumGram and select **Customize current chat**.
3. Alternatively, use **Add a chat by link**.
4. Choose that conversation’s appearance.

Each customized chat saves independently. Removing its saved appearance restores inheritance from the overall settings.

---

## 🔍 Understanding opacity

### Site and chat panel opacity

This controls the tint covering the selected background:

- **0%:** reveals the background image or color
- **100%:** covers it with an opaque panel tint

Advanced individual-panel mode overrides the master slider.

### Navigation opacity

This controls the transparency of the navigation background itself:

- **0%:** clear
- **95%:** nearly opaque

Icons and text remain fully visible.

### Image opacity and background tint

These are separate image adjustments—not substitutes for panel or navigation opacity.

---

## 🆕 Latest update — 1.3.3

### Message-outline repair

The remaining black rectangles around messages were traced to Instagram’s decorative outline:

    outline: 10px solid var(--mwp-message-row-background);

LumGram now makes that specific message-outline mask transparent instead of treating it as a background.

This repair preserves:

- Native rounded bubble fills and colors
- Keyboard-focus outlines
- Unrelated outlines
- Notes styling
- Existing background settings

### Recent improvements

- **1.3.2:** Direct inbox explicitly follows the overall background and opacity; inbox search no longer inherits an individual chat’s appearance.
- **1.3.1:** Expanded message-wrapper and pseudo-element cleanup.
- **1.3.0:** Independent site, navigation, and per-chat background controls, plus search-label and message-editor fixes.

---

## 🔒 Privacy and local storage

LumGram’s settings, uploaded backgrounds, and personal presets are stored locally in your browser profile.

- No cloud sync
- No remote analytics
- No uploaded background images
- No Instagram API calls introduced by the extension
- Bundled fonts load from the extension itself
- Diagnostics are copied manually and are not sent automatically

The appearance adapter inspects page structure, roles, geometry, and styles. It does not use message text or account credentials to determine styling.

Uninstalling LumGram or clearing extension storage removes saved data.

---

## 🧰 Troubleshooting

### The dashboard opens, but Instagram is unchanged

1. Refresh Instagram after installing or updating.
2. Confirm LumGram is enabled.
3. Check the connection card at the top of the popup.
4. Use **Connect & apply** if needed.
5. Confirm Instagram site access is allowed in your browser’s extension settings.
6. Make sure only one LumGram copy is enabled.

### A background change affects the wrong area

Check **Appearance destination**:

- **Overall / site** controls shared pages and the inbox.
- **Navigation bar** controls the icon dock/bar.
- A **saved chat** controls only that conversation.

Customized chats do not automatically follow later overall appearance changes.

### The background image is hidden

Lower the relevant site/chat panel opacity. At **100%**, the panel tint intentionally covers the image.

### A panel is missed or looks incorrect

Use **Rescan page** under troubleshooting.

When reporting an issue, include:

- LumGram version
- Browser and version
- The affected page or area
- Steps to reproduce
- A screenshot with private information hidden
- Optional copied diagnostics

**Do not share passwords, cookies, session tokens, or private conversation content.**

---

## ⌨️ Keyboard shortcuts

| Shortcut | Action |
|---|---|
| `Alt + Shift + I` | Open LumGram |
| `Alt + Shift + L` | Toggle LumGram |

Shortcuts can be reassigned in your browser’s extension shortcut settings.

---

## 🌐 Compatibility and limitations

LumGram is designed for **Instagram Web** using a Manifest V3 extension.

- Tested in Chromium with the extension loaded unpacked
- Installation instructions provided for Chrome and Edge
- Not intended for the Instagram mobile app
- Firefox and Safari are not validated

Instagram regularly changes its markup and serves different layouts. Surface detection is adaptive, but compatibility with every layout cannot be guaranteed.

Automated checks use controlled Instagram-like pages and real extension APIs. They are **not a substitute for verification on every live, signed-in Instagram layout**.

See `TESTING.md` for validation details.

---

## 📚 Documentation and attribution

- `TESTING.md` — validation coverage and limitations
- `FONTS.md` — bundled font information
- `ATTRIBUTION.txt` — attribution notices
- `assets/fonts/*-OFL.txt` — bundled font licenses

LumGram is a separate Instagram extension adapted from the Lumcord dashboard. Lumcord and LumGram can coexist and keep their settings separately.

LumGram is an independent customization project and is **not affiliated with, endorsed by, or sponsored by Instagram or Meta**.

---

**Developed by: MADBLOX252**
