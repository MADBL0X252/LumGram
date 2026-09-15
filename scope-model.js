/* Site-wide appearance and independently saved Direct-thread settings. */
(() => {
  const L = globalThis.LumGram;
  L.chatId = (value = location.href) => {
    const raw = String(value || "").trim();
    if (/^\d{1,80}$/.test(raw)) return raw;
    try {
      const url = new URL(raw, location.origin);
      if (!["www.instagram.com", "instagram.com"].includes(url.hostname))
        return null;
      return (
        url.pathname.match(/^\/direct\/t\/(\d{1,80})(?:\/|$)/)?.[1] || null
      );
    } catch {
      return null;
    }
  };
  L.appearanceKeys = Object.keys(L.defaults).filter(
    (k) =>
      ![
        "instagram_enable",
        "instagram_icon_id",
        "lumgram_presets",
        "lumgram_animations",
      ].includes(k),
  );
  L.appearance = (input = {}, complete = false) =>
    Object.fromEntries(
      L.appearanceKeys
        .filter((k) => complete || Object.hasOwn(input, k))
        .map((k) => [k, input[k] ?? L.defaults[k]]),
    );
  L.profile = (raw, id) =>
    id && Object.hasOwn(raw.lumgram_chat_profiles || {}, id)
      ? raw.lumgram_chat_profiles[id]
      : null;
  L.effective = (raw, id) => ({
    ...L.defaults,
    ...raw,
    ...L.appearance(L.profile(raw, id)?.settings || {}),
  });
  L.navDefaults = {
    ...L.appearance(L.defaults, true),
    lumgram_bg_mode: "color",
    lumgram_bg_color: "#18181b",
    lumgram_bg_overlay: 55,
    instagram_bg_overlay_advanced: "0",
  };
  L.navEffective = (raw) => {
    const result = {
      ...L.defaults,
      ...raw,
      ...L.navDefaults,
      ...LumFonts.settings(raw),
      ...L.appearance(raw.lumgram_nav_profile?.settings || {}),
    };
    result.lumgram_bg_overlay = L.clamp(result.lumgram_bg_overlay, 0, 95, 55);
    result.instagram_bg_overlay_advanced = "0";
    return result;
  };
})();
