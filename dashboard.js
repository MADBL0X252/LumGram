/* LumGram dashboard. No remote services, patch feeds or notification code. */
(() => {
  "use strict";
  const L = globalThis.LumGram,
    $ = (id) => document.getElementById(id);
  const extension = !!globalThis.chrome?.storage?.local;
  const rawStore = extension
    ? chrome.storage.local
    : {
        get: async () =>
          JSON.parse(localStorage.getItem("lumgram-preview-settings") || "{}"),
        set: async (patch) =>
          localStorage.setItem(
            "lumgram-preview-settings",
            JSON.stringify({ ...(await rawStore.get()), ...patch }),
          ),
      };
  const scopeStore = LumScope.create(rawStore, extension);
  const store = scopeStore;
  let state = { ...L.defaults },
    limit = 12,
    editingId = null,
    persist = Promise.resolve(),
    previewTimer,
    previewVersion = 0,
    fontsUI;
  function status(message, error = false) {
    $("saveStatus").textContent = message;
    $("saveStatus").classList.toggle("error", error);
  }
  async function save(patch, message = "Saved on this device.") {
    Object.assign(state, patch);
    const task = persist.then(() => store.set(patch));
    persist = task.catch(() => {});
    try {
      await task;
      status(message);
      return true;
    } catch (e) {
      status("Could not save: " + e.message, true);
      return false;
    }
  }
  function own() {
    return Array.isArray(state.lumgram_presets)
      ? state.lumgram_presets.map(L.normalize)
      : [];
  }
  function all() {
    return [...L.builtins, ...own()];
  }
  function selected() {
    return (
      all().find((t) => t.id === state.instagram_theme_id) || L.builtins[21]
    );
  }
  function isCustomBackground() {
    return (
      state.instagram_use_custom_bg === "1" &&
      L.validImage(state.instagram_custom_bg)
    );
  }
  function renderThemes() {
    fontsUI?.sync();
    const current = selected();
    $("themeSelect").replaceChildren();
    for (const groupName of ["LumGram 50", "Classics", "My presets"]) {
      const group = document.createElement("optgroup");
      group.label = groupName;
      for (const t of all().filter((t) => t.group === groupName)) {
        const option = new Option(t.name, t.id);
        group.append(option);
      }
      if (group.children.length) $("themeSelect").append(group);
    }
    $("themeSelect").value = current.id;
    $("themeCount").textContent =
      `71 built-in${own().length ? " · " + own().length + " personal" : ""} presets`;
    $("editPreset").textContent = own().some((t) => t.id === current.id)
      ? "Edit preset"
      : "Edit a copy";
    $("deletePreset").hidden = !own().some((t) => t.id === current.id);
    $("previewName").textContent = current.name;
    $("sourceLabel").textContent = isCustomBackground()
      ? "CUSTOM BACKGROUND"
      : current.group === "My presets"
        ? "YOUR COLLECTION"
        : current.group === "Classics"
          ? "REIMAGINED CLASSICS"
          : "LUMGRAM COLLECTION";
    $("themePreview").style.background =
      state.lumgram_bg_mode === "color"
        ? L.hex(state.lumgram_bg_color)
        : L.gradient(current);
    const query = $("themeSearch").value.trim().toLowerCase();
    const matches = [
      ...L.builtins.filter((t) => t.group === "LumGram 50"),
      ...own(),
      ...L.builtins.filter((t) => t.group === "Classics"),
    ].filter((t) => (t.name + " " + t.group).toLowerCase().includes(query));
    $("presetGrid").replaceChildren();
    for (const t of matches.slice(0, limit)) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "preset-tile";
      b.title = t.name;
      b.setAttribute("aria-label", "Apply " + t.name);
      b.setAttribute("aria-pressed", String(current.id === t.id));
      const swatch = document.createElement("span");
      swatch.className = "swatch";
      swatch.style.background = L.gradient(t);
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = t.name;
      b.append(swatch, name);
      b.addEventListener("click", () => applyPreset(t.id));
      $("presetGrid").append(b);
    }
    if (!matches.length) {
      const p = document.createElement("p");
      p.className = "quiet";
      p.textContent = "No matching palettes. Try another name.";
      $("presetGrid").append(p);
    }
    $("showMore").hidden = matches.length <= 12;
    $("showMore").textContent =
      limit >= matches.length
        ? "Show fewer palettes"
        : `Show more palettes (${matches.length - Math.min(limit, matches.length)} left)`;
    updatePreview();
  }
  async function applyPreset(id) {
    const t = all().find((t) => t.id === id);
    if (!t) return;
    const settings = t.group === "My presets" ? L.filter(t.settings) : {};
    await save(
      {
        ...settings,
        instagram_theme_id: id,
        lumgram_bg_mode: settings.lumgram_bg_mode || "theme",
        instagram_use_custom_bg: settings.instagram_use_custom_bg || "0",
      },
      "Applied " + t.name + ".",
    );
    renderThemes();
    syncBackground();
  }
  function renderIcons() {
    for (let i = 0; i <= 19; i++) {
      const id = i ? "icon" + i : "icon",
        label = document.createElement("label"),
        input = document.createElement("input"),
        img = document.createElement("img");
      input.type = "radio";
      input.name = "icon";
      input.value = id;
      input.checked = state.instagram_icon_id === id;
      input.setAttribute(
        "aria-label",
        i ? "Camera mark " + i : "Native Instagram logo",
      );
      img.src = i ? `assets/icons/icon-${i}.svg` : "assets/img/lumgram-48.png";
      img.alt = "";
      label.title = i ? "Camera mark " + i : "Keep Instagram logo";
      label.append(input, img);
      $("icons").append(label);
      input.addEventListener("change", () => save({ instagram_icon_id: id }));
    }
  }
  const ranges = [
    ["compositionRanges", "bgZoom", "Zoom", "lumgram_bg_zoom", 50, 200, 1, "%"],
    [
      "compositionRanges",
      "bgX",
      "Horizontal position",
      "lumgram_bg_x",
      0,
      100,
      1,
      "%",
    ],
    [
      "compositionRanges",
      "bgY",
      "Vertical position",
      "lumgram_bg_y",
      0,
      100,
      1,
      "%",
    ],
    [
      "imageRanges",
      "imageOpacity",
      "Image opacity",
      "lumgram_bg_opacity",
      0,
      100,
      1,
      "%",
    ],
    [
      "imageRanges",
      "imageBlurSlider",
      "Image blur",
      "instagram_bg_image_blur",
      0,
      40,
      1,
      "px",
    ],
    [
      "imageRanges",
      "bgBrightness",
      "Brightness",
      "lumgram_bg_brightness",
      25,
      175,
      1,
      "%",
    ],
    [
      "imageRanges",
      "bgContrast",
      "Contrast",
      "lumgram_bg_contrast",
      25,
      175,
      1,
      "%",
    ],
    [
      "imageRanges",
      "bgSaturation",
      "Saturation",
      "lumgram_bg_saturation",
      0,
      200,
      1,
      "%",
    ],
    [
      "overlayRange",
      "overlayAlpha",
      "Overall panel opacity",
      "lumgram_bg_overlay",
      0,
      100,
      1,
      "%",
    ],
    [
      "overlayRange",
      "backgroundTint",
      "Background tint opacity",
      "instagram_bg_grad_tint",
      0,
      100,
      1,
      "%",
    ],
    [
      "panelRanges",
      "advLowest",
      "Feed & post cards",
      "instagram_bg_grad_lowest",
      0,
      100,
      1,
      "%",
    ],
    [
      "panelRanges",
      "advHigher",
      "Dialogs & popovers",
      "instagram_bg_grad_higher",
      0,
      100,
      1,
      "%",
    ],
    [
      "panelRanges",
      "advChat",
      "Direct conversation",
      "instagram_bg_grad_chat",
      0,
      100,
      1,
      "%",
    ],
    [
      "panelRanges",
      "advHighest",
      "Message composer & inputs",
      "instagram_bg_grad_highest",
      0,
      100,
      1,
      "%",
    ],
    [
      "panelRanges",
      "advLower",
      "Headers & structural rails",
      "instagram_bg_grad_lower",
      0,
      100,
      1,
      "%",
    ],
    [
      "panelRanges",
      "advLow",
      "Explore & search",
      "instagram_bg_grad_low",
      0,
      100,
      1,
      "%",
    ],
    [
      "panelRanges",
      "advHigh",
      "Inbox list & profile header",
      "instagram_bg_grad_high",
      0,
      100,
      1,
      "%",
    ],
    [
      "panelRanges",
      "advAppFrame",
      "Page canvas",
      "instagram_bg_grad_appframe",
      0,
      100,
      1,
      "%",
    ],
  ];
  function createRanges() {
    for (const [container, id, label, key, min, max, step, unit] of ranges) {
      const wrap = document.createElement("div");
      wrap.className = "range-row";
      const row = document.createElement("div");
      row.className = "range-label";
      const lab = document.createElement("label");
      lab.htmlFor = id;
      lab.textContent = label;
      const output = document.createElement("output");
      output.id = id + "Value";
      output.htmlFor = id;
      row.append(lab, output);
      const input = document.createElement("input");
      input.type = "range";
      input.id = id;
      input.min = min;
      input.max = max;
      input.step = step;
      input.setAttribute("aria-label", label);
      wrap.append(row, input);
      $(container).append(wrap);
      input.addEventListener("input", () => {
        output.textContent = input.value + unit;
        save({ [key]: input.value });
        syncDestinationPaint();
        updatePreview();
      });
    }
  }
  function syncDestinationPaint() {
    const nav = scopeStore.current() === "nav";
    const kind = isCustomBackground()
      ? "image"
      : state.lumgram_bg_mode || "theme";
    $("backgroundKind").value = ["theme", "color", "image"].includes(kind)
      ? kind
      : "theme";
    $("solidColorRow").hidden = kind !== "color";
    $("surfaceColor").value = L.hex(state.lumgram_bg_color, "#18181b");
    $("surfaceColorHex").textContent = $("surfaceColor").value;
    $("navigationOpacityRow").hidden = false;
    $("navigationOpacity").max = nav ? "95" : "100";
    $("navigationOpacity").disabled =
      !nav && state.instagram_bg_overlay_advanced === "1";
    $("navigationOpacity").value = L.clamp(
      state.lumgram_bg_overlay,
      0,
      nav ? 95 : 100,
      55,
    );
    $("destinationOpacityLabel").textContent = nav
      ? "Navigation background opacity"
      : scopeStore.current() === "site"
        ? "Overall background / panel opacity"
        : "Chat background / panel opacity";
    $("destinationOpacityHint").textContent = nav
      ? "0% is clear; 95% is nearly opaque. Only the background fades, never icons or text. Site/chat changes never move this slider."
      : state.instagram_bg_overlay_advanced === "1"
        ? "Individual panel mode is on. Adjust it under Custom background → Panel opacity below, or turn it off to use this slider."
        : "0% reveals this destination’s color/image; 100% covers it with panel tint. Navigation and other saved destinations are not changed.";
    $("navigationOpacityValue").textContent =
      $("navigationOpacity").value + "%";
    $("backgroundKindHint").textContent =
      kind === "image"
        ? "Upload or adjust this destination’s image in Custom background below."
        : kind === "color"
          ? "This color is saved only to the selected destination."
          : "Choose a palette in Theme studio below. It applies only to this destination.";
  }
  function syncBackground() {
    syncDestinationPaint();
    const image = L.validImage(state.instagram_custom_bg);
    $("bgControls").disabled = !image;
    $("opacityControls").disabled = false;
    $("backgroundTint").disabled = !image;
    $("useCustomBgToggle").disabled = !image;
    $("useCustomBgToggle").checked = isCustomBackground();
    $("removeCustomBg").disabled = !image;
    $("customBgPreviewWrap").hidden = !image;
    $("uploadLabel").textContent = image
      ? "Replace your image"
      : "Choose an image";
    $("bgFit").value = state.lumgram_bg_fit;
    $("bgBase").value = L.hex(state.lumgram_bg_base, "#161616");
    $("overlayColorPicker").value = L.hex(
      state.instagram_bg_overlay_color,
      "#000000",
    );
    $("overlayColorHex").textContent =
      $("overlayColorPicker").value.toUpperCase();
    $("advancedModeToggle").checked =
      state.instagram_bg_overlay_advanced === "1";
    $("advancedPanel").hidden = !$("advancedModeToggle").checked;
    $("overlayAlpha").disabled = $("advancedModeToggle").checked;
    for (const [, id, , key, , , , unit] of ranges) {
      $(id).value = state[key];
      $(id + "Value").textContent = $(id).value + unit;
    }
    updatePreview();
  }
  function updatePreview() {
    clearTimeout(previewTimer);
    const version = ++previewVersion;
    previewTimer = setTimeout(async () => {
      try {
        const current = selected(),
          hasImage = L.validImage(state.instagram_custom_bg);
        const rendered = hasImage
          ? await L.renderImage({ ...state }, 640, 360)
          : "";
        if (version !== previewVersion) return;
        if (rendered) $("customBgPreview").src = rendered;
        else $("customBgPreview").removeAttribute("src");
        const tint = L.hex(state.instagram_bg_overlay_color, "#000000"),
          alpha = L.clamp(state.instagram_bg_grad_tint, 0, 100, 20) / 100;
        const values = L.panelValues(state);
        const panelTint = isCustomBackground() ? tint : "#000000";
        const panelRGBA = (opacity) =>
          panelTint +
          Math.round(opacity * 255)
            .toString(16)
            .padStart(2, "0");
        $("themePreview").querySelector(".mock-chat").style.background =
          panelRGBA(values.chat);
        $("themePreview").querySelector(".mock-sidebar").style.background =
          panelRGBA(values.appframe);
        $("themePreview").querySelector(".mock-input").style.background =
          panelRGBA(values.highest);
        $("customBgOverlay").style.background = tint;
        $("customBgOverlay").style.opacity = alpha;
        if (isCustomBackground() && rendered) {
          $("themePreview").style.backgroundImage = `linear-gradient(${
            tint +
            Math.round(alpha * 255)
              .toString(16)
              .padStart(2, "0")
          },${
            tint +
            Math.round(alpha * 255)
              .toString(16)
              .padStart(2, "0")
          }),url("${rendered}")`;
          $("themePreview").style.backgroundSize = "cover";
          $("ambientImage").style.backgroundImage = `url("${rendered}")`;
        } else {
          $("themePreview").style.background =
            state.lumgram_bg_mode === "color"
              ? L.hex(state.lumgram_bg_color)
              : L.gradient(current);
          $("ambientImage").style.backgroundImage = "none";
        }
        $("sourceLabel").textContent = isCustomBackground()
          ? "CUSTOM BACKGROUND"
          : state.lumgram_bg_mode === "color"
            ? "SOLID COLOR"
            : current.group === "My presets"
              ? "YOUR COLLECTION"
              : current.group === "Classics"
                ? "REIMAGINED CLASSICS"
                : "LUMGRAM COLLECTION";
      } catch (e) {
        status(e.message, true);
      }
    }, 90);
  }
  async function upload(file) {
    if (!file) return;
    if (
      !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
        file.type,
      )
    )
      return status("Choose a PNG, JPEG, WebP or GIF image.", true);
    if (file.size > 15 * 1024 * 1024)
      return status("Please choose an image smaller than 15 MB.", true);
    status("Preparing your image locally…");
    try {
      const source = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(new Error("Unable to read this image."));
        r.readAsDataURL(file);
      });
      const img = await L.loadImage(source),
        scale = Math.min(
          1,
          2560 / Math.max(img.naturalWidth, img.naturalHeight),
        );
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(img.naturalWidth * scale));
      c.height = Math.max(1, Math.round(img.naturalHeight * scale));
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const optimized = c.toDataURL("image/webp", 0.94);
      await save(
        {
          instagram_custom_bg: optimized,
          instagram_use_custom_bg: "1",
          lumgram_bg_mode: "image",
        },
        "Background saved locally.",
      );
      syncBackground();
    } catch (e) {
      status(e.message, true);
    } finally {
      $("customBgInput").value = "";
    }
  }
  function draft() {
    return L.normalize({
      id: editingId || "",
      name: $("presetName").value,
      colors: [
        $("presetColor1").value,
        $("presetColor2").value,
        $("presetColor3").value,
      ],
      accent: $("presetAccent").value,
      angle: $("presetAngle").value,
      kind: $("presetKind").value,
    });
  }
  function updateDraft() {
    const t = draft();
    $("editorPreview").style.background = L.gradient(t);
    $("editorPreview").firstElementChild.textContent =
      t.name || "Your next mood";
    $("presetAngleValue").textContent = t.angle + "°";
    $("presetAngle").disabled = t.kind === "radial";
  }
  function openEditor(mode) {
    const current = L.normalize(selected());
    editingId =
      mode === "edit" && own().some((t) => t.id === current.id)
        ? current.id
        : null;
    $("presetEditor").hidden = false;
    $("editorTitle").textContent = editingId
      ? "Edit your preset"
      : "Create something personal";
    $("presetName").value =
      mode === "new"
        ? ""
        : editingId
          ? current.name
          : current.name + " — my mix";
    current.colors.forEach((c, i) => ($("presetColor" + (i + 1)).value = c));
    $("presetAccent").value = current.accent;
    $("presetKind").value = current.kind;
    $("presetAngle").value = current.angle;
    $("saveBackground").checked = isCustomBackground();
    updateDraft();
    $("presetName").focus();
  }
  function closeEditor() {
    editingId = null;
    $("presetEditor").hidden = true;
  }
  async function boot() {
    await scopeStore.init();
    let raw;
    try {
      raw = await store.get(null);
    } catch (e) {
      status("Stored settings could not be read: " + e.message, true);
      return;
    }
    state = { ...L.defaults, ...raw };
    // Only known, valid personal themes are read; imported storage never becomes executable CSS.
    state.lumgram_presets = (
      Array.isArray(raw.lumgram_presets) ? raw.lumgram_presets : []
    )
      .filter((t) => t && typeof t.id === "string" && t.id.startsWith("user-"))
      .map((t) => ({
        ...L.normalize({ ...t, css: undefined, group: "My presets" }),
        group: "My presets",
      }));
    for (const b of document.querySelectorAll(".accordion-header"))
      b.addEventListener("click", () => {
        const open = b.getAttribute("aria-expanded") === "true";
        b.setAttribute("aria-expanded", String(!open));
        $(b.getAttribute("aria-controls")).hidden = open;
        b.closest(".accordion-item").classList.toggle("open", !open);
      });
    $("openFull").addEventListener("click", () =>
      extension
        ? chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") })
        : window.open(location.href, "_blank"),
    );
    const syncMotion = () => {
      $("animationsToggle").checked = state.lumgram_animations !== "0";
      document.documentElement.dataset.lumgramMotion = String(
        state.lumgram_animations !== "0",
      );
    };
    syncMotion();
    $("animationsToggle").addEventListener("change", () => {
      save({ lumgram_animations: $("animationsToggle").checked ? "1" : "0" });
      syncMotion();
    });
    $("enableToggle").checked = ["1", 1, true].includes(state.instagram_enable);
    $("themeStyleToggle").checked = state.instagram_theme_style === "ash";
    const labels = () => {
      $("enableLabel").textContent = $("enableToggle").checked
        ? "Active"
        : "Inactive";
      $("themeStyleLabel").textContent = $("themeStyleToggle").checked
        ? "Dark mode"
        : "Light mode";
    };
    labels();
    $("enableToggle").addEventListener("change", () => {
      save({ instagram_enable: $("enableToggle").checked ? "1" : "0" });
      labels();
    });
    $("themeStyleToggle").addEventListener("change", () => {
      save({
        instagram_theme_style: $("themeStyleToggle").checked ? "ash" : "light",
      });
      labels();
    });
    $("themeSelect").addEventListener("change", (e) =>
      applyPreset(e.target.value),
    );
    $("themeSearch").addEventListener("input", () => {
      limit = 12;
      renderThemes();
    });
    $("showMore").addEventListener("click", () => {
      const q = $("themeSearch").value.toLowerCase();
      const count = all().filter((t) =>
        (t.name + " " + t.group).toLowerCase().includes(q),
      ).length;
      limit = limit >= count ? 12 : limit + 24;
      renderThemes();
    });
    $("newPreset").addEventListener("click", () => openEditor("new"));
    $("editPreset").addEventListener("click", () => openEditor("edit"));
    $("closeEditor").addEventListener("click", closeEditor);
    $("cancelPreset").addEventListener("click", closeEditor);
    $("presetEditor").addEventListener("input", updateDraft);
    $("presetEditor").addEventListener("submit", async (e) => {
      e.preventDefault();
      const t = draft();
      if (!$("presetName").value.trim()) {
        status("Give your preset a name first.", true);
        $("presetName").focus();
        return;
      }
      if (
        own().some(
          (p) =>
            p.id !== editingId && p.name.toLowerCase() === t.name.toLowerCase(),
        )
      )
        return status(
          "You already have a preset with that name. Choose another.",
          true,
        );
      t.id = editingId || "user-" + crypto.randomUUID();
      t.group = "My presets";
      t.settings = $("saveBackground").checked
        ? L.snapshot(state)
        : { instagram_use_custom_bg: "0" };
      t.settings = { ...t.settings, ...LumFonts.settings(state) };
      const presets = own(),
        index = presets.findIndex((p) => p.id === t.id);
      if (index >= 0) presets[index] = t;
      else presets.push(t);
      $("savePreset").disabled = true;
      const ok = await save(
        {
          lumgram_presets: presets,
          instagram_theme_id: t.id,
          ...L.filter(t.settings),
        },
        "Saved and applied " + t.name + ".",
      );
      $("savePreset").disabled = false;
      if (ok) {
        closeEditor();
        renderThemes();
        syncBackground();
      }
    });
    $("deletePreset").addEventListener("click", async () => {
      const t = selected();
      if (
        !own().some((p) => p.id === t.id) ||
        !confirm(`Delete “${t.name}”? This cannot be undone.`)
      )
        return;
      await save(
        {
          lumgram_presets: own().filter((p) => p.id !== t.id),
          instagram_theme_id: "lumgram-01",
          instagram_use_custom_bg: "0",
        },
        "Preset deleted.",
      );
      closeEditor();
      renderThemes();
      syncBackground();
    });
    await scopeStore.mount({ flush: () => persist, status });
    $("backgroundKind").addEventListener("change", async () => {
      const kind = $("backgroundKind").value;
      await save({
        lumgram_bg_mode: kind,
        instagram_use_custom_bg:
          kind === "image" && L.validImage(state.instagram_custom_bg)
            ? "1"
            : "0",
      });
      if (kind === "image" && $("bgBody").hidden)
        document.querySelector('[aria-controls="bgBody"]').click();
      renderThemes();
      syncBackground();
    });
    $("surfaceColor").addEventListener("input", async () => {
      await save({
        lumgram_bg_color: $("surfaceColor").value,
        lumgram_bg_mode: "color",
        instagram_use_custom_bg: "0",
      });
      renderThemes();
      syncDestinationPaint();
    });
    $("navigationOpacity").addEventListener("input", async () => {
      $("navigationOpacityValue").textContent =
        $("navigationOpacity").value + "%";
      await save({ lumgram_bg_overlay: $("navigationOpacity").value });
      syncBackground();
    });
    fontsUI = LumFonts.mount({ getState: () => state, save });
    createRanges();
    renderIcons();
    renderThemes();
    syncBackground();
    $("customBgInput").addEventListener("change", (e) =>
      upload(e.target.files[0]),
    );
    $("useCustomBgToggle").addEventListener("change", async () => {
      await save({
        lumgram_bg_mode: $("useCustomBgToggle").checked ? "image" : "theme",
        instagram_use_custom_bg: $("useCustomBgToggle").checked ? "1" : "0",
      });
      syncBackground();
    });
    $("removeCustomBg").addEventListener("click", async () => {
      await save(
        {
          instagram_custom_bg: "",
          instagram_use_custom_bg: "0",
          lumgram_bg_mode: "theme",
        },
        "Background removed. Saved presets keep their own copies.",
      );
      syncBackground();
    });
    $("resetBackground").addEventListener("click", async () => {
      const settings = L.snapshot(L.defaults);
      for (const key of Object.keys(LumFonts.defaults)) delete settings[key];
      delete settings.instagram_custom_bg;
      delete settings.instagram_use_custom_bg;
      await save(settings, "Background adjustments reset.");
      syncBackground();
    });
    for (const [id, key] of [
      ["bgFit", "lumgram_bg_fit"],
      ["bgBase", "lumgram_bg_base"],
      ["overlayColorPicker", "instagram_bg_overlay_color"],
    ])
      $(id).addEventListener("input", () => {
        save({ [key]: $(id).value });
        $("overlayColorHex").textContent =
          $("overlayColorPicker").value.toUpperCase();
        updatePreview();
      });
    $("advancedModeToggle").addEventListener("change", () => {
      save({
        instagram_bg_overlay_advanced: $("advancedModeToggle").checked
          ? "1"
          : "0",
      });
      $("advancedPanel").hidden = !$("advancedModeToggle").checked;
      syncDestinationPaint();
      $("overlayAlpha").disabled = $("advancedModeToggle").checked;
      updatePreview();
    });
    $("advResetBtn").addEventListener("click", async () => {
      await save(
        Object.fromEntries(
          ranges
            .filter((r) => r[0] === "panelRanges")
            .map((r) => [r[3], L.defaults[r[3]]]),
        ),
      );
      syncBackground();
    });
    if (extension)
      chrome.storage.onChanged.addListener((changes) => {
        if (changes.lumgram_animations) {
          state.lumgram_animations = changes.lumgram_animations.newValue;
          syncMotion();
        }
        if (changes.instagram_enable) {
          state.instagram_enable = changes.instagram_enable.newValue;
          $("enableToggle").checked = ["1", 1, true].includes(
            state.instagram_enable,
          );
          labels();
        }
      });
    LumConnectionUI.mount({
      extension,
      onTarget: (id) => scopeStore.updateCurrentChat(id),
    });
    document.documentElement.dataset.ready = "true";
  }
  boot().catch((e) =>
    status("Unable to initialize LumGram: " + e.message, true),
  );
})();
