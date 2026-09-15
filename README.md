# LumGram — Instagram Themes

Version 1.3.3 · Adapted from the latest Lumcord dashboard for Instagram Web.

## Install

1. Extract `LumGram-1.3.3.zip` (or the combined download).
2. Open `chrome://extensions` (or `edge://extensions`).
3. Enable **Developer mode**.
4. Choose **Load unpacked** and select the **LumGram** folder containing `manifest.json`.
5. Refresh Instagram and open LumGram from the browser toolbar.

LumGram is a separate extension. You can keep Lumcord installed: LumGram targets Instagram only, and Lumcord targets Discord only. Their saved settings are separate. Existing Lumcord presets are not automatically transferred.

For later LumGram updates, replace files in this same folder, click **Reload** on the extension card, and refresh Instagram. Do not uninstall the extension if you want to retain its local settings.

## Confirmed message-outline repair in 1.3.3

The user identified the remaining rectangular mask in Instagram’s CSS:

```css
.x1k4qllp { outline: 10px solid var(--mwp-message-row-background); }
```

The previous background-only repairs could not remove this outline. This release recognizes the **10px solid outline plus message-row background token** on presentation/message elements in Direct, without depending on that generated class name.

- Changes only the decorative outline color to transparent. Bubble fills, colors, radii, padding and layout are not changed by this repair.
- Exempts `:focus-visible`, so native keyboard-focus outlines remain visible. Unrelated thin outlines and outlines without the message-row token are not suppressed.
- Handles incoming/outgoing and quoted messages, including quotes inside clickable wrappers. Rescans remain stable and disable restores the original outline.
- Notes, inbox/navigation appearance, media and saved settings are unchanged. Diagnostics include the count of detected message-outline masks, not message contents.

The exact supplied CSS rule fails the new regression on 1.3.2 and passes with this repair. Tests use controlled markup, not a live signed-in account.

## Inbox follows Overall/site in 1.3.2

The Direct users/groups list is explicitly part of **Overall / site appearance**, not the navigation-bar profile or any saved chat profile. This release recognizes Instagram’s `IGDInboxThreadListScrollableAreaPagelet` and its enclosing thread-list landmark, including button-based rows with no thread links or grid role.

- The whole inbox column uses the overall background image/color and the overall **Inbox list & profile header** opacity group. In normal mode this follows the overall master slider.
- Header, tab-strip and virtual-list structural backings no longer hide the overall background. Native row hover/selection, unread/presence indicators, avatars and scrolling remain intact.
- Inbox search is explicitly excluded from chat scope, correcting the `data-lumgram-chat="true"` shown in the supplied markup. It uses the overall composer/input tint group.
- The narrow global navigation dock retains its separate settings. Saved conversations retain theirs. No fourth editing destination or new saved-setting migration is introduced.
- **Notes protection, colors and typography are unchanged.**

Tested against a controlled 1117×837 layout reproducing the supplied semantic structure, nested wrappers, 367.609px inbox, Notes and button-only individual/group rows. Both `/direct/inbox/` and an active customized `/direct/t/…/` were tested. No private account names or image URLs from the supplied HTML are included in the extension or test fixture. Live signed-in verification remains unavailable.

## Message-corner repair in 1.3.1

This release targets the remaining black rectangular corners visible behind rounded message bubbles:

- Bubble recognition no longer requires `role="presentation"` or `aria-roledescription`. It also works inside a detected conversation when padding, fill and rounded corners are on separate nodes.
- Neutral CSS-gradient backings are treated as fills, not as protected image backgrounds. Actual uploaded images, native rounded fills, colored message gradients, reactions and media are retained.
- Empty full-box pseudo layers are recognized with percentage sizing as well as pixel sizing.
- Explicitly identified message-wrapper cleanup does not depend on a second ancestor marker being present. Conversation wallpaper is kept on the conversation surfaces.
- Notes implementation, independent site/navigation/chat settings, search/composer controls and fonts remain unchanged.

A regression fixture reproducing black gradient corners failed on 1.3.0 and passes on 1.3.1. Browser regressions also passed; this is not confirmation against the signed-in DOM in the screenshot. Update in place and refresh Instagram tabs to replace the old page script.

## Independent backgrounds in 1.3.0

Choose **Appearance destination**, then use the always-visible **Background for this destination** card:

