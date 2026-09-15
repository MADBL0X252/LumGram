/* Always-visible, local-only page connection status and manual repair controls. */
(() => {
  globalThis.LumConnectionUI = {
    mount({ extension, onTarget }) {
      const $ = (id) => document.getElementById(id);
      let last = null,
        chosen = null,
        busy = false,
        retryTimer = null,
        autoChecks = 0;
      const names = {
        connected: "Instagram styling is active",
        conflict: "Another LumGram copy is interfering",
        missing: "Instagram is not connected",
        "no-tab": "Open an Instagram tab",
        outdated: "Instagram needs a refresh",
        stale: "An old page script needs a refresh",
        access: "Instagram site access is blocked",
        "attach-error": "The page script could not start",
        paused: "This page stays native",
        disabled: "LumGram is switched off",
        error: "Connection needs attention",
        "css-blocked": "Styles are not taking effect",
        unmapped: "No Instagram panels detected",
        applying: "Applying your appearance…",
        loading: "Instagram is still loading",
        reloading: "Reloading Instagram…",
        preview: "Preview only — not connected",
      };
      function diagnostic(result) {
        const s = result?.status || {};
        return JSON.stringify(
          {
            extensionVersion: result?.version || "unknown",
            browser: navigator.userAgent,
            connection: result?.code,
            route: result?.route || s.route || null,
            pageVersion: s.version || null,
            phase: s.phase || null,
            enabled: s.enabled ?? null,
            active: s.active ?? null,
            cssApplied: s.cssApplied ?? null,
            stylesheetConflict: s.stylesheetConflict ?? null,
            canvasPainted: s.canvasPainted ?? null,
            surfaces: s.surfaces ?? null,
            chatSurfaces: s.chatSurfaces ?? null,
            nativeNotes: s.nativeNotes ?? null,
            nativeMessageBubbles: s.nativeMessageBubbles ?? null,
            messageOutlineMasks: s.messageOutlineMasks ?? null,
            semanticMessageWrappers: s.semanticMessageWrappers ?? null,
            searchShells: s.searchShells ?? null,
            composerShells: s.composerShells ?? null,
            navigationBars: s.navigationBars ?? null,
            inboxPanels: s.inboxPanels ?? null,
            inboxOpacity: s.inboxOpacity ?? null,
            navigationOpacity: s.navigationOpacity ?? null,
            savedNavigationAppearance: s.navigationCustomized ?? false,
            clearedMessageWrappers: s.clearedMessageWrappers ?? null,
            scanning: s.scanning ?? null,
            savedChatAppearance: s.chatCustomized ?? false,
            panelOpacity: s.panelOpacity || null,
            error: result?.error || s.error || s.scanError || "",
            warning: s.warning || "",
          },
          null,
          2,
        );
      }
      function render(result) {
        last = result;
        $("connectionHeadline").textContent = names[result.code] || names.error;
        $("connectionResult").textContent = result.detail;
        $("connectionCard").dataset.state = result.code;
        $("connectionVersion").textContent = result.version
          ? "v" + result.version
          : "Preview";
        $("connectionDiagnostics").value = diagnostic(result);
        const tabs = result.tabs || [];
        if (!result.tabId && !tabs.length) chosen = null;
        $("instagramTarget").replaceChildren(
          ...tabs.map(
            (t, i) =>
              new Option(
                `Instagram ${i + 1} · ${t.route}${t.active ? " · active" : ""}`,
                String(t.id),
              ),
          ),
        );
        if (result.tabId) $("instagramTarget").value = String(result.tabId);
        $("instagramTargetRow").hidden = tabs.length < 2;
        $("reloadInstagram").disabled = !result.tabId;
        $("rescanPage").disabled = !result.status;
        onTarget(result.status?.chatId || null);
      }
      async function request(action = "check", automatic = false) {
        if (busy) return;
        clearTimeout(retryTimer);
        if (!automatic) autoChecks = 0;
        if (!extension) {
          render({
            code: "preview",
            detail:
              "This is a standalone dashboard preview. Install the LumGram folder through Load unpacked in your browser’s Extensions page, then open its toolbar icon on Instagram.",
            tabs: [],
          });
          return;
        }
        busy = true;
        $("connectionCard").dataset.state = "checking";
        $("repairConnection").disabled = true;
        $("checkConnection").disabled = true;
        $("connectionHeadline").textContent =
          action === "connect"
            ? "Connecting and applying…"
            : "Checking Instagram…";
        $("connectionResult").textContent =
          "Your saved themes, chat profiles and backgrounds will not be reset.";
        let timer;
        try {
          const result = await Promise.race([
            chrome.runtime.sendMessage({
              type: "LUMGRAM_CONNECTION",
              action,
              tabId: chosen,
            }),
            new Promise((_, reject) => {
              timer = setTimeout(
                () =>
                  reject(
                    new Error(
                      "The extension worker did not respond. Reload LumGram in Extensions and refresh Instagram.",
                    ),
                  ),
                25000,
              );
            }),
          ]);
          if (!result)
            throw new Error(
              "The connection helper is unavailable. Replace all update files, then reload LumGram in Extensions.",
            );
          render(result);
          if (result.code === "applying" && autoChecks < 4) {
            autoChecks++;
            retryTimer = setTimeout(() => request("check", true), 1500);
          }
        } catch (error) {
          render({
            code: "error",
            detail: error.message,
            error: error.message,
            version: chrome.runtime.getManifest().version,
            tabs: [],
          });
        } finally {
          clearTimeout(timer);
          busy = false;
          $("repairConnection").disabled = !extension;
          $("checkConnection").disabled = false;
        }
      }
      $("checkConnection").addEventListener("click", () => request());
      $("repairConnection").addEventListener("click", () => request("connect"));
      $("rescanPage").addEventListener("click", () => request("rescan"));
      $("instagramTarget").addEventListener("change", () => {
        chosen = Number($("instagramTarget").value) || null;
        request();
      });
      $("reloadInstagram").addEventListener("click", () => {
        if (
          confirm(
            "Reload the selected Instagram tab? This may discard unsent text or unfinished edits. Your saved LumGram settings will stay intact.",
          )
        )
          request("reload");
      });
      $("openExtensionSettings").addEventListener("click", () => {
        if (extension)
          chrome.tabs.create({
            url: "chrome://extensions/?id=" + chrome.runtime.id,
          });
      });
      $("copyDiagnostics").addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(diagnostic(last));
          $("diagnosticHint").textContent =
            "Copied. You can paste this report into the conversation.";
        } catch {
          $("connectionDiagnostics").focus();
          $("connectionDiagnostics").select();
          $("diagnosticHint").textContent = "Select and copy the report below.";
        }
      });
      if (extension)
        chrome.storage.onChanged.addListener((changes) => {
          if (changes.instagram_enable && !busy) request();
        });
      if (!extension) {
        $("repairConnection").disabled = true;
        $("openExtensionSettings").disabled = true;
      }
      request();
      return { check: request };
    },
  };
})();
