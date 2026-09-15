# LumGram 1.3.3 validation

Tested with Chromium and LumGram loaded as an unpacked Manifest V3 extension. Test pages were served as intercepted Instagram URLs, so the real content-script registration, isolated extension context, local storage, and runtime APIs were exercised.

## 1.3.3 exact outline regression

- Reproduced `.x1k4qllp { outline: 10px solid var(--mwp-message-row-background); }` with token rgb(24,24,27). The test fails on 1.3.2 because the outline remains black despite background cleanup.
- Incoming/outgoing and clickable quoted-message masks compute transparent outline color after the fix; width remains 10px, and native bubble RGB, radii and padding remain unchanged.
- Keyboard-focused bubble retains its native 3px gold focus outline. An unrelated 2px red outline and a 10px green outline without the row token remain unchanged.
- A Notes bubble carrying that same class/role/rule remains native. Notes popup, tray, reply and outline snapshots compared unchanged.
- Repeated rescans preserve cleanup; disabling restores original 10px rgb(24,24,27) and removes every outline marker.
- Inbox/site ownership, desktop/mobile navigation isolation, Notes, message corners, general opacity/presets, chat/font scopes, Reels/motion and connection/recovery regressions rerun. No JavaScript errors observed.

## 1.3.2 inbox ownership checks

- Reproduced the supplied stable pagelet and enclosing navigation landmark, 367.609px column, nested header/tab/search/scroll wrappers and button-only person/group rows without thread links or grid roles.
- At 1117×837, inbox root paints the overall image with 31% master tint; intermediate structural fills clear. Narrow navigation remains separate.
- Opening a saved chat with a different color, 76% opacity and Lora font leaves inbox/search on overall settings and removes erroneous chat markers from inbox descendants.
- Changing overall to a solid color / 48% updates inbox/search while leaving saved chat and navigation unchanged. Advanced site inbox 19% / inputs 26% also verified.
- Notes snapshots unchanged; presence/unread background colors and radii retained. Native row hover/selection, click handlers, editable search, dynamic list insertion, localized landmark labels and repeated rescans pass.
- Disable restores native fills and removes new markers. Pagelet attribute mutations trigger rescanning. No new permissions or storage migration.
- Existing Notes, message corners, semantic bubbles, navigation, fonts/chat scopes, Reels/motion, overall/advanced opacity and activation/recovery regression checks retained.

## 1.3.1 message-corner regression

- Created a controlled regression that fails on delivered 1.3.0: black neutral-gradient backing behind a native rounded bubble, with padding on a separate child and no presentation/article metadata.
- Verified solid, neutral-gradient and empty 100%-sized pseudo backings clear; native rgb(37,41,46) rounded fill, padding and reactions remain intact.
- Verified no loss of the conversation wallpaper, stable repeated rescans, incomplete article metadata, working reaction clicks and full native restoration on disable.
- Notes popup/tray/reply snapshots compared unchanged. Existing navigation, search/editor, semantic bubbles, Notes, Reels/motion, general opacity/presets, fonts/chat scopes and connection/recovery suites rerun.
- No JavaScript errors observed in these browser flows. The supplied image shows the remaining artifact but does not expose its exact DOM; live signed-in Instagram remains unverified.

## 1.3.0 release checks — passed

- Three dashboard destinations: overall/site, navigation, and saved chats. Theme/solid color/custom image and master opacity available for each; navigation hides irrelevant eight-group controls.
- Navigation defaults independently to #18181b / 55%, even with a site image and different site opacity. Site color/opacity edits leave navigation settings unchanged; navigation image/opacity edits leave site and chat settings unchanged.
- Navigation image, color and 0%, 27%, 42%, 55%, 95% actual background alpha tested. Text and icons remain at opacity 1. Settings survive dashboard and page reloads.
- Desktop dock and 400×592 responsive bottom bar (400×50 at y=542) detected. Sticky/fixed positioning and layout unchanged. Full-size native structural backing cleared, native hover and clicks retained, escaping popover not cleared or clipped. Repeated rescans retain one paint layer; hidden desktop layer is removed after switching to mobile.
- Supplied rounded search LABEL shape and 18px-high Lexical editor reproduced; LABEL is transparent within the tinted shell and editor no longer has a fixed wallpaper gradient.
- Semantic article/presentation bubbles preserve native rgb(37,41,46), 18px radii and 8px/12px padding; same-size rounded backings and empty full-box pseudos clear. Reactions, media, inline emoji, typing, sending and clear-search handlers preserved.
- Notes snapshots unchanged (popup, tray, reply input, colors, native fonts and radii), including subsequent site/chat changes. Notes implementation not broadened for navigation.
- Native styling restored on disable; no added navigation paint remains. No JavaScript errors and no dashboard horizontal overflow at 360/440px.
- Existing Notes, Reels/video/motion, activation/recovery, per-chat/font, and general opacity/preset regression suites rerun. Old navigation-in-site-opacity assertions were replaced with separate navigation checks; all eight remaining site surface groups still tested, using a native header for the structural-rails group.

