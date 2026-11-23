(function () {
  "use strict";

  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector("#site-nav");
  if (toggle && links) {
    const close = () => {
      toggle.setAttribute("aria-expanded", "false");
      links.classList.remove("is-open");
    };
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      links.classList.toggle("is-open", !open);
    });
    links.querySelectorAll("a").forEach((a) => a.addEventListener("click", close));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") close();
    });
  }

  function normalize(pathname) {
    let path = pathname.replace(/\/index\.html$/, "/");
    if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
    return path || "/";
  }
  const here = normalize(location.pathname);
  document.querySelectorAll("#site-nav a").forEach((a) => {
    try {
      if (normalize(new URL(a.href, location.href).pathname) === here) {
        a.setAttribute("aria-current", "page");
      }
    } catch {
      // ignore malformed hrefs
    }
  });
})();
