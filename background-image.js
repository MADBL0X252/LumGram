/* Local-only image compositor shared by the dashboard and Instagram content script. */
(() => {
  const L = globalThis.LumGram;
  let cachedSource = "",
    cachedImage = null;
  L.validImage = (source) =>
    typeof source === "string" &&
    /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=\r\n]+$/.test(source);
  L.loadImage = (source) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () =>
        reject(
          new Error(
            "This image could not be decoded. Choose a PNG, JPEG or WebP image.",
          ),
        );
      img.src = source;
    });
  L.renderImage = async (state, width, height) => {
    const source = state.instagram_custom_bg;
    if (!L.validImage(source)) return "";
    let img;
    if (cachedSource === source && cachedImage) img = cachedImage;
    else {
      img = await L.loadImage(source);
      cachedSource = source;
      cachedImage = img;
    }
    const scale = Math.min(1, 1920 / Math.max(width, height));
    width = Math.max(1, Math.round(width * scale));
    height = Math.max(1, Math.round(height * scale));
    const c = document.createElement("canvas");
    c.width = width;
    c.height = height;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Image editing is unavailable in this browser.");
    ctx.fillStyle = L.hex(state.lumgram_bg_base, "#161616");
    ctx.fillRect(0, 0, width, height);
    const fit = state.lumgram_bg_fit,
      zoom = L.clamp(state.lumgram_bg_zoom, 50, 200, 100) / 100;
    const ratio = (fit === "contain" ? Math.min : Math.max)(
      width / img.naturalWidth,
      height / img.naturalHeight,
    );
    const w = (fit === "stretch" ? width : img.naturalWidth * ratio) * zoom,
      h = (fit === "stretch" ? height : img.naturalHeight * ratio) * zoom;
    const x = ((width - w) * L.clamp(state.lumgram_bg_x, 0, 100, 50)) / 100,
      y = ((height - h) * L.clamp(state.lumgram_bg_y, 0, 100, 50)) / 100;
    ctx.globalAlpha = L.clamp(state.lumgram_bg_opacity, 0, 100, 100) / 100;
    ctx.filter = `blur(${L.clamp(state.instagram_bg_image_blur, 0, 40, 0) * scale}px) brightness(${L.clamp(state.lumgram_bg_brightness, 25, 175, 100)}%) contrast(${L.clamp(state.lumgram_bg_contrast, 25, 175, 100)}%) saturate(${L.clamp(state.lumgram_bg_saturation, 0, 200, 100)}%)`;
    ctx.drawImage(img, x, y, w, h);
    return c.toDataURL("image/jpeg", 0.92);
  };
})();