| Destination | Background | Opacity |
|---|---|---|
| **Overall / site appearance** | Its own selected theme, solid color, or local image | Its own 0–100% panel-tint slider; optional eight-group controls below |
| **Navigation bar** | Its own selected theme, solid color, or local image | Its own 0–95% background-layer slider; icons and text never fade |
| **Each saved chat** | Its own selected theme, solid color, or local image | Its own 0–100% panel-tint slider; optional per-panel controls |

- The navigation destination covers both the narrow desktop dock and responsive bottom icon bar. Its default is **#18181b at 55%**, independent of the site theme. Its opacity stays below fully opaque to keep it translucent. Transparent navigation naturally reveals the page behind it; changing that page does not replace navigation's saved color, image, or slider value.
- Choose **Custom image**, then upload/adjust the image in **Custom background** below. Images, adjustments, and panel values are saved to the selected destination, not copied into the others.
- Use **Customize current chat**, or **Add a chat by link**, to create a saved chat appearance. Uncustomized chats still inherit the overall appearance. Changing one saved chat does not change other saved chats.
- The inbox list, Home, Feed, Explore, Reels surroundings, Notifications, Create and Profiles share the overall appearance. Navigation has its own settings. The old “Navigation sidebar” advanced group is now **Headers & structural rails** and no longer controls the navigation background.
- The global enable switch, animation preference, icon choice and personal-preset library remain shared. Fonts still follow the site on navigation until a navigation-specific font is saved.
- Existing site/chat settings and personal presets are retained; no storage reset or new permission is required. Update the original installed folder, reload the extension, and refresh every Instagram tab.

### Direct/search fixes included

- Preserve the actual padded, rounded native message bubble while clearing surrounding rectangular backings and empty whole-box pseudo layers. Native reactions and media stay native, including small inline emoji within text bubbles.
- Clear nested search **LABEL** fills and deep search wrappers, leaving one tinted outer shell rather than overlapping backgrounds.
- The tiny Lexical `contenteditable` message editor is explicitly transparent, not a fixed wallpaper panel. Composer/search backgrounds use one tint layer instead of a second wallpaper rectangle.
- **Notes protection, native colors and native typography are unchanged from 1.2.2.**

Validation used real Chromium extension APIs against controlled layouts reproducing the supplied DOM shapes, including a 400×592 viewport with a 50px fixed bottom bar. This is not signed-in live Instagram confirmation; see TESTING.md.

## Direct message and Notes safety in 1.2.2 (retained)

Version 1.2.2 replaced the previous shallow bubble-wrapper rule and expands Notes protection beyond the inbox row:

- Conversation detection follows deeper composer wrappers, including `display: contents` containers, without requiring the conversation to be a semantic `<main>` or the inbox to be a grid.
- The conversation column and message pane receive the appearance. Nested message content is no longer promoted to an appearance panel simply because it is large. Small and deeply nested neutral rectangular backings become transparent, while actual rounded/clipped or colored bubble surfaces retain native styling.
- Unknown compact Direct cards are left alone rather than being painted as generic panels.
- Short Notes rows with overlapping bubbles are detected independently of inbox roles. Note-like floating avatar cards/popups are also protected, including reply inputs and placeholders.
- **Notes retain native typography as well as colors.** They are excluded from LumGram font replacement and added navigation-hover motion, to avoid introducing label wrapping or movement. Normal Instagram interface and chat typography remains customizable.
- Mutation rescans are throttled instead of indefinitely postponed by a stream of page changes.
- Copied diagnostics now include counts of detected chat surfaces, protected Notes regions, and cleared message wrappers. No message content or account names are included.

Validation covers a structural test with seven nested message backings, tiny spans, a 14-wrapper composer, a short Notes row without inbox semantics, and a dynamically inserted Notes popup without a dialog role. Native popup/bubble/input colors, fonts, borders and shadows were compared with the extension disabled. These are controlled tests, not a live DOM inspection of the supplied screenshot.

## Activation repair and diagnostics in 1.2.1

The dashboard loading does not prove that its Instagram page script is attached. This update makes that distinction visible at the **top** of the dashboard.

