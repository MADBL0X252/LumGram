/* Shared, locally hosted typography controls for Lumcord and LumGram. */
(() => {
  "use strict";
  const registry = [
    ["inter", "Inter", "sans-serif"],
    ["roboto", "Roboto", "sans-serif"],
    ["nunito", "Nunito", "sans-serif"],
    ["montserrat", "Montserrat", "sans-serif"],
    ["outfit", "Outfit", "sans-serif"],
    ["sourcesans3", "Source Sans 3", "sans-serif"],
    ["lora", "Lora", "serif"],
    ["jetbrainsmono", "JetBrains Mono", "monospace"],
  ].map(([id, name, fallback]) => ({ id, name, fallback }));
  const defaults = {
    lum_font_source: "native",
    lum_font_family: "inter",
    lum_font_device: "",
  };
  const clean = (name) =>
    String(name || "")
      .replace(/["'\\;{}\n\r\u0000-\u001f]/g, "")
      .trim()
      .slice(0, 100);
  function settings(state) {
    return {
      lum_font_source: ["native", "bundled", "device"].includes(
        state.lum_font_source,
      )
        ? state.lum_font_source
        : "native",
      lum_font_family: registry.some((f) => f.id === state.lum_font_family)
        ? state.lum_font_family
        : "inter",
      lum_font_device: clean(state.lum_font_device),
    };
  }
  function family(state) {
    const s = settings(state);
    if (s.lum_font_source === "device")
      return s.lum_font_device
        ? `"${s.lum_font_device}",system-ui,sans-serif`
        : "system-ui,sans-serif";
    const f = registry.find((f) => f.id === s.lum_font_family);
    return s.lum_font_source === "bundled"
      ? `"Lum ${f.name}",${f.fallback}`
      : null;
  }
  function faces(url) {
    return registry
      .map(
        (f) =>
          `@font-face{font-family:"Lum ${f.name}";src:url("${url("assets/fonts/" + f.id + ".ttf")}") format("truetype");font-weight:100 900;font-style:normal;font-display:swap;}`,
      )
      .join("\n");
  }
  function rules(state, selector, { nativeFallback = false } = {}) {
    const font =
      family(state) ||
      (nativeFallback ? 'system-ui,-apple-system,"Segoe UI",sans-serif' : null);
    if (!font) return "";
    // Keep SVG artwork and icon-font glyphs intact. Images/video are never filtered.
    const descendants = `${selector} :where(*:not([data-lumgram-notes],[data-lumgram-notes] *,svg,svg *,[aria-hidden="true"],[class*="iconfont"],[class*="iconfont"] *,[class*="material-icons"],[class*="material-icons"] *))`;
    return `${selector},${descendants}{font-family:${font} !important;}\n${selector} :is(input,textarea):not([data-lumgram-notes] *)::placeholder{font-family:${font} !important;}`;
  }
  function mount({ getState, save }) {
    const host = document.getElementById("fontControls");
    if (!host) return { sync() {} };
    const style = document.createElement("style");
    style.textContent = faces((path) => path);
    document.head.append(style);
    host.innerHTML = `<label class="field-label" for="fontSelect">Interface font</label><select id="fontSelect"><option value="native">Original / site font</option><optgroup label="Bundled fonts"></optgroup><option value="device">A font on this device…</option></select><div id="deviceFontPanel" hidden><label class="field-label" for="deviceFontName">Installed font family</label><input id="deviceFontName" type="text" list="deviceFontList" maxlength="100" placeholder="For example: Arial or Aptos"><datalist id="deviceFontList"></datalist><button id="listDeviceFonts" type="button" class="subtle-button">List device fonts</button><p class="quiet" id="fontDeviceStatus">Enter the exact installed family name. If unavailable, your system font is used.</p></div><div class="font-preview" id="fontPreview"><strong>Aa</strong><span>The quick brown fox<br>0123456789 · Your words, your style.</span></div><p class="quiet">Applies to interface text, headings, messages, buttons, inputs, and placeholders. Font size and layout stay native; image text and icon artwork are unchanged. Notes keep their original typography.</p>`;
    const typography = document.createElement("style");
    document.head.append(typography);
    const $ = (id) => document.getElementById(id),
      group = host.querySelector("optgroup");
    for (const f of registry)
      group.append(new Option(f.name, "bundled:" + f.id));
    const populate = (names) => {
      $("deviceFontList").replaceChildren();
      for (const name of [...new Set(names)].sort((a, b) =>
        a.localeCompare(b),
      )) {
        const o = document.createElement("option");
        o.value = name;
        $("deviceFontList").append(o);
      }
    };
    populate([
      "Arial",
      "Arial Narrow",
      "Aptos",
      "Calibri",
      "Cambria",
      "Candara",
      "Consolas",
      "Courier New",
      "DejaVu Sans",
      "DejaVu Serif",
      "Georgia",
      "Helvetica Neue",
      "Liberation Sans",
      "Noto Sans",
      "Palatino Linotype",
      "Segoe UI",
      "Tahoma",
      "Times New Roman",
      "Trebuchet MS",
      "Verdana",
    ]);
    function sync() {
      const s = settings(getState());
      typography.textContent = rules(s, "body");
      $("fontSelect").value =
        s.lum_font_source === "bundled"
          ? "bundled:" + s.lum_font_family
          : s.lum_font_source;
      $("deviceFontPanel").hidden = s.lum_font_source !== "device";
      $("deviceFontName").value = s.lum_font_device;
      $("fontPreview").style.fontFamily = family(s) || "system-ui,sans-serif";
    }
    $("fontSelect").addEventListener("change", async () => {
      const v = $("fontSelect").value;
      await save(
        {
          lum_font_source: v.startsWith("bundled:") ? "bundled" : v,
          ...(v.startsWith("bundled:")
            ? { lum_font_family: v.split(":")[1] }
            : {}),
        },
        "Font saved.",
      );
      sync();
    });
    $("deviceFontName").addEventListener("change", async () => {
      await save(
        {
          lum_font_device: clean($("deviceFontName").value),
          lum_font_source: "device",
        },
        "Device font name saved.",
      );
      sync();
    });
    $("listDeviceFonts").addEventListener("click", async () => {
      if (typeof window.queryLocalFonts !== "function") {
        $("fontDeviceStatus").textContent =
          "This browser cannot list installed fonts here. Enter a family name above; installed fonts can still be used.";
        return;
      }
      try {
        const fonts = await window.queryLocalFonts();
        populate(fonts.map((f) => f.family));
        $("fontDeviceStatus").textContent =
          `${$("deviceFontList").children.length} font families found. Type in the field to choose one. Names remain on this device.`;
        $("deviceFontName").focus();
      } catch {
        $("fontDeviceStatus").textContent =
          "Font-list access was declined or is unavailable in this popup. You can still type an installed family name above.";
      }
    });
    sync();
    return { sync };
  }
  globalThis.LumFonts = {
    registry,
    defaults,
    settings,
    family,
    faces,
    rules,
    mount,
  };
})();
