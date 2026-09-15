/* LumGram's eight surface groups. Instagram has no Discord gradient channels. */
(() => {
  const L = globalThis.LumGram;
  L.groups = {
    chat: "Direct conversation",
    highest: "Message composer & inputs",
    lowest: "Feed, Reels & post cards",
    lower: "Headers & structural rails",
    low: "Explore & search",
    high: "Inbox list & profile header",
    higher: "Dialogs & popovers",
    appframe: "Page canvas",
  };
  L.panelValues = (state) =>
    Object.fromEntries(
      Object.keys(L.groups).map((key) => [
        key,
        state.instagram_bg_overlay_advanced === "1"
          ? L.clamp(
              state["instagram_bg_grad_" + key],
              0,
              100,
              L.defaults["instagram_bg_grad_" + key],
            ) / 100
          : L.clamp(state.lumgram_bg_overlay, 0, 100, 55) / 100,
      ]),
    );
  L.rgb = (hex) =>
    [1, 3, 5].map((i) => parseInt(L.hex(hex).slice(i, i + 2), 16));
  L.rgba = (hex, a) => `rgba(${L.rgb(hex).join(",")},${L.clamp(a, 0, 1, 0)})`;
  L.panelCSS = (state, color) => {
    const values = L.panelValues(state);
    const surfaces = Object.entries(values)
      .map(
        ([key, opacity]) =>
          `--lumgram-${key}: linear-gradient(${L.rgba(color, opacity)},${L.rgba(color, opacity)}) fixed center / cover, var(--lumgram-image) fixed center / cover;`,
      )
      .join("\n");
    const input = L.rgba(color, values.highest);
    return (
      surfaces +
      `\n--lumgram-control-surface:linear-gradient(${input},${input});`
    );
  };
})();