## Retained regression coverage

- Manifest loads; JavaScript parses; no page JavaScript errors in the test flows.
- Exactly 71 built-in palettes; all generated gradients accepted by the browser.
- Twenty navigation choices (native logo plus nineteen alternative marks).
- Preset search, creation, editing without duplication, and persistence after reload.
- Overall opacity controls available before an image is uploaded; image editing stays disabled until an image is provided.
- Feed, independent navigation, article, profile-header, inbox, conversation, composer, search, and dialog mapping on test layouts.
- Overall 0%, 25%, 60%, and 100% produce matching computed background alphas in all eight site groups (headers/rails, not navigation), in both dark and light modes.
- Individual mode disables overall control; each group can be changed without changing the other groups.
- Image upload, zoom, blur, tint, and saved image/panel snapshots; switching away and restoring a personal preset restores the image/settings.
- Photos, avatars, Story rings, and gradient chat bubbles retain their sources, filters, opacity, and styling.
- Existing click handlers and contenteditable message entry remain functional.
- Instagram-like pushState navigation from feed to Direct to a profile is detected.
- Dynamically inserted dialogs are styled without refreshing.
- Navigation logo changes are reversible; original SVG content is retained.
- Disable removes LumGram styles and annotations; enable reapplies them.
- Stories and authentication routes remain excluded, including same-document navigation. Reels routes are now styled; see the 1.2.0 checks below.
- No Instagram API calls, remote analytics, Discord endpoints, or remote assets are introduced by LumGram.

## Not validated

- A live signed-in Instagram account: the public page returned an access/rate-limit response in this environment.
- Every Instagram A/B layout, localization, screen width, or future release.
- The Instagram mobile app, Firefox, or Safari.

Surface detection is adaptive and best-effort. These are functional browser tests of controlled Instagram-like markup, not proof of compatibility with every live Instagram page.

## Typography / scoped appearance update

- All eight bundled TTF families were actually loaded and decoded in Chromium extension content-script contexts for Instagram and Discord.
- Verified font-family changes on headings, message text, buttons, editable composers, inputs and placeholders; native-font reset and saved-font persistence were tested.
- Manual device-font family entry works with the optional enumeration API unavailable. OS permission dialogs/each operating system’s font enumeration have not been exhaustively validated.
- Personal presets save their typography even without a background-image snapshot.

- Tested two independently saved chat profiles with different fonts, images, themes and opacity values.
- Editing a non-active chat did not alter the active conversation, site-wide settings, navigation or inbox.
- Rapid chat-to-chat SPA navigation and full reload restored the correct profile. A timing regression during rapid navigation was fixed.
- Home/Feed, Explore, Notifications, Create and Profiles all retained one site-wide configuration.
- A Create dialog nested inside a conversation retained site-wide styling/fonts rather than inheriting the chat override.
- Removing one chat profile restored site-wide appearance without deleting another profile.
- All Instagram tests used controlled Instagram-like markup; no signed-in live account was available.

## 1.2.0 repair checks

Chromium with the actual unpacked extension, using intercepted Instagram URLs and screenshot-inspired structural fixtures:

- Nested rectangular message wrappers become transparent; short incoming bubbles, colored/gradient bubbles, and a tall rounded message retain native backgrounds and radii.
- Dynamically inserted message wrappers are processed without replacing click/input handlers or extracting message text.
- A compact multi-layer search control has exactly one painted shell; nested containers/input backgrounds are transparent, focus remains visible, and its native clear button works.
- Notes background/text colors, pseudo-element tails, and shadows match the extension-disabled native baseline. Individually colored Notes retain their local overrides.
- LumGram light/dark and palette changes do not recolor Notes. Changes to the website's own native color variables are picked up instead of freezing an old native palette.
- Added motion is limited to supported interface controls/dialogs and dashboard sections. The persistent off-switch works even from a chat-editing scope, without storing animation state in that chat's profile.
- Emulated reduced-motion disables the added animations/transitions in the website and dashboard.
- Reels SPA navigation applies shared background/font styling to the shell while retaining native video-stage/caption colors. A synthetic canvas-stream video continued playing and its adjacent native action handler remained functional.
- Both `/reels/` and `/reel/.../` are supported. Disable clears all new surface/native-color/search/navigation annotations and styles; re-enable reapplies them. Stories remain excluded.
- Previous font, scoped-chat, preset CRUD, rapid SPA, persistence, and all eight opacity-group regressions still pass, with no page JavaScript errors.

No claim of exhaustive live Instagram compatibility is made: no signed-in account/actual DOM from the supplied screenshot was available.

## 1.2.1 activation and diagnostics

Tested with the actual unpacked extension, Chrome scripting/storage/messaging APIs, and controlled Instagram URL fixtures:

- Disposed the page runtime to reproduce a dashboard with no content-script receiver. The full-tab dashboard detected Missing, and Connect & apply reattached the packaged scripts and restored computed page backgrounds/fonts.
- Saved independent chat settings survived connection repair, re-enable, and page reload unchanged.
- Reconnecting and re-injecting the script list retained one runtime instead of duplicating observers/listeners.
- Old-version responses and stale page annotations prompted a reload instead of automatic duplicate injection. Explicit reload restored the current version.
- Disabling the actual runtime stylesheet produced a Styles not taking effect report; explicit reapply restored it.
- A corrupt saved image no longer aborted all styling: the palette applied with a visible warning and the original saved data remained intact.
- An injected layout-scan failure was caught and displayed in diagnostics. Rescan recovered after removal of the synthetic fault.
- A simulated browser API site-access denial produced actionable permission guidance and removed the example private URL from the copied diagnostic data. Real browser permission prompts/withheld-access UI were not exhaustively tested.
- Multiple Instagram tabs could be selected from an active full-tab dashboard, including updating its current-chat shortcut.
- The connection card remained at the top, with no horizontal overflow at 360px/440px.
- Standalone HTML preview clearly reported Preview only and disabled repair. No-Instagram-tab status was separately verified.
- Previous Notes, search, messages, Reels, animation, font, scope, preset, opacity and SPA regressions passed again.

These tests establish the recovery/diagnostic behavior on controlled pages, not the specific cause of a failure in an uninspected user's browser.

## 1.2.2 deeper Direct / Notes layouts

- Removed semantic main/inbox/grid markers from the fixture and nested the composer inside 14 display-contents wrappers. The conversation and message pane were still detected, without marking the inbox as a chat.
- Seven nested neutral message backings and a tiny span were cleared. The actual small rounded bubble retained its background/radius and the selected conversation font.
- An 80px-high Notes row with bubbles extending above its bounds was protected without a recognized inbox role.
- A Note-like floating card with a large avatar and reply field was inserted inside the conversation, with no dialog/tooltip role. Its background/text colors, fonts, sizes, line heights, border radii/colors, shadows, overflow/filter properties and placeholder style matched the extension-disabled baseline.
- The same popup was removed and inserted again after activation. Detection and native appearance were restored.
- Native Note colors/typography stayed unchanged through LumGram font and light/dark changes. Reply-field editing and native input events still worked.
- An ordinary Create dialog with a small account avatar and caption field retained shared styling rather than being mistaken for a Notes card.
- Disable removed all new Notes/message/native annotations and restored baseline styles.
- Activation recovery, search, Reels, animations, eight fonts, per-chat isolation/persistence, preset CRUD and all eight opacity-group regressions also passed.

The user's actual live DOM was not available; no claim of exhaustive compatibility with every Instagram variant is made.
