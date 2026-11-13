(() => {
  const root = document.documentElement;
  const menu = document.getElementById("knowledgeMenu");
  const toggle = document.getElementById("knowledgeMenuToggle");
  const backdrop = document.getElementById("knowledgeMenuBackdrop");
  const themeToggle = document.getElementById("knowledgeThemeToggle");
  const mobileQuery = window.matchMedia("(max-width: 960px)");
  const themeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  const THEME_KEY = "sd-storefront-theme-override-v2";
  let closeToken = 0;
  let previousBodyOverflow = "";
  let menuOpen = false;

  const readTheme = () => {
    try {
      const mode = sessionStorage.getItem(THEME_KEY);
      return mode === "dark" || mode === "light" ? mode : "auto";
    } catch {
      return "auto";
    }
  };

  const applyTheme = (mode) => {
    root.classList.toggle("dark", mode === "dark");
    root.classList.toggle("light", mode === "light");
    root.dataset.themeMode = mode;
    if (!themeToggle) return;
    const effectiveDark = mode === "dark" || (mode === "auto" && themeQuery.matches);
    const nextLabel = effectiveDark ? "Chuyển sang giao diện sáng" : "Chuyển sang giao diện tối";
    themeToggle.setAttribute("aria-label", nextLabel);
    themeToggle.title = nextLabel;
  };

  const restoreBodyScroll = () => {
    document.body.style.overflow = previousBodyOverflow;
  };

  const closeMenu = ({ restoreFocus = false, immediate = false } = {}) => {
    if (!menu || !toggle || !backdrop || !menuOpen) return;
    menuOpen = false;
    const token = ++closeToken;
    menu.classList.remove("open");
    backdrop.classList.remove("open");
    menu.setAttribute("aria-hidden", "true");
    menu.inert = true;
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Mở menu điều hướng");
    toggle.title = "Mở menu điều hướng";
    restoreBodyScroll();
    if (restoreFocus) toggle.focus({ preventScroll: true });
    const finish = () => {
      if (token !== closeToken || menuOpen) return;
      menu.hidden = true;
      backdrop.hidden = true;
    };
    if (immediate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) finish();
    else window.setTimeout(finish, 220);
  };

  const openMenu = () => {
    if (!menu || !toggle || !backdrop || menuOpen || !mobileQuery.matches) return;
    menuOpen = true;
    closeToken += 1;
    menu.hidden = false;
    backdrop.hidden = false;
    menu.inert = false;
    menu.setAttribute("aria-hidden", "false");
    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Đóng menu điều hướng");
    toggle.title = "Đóng menu điều hướng";
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      if (!menuOpen) return;
      menu.classList.add("open");
      backdrop.classList.add("open");
      menu.querySelector("a")?.focus({ preventScroll: true });
    });
  };

  if (menu && toggle && backdrop) {
    toggle.addEventListener("click", () => menuOpen ? closeMenu() : openMenu());
    backdrop.addEventListener("click", () => closeMenu());
    menu.addEventListener("click", (event) => {
      if (event.target.closest("a")) closeMenu({ immediate: true });
    });
    document.addEventListener("pointerdown", (event) => {
      if (!menuOpen || menu.contains(event.target) || toggle.contains(event.target)) return;
      closeMenu();
    });
    document.addEventListener("keydown", (event) => {
      if (!menuOpen) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu({ restoreFocus: true });
        return;
      }
      if (event.key !== "Tab") return;
      const items = [...menu.querySelectorAll("a[href]")].filter((item) => !item.hasAttribute("disabled"));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === menu)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });
    const handleBreakpointChange = (event) => {
      if (!event.matches && menuOpen) closeMenu({ immediate: true });
    };
    if (mobileQuery.addEventListener) mobileQuery.addEventListener("change", handleBreakpointChange);
    else mobileQuery.addListener(handleBreakpointChange);
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const current = readTheme();
      const effectiveDark = current === "dark" || (current === "auto" && themeQuery.matches);
      const next = effectiveDark ? "light" : "dark";
      try { sessionStorage.setItem(THEME_KEY, next); } catch { /* Theme still works for this page. */ }
      applyTheme(next);
    });
  }

  const handleSystemThemeChange = () => {
    if (readTheme() === "auto") applyTheme("auto");
  };
  if (themeQuery.addEventListener) themeQuery.addEventListener("change", handleSystemThemeChange);
  else themeQuery.addListener(handleSystemThemeChange);
  applyTheme(readTheme());
  root.classList.remove("no-js");
})();
