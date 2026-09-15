/* Instagram-only activation and diagnostics. Imported by the extension worker.
   No message text, page HTML, credentials or account data is collected. */
(() => {
  const patterns = ["https://www.instagram.com/*", "https://instagram.com/*"];
  const pending = new Map();
  const version = () => chrome.runtime.getManifest().version;
  const safeError = (error) =>
    String(error?.message || error || "Unknown error")
      .replace(/https?:\/\/\S+/g, "[page URL]")
      .replace(/data:\S+/g, "[image]")
      .slice(0, 240);
  const instagram = (value) => {
    try {
      const u = new URL(value);
      return (
        u.protocol === "https:" &&
        ["instagram.com", "www.instagram.com"].includes(u.hostname)
      );
    } catch {
      return false;
    }
  };
  const routeName = (value) => {
    const p = new URL(value).pathname;
    if (/^\/(accounts\/(login|signup|password)|challenge|oauth)(\/|$)/.test(p))
      return "Authentication";
    if (/^\/stories(\/|$)/.test(p)) return "Stories";
    if (/^\/direct(\/|$)/.test(p)) return "Direct";
    if (/^\/(reel|reels)(\/|$)/.test(p)) return "Reels";
    if (/^\/explore(\/|$)/.test(p)) return "Explore";
    return p === "/" ? "Home / Feed" : "Profile / page";
  };
  async function timeout(promise, ms = 2500) {
    let timer;
    try {
      return await Promise.race([
        promise,
        new Promise((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Page script did not respond in time.")),
            ms,
          );
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
  async function target(tabId) {
    const tabs = await chrome.tabs.query({ url: patterns });
    const [active] = await chrome.tabs.query({
      active: true,
      lastFocusedWindow: true,
    });
    if (
      active &&
      instagram(active.url) &&
      !tabs.some((t) => t.id === active.id)
    )
      tabs.push(active);
    tabs.sort((a, b) => (b.lastAccessed || 0) - (a.lastAccessed || 0));
    let tab = tabId ? tabs.find((t) => t.id === tabId) : null;
    if (tabId && !tab) {
      try {
        const requested = await chrome.tabs.get(tabId);
        if (instagram(requested.url)) tab = requested;
      } catch {}
    }
    if (tabId && !tab)
      throw new Error(
        "The selected Instagram tab is unavailable. Open Instagram and check its site access.",
      );
    tab ||= (instagram(active?.url) ? active : null) || tabs[0];
    return {
      tab,
      tabs: tabs.map((t) => ({
        id: t.id,
        route: routeName(t.url),
        active: t.id === active?.id,
      })),
    };
  }
  async function message(tabId, type) {
    return timeout(chrome.tabs.sendMessage(tabId, { type }));
  }
  function classify(status) {
    if (status.stylesheetConflict)
      return {
        code: "conflict",
        detail:
          "Another LumGram extension copy appears to be overwriting this stylesheet. Keep only one copy enabled, then refresh Instagram.",
      };
    if (status.version !== version())
      return {
        code: "outdated",
        detail:
          "An older LumGram page script is still loaded. Reload this Instagram tab to finish the update.",
      };
    if (status.phase === "error" || status.scanError)
      return {
        code: "error",
        detail:
          "The page script encountered a problem. Open Troubleshooting and copy the diagnostics.",
      };
    if (!status.enabled)
      return {
        code: "disabled",
        detail:
          "LumGram is switched off. Turn on Active below, or use Connect & apply.",
      };
    if (status.paused)
      return {
        code: "paused",
        detail:
          "Styling is intentionally paused on Stories and authentication pages.",
      };
    if (status.phase === "starting" || status.phase === "applying")
      return {
        code: "applying",
        detail:
          "The page script is running and applying your saved appearance. Check again in a moment.",
      };
    if (!status.cssApplied)
      return {
        code: "css-blocked",
        detail:
          "The script is running, but its stylesheet is not taking effect. Copy diagnostics so this can be targeted accurately.",
      };
    if (status.surfaces < 2 && status.scanning)
      return {
        code: "applying",
        detail:
          "The script is connected and is still detecting Instagram’s page panels.",
      };
    if (status.surfaces < 2)
      return {
        code: "unmapped",
        detail:
          "The script is connected, but no main Instagram panels were detected. Try Rescan page, then copy diagnostics if unchanged.",
      };
    return {
      code: "connected",
      detail: `Connected · ${status.route} · ${status.surfaces} detected surfaces${status.chatCustomized ? " · saved chat appearance" : ""}${status.warning ? " · " + status.warning : "."}`,
    };
  }
  async function run(request) {
    const { tab, tabs } = await target(request.tabId);
    const base = {
      version: version(),
      tabs,
      tabId: tab?.id || null,
      route: tab ? routeName(tab.url) : null,
    };
    if (!tab)
      return {
        ...base,
        code: "no-tab",
        detail:
          "Open Instagram in this browser, allow LumGram site access, and click its toolbar icon. A downloaded dashboard preview cannot style Instagram.",
      };
    if (base.route === "Authentication")
      return {
        ...base,
        code: "paused",
        detail:
          "Sign-in, password and authentication pages are deliberately left untouched. Finish signing in, then reopen LumGram.",
      };
    if (request.action === "reload") {
      await chrome.tabs.reload(tab.id);
      return {
        ...base,
        code: "reloading",
        detail:
          "Instagram is reloading. When it finishes, reopen LumGram or click Check connection.",
      };
    }
    let status = null;
    try {
      status = await message(tab.id, "LUMGRAM_STATUS");
    } catch {}
    if (status && status.version !== version())
      return { ...base, status, ...classify(status) };
    if (request.action === "connect") {
      if (!status) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => ({
              body: !!document.body,
              stale: !!document.querySelector(
                "#lumgram-style,[data-lumgram-active],[data-lumgram-surface]",
              ),
            }),
          });
          if (!results[0]?.result?.body)
            return {
              ...base,
              code: "loading",
              detail:
                "Instagram is still loading. Try Connect & apply when the page is ready.",
            };
          if (results[0].result.stale)
            return {
              ...base,
              code: "stale",
              detail:
                "Old LumGram styling is present, but its page script cannot respond. Reload Instagram rather than adding a second script.",
            };
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: chrome.runtime.getManifest().content_scripts[0].js,
          });
          status = await message(tab.id, "LUMGRAM_STATUS");
        } catch (error) {
          const denied = /cannot access|permission|not allowed/i.test(
            String(error.message || error),
          );
          return {
            ...base,
            code: denied ? "access" : "attach-error",
            detail: denied
              ? "Cannot attach LumGram to this tab. In extension Details → Site access, allow Instagram, then refresh it and try again."
              : "The page script could not start. Make sure all update files were copied, reload LumGram in Extensions, and refresh Instagram. Copy diagnostics if this persists.",
            error: safeError(error),
          };
        }
      }
      await chrome.storage.local.set({ instagram_enable: "1" });
      // Apply acknowledges after rendering, rather than reporting a connection
      // before a stylesheet exists. Saved profiles/presets are never reset.
      status = await timeout(
        chrome.tabs.sendMessage(tab.id, { type: "LUMGRAM_APPLY" }),
        20000,
      );
    } else if (request.action === "rescan" && status) {
      await message(tab.id, "LUMGRAM_RESCAN");
      await new Promise((resolve) => setTimeout(resolve, 350));
      status = await message(tab.id, "LUMGRAM_STATUS");
    }
    if (!status)
      return {
        ...base,
        code: "missing",
        detail:
          "The Instagram page script is not attached. Click Connect & apply. If access is blocked, allow Instagram in the extension’s Site access settings.",
      };
    return { ...base, status, ...classify(status) };
  }
  globalThis.LumConnection = {
    async handle(request) {
      const key = request.tabId || "current";
      const prior = pending.get(key) || Promise.resolve();
      const task = prior
        .then(() => run(request))
        .catch((error) => ({
          version: version(),
          code: "error",
          detail:
            "Could not check this Instagram tab. Open Troubleshooting for the diagnostic details.",
          error: safeError(error),
          tabs: [],
        }));
      pending.set(key, task);
      try {
        return await task;
      } finally {
        if (pending.get(key) === task) pending.delete(key);
      }
    },
  };
})();
