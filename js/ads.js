(function () {
  "use strict";

  try {
    initAds();
  } catch (error) {
    console.warn("FaceVision ads:", error);
  }

  function initAds() {
    const KEY_RE = /^[a-f0-9]{32}$/i;
    const SRC_RE = /^https:\/\/[a-z0-9.-]+\/[a-z0-9/_?=&.-]*$/i;
    const ADSTERRA_INVOKE = "https://bauval.org/22";

    const config = window.FACEVISION_ADS || {};
    const network = (config.network || "").toLowerCase();
    const adsterra = config.adsterra || {};
    const custom = config.custom || {};
    const monetag = config.monetag || {};
    const media = window.matchMedia("(max-width: 760px)");

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

    // Each unit lives in its own srcdoc iframe so the global atOptions
    // read by the invoke script cannot clobber another unit on the page.
    function loadAdsterra(container, key, width, height) {
      if (!container || !KEY_RE.test(key)) return false;
      const holder = document.createElement("div");
      holder.className = "ad-frame";
      const frame = document.createElement("iframe");
      frame.className = "ad-host";
      frame.title = "Advertisement";
      frame.width = String(width);
      frame.height = String(height);
      frame.setAttribute("scrolling", "no");
      frame.setAttribute("loading", "lazy");
      frame.style.width = width + "px";
      frame.style.height = height + "px";
      frame.sandbox = "allow-scripts allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation";
      const src = ADSTERRA_INVOKE + "/" + key;
      frame.srcdoc = "<!doctype html><html><head><meta charset=\"utf-8\"><style>html,body{margin:0;padding:0;overflow:hidden;background:transparent}</style></head><body>" +
        "<script>atOptions = {key:" + JSON.stringify(key) + ",format:\"iframe\",height:" + height + ",width:" + width + ",params:{}};<\/script>" +
        "<script src=\"" + src + "\"><\/script>" +
        "</body></html>";
      holder.append(frame);
      container.append(holder);
      return true;
    }

    function loadScript(container, src) {
      if (!container || !SRC_RE.test(src)) return false;
      const script = document.createElement("script");
      script.src = src;
      script.onerror = function () { console.warn("FaceVision ads: script failed to load"); };
      container.append(script);
      return true;
    }

    function loadSnippet(container, html) {
      if (!container || !isFilled(html)) return false;
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
      try {
        const el = slotEl(name);
        if (!el) return;
        el.hidden = true;
        el.classList.remove("is-live");
        el.replaceChildren();
        if (loader()) labelSlot(el);
      } catch (error) {
        console.warn("FaceVision ads:", error);
      }
    }

    function leaderboard(container) {
      if (media.matches && KEY_RE.test(adsterra.key320x50 || "")) {
        return loadAdsterra(container, adsterra.key320x50, 320, 50);
      }
      if (!media.matches && KEY_RE.test(adsterra.key728x90 || "")) {
        return loadAdsterra(container, adsterra.key728x90, 728, 90);
      }
      return false;
    }

    function render() {
      if (network === "adsterra") {
        fill("top", () => leaderboard(slotEl("top")) || loadSnippet(slotEl("top"), custom.top));
        fill("mid", () => {
          if (KEY_RE.test(adsterra.key300x250 || "")) {
            return loadAdsterra(slotEl("mid"), adsterra.key300x250, 300, 250);
          }
          return loadSnippet(slotEl("mid"), custom.mid);
        });
        fill("bottom", () => leaderboard(slotEl("bottom")) || loadSnippet(slotEl("bottom"), custom.bottom));
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
    }

    render();
    if (typeof media.addEventListener === "function") {
      media.addEventListener("change", render);
    } else if (typeof media.addListener === "function") {
      media.addListener(render);
    }
  }
})();