- **Automatic connection status** checks the page-script version, activation state, actual stylesheet application, detected panels, and scanning errors. It does not equate a responding script with working styling.
- **Connect & apply** explicitly enables LumGram and attaches a missing content script to the selected Instagram tab. Existing global/chat appearances, images, presets, and fonts are preserved. Repeated attachment is guarded against duplicate runtimes.
- The **full-tab extension dashboard** now locates an Instagram tab instead of trying to message itself. A selector appears when multiple Instagram tabs are available; the current-chat shortcut follows that choice.
- Old or unresponsive page-script remnants require **Reload Instagram**, rather than adding a second script on top. Reloading asks for confirmation because it may discard unsent text or unfinished Instagram edits.
- **Troubleshooting → Copy diagnostics** reports browser/version, broad route category, script/style status, panel counts/opacity values, and errors. It does not include messages, profile names, conversation links/IDs, images, or stored preset contents. Copying is manual; nothing is sent automatically.
- A saved background that cannot decode or load now falls back to its palette instead of aborting all styling. The original saved image is not deleted.
- Standalone HTML previews explicitly say **Preview only**; they cannot style Instagram.

### Update and site access

Copy **all** files from this release into your original installed LumGram folder, including `connection.js` and `connection-dashboard.js`. Reload the extension in `chrome://extensions` / `edge://extensions`, allow Instagram site access if requested, and refresh Instagram tabs. Confirm **v1.3.3** at the top of the popup. Keep only one LumGram copy enabled. Do not uninstall or clear its storage if you want to retain settings.

This build adds `scripting`, `activeTab`, and explicit host permissions limited to `https://instagram.com/*` and `https://www.instagram.com/*`. They allow the user-initiated repair button to attach the packaged page script and target Instagram tabs. It does not request the broad `tabs` permission or an all-websites host grant; the repair code rejects non-Instagram URLs. `activeTab` is the browser’s temporary access grant when you invoke the extension. Automatic checks only inspect connection status; they do not inject/reload a page or turn LumGram on.

If the status is Connected but changes are not visible, check **Appearance destination**: a customized Direct chat keeps its independent saved appearance. Click **Customize current chat** to edit that chat. At 100% panel opacity, that panel’s tint intentionally hides the image/gradient underneath; lower the relevant opacity to reveal it.

The activation recovery paths were tested using the real unpacked extension APIs on controlled Instagram-like pages. The specific cause in a user's browser cannot be confirmed without its connection report; live Instagram layout coverage remains best-effort.

## Fixes and motion in 1.2.0

- **Message rectangles:** only conversation panes receive the theme/background. Native message bubbles, including tall rounded messages, are no longer treated as small background panels. Neutral square wrappers around rounded bubbles are cleared instead of being filled with wallpaper; colored bubbles and reaction controls retain their native styling.
- **Search fields:** compact search controls use a single rounded background. Nested field wrappers and the input itself are transparent, avoiding overlapping filled shapes. Native search/clear actions and input layout remain intact; the outer shell provides the focus indicator.
- **Notes colors:** detected Notes trays are excluded from panel painting. Their native color variables are preserved, including individually colored Notes, tails, and shadows. Changing the LumGram palette or light/dark appearance does not recolor those Notes. The language-independent fallback recognizes horizontal avatar trays in the Direct inbox.
- **Reels is now included:** `/reels/` and `/reel/.../` use the shared site-wide appearance for the page canvas, headings, and surrounding interface; navigation now uses its separate 1.3.0 settings. Video stages and overlaid captions/controls retain native colors. No video filters, playback changes, transforms, or media fades are introduced.
- **Subtle animations:** the Essentials card has a site-wide switch, enabled by default. It adds small navigation hover movement, short dialog fades, search-focus transitions, and dashboard accordion/preset motion. Message arrivals and videos are not animated. The switch persists independently of chat appearances, and system/browser reduced-motion preferences disable the added motion.

These repairs were tested on controlled layouts inspired by the supplied screenshot, not a live signed-in Instagram account. Surface recognition remains best-effort across Instagram layouts.

## Site-wide and per-chat appearances (introduced in 1.1.0)

The application is now named **LumGram**.

At the top of the dashboard, **Appearance destination** selects where edits are saved:

- **Overall / site appearance** is one shared configuration for Home/Dashboard, Feed, Explore, Reels, Notifications, Create, and Profiles. The inbox list and dialogs also use it. Navigation uses its separate profile. Chats without a saved override inherit it.
- **Customize current chat** detects the `/direct/t/<thread-id>/` conversation in the active Instagram tab. It creates an independent copy of the current site appearance for that thread. Open the toolbar popup while that conversation is active.
- Alternatively, expand **Add a chat by link**, paste its Instagram Direct conversation URL (or numeric thread ID), and select **Create chat appearance**.
- Pick any saved chat from the destination dropdown to edit it, even if a different chat is open. Changes auto-save only to the selected thread. **Save chat settings** also saves its optional private label.
- A chat profile remembers its theme, custom image, opacity, image adjustments, dark/light mode, and font selection. It applies automatically when that thread opens, including SPA navigation and after a page reload.
- The navigation/sidebar and inbox retain site-wide styling. Create/notification/menu dialogs remain site-wide even when mounted inside a chat subtree.
- **Use site-wide look** removes only the selected chat's override. Other chat profiles and global settings remain intact.

