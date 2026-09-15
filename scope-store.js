/* Dashboard scope router. Global state and chat profiles never share writes. */
(() => {
  const L = globalThis.LumGram;
  globalThis.LumScope = {
    create(rawStore, extension) {
      let scope = "site",
        currentChat = null;
      let lastRaw = {};
      async function raw() {
        return (lastRaw = await rawStore.get(null));
      }
      async function init() {
        await raw();
        if (extension)
          try {
            const result = await chrome.runtime.sendMessage({
              type: "LUMGRAM_CONNECTION",
              action: "check",
            });
            currentChat = L.chatId(result?.status?.chatId);
          } catch {}
        const requested = sessionStorage.getItem("lumgram_edit_scope");
        scope = ["site", "nav"].includes(requested)
          ? requested
          : L.chatId(requested) ||
            (currentChat && L.profile(lastRaw, currentChat)
              ? currentChat
              : "site");
      }
      async function get() {
        const data = await raw();
        return scope === "site"
          ? { ...L.defaults, ...data }
          : scope === "nav"
            ? L.navEffective(data)
            : L.effective(data, scope);
      }
      async function set(patch) {
        const data = await raw();
        if (scope === "site") {
          await rawStore.set(patch);
          return;
        }
        if (scope === "nav") {
          const local = L.appearance(patch);
          if ("lumgram_bg_overlay" in local)
            local.lumgram_bg_overlay = L.clamp(
              local.lumgram_bg_overlay,
              0,
              95,
              55,
            );
          const shared = Object.fromEntries(
            Object.entries(patch).filter(
              ([key]) => !L.appearanceKeys.includes(key),
            ),
          );
          if (Object.keys(local).length)
            shared.lumgram_nav_profile = {
              settings: {
                ...(data.lumgram_nav_profile?.settings || {}),
                ...local,
              },
              updatedAt: new Date().toISOString(),
            };
          await rawStore.set(shared);
          return;
        }
        const shared = Object.fromEntries(
          Object.entries(patch).filter(
            ([key]) => !L.appearanceKeys.includes(key),
          ),
        );
        const local = L.appearance(patch);
        if (Object.keys(local).length) {
          const prior = L.profile(data, scope);
          const profile = {
            id: scope,
            label: prior?.label || "Chat " + scope.slice(-8),
            settings: {
              ...L.appearance(prior ? prior.settings : data, true),
              ...local,
            },
            updatedAt: new Date().toISOString(),
          };
          shared.lumgram_chat_profiles = {
            ...(data.lumgram_chat_profiles || {}),
            [scope]: profile,
          };
        }
        await rawStore.set(shared);
      }
      function choose(id) {
        sessionStorage.setItem(
          "lumgram_edit_scope",
          ["site", "nav"].includes(id) ? id : L.chatId(id) || "site",
        );
        location.reload();
      }
      async function create(id, label) {
        id = L.chatId(id);
        if (!id)
          throw new Error(
            "Open a Direct chat or paste its Instagram /direct/t/… link.",
          );
        const data = await raw(),
          old = L.profile(data, id);
        const profile = {
          id,
          label: String(label || old?.label || "Chat " + id.slice(-8))
            .trim()
            .slice(0, 64),
          settings: L.appearance(old ? old.settings : data, true),
          updatedAt: new Date().toISOString(),
        };
        await rawStore.set({
          lumgram_chat_profiles: {
            ...(data.lumgram_chat_profiles || {}),
            [id]: profile,
          },
        });
        choose(id);
      }
      async function reset() {
        const data = await raw(),
          profiles = { ...(data.lumgram_chat_profiles || {}) };
        delete profiles[scope];
        await rawStore.set({ lumgram_chat_profiles: profiles });
        choose("site");
      }
      async function saveProfile(label) {
        if (["site", "nav"].includes(scope)) return;
        const data = await raw(),
          old = L.profile(data, scope);
        await rawStore.set({
          lumgram_chat_profiles: {
            ...(data.lumgram_chat_profiles || {}),
            [scope]: {
              id: scope,
              label: String(label || old?.label || "Chat " + scope.slice(-8))
                .trim()
                .slice(0, 64),
              settings: L.appearance(old ? old.settings : data, true),
              updatedAt: new Date().toISOString(),
            },
          },
        });
      }
      async function mount({ flush, status }) {
        const $ = (id) => document.getElementById(id);
        const data = await raw(),
          select = $("appearanceScope");
        select.replaceChildren(
          new Option("Overall / site appearance", "site"),
          new Option("Navigation bar", "nav"),
        );
        document.documentElement.dataset.editorScope =
          scope === "nav" ? "nav" : scope === "site" ? "site" : "chat";
        for (const [id, p] of Object.entries(
          data.lumgram_chat_profiles || {},
        ).filter(([id]) => L.chatId(id))) {
          select.append(new Option(p.label || "Chat " + id.slice(-8), id));
        }
        if (!["site", "nav"].includes(scope) && !L.profile(data, scope))
          select.append(new Option("Chat " + scope.slice(-8), scope));
        select.value = scope;
        $("chatScopeControls").hidden = ["site", "nav"].includes(scope);
        $("chatLocalName").value = L.profile(data, scope)?.label || "";
        $("scopeDescription").textContent =
          scope === "site"
            ? "Shared look for Home, Feed, Explore, Reels, Notifications, Create, Profiles and the inbox. Navigation is independent. Unsaved chats inherit this look."
            : scope === "nav"
              ? "Independent left-side / bottom navigation bar. Its background and opacity do not follow the site or chats. Transparency still reveals the page behind it."
              : "Editing only this saved conversation. Its background, opacity and fonts are independent. The inbox keeps the site look; navigation keeps its own look.";
        $("scopeStatus").textContent =
          scope === "site"
            ? "OVERALL / SITE"
            : scope === "nav"
              ? "NAVIGATION"
              : "CHAT · " + scope.slice(-8);
        $("customizeCurrentChat").disabled = !currentChat;
        $("currentChatHint").textContent = currentChat
          ? "Current Direct chat detected: …" + currentChat.slice(-8)
          : "Open a Direct conversation and reopen this popup, or paste a chat link below.";
        select.addEventListener("change", async () => {
          await flush();
          choose(select.value);
        });
        $("customizeCurrentChat").addEventListener("click", async () => {
          try {
            await flush();
            await create(currentChat);
          } catch (e) {
            status(e.message, true);
          }
        });
        $("addChatProfile").addEventListener("click", async () => {
          try {
            await flush();
            await create($("chatLink").value);
          } catch (e) {
            status(e.message, true);
          }
        });
        $("saveChatProfile").addEventListener("click", async () => {
          await flush();
          await saveProfile($("chatLocalName").value);
          const opt = select.querySelector(`option[value="${scope}"]`);
          if (opt)
            opt.textContent =
              $("chatLocalName").value || "Chat " + scope.slice(-8);
          status("This chat’s appearance is saved.");
        });
        $("resetChatProfile").addEventListener("click", async () => {
          if (
            confirm(
              "Remove this chat’s saved appearance and use the site-wide settings?",
            )
          ) {
            await flush();
            await reset();
          }
        });
      }
      function updateCurrentChat(id) {
        currentChat = L.chatId(id);
        const button = document.getElementById("customizeCurrentChat"),
          hint = document.getElementById("currentChatHint");
        if (button) button.disabled = !currentChat;
        if (hint)
          hint.textContent = currentChat
            ? "Connected Direct chat detected: …" + currentChat.slice(-8)
            : "Connect a Direct conversation above, or paste a chat link below.";
      }
      return {
        init,
        get,
        set,
        mount,
        current: () => scope,
        currentChat: () => currentChat,
        updateCurrentChat,
      };
    },
  };
})();
