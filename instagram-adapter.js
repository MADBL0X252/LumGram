/* Instagram surface adapter. It inspects layout/roles/styles, never post text,
   message contents, cookies, credentials, or Instagram APIs. No page handlers are
   replaced. Obfuscated class names are deliberately not hard-coded. */
(() => {
  "use strict";
  const L = globalThis.LumGram;
  const surfaceAttr = "data-lumgram-surface",
    clearAttr = "data-lumgram-clear",
    logoAttr = "data-lumgram-logo";
  const mediaSelector = 'img,video,canvas,picture,iframe,[role="img"]';
  const interactionSelector =
    'button,[role="button"],a,input,textarea,select,[contenteditable="true"],[role="textbox"]';
  const containers = new Set([
    "DIV",
    "SECTION",
    "ARTICLE",
    "MAIN",
    "ASIDE",
    "NAV",
    "HEADER",
    "FOOTER",
    "FORM",
    "UL",
    "OL",
  ]);
  L.createInstagramAdapter = () => {
    let generation = 0,
      scanError = "",
      regions = new Map(),
      protectedNodes = new Set(),
      lastRoute = "",
      lastScan = 0,
      nativeSerial = 0,
      nativeRoots = new Set(),
      noteRoots = new Set(),
      searchShells = new Set(),
      composerShells = new Set(),
      controlClear = new Set(),
      bubbleRoots = new Set(),
      messageOutlines = new Set(),
      bubbleBackings = new Set(),
      beforeClear = new Set(),
      afterClear = new Set(),
      searchChildren = new Set(),
      navigationRoots = new Set(),
      inboxRoots = new Set(),
      inboxClear = new Set(),
      frame = 0,
      retryTimer = 0,
      running = false,
      pending = false;
    const touched = new Set(),
      original = new WeakMap(),
      neutralCandidates = new WeakSet(),
      nativeIds = new WeakMap(),
      nativeSnapshots = new WeakMap(),
      navigationPaint = new Map(),
      navInterior = new Set();
    function route() {
      const p = location.pathname;
      if (
        /^\/(accounts\/(login|signup|password)|challenge|oauth)(\/|$)/.test(p)
      )
        return "authentication";
      if (/^\/stories(\/|$)/.test(p)) return "media viewer";
      if (/^\/(reels|reel)(\/|$)/.test(p)) return "Reels";
      if (p.startsWith("/direct")) return "Direct";
      if (p.startsWith("/explore")) return "Explore";
      if (p === "/" || p.startsWith("/p/")) return "Feed";
      return "Profile / page";
    }
    function set(el, name, value) {
      if (!original.has(el)) original.set(el, new Map());
      const prior = original.get(el);
      if (!prior.has(name)) prior.set(name, el.getAttribute(name));
      if (value === null) {
        if (el.hasAttribute(name)) el.removeAttribute(name);
      } else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
      touched.add(el);
      if (name === surfaceAttr) {
        let inChat = false;
        if (
          route() === "Direct" &&
          !inboxFor(el) &&
          ["chat", "highest", "lower"].includes(value)
        ) {
          for (
            let node = el;
            node && node !== document.body;
            node = node.parentElement
          ) {
            const group = regions.get(node);
            if (["high", "higher", "low", "lowest"].includes(group)) break;
            if (
              group === "lower" &&
              (node.matches("nav,[role=navigation]") ||
                rect(node).height > innerHeight * 0.45)
            )
              break;
            if (group === "chat") {
              inChat = true;
              break;
            }
          }
        }
        set(el, "data-lumgram-chat", inChat ? "true" : null);
      }
    }
    function restore(el) {
      for (const [name, value] of original.get(el) || [])
        value === null
          ? el.removeAttribute(name)
          : el.setAttribute(name, value);
      original.delete(el);
      touched.delete(el);
    }
    function rect(el) {
      return el.getBoundingClientRect();
    }
    function visible(el) {
      const r = rect(el);
      return r.width > 1 && r.height > 1;
    }
    function protectedElement(el) {
      if (
        el.matches(
          'svg,svg *,img,video,canvas,picture,iframe,[role="img"],input[type="password"]',
        )
      )
        return true;
      for (let p = el; p && p !== document.body; p = p.parentElement)
        if (protectedNodes.has(p)) return true;
      return false;
    }
    function mediaRegions() {
      protectedNodes = new Set();
      nativeRoots = new Set();
      noteRoots = new Set();
      searchShells = new Set();
      composerShells = new Set();
      controlClear = new Set();
      bubbleRoots = new Set();
      messageOutlines = new Set();
      bubbleBackings = new Set();
      beforeClear = new Set();
      afterClear = new Set();
      searchChildren = new Set();
      navigationRoots = new Set();
      inboxRoots = new Set();
      inboxClear = new Set();
      for (const media of document.querySelectorAll(mediaSelector)) {
        protectedNodes.add(media);
        const r = rect(media);
        if (r.width < 50 || r.height < 50) continue;
        let p = media.parentElement;
        for (
          let i = 0;
          p && i < 4 && p !== document.body;
          i++, p = p.parentElement
        ) {
          if (
            p.matches(
              'main,article,[role="main"],nav,[role="navigation"],header',
            )
          )
            break;
          const b = rect(p);
          if (
            Math.abs(b.width - r.width) < 6 &&
            Math.abs(b.height - r.height) < 6
          )
            protectedNodes.add(p);
          else break;
        }
        // Keep the video stage/captions/overlaid controls native, not the page shell.
        if (media.matches("video")) {
          let stage = media;
          for (
            let p = media.parentElement, n = 0;
            p && n < 18 && p !== document.body;
            p = p.parentElement, n++
          ) {
            if (p.matches('main,nav,[role="main"],[role="navigation"]')) break;
            const b = rect(p);
            if (b.width > r.width + 100 || b.height > r.height + 40) break;
            if (b.width >= r.width - 2 && b.height >= r.height - 2) stage = p;
          }
          nativeRoots.add(stage);
          protectedNodes.add(stage);
        }
      }
    }
    function addRegion(el, group) {
      if (el && el !== document.body && visible(el) && !protectedElement(el))
        regions.set(el, group);
    }
    function tallColumn(start, kind) {
      let result = null;
      for (
        let p = start, depth = 0;
        p && depth < 10 && p !== document.body;
        p = p.parentElement, depth++
      ) {
        const r = rect(p);
        if (
          r.width < 55 ||
          r.width > Math.min(kind === "nav" ? 450 : 610, innerWidth * 0.58)
        )
          continue;
        if (kind === "inbox" && r.right > Math.max(400, innerWidth * 0.68))
          continue;
        if (
          r.height > innerHeight * 0.48 &&
          r.x >= -2 &&
          r.x < innerWidth * 0.55
        )
          result = p;
      }
      return result;
    }
    function compactFloating(start) {
      for (
        let p = start, n = 0;
        p && p !== document.body && n < 18;
        p = p.parentElement, n++
      ) {
        const r = rect(p);
        if (
          p.matches('[role="dialog"],[role="tooltip"],[role="menu"],[popover]')
        )
          return true;
        const pos = getComputedStyle(p).position;
        if (
          ["fixed", "absolute"].includes(pos) &&
          r.width >= 140 &&
          r.width <= 560 &&
          r.height >= 100 &&
          r.height <= 580
        )
          return true;
      }
      return false;
    }
    function inboxFor(el) {
      for (let p = el; p && p !== document.body; p = p.parentElement)
        if (inboxRoots.has(p)) return p;
      return null;
    }
    function conversationFor(el) {
      if (inboxFor(el)) return null;
      for (let p = el; p && p !== document.body; p = p.parentElement) {
        const group = regions.get(p);
        if (
          p.matches(
            'header,nav,[role="navigation"],[role="dialog"],[role="menu"],[role="tooltip"]',
          ) ||
          ["highest", "high", "higher", "low", "lower"].includes(group)
        )
          return null;
        if (group === "chat") return p;
      }
      return null;
    }
    function navShape(el) {
      if (
        el.querySelector(
          '[data-pagelet="IGDInboxThreadListScrollableAreaPagelet"]',
        )
      )
        return false;
      const r = rect(el);
      if (!visible(el)) return false;
      const desktop =
        r.width >= 48 &&
        r.width <= Math.min(300, innerWidth * 0.35) &&
        r.height >= innerHeight * 0.48 &&
        r.left >= -3 &&
        r.left < innerWidth * 0.2;
      const bottom =
        r.height >= 30 &&
        r.height <= 110 &&
        r.width >= innerWidth * 0.65 &&
        Math.abs(r.bottom - innerHeight) <= 24;
      return desktop || bottom;
    }
    function navDestinations(el) {
      const paths = new Set();
      for (const a of el.querySelectorAll("a[href]")) {
        try {
          const url = new URL(a.getAttribute("href"), location.origin);
          if (
            url.origin === location.origin &&
            /^\/(?:$|explore\/?$|reels\/?$|direct\/inbox\/?$)/.test(
              url.pathname,
            )
          )
            paths.add(url.pathname.replace(/\/$/, "") || "/");
        } catch {}
      }
      return paths.size;
    }
    function discoverNavigation() {
      const candidates = new Set();
      const seeds = document.querySelectorAll(
        'nav,[role="navigation"],a[href="/"],a[href="/explore/"],a[href="/reels/"],a[href="/direct/inbox/"],svg[aria-label="Home"],svg[aria-label="Reels"]',
      );
      for (const seed of seeds) {
        for (
          let el = seed, depth = 0;
          el && el !== document.body && depth < 22;
          el = el.parentElement, depth++
        ) {
          if (
            !(el instanceof HTMLElement) ||
            el.closest(
              'article,[role="article"],[role="dialog"],[role="menu"]',
            ) ||
            !navShape(el)
          )
            continue;
          if (
            el.querySelector(
              'textarea,[contenteditable="true"],a[href*="/direct/t/"]',
            )
          )
            continue;
          const semantic = el.matches('nav,[role="navigation"]');
          const positioned = ["fixed", "sticky"].includes(
            getComputedStyle(el).position,
          );
          if (
            navDestinations(el) >= 2 ||
            (semantic &&
              el.querySelectorAll('a,button,[role="button"]').length >= 2) ||
            (positioned && el.querySelectorAll("svg[aria-label]").length >= 3)
          )
            candidates.add(el);
        }
      }
      // The outermost bar-shaped shell owns one paint layer, never the inbox.
      for (const el of candidates)
        if (
          ![...candidates].some((other) => other !== el && other.contains(el))
        ) {
          navigationRoots.add(el);
          addRegion(el, "lower");
        }
    }
    function prepareNavigation() {
      navInterior.clear();
      for (const [root, paint] of navigationPaint)
        if (!navigationRoots.has(root) || !root.isConnected) {
          paint.remove();
          navigationPaint.delete(root);
          set(root, "data-lumgram-nav-position", null);
        }
      const cleared = new Set();
      for (const root of navigationRoots) {
        // Sample the native positioning, not our static-only positioning fallback.
        const prior = root.getAttribute("data-lumgram-nav-position");
        root.removeAttribute("data-lumgram-nav-position");
        const staticPosition = getComputedStyle(root).position === "static";
        if (prior !== null)
          root.setAttribute("data-lumgram-nav-position", prior);
        set(root, "data-lumgram-nav-position", staticPosition ? "true" : null);
        let paint = navigationPaint.get(root);
        if (!paint) {
          paint = document.createElement("span");
          paint.setAttribute("data-lumgram-nav-paint", "true");
          paint.setAttribute("aria-hidden", "true");
          paint.style.display = "none";
          navigationPaint.set(root, paint);
        }
        if (paint.parentElement !== root) root.prepend(paint);
        const bounds = rect(root);
        for (const el of [root, ...root.querySelectorAll("*")]) {
          if (
            !(el instanceof HTMLElement) ||
            el === paint ||
            protectedElement(el) ||
            el.closest(
              '[role="dialog"],[role="menu"],[role="tooltip"],[popover]',
            )
          )
            continue;
          const r = rect(el);
          if (
            el !== root &&
            (r.left < bounds.left - 3 ||
              r.right > bounds.right + 3 ||
              r.top < bounds.top - 3 ||
              r.bottom > bounds.bottom + 3)
          )
            continue;
          navInterior.add(el);
          if (
            el === root ||
            (containers.has(el.tagName) &&
              !el.closest(
                'a,button,[role="button"],[aria-selected="true"],[aria-current]',
              ))
          ) {
            cleared.add(el);
            markCoverLayers(el);
          }
        }
      }
      for (const el of touched)
        if (el.hasAttribute("data-lumgram-nav-clear") && !cleared.has(el))
          set(el, "data-lumgram-nav-clear", null);
      for (const el of cleared) set(el, "data-lumgram-nav-clear", "true");
    }
    function discoverInbox() {
      const selector =
        '[data-pagelet="IGDInboxThreadListScrollableAreaPagelet"]';
      for (const list of document.querySelectorAll(selector)) {
        if (!visible(list) || protectedElement(list)) continue;
        const width = rect(list).width;
        let root = list;
        for (
          let p = list.parentElement, n = 0;
          p && p !== document.body && n < 24;
          p = p.parentElement, n++
        ) {
          const r = rect(p);
          if (!r.width || !r.height) continue;
          if (
            r.width > width + 48 ||
            p.querySelector('textarea,[contenteditable="true"]')
          )
            break;
          root = p;
          if (p.matches('nav,[role="navigation"]')) break;
        }
        inboxRoots.add(root);
        addRegion(root, "high");
        // Intermediate header/search/list wrappers also provide a site boundary.
        for (let p = list; p && root.contains(p); p = p.parentElement) {
          addRegion(p, "high");
          if (p === root) break;
        }
        navigationRoots.delete(root);
      }
    }
    function prepareInbox() {
      for (const root of inboxRoots) {
        const width = rect(root).width;
        for (const el of root.querySelectorAll("*")) {
          if (!(el instanceof HTMLElement) || protectedElement(el)) continue;
          // Remove erroneous chat ownership even on fields/virtualized nodes that
          // will be skipped by the conservative generic surface mapper.
          set(el, "data-lumgram-chat", null);
          if (
            el.closest(
              'button,[role="button"],[role="tab"],a,article,[role="article"],[role="dialog"],[role="menu"],[role="tooltip"],[popover]',
            ) ||
            el.hasAttribute("data-thumb") ||
            el.closest("[data-thumb]") ||
            searchShells.has(el) ||
            controlClear.has(el)
          )
            continue;
          if (
            !containers.has(el.tagName) ||
            rect(el).width < width * 0.8 ||
            rect(el).height < 10
          )
            continue;
          const cs = getComputedStyle(el);
          if (
            neutralMessagePaint(cs) ||
            el.hasAttribute(surfaceAttr) ||
            el.hasAttribute("data-lumgram-inbox-clear")
          ) {
            inboxClear.add(el);
            markCoverLayers(el);
          }
        }
        set(root, "data-lumgram-chat", null);
      }
      for (const [attr, nodes] of [
        ["data-lumgram-inbox", inboxRoots],
        ["data-lumgram-inbox-clear", inboxClear],
      ]) {
        for (const el of touched)
          if (el.hasAttribute(attr) && !nodes.has(el)) set(el, attr, null);
        for (const el of nodes) set(el, attr, "true");
      }
    }
    function collectRegions() {
      regions = new Map();
      mediaRegions();
      const current = route();
      for (const el of document.querySelectorAll('main,[role="main"]'))
        addRegion(
          el,
          current === "Direct"
            ? "chat"
            : current === "Explore"
              ? "low"
              : "lowest",
        );
      for (const el of document.querySelectorAll("article"))
        addRegion(el, "lowest");
      discoverNavigation();
      for (const el of document.querySelectorAll(
        'aside,[role="complementary"]',
      ))
        addRegion(el, "high");
      for (const el of document.querySelectorAll("header"))
        addRegion(el, current === "Profile / page" ? "high" : "lower");
      if (current === "Direct") {
        discoverInbox();
        for (const el of document.querySelectorAll(
          'a[href^="/direct/t/"],[role="grid"],[role="listbox"]',
        ))
          addRegion(tallColumn(el, "inbox"), "high");
        for (const input of document.querySelectorAll(
          '[contenteditable="true"][role="textbox"],textarea',
        )) {
          if (!visible(input) || compactFloating(input)) continue;
          if (input.closest('[role="article"][aria-roledescription]')) continue;
          let composer = input,
            roundedComposer = null;
          const compact = [];
          for (
            let p = input.parentElement, n = 0;
            p && n < 24 && p !== document.body;
            p = p.parentElement, n++
          ) {
            const r = rect(p),
              cs = getComputedStyle(p);
            if (cs.display === "contents" || (!r.width && !r.height)) continue;
            if (r.height > 150) break;
            if (r.width < 160 || r.bottom < innerHeight * 0.45) continue;
            composer = p;
            compact.push(p);
            if (hasRadius(cs) && r.height <= 120) roundedComposer = p;
          }
          composer = roundedComposer || composer;
          addRegion(composer, "highest");
          if (composer !== input) {
            composerShells.add(composer);
            for (const parent of compact)
              if (parent !== composer && parent.contains(composer))
                controlClear.add(parent);
          }
          // Find the conversation column above its input without relying on a localized label.
          let chat = null;
          for (
            let p = composer.parentElement, n = 0;
            p && n < 24 && p !== document.body;
            p = p.parentElement, n++
          ) {
            const r = rect(p);
            if (chat && r.width > rect(chat).width + 48) break;
            if (
              [...regions].some(
                ([child, group]) =>
                  child !== p &&
                  ["high", "lower"].includes(group) &&
                  rect(child).height > innerHeight * 0.45 &&
                  p.contains(child),
              )
            )
              continue;
            if (
              r.height > innerHeight * 0.45 &&
              r.width < innerWidth * 0.85 &&
              r.width > 240
            )
              chat = p;
          }
          if (chat) {
            if (!regions.has(chat)) addRegion(chat, "chat");
            // The tall sibling of the composer branch is the conversation's
            // message pane. Do not infer panels from the size of message bubbles.
            for (
              let branch = composer;
              branch && branch !== chat;
              branch = branch.parentElement
            ) {
              for (const sibling of branch.parentElement?.children || []) {
                if (sibling === branch || sibling.contains(composer)) continue;
                const r = rect(sibling),
                  c = rect(chat);
                if (
                  r.width >= c.width * 0.8 &&
                  r.height >= innerHeight * 0.3 &&
                  !sibling.matches(
                    'header,nav,[role="dialog"],[role="menu"]',
                  ) &&
                  !compactFloating(sibling)
                ) {
                  addRegion(sibling, "chat");
                }
              }
            }
          }
        }
      }
      for (const el of document.querySelectorAll(
        '[role="search"],form:has(input[type="search"])',
      ))
        addRegion(el, "low");
      for (const el of document.querySelectorAll(
        '[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"]',
      )) {
        if (current === "Direct" && regions.get(el) === "high") continue;
        addRegion(el, "higher");
      }
      // A broad Direct <main> may contain BOTH inbox and conversation columns.
      // Do not let its inherited chat typography spill into the inbox/sidebar.
      for (const [el, group] of [...regions]) {
        if (
          group === "chat" &&
          [...regions].some(
            ([child, g]) =>
              child !== el &&
              ["high", "lower"].includes(g) &&
              rect(child).height > innerHeight * 0.45 &&
              el.contains(child),
          )
        )
          regions.set(el, "appframe");
      }
    }
    function clearSurface(el) {
      if (el.hasAttribute(surfaceAttr)) set(el, surfaceAttr, null);
      if (el.hasAttribute(clearAttr)) set(el, clearAttr, null);
    }
    function hasRadius(cs) {
      return [
        "borderTopLeftRadius",
        "borderTopRightRadius",
        "borderBottomLeftRadius",
        "borderBottomRightRadius",
      ].some((k) => parseFloat(cs[k]) > 3);
    }
    function emptyCover(el, pseudo) {
      const attr =
        pseudo === "::before"
          ? "data-lumgram-clear-before"
          : "data-lumgram-clear-after";
      const old = el.getAttribute(attr);
      if (old !== null) el.removeAttribute(attr);
      try {
        const cs = getComputedStyle(el, pseudo),
          r = rect(el);
        if (
          !['""', "''"].includes(cs.content) ||
          cs.display === "none" ||
          !neutralMessagePaint(cs)
        )
          return false;
        const fullInset = ["top", "right", "bottom", "left"].every(
          (k) => parseFloat(cs[k]) === 0,
        );
        const matches = (value, size) =>
          value === "100%" || Math.abs(parseFloat(value) - size) <= 3;
        return (
          (matches(cs.width, r.width) && matches(cs.height, r.height)) ||
          (fullInset &&
            ["auto", "100%"].includes(cs.width) &&
            ["auto", "100%"].includes(cs.height))
        );
      } finally {
        if (old !== null) el.setAttribute(attr, old);
      }
    }
    function markCoverLayers(el) {
      if (emptyCover(el, "::before")) beforeClear.add(el);
      if (emptyCover(el, "::after")) afterClear.add(el);
    }
    function neutralMessagePaint(cs) {
      if (neutralBackground(cs)) return true;
      // A flat CSS gradient is still a rectangular fill. Do not mistake it for
      // an uploaded image or a native multicolored outgoing bubble.
      const image = cs.backgroundImage;
      if (
        !/^(linear|radial|conic)-gradient\(/.test(image) ||
        /url\(/i.test(image)
      )
        return false;
      const colors = image.match(/rgba?\([^)]+\)/g) || [];
      return (
        colors.length >= 2 &&
        colors.every((color) => {
          const values = color.match(/[\d.]+/g).map(Number);
          return (
            Math.max(...values.slice(0, 3)) - Math.min(...values.slice(0, 3)) <
            30
          );
        })
      );
    }
    function collectMessagePaint() {
      if (route() !== "Direct") return;
      const articleSelector = 'article,[role="article"]';
      const areas = new Set(document.querySelectorAll(articleSelector));
      for (const [el, group] of regions) if (group === "chat") areas.add(el);
      const visited = new Set(),
        candidates = [];
      for (const area of areas) {
        if (protectedElement(area)) continue;
        for (const el of area.querySelectorAll(
          'div,span,[role="presentation"]',
        )) {
          if (visited.has(el)) continue;
          visited.add(el);
          if (
            regions.has(el) ||
            protectedElement(el) ||
            el.closest(
              'button,[role="button"],pre,code,mark,input,textarea,[contenteditable="true"]',
            )
          )
            continue;
          const boundary = el.closest(articleSelector) || conversationFor(el);
          if (!boundary) continue;
          const box = rect(el);
          if (box.width < 28 || box.height < 22) continue;
          const cs = getComputedStyle(el);
          if (
            !hasRadius(cs) ||
            (cs.backgroundImage === "none" &&
              ["transparent", "rgba(0, 0, 0, 0)"].includes(cs.backgroundColor))
          )
            continue;
          if (
            [...el.querySelectorAll(mediaSelector)].some(
              (media) =>
                media.matches("video,canvas,iframe") ||
                rect(media).width > 40 ||
                rect(media).height > 40,
            )
          )
            continue;
          // Instagram can split radius/fill and padding across different nodes.
          // No presentation role or aria-roledescription is required here.
          const padded = [
            el,
            ...el.querySelectorAll(
              ":scope > *, :scope > * > *, :scope > * > * > *",
            ),
          ].some((child) => {
            if (!(child instanceof HTMLElement)) return false;
            const style = getComputedStyle(child),
              r = rect(child);
            return (
              r.width <= box.width + 3 &&
              r.height <= box.height + 3 &&
              Math.max(
                parseFloat(style.paddingTop),
                parseFloat(style.paddingBottom),
              ) >= 4 &&
              Math.max(
                parseFloat(style.paddingLeft),
                parseFloat(style.paddingRight),
              ) >= 6
            );
          });
          if (padded) candidates.push(el);
        }
      }
      for (const bubble of candidates.filter(
        (el) => !candidates.some((other) => el !== other && el.contains(other)),
      )) {
        bubbleRoots.add(bubble);
        const boundary =
          bubble.closest(articleSelector) || conversationFor(bubble);
        for (
          let p = bubble.parentElement;
          p && p !== document.body;
          p = p.parentElement
        ) {
          if (
            protectedElement(p) ||
            (regions.has(p) && (p !== boundary || regions.get(p) === "chat"))
          )
            break;
          const cs = getComputedStyle(p),
            r = rect(p),
            b = rect(bubble);
          if (
            !hasRadius(cs) ||
            (r.height <= b.height + 8 && r.width <= b.width + 24)
          ) {
            if (
              neutralMessagePaint(cs) ||
              (cs.backgroundImage === "none" &&
                ["transparent", "rgba(0, 0, 0, 0)"].includes(
                  cs.backgroundColor,
                )) ||
              p.hasAttribute(surfaceAttr) ||
              p.hasAttribute("data-lumgram-message-wrapper")
            ) {
              bubbleBackings.add(p);
              markCoverLayers(p);
            }
          }
          if (p === boundary) break;
        }
        // Text-only inner wrappers must not bring a second square fill back,
        // including when the semantic message sits outside a mapped chat pane.
        for (const el of bubble.querySelectorAll("div,span")) {
          if (
            protectedElement(el) ||
            el.closest('a,button,[role="button"],pre,code,mark')
          )
            continue;
          const cs = getComputedStyle(el);
          if (!hasRadius(cs) && neutralMessagePaint(cs)) {
            bubbleBackings.add(el);
            markCoverLayers(el);
          }
        }
      }
    }
    function collectMessageOutlines() {
      if (route() !== "Direct") return;
      const attr = "data-lumgram-message-outline";
      // Instagram masks the space around messages with a 10px outline, not a
      // background. Match its message-row token + geometry rather than relying
      // on the current generated class name (.x1k4qllp in the supplied rule).
      const candidates = new Set([
        ...document.querySelectorAll('[role="presentation"]'),
        ...bubbleRoots,
      ]);
      for (const el of candidates) {
        if (
          !(el instanceof HTMLElement) ||
          !visible(el) ||
          protectedElement(el) ||
          inboxFor(el) ||
          el.closest(
            'button,input,textarea,[contenteditable="true"],nav,[role="navigation"],[role="dialog"],[role="menu"]',
          )
        )
          continue;
        const cs = getComputedStyle(el);
        if (!cs.getPropertyValue("--mwp-message-row-background").trim())
          continue;
        const mask =
          cs.outlineStyle === "solid" &&
          Math.abs(parseFloat(cs.outlineWidth) - 10) < 0.25;
        // A native focus rule can temporarily replace the decorative outline.
        // Keep ownership while focused; CSS always exempts :focus-visible.
        if (mask || (el.hasAttribute(attr) && el.matches(":focus-visible")))
          messageOutlines.add(el);
      }
    }
    function collectControlPaint() {
      // Lexical's tiny editable DIV is never a wallpaper surface, even if its
      // responsive composer ancestors have not mounted yet. Notes stay protected.
      if (route() === "Direct")
        for (const editor of document.querySelectorAll(
          '[contenteditable="true"][role="textbox"],textarea',
        )) {
          if (!protectedElement(editor) && !composerShells.has(editor))
            controlClear.add(editor);
        }
      for (const shell of [...searchShells, ...composerShells]) {
        if (protectedElement(shell)) continue;
        for (const child of shell.querySelectorAll("*")) {
          if (
            protectedElement(child) ||
            child.matches("svg,svg *,img,video,canvas")
          )
            continue;
          const field = child.matches(
            'input,textarea,[contenteditable="true"],[role="textbox"]',
          );
          const innerText = child.closest(
            'input,textarea,[contenteditable="true"],[role="textbox"]',
          );
          if (
            field ||
            innerText ||
            ((containers.has(child.tagName) ||
              ["SPAN", "LABEL"].includes(child.tagName)) &&
              !child.closest('button,[role="button"],a'))
          ) {
            controlClear.add(child);
          }
        }
      }
      for (const el of [...controlClear]) {
        if (
          protectedElement(el) ||
          searchShells.has(el) ||
          composerShells.has(el)
        )
          controlClear.delete(el);
        else markCoverLayers(el);
      }
    }
    function collectGuards() {
      // A real Notes tray need not sit under an identifiable inbox/grid node.
      // Locate short horizontal avatar rows directly, including absolutely
      // positioned bubbles that extend above the row's own bounding box.
      if (route() === "Direct") {
        const candidates = new Set(),
          examined = new Set();
        for (const avatar of document.querySelectorAll('img,[role="img"]')) {
          const a = rect(avatar);
          if (a.width < 28 || a.width > 220 || a.height < 28 || a.height > 220)
            continue;
          for (
            let p = avatar.parentElement, n = 0;
            p && p !== document.body && n < 18;
            p = p.parentElement, n++
          ) {
            const r = rect(p);
            if (r.width > 680 || r.height > 580) break;
            if (examined.has(p)) continue;
            examined.add(p);
            const floating = compactFloating(p);
            const peers = [...p.querySelectorAll('img,[role="img"]')]
              .map(rect)
              .filter(
                (t) =>
                  t.width >= 28 &&
                  t.width <= 120 &&
                  t.height >= 28 &&
                  t.height <= 120,
              );
            const horizontal = peers.some((t) =>
              peers.some(
                (u) =>
                  Math.abs(t.top - u.top) < 38 &&
                  Math.abs(t.left - u.left) > 35,
              ),
            );
            const noteLabel =
              p.matches('[aria-label*="note" i]') ||
              p.querySelector('[aria-label*="note" i]');
            const tray =
              r.height >= 40 &&
              r.height <= 280 &&
              r.left < innerWidth * 0.6 &&
              r.top < innerHeight * 0.6 &&
              !p.querySelector(
                'input,textarea,[contenteditable="true"],[role="search"]',
              ) &&
              (horizontal || noteLabel);
            // Conservative exemption for compact Direct avatar popovers. This
            // also leaves profile/call preview cards native rather than risking
            // Notes recoloring. Ordinary Create/Notifications dialogs without
            // this avatar-card structure retain the shared appearance.
            const popover =
              floating &&
              (a.width >= 72 || noteLabel) &&
              !p.querySelector(
                'input[type="file"],video,[aria-label*="caption" i]',
              ) &&
              ![...p.querySelectorAll("img")].some(
                (image) => rect(image).width > 240 || rect(image).height > 240,
              ) &&
              r.width >= 160 &&
              r.width <= 540 &&
              r.height >= 100 &&
              r.height <= 560;
            if (tray || popover) candidates.add(p);
          }
        }
        for (const note of candidates) {
          if (
            [...candidates].some(
              (other) => other !== note && other.contains(note),
            )
          )
            continue;
          noteRoots.add(note);
          nativeRoots.add(note);
          protectedNodes.add(note);
          // Remove old surface/field mappings immediately, not in a later batch.
          clearSurface(note);
          for (const child of note.querySelectorAll(
            "[data-lumgram-surface],[data-lumgram-clear]",
          ))
            clearSurface(child);
        }
      }
      for (const input of document.querySelectorAll(
        'input[type="search"],input[role="searchbox"],input[placeholder*="search" i],input[aria-label*="search" i],[role="search"] input',
      )) {
        if (!visible(input) || protectedElement(input)) continue;
        let shell = input,
          roundedShell = null;
        const a = rect(input),
          compact = [];
        for (
          let p = input.parentElement, n = 0;
          p && p !== document.body && n < 24;
          p = p.parentElement, n++
        ) {
          const r = rect(p),
            cs = getComputedStyle(p);
          if (cs.display === "contents" || (!r.width && !r.height)) continue;
          if (
            r.height > 90 ||
            r.width > innerWidth * 0.97 ||
            protectedElement(p)
          )
            break;
          if (r.height < 20 || r.width < a.width - 2) continue;
          if (
            p.querySelectorAll("input").length !== 1 ||
            p.querySelector('textarea,[contenteditable="true"],img,video')
          )
            break;
          shell = p;
          compact.push(p);
          if (hasRadius(cs)) roundedShell = p;
        }
        shell = roundedShell || shell;
        if (shell === input) continue;
        searchShells.add(shell);
        regions.set(shell, "highest");
        for (const parent of compact)
          if (parent !== shell && parent.contains(shell))
            controlClear.add(parent);
      }
      for (const shell of [...composerShells])
        if (protectedElement(shell)) composerShells.delete(shell);
      collectMessagePaint();
      collectMessageOutlines();
      collectControlPaint();
      prepareInbox();
      prepareNavigation();
      for (const el of [...touched]) {
        if (el.hasAttribute("data-lumgram-notes") && !noteRoots.has(el))
          set(el, "data-lumgram-notes", null);
        if (el.hasAttribute("data-lumgram-native") && !nativeRoots.has(el))
          set(el, "data-lumgram-native", null);
        if (el.hasAttribute("data-lumgram-search") && !searchShells.has(el))
          set(el, "data-lumgram-search", null);
        if (
          el.hasAttribute("data-lumgram-navigation") &&
          !navigationRoots.has(el)
        )
          set(el, "data-lumgram-navigation", null);
        if (el.getAttribute(clearAttr) === "search" && !controlClear.has(el))
          set(el, clearAttr, null);
      }
      for (const [attr, nodes] of [
        ["data-lumgram-compose", composerShells],
        ["data-lumgram-bubble", bubbleRoots],
        ["data-lumgram-message-outline", messageOutlines],
        ["data-lumgram-message-wrapper", bubbleBackings],
        ["data-lumgram-control-clear", controlClear],
        ["data-lumgram-clear-before", beforeClear],
        ["data-lumgram-clear-after", afterClear],
      ]) {
        for (const el of [...touched])
          if (el.hasAttribute(attr) && !nodes.has(el)) set(el, attr, null);
        for (const el of nodes) set(el, attr, "true");
      }
      for (const el of noteRoots) set(el, "data-lumgram-notes", "true");
      for (const el of navigationRoots)
        set(el, "data-lumgram-navigation", "true");
      for (const el of searchShells) set(el, "data-lumgram-search", "shell");
      captureNativeColors();
    }
    function captureNativeColors() {
      let sheet = document.getElementById("lumgram-native-style");
      if (!sheet) {
        sheet = document.createElement("style");
        sheet.id = "lumgram-native-style";
        document.head.append(sheet);
      }
      const pending = [];
      for (const el of nativeRoots) {
        if (!nativeIds.has(el)) nativeIds.set(el, String(++nativeSerial));
        set(el, "data-lumgram-native", nativeIds.get(el));
        // Our data attributes do not invalidate native colors. Parent native
        // theme/class/style changes do. Avoid re-reading styles on every message.
        let signature = "notes:" + noteRoots.has(el) + ";";
        for (let p = el; p; p = p.parentElement)
          signature +=
            p.getAttribute("class") + "|" + p.getAttribute("style") + ";";
        if (nativeSnapshots.get(el)?.signature !== signature)
          pending.push({ el, signature });
      }
      if (pending.length) {
        // Read the real native cascade only synchronously; never leave either
        // stylesheet disabled across an animation frame or asynchronous boundary.
        const sheets = [
          document.getElementById("lumgram-style")?.sheet,
          sheet.sheet,
        ].filter(Boolean);
        const disabled = sheets.map((s) => s.disabled);
        try {
          sheets.forEach((s) => {
            s.disabled = true;
          });
          const tokens = [
            "--ig-primary-background",
            "--ig-secondary-background",
            "--ig-elevated-background",
            "--ig-highlight-background",
            "--ig-primary-text",
            "--ig-secondary-text",
            "--ig-tertiary-text",
            "--ig-elevated-separator",
            "--ig-separator",
            "--primary-text",
            "--secondary-text",
            "--primary-icon",
            "--secondary-icon",
            "--primary-background",
            "--secondary-background",
            "--divider",
          ];
          for (const { el, signature } of pending) {
            const cs = getComputedStyle(el);
            const declarations = tokens
              .map(
                (k) =>
                  `${k}:${cs.getPropertyValue(k).trim() || "initial"} !important;`,
              )
              .join("");
            nativeSnapshots.set(el, {
              signature,
              css: `html[data-lumgram-active] [data-lumgram-native="${nativeIds.get(el)}"]{${declarations}color:${cs.color}!important;color-scheme:${cs.colorScheme};${noteRoots.has(el) ? `font-family:${cs.fontFamily}!important;` : ""}}`,
            });
          }
        } finally {
          sheets.forEach((s, i) => {
            s.disabled = disabled[i];
          });
        }
      }
      const css = [...nativeRoots]
        .map((el) => nativeSnapshots.get(el).css)
        .join("\n");
      if (sheet.textContent !== css) sheet.textContent = css;
    }
    function groupFor(el) {
      for (let p = el; p && p !== document.body; p = p.parentElement)
        if (regions.has(p)) return regions.get(p);
      return "appframe";
    }
    function neutralBackground(style) {
      if (style.backgroundImage !== "none") return false;
      const values = style.backgroundColor.match(/[\d.]+/g)?.map(Number);
      if (
        !values ||
        values.length < 3 ||
        (values.length > 3 && values[3] < 0.04)
      )
        return false;
      return (
        Math.max(...values.slice(0, 3)) - Math.min(...values.slice(0, 3)) < 30
      );
    }
    function classify(el) {
      if (!(el instanceof HTMLElement) || !el.isConnected) return;
      if (protectedElement(el)) {
        clearSurface(el);
        return;
      }
      if (el.hasAttribute("data-lumgram-nav-paint") || navInterior.has(el)) {
        clearSurface(el);
        return;
      }
      if (inboxRoots.has(el)) {
        clearSurface(el);
        set(el, surfaceAttr, "high");
        return;
      }
      if (inboxClear.has(el)) {
        clearSurface(el);
        return;
      }
      if (bubbleRoots.has(el)) {
        clearSurface(el);
        return;
      }
      if (bubbleBackings.has(el)) {
        if (el.hasAttribute(surfaceAttr)) set(el, surfaceAttr, null);
        set(el, clearAttr, "message");
        return;
      }
      if (controlClear.has(el)) {
        if (el.hasAttribute(surfaceAttr)) set(el, surfaceAttr, null);
        set(el, clearAttr, "search");
        return;
      }
      if (el === document.body) {
        set(el, surfaceAttr, "appframe");
        return;
      }
      if (
        el.matches(
          'input:not([type]),input[type="text"],input[type="search"],input[type="email"],input[type="tel"],input[type="url"],input[type="number"],textarea,[contenteditable="true"][role="textbox"]',
        )
      ) {
        if (visible(el)) set(el, surfaceAttr, "highest");
        return;
      }
      const forced = regions.has(el),
        r = rect(el),
        cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") return;
      const rounded = (style) =>
        [
          "borderTopLeftRadius",
          "borderTopRightRadius",
          "borderBottomLeftRadius",
          "borderBottomRightRadius",
        ].some((k) => parseFloat(style[k]) > 2);
      const conversation = route() === "Direct" ? conversationFor(el) : null;
      if (conversation && regions.get(el) !== "chat") {
        // Nested message content is NEVER a wallpaper panel, regardless of its
        // height, role, or distance from a rounded descendant. Tiny and deeply
        // nested neutral backing boxes are transparent; actual rounded/clipped
        // or colored bubble surfaces retain their own native backgrounds.
        const eligible = containers.has(el.tagName) || el.tagName === "SPAN";
        const wasCleared = el.getAttribute(clearAttr) === "message";
        if (
          eligible &&
          !el.closest("pre,code,mark") &&
          !rounded(cs) &&
          cs.clipPath === "none" &&
          (wasCleared || neutralCandidates.has(el) || neutralBackground(cs))
        ) {
          if (el.hasAttribute(surfaceAttr)) set(el, surfaceAttr, null);
          set(el, clearAttr, "message");
        } else clearSurface(el);
        return;
      }
      if (!containers.has(el.tagName) || el.matches(interactionSelector))
        return;
      // In Direct, unknown compact cards are content, not generic panels. This
      // is the safe fallback for Notes popovers whose semantics we cannot see.
      if (
        route() === "Direct" &&
        !forced &&
        (r.height < innerHeight * 0.45 || r.width < innerWidth * 0.45)
      ) {
        clearSurface(el);
        return;
      }
      if (el.getAttribute(clearAttr) === "message") set(el, clearAttr, null);
      if (
        !forced &&
        (r.width < 70 || r.height < 24 || r.width * r.height < 2800)
      ) {
        clearSurface(el);
        return;
      }
      const known = neutralCandidates.has(el);
      if (!known && !forced && !neutralBackground(cs)) return;
      if (!forced && !known) neutralCandidates.add(el);
      // Protect tinted message bubbles, gradient story rings and media overlays.
      // Only neutral containers or explicit semantic surface roots are painted.
      let group = groupFor(el);
      if (
        route() === "Direct" &&
        !forced &&
        cs.overflowY === "auto" &&
        r.height > innerHeight * 0.45 &&
        r.width > 180 &&
        r.width < innerWidth * 0.45 &&
        r.x < innerWidth * 0.5
      )
        group = "high";
      set(el, surfaceAttr, group);
    }
    function scan() {
      if (running && lastRoute === route()) {
        pending = true;
        return;
      }
      running = true;
      pending = false;
      const id = ++generation;
      lastScan = Date.now();
      lastRoute = route();
      if (lastRoute === "authentication" || lastRoute === "media viewer") {
        clear();
        return;
      }
      scanError = "";
      try {
        collectRegions();
        collectGuards();
      } catch (error) {
        running = false;
        scanError = String(error.message || error).slice(0, 240);
        return;
      }
      // Remove stale mappings on moved/recycled nodes; reclassify against the current route.
      for (const el of [...touched]) if (!el.isConnected) restore(el);
      const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT,
      );
      let next = document.body;
      cancelAnimationFrame(frame);
      function batch() {
        if (id !== generation) return;
        let count = 0;
        const start = performance.now();
        while (next && count < 180 && performance.now() - start < 9) {
          const current = next;
          next = walker.nextNode();
          try {
            classify(current);
          } catch (error) {
            scanError = String(error.message || error).slice(0, 240);
            running = false;
            return;
          }
          count++;
        }
        if (next) frame = requestAnimationFrame(batch);
        else {
          running = false;
          if (pending) {
            pending = false;
            retryTimer = setTimeout(scan, 100);
          }
        }
      }
      batch();
    }
    function logo(iconId) {
      for (const el of [...touched])
        if (el.hasAttribute(logoAttr)) set(el, logoAttr, null);
      if (!/^icon([1-9]|1[0-9])$/.test(iconId)) return;
      // Only the Instagram brand mark in a home link; never the Home button or post media.
      for (const svg of document.querySelectorAll(
        'a[href="/"] svg[aria-label="Instagram"],a[href="https://www.instagram.com/"] svg[aria-label="Instagram"]',
      ))
        set(svg, logoAttr, "true");
    }
    function clear() {
      ++generation;
      cancelAnimationFrame(frame);
      clearTimeout(retryTimer);
      running = false;
      pending = false;
      for (const el of [...touched]) restore(el);
      regions.clear();
      protectedNodes.clear();
      nativeRoots.clear();
      noteRoots.clear();
      searchShells.clear();
      composerShells.clear();
      controlClear.clear();
      bubbleRoots.clear();
      messageOutlines.clear();
      bubbleBackings.clear();
      beforeClear.clear();
      afterClear.clear();
      searchChildren.clear();
      navigationRoots.clear();
      inboxRoots.clear();
      inboxClear.clear();
      for (const paint of navigationPaint.values()) paint.remove();
      navigationPaint.clear();
      navInterior.clear();
      document.getElementById("lumgram-native-style")?.remove();
    }
    return {
      scan,
      clear,
      logo,
      route,
      status: () => ({
        route: route(),
        surfaces: document.querySelectorAll("[" + surfaceAttr + "]").length,
        lastScan,
        scanError,
        scanning: running,
        chatSurfaces: document.querySelectorAll('[data-lumgram-chat="true"]')
          .length,
        nativeNotes: noteRoots.size,
        navigationBars: navigationRoots.size,
        inboxPanels: inboxRoots.size,
        nativeMessageBubbles: bubbleRoots.size,
        messageOutlineMasks: messageOutlines.size,
        semanticMessageWrappers: bubbleBackings.size,
        searchShells: searchShells.size,
        composerShells: composerShells.size,
        clearedMessageWrappers: document.querySelectorAll(
          '[data-lumgram-clear="message"]',
        ).length,
      }),
    };
  };
})();
