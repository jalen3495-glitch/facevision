(function () {
  "use strict";

  const KEY_RE = /^[a-f0-9]{32}$/i;
  const SRC_RE = /^https:\/\/[a-z0-9.-]+\/[a-z0-9/_?=&.-]*$/i;
  const ADSTERRA_INVOKE = "https://www.highperformanceformat.com";

  const config = window.FACEVISION_ADS || {};
  const network = (config.network || "").toLowerCase();

  function isFilled(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function slotEl(name) {
    return document.querySelector(`[data-ad-slot="${name}"]`);
  }

  function labelSlot(el) {
    el.hidden = false;
    el.classList.add("is-live");
    el.setAttribute("role", "complementary");
    if (!el.getAttribute("aria-label")) el.setAttribute("aria-label", "Advertisement");
    if (!el.querySelector(".ad-label")) {
      const label = document.createElement("span");
      label.className = "ad-label";
      label.textContent = "Advertisement";
      el.prepend(label);
    }
  }

  function loadAdsterra(container, key, width, height) {
    if (!KEY_RE.test(key)) return false;
    const holder = document.createElement("div");
    holder.className = "ad-frame";
    const options = document.createElement("script");
    options.text = `atOptions = {key:${JSON.stringify(key)},format:"iframe",height:${height},width:${width},params:{}};`;
    const invoke = document.createElement("script");
    invoke.async = true;
    invoke.src = `${ADSTERRA_INVOKE}/${key}/invoke.js`;
    holder.append(options, invoke);
    container.append(holder);
    return true;
  }

  function loadScript(container, src) {
    if (!SRC_RE.test(src)) return false;
    const script = document.createElement("script");
    script.async = true;
    script.src = src;
    container.append(script);
    return true;
  }

  function loadSnippet(container, html) {
    if (!isFilled(html)) return false;
    // Owner-supplied official snippet only. Popunder/redirect keywords are rejected.
    const lower = html.toLowerCase();
    if (lower.includes("popunder") || lower.includes("pop-under") || lower.includes("clickunder")) {
      return false;
    }
    const holder = document.createElement("div");
    holder.className = "ad-frame";
    holder.innerHTML = html;
    container.append(holder);
    return true;
  }

  function fill(name, loader) {
    const el = slotEl(name);
    if (!el) return;
    el.hidden = true;
    el.replaceChildren();
    if (loader()) labelSlot(el);
  }

  const adsterra = config.adsterra || {};
  const custom = config.custom || {};
  const monetag = config.monetag || {};
  const isNarrow = window.matchMedia("(max-width: 760px)").matches;

  if (network === "adsterra") {
    fill("top", () => {
      if (isNarrow && KEY_RE.test(adsterra.key320x50 || "")) {
        return loadAdsterra(slotEl("top"), adsterra.key320x50, 320, 50);
      }
      if (!isNarrow && KEY_RE.test(adsterra.key728x90 || "")) {
        return loadAdsterra(slotEl("top"), adsterra.key728x90, 728, 90);
      }
      return loadSnippet(slotEl("top"), custom.top);
    });
    fill("mid", () => {
      if (KEY_RE.test(adsterra.key300x250 || "")) {
        return loadAdsterra(slotEl("mid"), adsterra.key300x250, 300, 250);
      }
      return loadSnippet(slotEl("mid"), custom.mid);
    });
    fill("bottom", () => {
      if (isNarrow && KEY_RE.test(adsterra.key320x50 || "")) {
        return loadAdsterra(slotEl("bottom"), adsterra.key320x50, 320, 50);
      }
      if (!isNarrow && KEY_RE.test(adsterra.key728x90 || "")) {
        return loadAdsterra(slotEl("bottom"), adsterra.key728x90, 728, 90);
      }
      return loadSnippet(slotEl("bottom"), custom.bottom);
    });
    return;
  }

  if (network === "monetag") {
    const src = (monetag.zoneScriptSrc || "").trim();
    fill("bottom", () => loadScript(slotEl("bottom"), src) || loadSnippet(slotEl("bottom"), custom.bottom));
    fill("mid", () => loadSnippet(slotEl("mid"), custom.mid));
    fill("top", () => loadSnippet(slotEl("top"), custom.top));
    return;
  }

  fill("top", () => loadSnippet(slotEl("top"), custom.top));
  fill("mid", () => loadSnippet(slotEl("mid"), custom.mid));
  fill("bottom", () => loadSnippet(slotEl("bottom"), custom.bottom));
})();
