/* LumGram: Instagram-only appearance controller. No network requests or account
   actions. Content, layout classes, inline styles and event handlers stay intact. */
(() => {
  "use strict";
  const runtimeVersion = chrome.runtime.getManifest().version;
  if (globalThis.__lumgramRuntime?.version === runtimeVersion) {
    globalThis.__lumgramRuntime.refresh();
    return;
  }
  globalThis.__lumgramRuntime?.dispose();
  const disposers = [];
  function listen(target, name, handler) {
    target.addEventListener(name, handler);
    disposers.push(() => target.removeEventListener(name, handler));
  }
  function watch(event, handler) {
    event.addListener(handler);
    disposers.push(() => event.removeListener(handler));
  }
  let phase = "starting",
    lastError = "",
    warning = "";
  const safeError = (error) =>
    String(error?.message || error)
      .replace(/data:\S+/g, "[image]")
      .replace(/https?:\/\/\S+/g, "[page URL]")
      .slice(0, 240);
  async function timeout(promise, ms) {
    let timer;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Background image loading timed out.")),
            ms,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  const L = globalThis.LumGram,
    root = document.documentElement,
    adapter = L.createInstagramAdapter();
  let state = { ...L.defaults },
    revision = 0,
    applyTimer,
    scanTimer,
    routeTimer,
    imageCache = new Map();
  let active = false,
    observer,
    lastPath = location.pathname;
  const rootAttrs = [
    "data-lumgram-active",
    "data-lumgram-mode",
    "data-lumgram-motion",
  ];
  const originalAttrs = Object.fromEntries(
    rootAttrs.map((k) => [k, root.getAttribute(k)]),
  );
  function setRoot(name, value) {
    if (root.getAttribute(name) !== value) root.setAttribute(name, value);
  }
  function enabled() {
    return ["1", 1, true].includes(state.instagram_enable);
  }
  function paused() {
    return ["authentication", "media viewer"].includes(adapter.route());
  }
  function selected(settings = state) {
    const builtin = L.builtins.find(
      (t) => t.id === settings.instagram_theme_id,
    );
    if (builtin) return builtin;
    const custom = (
      Array.isArray(settings.lumgram_presets) ? settings.lumgram_presets : []
    ).find((t) => t?.id === settings.instagram_theme_id);
    return custom ? L.normalize({ ...custom, css: undefined }) : L.builtins[21];
  }
  function remove() {
    active = false;
    clearTimeout(scanTimer);
    scanTimer = null;
    observer?.disconnect();
    adapter.clear();
    document.getElementById("lumgram-style")?.remove();
    for (const k of rootAttrs)
      originalAttrs[k] === null
        ? root.removeAttribute(k)
        : root.setAttribute(k, originalAttrs[k]);
  }
  function scheduleScan() {
    if (!active) return;
    if (scanTimer) return;
    scanTimer = setTimeout(() => {
      scanTimer = null;
      if (!active) return;
      adapter.scan();
      adapter.logo(state.instagram_icon_id);
    }, 180);
  }
  function observe() {
    if (observer) return;
    observer = new MutationObserver((records) => {
      if (!active) return;
      // Only structural/style mutations matter. Our data attributes aren't observed.
      if (records.some((r) => r.target?.id !== "lumgram-style")) scheduleScan();
    });
  }
  function vars(dark, settings = state) {
    // Instagram's native --ig-* values use comma-separated RGB components.
    // Keep those valid; transparency is applied to mapped surfaces, not to tokens
    // or element opacity (which would also fade images/text).
    const fg = dark ? "245,245,245" : "26,26,29",
      muted = dark ? "179,179,187" : "93,93,103";
    const base = dark ? "24,24,27" : "250,250,252",
      elevated = dark ? "40,40,44" : "242,242,245",
      border = dark ? "91,91,98" : "190,190,198";
    return `--ig-primary-background:${base}!important;--ig-secondary-background:${base}!important;
      --ig-elevated-background:${elevated}!important;--ig-highlight-background:${elevated}!important;
      --ig-primary-text:${fg}!important;--ig-secondary-text:${muted}!important;--ig-tertiary-text:${muted}!important;
      --ig-elevated-separator:${border}!important;--ig-separator:${border}!important;
      --lumgram-accent:${L.hex(selected(settings).accent)};
      --primary-text:rgb(${fg})!important;--secondary-text:rgb(${muted})!important;
      --primary-icon:rgb(${fg})!important;--secondary-icon:rgb(${muted})!important;
      --primary-background:rgb(${base})!important;--secondary-background:rgb(${elevated})!important;
      --divider:rgb(${border})!important;--lumgram-text:rgb(${fg});--lumgram-muted:rgb(${muted});
      --lumgram-line:${dark ? "rgba(255,255,255,.2)" : "rgba(0,0,0,.18)"};`;
  }
  async function buildAppearance(settings) {
    const theme = selected(settings),
      dark = settings.instagram_theme_style !== "light";
    const hasImage =
      settings.instagram_use_custom_bg === "1" &&
      L.validImage(settings.instagram_custom_bg);
    const color = L.hex(settings.lumgram_bg_color, "#18181b");
    let source =
      settings.lumgram_bg_mode === "color"
        ? `linear-gradient(${color},${color})`
        : L.gradient(theme);
    if (hasImage) {
      const key = JSON.stringify([
        innerWidth,
        innerHeight,
        ...[
          "instagram_custom_bg",
          "instagram_bg_image_blur",
          "lumgram_bg_fit",
          "lumgram_bg_zoom",
          "lumgram_bg_x",
          "lumgram_bg_y",
          "lumgram_bg_opacity",
          "lumgram_bg_brightness",
          "lumgram_bg_contrast",
          "lumgram_bg_saturation",
          "lumgram_bg_base",
        ].map((k) => settings[k]),
      ]);
      if (!imageCache.has(key)) {
        let rendered;
        try {
          rendered = await timeout(
            L.renderImage({ ...settings }, innerWidth, innerHeight),
            8000,
          );
        } catch (error) {
          warning =
            "A saved background could not load; using its palette. Replace the background image.";
          return {
            source: L.gradient(theme),
            dark,
            panelColor: dark ? "#141418" : "#ffffff",
          };
        }
        imageCache.set(key, `url("${rendered}")`);
        if (imageCache.size > 3)
          imageCache.delete(imageCache.keys().next().value);
      }
      const tint = L.rgba(
        settings.instagram_bg_overlay_color,
        L.clamp(settings.instagram_bg_grad_tint, 0, 100, 20) / 100,
      );
      source = `linear-gradient(${tint},${tint}),${imageCache.get(key)}`;
    }
    const panelColor = hasImage
      ? L.hex(settings.instagram_bg_overlay_color, "#000000")
      : dark
        ? "#141418"
        : "#ffffff";

    return { source, dark, panelColor };
  }
  async function apply() {
    const id = ++revision;
    const renderPath = location.pathname;
    lastPath = renderPath;
    phase = "applying";
    lastError = "";
    warning = "";
    try {
      const raw = await chrome.storage.local.get(null);
      if (id !== revision) return;
      state = { ...L.defaults, ...raw };
      if (!enabled() || paused()) {
        remove();
        phase = enabled() ? "paused" : "disabled";
        return;
      }
      const { source, dark, panelColor } = await buildAppearance(state);
      const chatId = L.chatId();
      const chatProfile = L.profile(raw, chatId);
      const chatState = chatProfile ? L.effective(raw, chatId) : null;
      const chatAppearance = chatState
        ? await buildAppearance(chatState)
        : null;
      const navState = L.navEffective(raw);
      const navAppearance = await buildAppearance(navState);
      if (id !== revision) return;
      if (renderPath !== location.pathname) {
        scheduleApply();
        return;
      }
      let style = document.getElementById("lumgram-style");
      if (!style) {
        style = document.createElement("style");
        style.id = "lumgram-style";
        document.head.append(style);
      }
      const groupRules = Object.keys(L.groups)
        .map(
          (key) =>
            `html[data-lumgram-active] [data-lumgram-surface="${key}"]{background:var(--lumgram-${key}) !important;}`,
        )
        .join("\n");
      const icon = /^icon([1-9]|1[0-9])$/.test(state.instagram_icon_id)
        ? chrome.runtime.getURL(
            `assets/icons/icon-${state.instagram_icon_id.slice(4)}.svg`,
          )
        : "";
      style.textContent = `
        html[data-lumgram-active]{color-scheme:${dark ? "dark" : "light"};background:var(--lumgram-appframe)!important;}
        html[data-lumgram-active],html[data-lumgram-active] body,html[data-lumgram-active] [data-lumgram-surface]{--lumgram-image:${source};${L.panelCSS(state, panelColor)}${vars(dark)}}
        html[data-lumgram-active] body{background:var(--lumgram-appframe)!important;}
        ${groupRules}
        html[data-lumgram-active] [data-lumgram-surface]{color:var(--lumgram-text);border-color:var(--lumgram-line);}
        html[data-lumgram-active] :is(input,textarea,[role="textbox"])[data-lumgram-surface]{color:var(--lumgram-text)!important;caret-color:var(--lumgram-accent);}
        html[data-lumgram-active] :is(input,textarea)[data-lumgram-surface]::placeholder{color:var(--lumgram-muted)!important;}
        html[data-lumgram-active] :is(input,textarea,[role="textbox"])[data-lumgram-surface]:focus-visible{outline:2px solid var(--lumgram-accent);outline-offset:2px;}
        html[data-lumgram-active] svg[data-lumgram-logo]{background-image:url("${icon}")!important;background-size:contain!important;background-position:center!important;background-repeat:no-repeat!important;}
        html[data-lumgram-active] svg[data-lumgram-logo]>*{visibility:hidden!important;}
        html[data-lumgram-active] [data-lumgram-clear="message"]{background:transparent!important;}
        html[data-lumgram-active] [data-lumgram-search="shell"]{border-radius:14px!important;}
        html[data-lumgram-active] :is([data-lumgram-search="shell"],[data-lumgram-compose="true"]){background:var(--lumgram-control-surface)!important;}
        html[data-lumgram-active] [data-lumgram-message-wrapper="true"]{background:transparent!important;}
        /* Hide only the decorative message-row mask, never bubble fills or focus rings. */
        html[data-lumgram-active] [data-lumgram-message-outline="true"]:not(:focus-visible){outline-color:transparent!important;}
        html[data-lumgram-active] [data-lumgram-clear-before="true"]::before,
        html[data-lumgram-active] [data-lumgram-clear-after="true"]::after{background:transparent!important;}
        html[data-lumgram-active] :is([contenteditable="true"],textarea,[role="textbox"])[data-lumgram-control-clear="true"]{background:transparent!important;color:var(--lumgram-text)!important;caret-color:var(--lumgram-accent);}

        html[data-lumgram-active] [data-lumgram-clear="search"]{background:transparent!important;box-shadow:none!important;}
        html[data-lumgram-active] input[data-lumgram-clear="search"]{border-color:transparent!important;outline:none!important;color:var(--lumgram-text)!important;caret-color:var(--lumgram-accent);min-width:0;}
        html[data-lumgram-active] input[data-lumgram-clear="search"]::placeholder{color:var(--lumgram-muted)!important;}
        html[data-lumgram-active] :is([data-lumgram-search="shell"],[data-lumgram-compose="true"]):focus-within{outline:1px solid var(--lumgram-line);outline-offset:2px;}
        @keyframes lumgram-dialog-in{from{opacity:.94}to{opacity:1}}
        @media(prefers-reduced-motion:no-preference){
          html[data-lumgram-active][data-lumgram-motion="true"] [data-lumgram-navigation] :is(a,button,[role="button"]):not([data-lumgram-notes],[data-lumgram-notes] *){transition:translate 140ms ease-out;}
          html[data-lumgram-active][data-lumgram-motion="true"] [data-lumgram-navigation] :is(a,button,[role="button"]):not([data-lumgram-notes],[data-lumgram-notes] *):hover{translate:0 -1px;}
          html[data-lumgram-active][data-lumgram-motion="true"] [data-lumgram-search="shell"]{transition:outline-color 160ms ease-out;}
          html[data-lumgram-active][data-lumgram-motion="true"] [data-lumgram-surface="higher"][role="dialog"]{animation:lumgram-dialog-in 160ms ease-out;}
        }
        /* Never use page-level filters, opacity or blanket * backgrounds: media,
           story rings, reaction colors and native control states stay untouched. */
      `;
      style.textContent += LumFonts.faces((path) =>
        chrome.runtime.getURL(path),
      );
      style.textContent += LumFonts.rules(state, "html[data-lumgram-active]");
      if (chatAppearance) {
        const selector = 'html[data-lumgram-active] [data-lumgram-chat="true"]';
        style.textContent += `${selector}{--lumgram-image:${chatAppearance.source};${L.panelCSS(chatState, chatAppearance.panelColor)}${vars(chatAppearance.dark, chatState)}color-scheme:${chatAppearance.dark ? "dark" : "light"};}`;
        style.textContent += LumFonts.rules(chatState, selector, {
          nativeFallback: true,
        });
      }
      const inboxSelector =
        'html[data-lumgram-active] [data-lumgram-inbox="true"]';
      style.textContent += `${inboxSelector}{--lumgram-image:${source};${L.panelCSS(state, panelColor)}${vars(dark)}background:var(--lumgram-high)!important;color-scheme:${dark ? "dark" : "light"};}
        html[data-lumgram-active] [data-lumgram-inbox-clear="true"]{background:transparent!important;}`;
      style.textContent += LumFonts.rules(state, inboxSelector, {
        nativeFallback: true,
      });
      const navSelector =
        'html[data-lumgram-active] [data-lumgram-navigation="true"]';
      style.textContent += `
        ${navSelector}{--lumgram-navigation-image:${navAppearance.source};--lumgram-navigation-alpha:${navState.lumgram_bg_overlay / 100};${vars(navAppearance.dark, navState)}background:transparent!important;isolation:isolate;border-color:var(--lumgram-line)!important;}
        ${navSelector}[data-lumgram-nav-position="true"]{position:relative!important;}
        ${navSelector}>[data-lumgram-nav-paint]{display:block!important;position:absolute!important;inset:0!important;z-index:-1!important;pointer-events:none!important;background:var(--lumgram-navigation-image)!important;background-size:cover!important;background-position:center!important;background-attachment:scroll!important;opacity:var(--lumgram-navigation-alpha)!important;border-radius:inherit;}
        html[data-lumgram-active] [data-lumgram-nav-clear="true"]{background:transparent!important;}
      `;
      style.textContent += LumFonts.rules(navState, navSelector, {
        nativeFallback: true,
      });
      // Site dialogs (Create / Notifications / menus) stay site-wide even when
      // Instagram mounts them inside a conversation subtree instead of a portal.
      style.textContent += LumFonts.rules(
        state,
        'html[data-lumgram-active] [data-lumgram-surface="higher"]',
        { nativeFallback: true },
      );
      setRoot("data-lumgram-active", "true");
      setRoot("data-lumgram-mode", dark ? "dark" : "light");
      setRoot(
        "data-lumgram-motion",
        state.lumgram_animations === "0" ? "false" : "true",
      );
      active = true;
      observe();
      observer.disconnect();
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: [
          "class",
          "style",
          "role",
          "aria-expanded",
          "data-pagelet",
        ],
      });
      adapter.scan();
      adapter.logo(state.instagram_icon_id);
      phase = "active";
    } catch (error) {
      phase = "error";
      lastError = safeError(error);
      console.warn("LumGram appearance could not be applied.", error);
    }
  }
  function scheduleApply() {
    clearTimeout(applyTimer);
    applyTimer = setTimeout(apply, 100);
  }
  watch(chrome.storage.onChanged, (changes, area) => {
    if (
      area === "local" &&
      Object.keys(changes).some(
        (k) =>
          k.startsWith("instagram_") ||
          k.startsWith("lumgram_") ||
          k.startsWith("lum_font_"),
      )
    )
      scheduleApply();
  });
  function status() {
    const style = document.getElementById("lumgram-style");
    return {
      version: runtimeVersion,
      stylesheetConflict:
        !!style &&
        [
          ...style.textContent.matchAll(/chrome-extension:\/\/([a-p]{32})\//g),
        ].some((m) => m[1] !== chrome.runtime.id),
      phase,
      error: lastError,
      warning,
      enabled: enabled(),
      paused: paused(),
      active,
      cssApplied:
        !!style?.sheet &&
        !style.sheet.disabled &&
        root.hasAttribute("data-lumgram-active") &&
        !!getComputedStyle(root).getPropertyValue("--lumgram-image").trim(),
      canvasPainted:
        !!document.body &&
        getComputedStyle(document.body).backgroundImage !== "none",
      chatId: L.chatId(),
      chatCustomized: !!L.profile(state, L.chatId()),
      navigationCustomized: !!state.lumgram_nav_profile,
      navigationOpacity: L.navEffective(state).lumgram_bg_overlay,
      inboxOpacity: Math.round(L.panelValues(state).high * 100),
      panelOpacity: Object.fromEntries(
        Object.entries(L.panelValues(L.effective(state, L.chatId()))).map(
          ([key, value]) => [key, Math.round(value * 100)],
        ),
      ),
      ...adapter.status(),
    };
  }
  watch(chrome.runtime.onMessage, (message, sender, reply) => {
    if (
      sender.id !== chrome.runtime.id ||
      !["LUMGRAM_RESCAN", "LUMGRAM_STATUS", "LUMGRAM_APPLY"].includes(
        message?.type,
      )
    )
      return;
    if (message.type === "LUMGRAM_APPLY") {
      clearTimeout(applyTimer);
      apply().then(() => reply(status()));
      return true;
    }
    if (message.type === "LUMGRAM_RESCAN" && active) {
      try {
        adapter.scan();
        adapter.logo(state.instagram_icon_id);
      } catch (error) {
        phase = "error";
        lastError = safeError(error);
      }
    }
    reply(status());
  });
  // Isolated content scripts do not patch Instagram's history API. This lightweight
  // path check catches pushState navigation without accessing a single message.
  routeTimer = setInterval(() => {
    if (location.pathname !== lastPath) {
      lastPath = location.pathname;
      scheduleApply();
    }
  }, 750);
  listen(window, "pageshow", (event) => {
    if (event.persisted) {
      clearInterval(routeTimer);
      routeTimer = setInterval(() => {
        if (location.pathname !== lastPath) {
          lastPath = location.pathname;
          scheduleApply();
        }
      }, 750);
      scheduleApply();
    }
  });
  listen(document, "focusout", (event) => {
    if (
      event.target instanceof Element &&
      event.target.hasAttribute("data-lumgram-message-outline")
    )
      scheduleScan();
  });
  listen(window, "popstate", scheduleApply);
  listen(window, "resize", scheduleApply);
  listen(document, "visibilitychange", () => {
    if (!document.hidden && enabled()) {
      if (lastPath !== location.pathname) {
        lastPath = location.pathname;
        scheduleApply();
      } else scheduleScan();
    }
  });
  listen(window, "pagehide", () => {
    clearInterval(routeTimer);
    observer?.disconnect();
  });
  globalThis.__lumgramRuntime = {
    version: runtimeVersion,
    refresh: scheduleApply,
    status,
    dispose() {
      ++revision;
      clearInterval(routeTimer);
      clearTimeout(applyTimer);
      clearTimeout(scanTimer);
      disposers.forEach((fn) => fn());
      remove();
      delete globalThis.__lumgramRuntime;
    },
  };
  apply();
})();