The Active switch, subtle-animation switch, and navigation-mark choice are always global. The named theme-preset library is shared, but applying a preset changes only the selected appearance destination.

No contact names or message text are extracted. The conversation ID comes from the page URL; private labels are entered by you and stay in local extension storage.

## Fonts and typography

**Fonts & typography** contains eight real bundled font families: Inter, Roboto, Nunito, Montserrat, Outfit, Source Sans 3, Lora, and JetBrains Mono. Their variable TTF files and licenses are included in the extension, so no Google Fonts/CDN request is made at runtime.

- Choose **Original / site font** to retain native typography.
- Choose a bundled family to change interface text, headings, messages, buttons, text inputs, and placeholders. The dashboard itself reflects your choice. Notes are intentionally exempt and keep their native typography.
- Choose **A font on this device…**, then enter the exact installed family name, such as Arial, Aptos, or DejaVu Sans.
- **List device fonts** uses the browser's optional Local Font Access API after a user click and any permission prompt. Some browser versions or popup contexts do not expose it; manual family-name entry still works. A missing family falls back to the system font.
- Native sizes and weights are preserved. Fonts do not rewrite text embedded in photos/videos or replace SVG/icon artwork. Stories and authentication routes remain excluded. Reels interface text now uses the shared font.
- In site-wide mode, the font applies to all shared areas. In a saved-chat scope, it applies only to that conversation and its composer. Font choices also save with personal theme presets, whether or not an image is included.

See `assets/fonts/*-OFL.txt` and `FONTS.md` for licenses and sources.

## Included

- Neutral translucent dashboard with subtle blur and white borders.
- **71 built-in palettes:** 50 newer palettes and 21 adapted classics.
- Searchable presets and an illustrative preview.
- Create, edit, save, apply, and delete personal gradient presets.
- Save a custom image and its adjustments inside a personal preset.
- Dark/light interface colors.
- Custom backgrounds: fill/fit/stretch, zoom, positioning, image opacity, blur, brightness, contrast, saturation, canvas color, and separate background tint.
- Overall and individual panel-opacity controls, available for both theme palettes and custom images.
- Native Instagram logo or 19 original camera-mark alternatives where the navigation logo is detectable.
- Connection check and manual rescan controls.
- Footer credit: **Developed by: MADBLOX252**.
- No support section, patch feed, announcement banner, notification system, donation links, or background network polling.

## Instagram coverage

The adapter targets the normal website shell, navigation sidebar, feed/post containers, profile headers, Explore/search surfaces, Direct inbox/conversations/composer, and dialogs/popovers.

It uses semantic roles, links, layout geometry, and neutral background colors rather than copying Discord selectors or assuming Instagram has Discord's gradient variables. It rescans dynamically added content and detects single-page navigation.

**Coverage is best-effort, not a guarantee that every Instagram layout is recognized.** Instagram serves different layouts and changes its markup frequently. A signed-in Instagram session could not be accessed during development; the live public page returned an access/rate-limit response. Testing used controlled Instagram-like layouts with real browser extension APIs, not a logged-in Instagram account.

### What intentionally stays native

- Photos, videos, avatars, Story rings, and their immediate media wrappers are not blurred, faded, recolored, or replaced.
- Colored/gradient message bubbles, native button states, and media overlays are preserved rather than indiscriminately painted.
- Dedicated Stories routes remain native. Reels page surroundings are themed, while video stages, media colors, and playback controls remain native.
- Sign-in, sign-up, password, authentication challenge, and OAuth pages are excluded.
- Text, avatars, and controls do not fade when panel opacity changes; only detected backgrounds change.

If a particular Instagram panel remains unchanged, keep Instagram open, open the LumGram popup, and click **Rescan page**. If that does not help, a screenshot of the affected view will help refine the surface detection.

## Opacity controls

The top background card exposes the selected destination’s master slider. Open **Custom background** for advanced panel controls, even if you use a theme or solid color rather than an uploaded image. Navigation has one separate background-only slider, not the eight-group controls.

**Overall panel opacity** sets the same tint opacity on all detected surface groups belonging to the selected site/chat appearance, excluding navigation:

- 0%: the background image/gradient is fully visible.
- 100%: the surface tint is fully opaque.

**Individual panel opacity** overrides the overall slider. That slider is disabled while individual mode is enabled. Turn individual mode off to adjust everything together again. Individual values are retained.

The eight surface groups are:

| Control | Intended surfaces |
|---|---|
| Direct conversation | Conversation pane and neutral message-list containers |
| Message composer & inputs | Message composer and search shells; inner editable/text fields stay transparent |
| Feed, Reels & post cards | Main feed, Reels page shell, and article/post containers |
| Headers & structural rails | Standard headers and non-navigation structural surfaces |
| Explore & search | Explore main content and search regions |
| Inbox list & profile header | Direct conversation list, profile headers, complementary panes |
| Dialogs & popovers | Detected dialogs, menus, and popovers |
| Page canvas | Body and otherwise unclassified neutral app containers |

Search controls are painted once at their compact outer shell using the composer/inputs group; their inner fields remain transparent. Notes and message bubbles are not opacity panels. Other nested surfaces share their closest detected group. A composite area can contain multiple groups—for example, a search panel contains an input. Per-panel transparency is not the same as image opacity or background tint.

**Background tint opacity** only affects an uploaded background image. To see an unmodified image, set tint to 0%, image opacity/brightness/contrast/saturation to 100%, blur to 0, and panel opacity to 0%.

## Personal presets

1. Choose **Create preset**, or select a built-in and choose **Edit a copy**.
2. Name it, choose three colors, linear/radial layout, angle, and accent.
3. If desired, configure a background first and check **Include current background and its adjustments**.
4. Click **Save & apply**.

Built-ins are not overwritten. Select a personal preset to edit or delete it. Accent is used for mapped input focus outlines/carets; Instagram's button and reaction colors remain native.

Saved images and settings are local to this browser profile in `chrome.storage.local`. Nothing is uploaded or cloud-synced. Uninstalling the extension or clearing its storage deletes the saved data.

Images up to 15 MB are accepted. They are resized locally to at most 2560 pixels on the longest side; GIFs become still images. Background compositing is capped at 1920 pixels on the longest side for responsiveness.

## Shortcuts

- **Alt + Shift + I:** open LumGram.
- **Alt + Shift + L:** toggle LumGram.

These differ from Lumcord's shortcuts so both can coexist. Reassign them in the browser's extension shortcut settings if another application uses them.

## Connection check

The connection card is at the top of the dashboard. It works in both the toolbar popup and the installed extension’s full-tab dashboard. **Check connection** selects an Instagram tab and verifies script/style status. **Connect & apply** repairs a missing page connection; **Troubleshooting → Rescan page** requests fresh layout mapping.

If no Instagram tab is found, open `https://www.instagram.com/` in the same browser/profile and allow site access. A dashboard HTML file opened outside the installed extension is only a separate preview.

## Standalone preview

`dashboard.html` also works in a normal browser tab. That preview uses its own localStorage and does not modify Instagram. It is separate from the installed extension's settings.

The dashboard's glass effect blurs its own backdrop. Browser extension popups cannot see through to or blur the Instagram tab or desktop underneath the popup.

## Source files

- `dashboard.html`, `dashboard.js`, `style.css`: dashboard and local settings UI.
- `themes.js`: portable palettes and preset validation.
- `scope-model.js`, `scope-store.js`: per-chat settings and dashboard write routing.
- `font-manager.js`: shared font registry, local font controls, and typography CSS.
- `background-image.js`: local image compositor.
- `panel-opacity.js`: shared panel calculations.
- `instagram-adapter.js`: adaptive surface detection and reversible DOM annotations.
- `main.js`: Instagram styling, SPA route handling, and extension messaging.
- `background.js`: keyboard toggle and restricted dashboard connection-message handler.
- `connection.js`: Instagram-only tab selection, status checks and manual script attachment.
- `connection-dashboard.js`: visible status, repair controls and copyable diagnostics.
- `manifest.json`: Instagram-only site access and extension configuration.

The extension does not call Instagram APIs, send messages, modify account data, fetch remote styles/fonts, or transmit page content. The adapter examines structure, roles, dimensions, and computed colors; it does not extract post/message text.

See `ATTRIBUTION.txt` for the original project's attribution and rights notice. LumGram is an independent customization, not affiliated with Instagram, Meta, or Discord.
