(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const storage = {
    get(key, fallback = null) {
      try {
        const raw = localStorage.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // ignore
      }
    },
  };

  function ensureToastRoot() {
    let root = $(".toastWrap");
    if (!root) {
      root = document.createElement("div");
      root.className = "toastWrap";
      document.body.appendChild(root);
    }
    return root;
  }

  function toast(title, message) {
    const root = ensureToastRoot();
    const el = document.createElement("div");
    el.className = "toast";
    el.innerHTML = `
      <div class="icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M12 2l9 6v8l-9 6-9-6V8l9-6z" stroke="currentColor" stroke-width="1.6" opacity=".9"/>
          <path d="M8.5 12.4l2.2 2.2 4.8-5.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <div>
        <div class="t">${escapeHtml(title)}</div>
        <div class="m">${escapeHtml(message)}</div>
      </div>
    `;
    root.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    }[c]));
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    storage.set("sailplan.theme", theme);
  }

  function initTheme() {
    const saved = storage.get("sailplan.theme", null);
    if (saved === "light" || saved === "dark") {
      applyTheme(saved);
      return;
    }
    // default: dark, but respect system if light
    const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
    applyTheme(prefersLight ? "light" : "dark");
  }

  function initDropdowns() {
    $$("[data-dropdown]").forEach((wrap) => {
      const btn = $("[data-dropdown-btn]", wrap);
      const menu = $("[data-dropdown-menu]", wrap);
      if (!btn || !menu) return;

      const close = () => menu.classList.remove("open");
      const open = () => menu.classList.add("open");
      const toggle = () => menu.classList.toggle("open");

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggle();
      });

      document.addEventListener("click", (e) => {
        if (!wrap.contains(e.target)) close();
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close();
      });
    });
  }

  function initActiveNav() {
    const path = location.pathname.split("/").pop() || "";
    $$("[data-nav]").forEach((a) => {
      const href = a.getAttribute("href") || "";
      if (!href) return;
      const target = href.split("/").pop();
      if (target === path) a.classList.add("active");
    });
  }

  function initThemeToggle() {
    $$("[data-theme-toggle]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const current = document.documentElement.getAttribute("data-theme") || "dark";
        const next = current === "dark" ? "light" : "dark";
        applyTheme(next);
        toast("Vzhled", next === "dark" ? "Zapnutý dark mode." : "Zapnutý light mode.");
      });
    });
  }

  function initPersistedInputs() {
    // Checkbox
    $$("[data-persist-check]").forEach((el) => {
      const key = el.getAttribute("data-persist-check");
      if (!key) return;
      const saved = storage.get(`sailplan.check.${key}`, null);
      if (saved != null) el.checked = !!saved;
      updateCheckRow(el);
      el.addEventListener("change", () => {
        storage.set(`sailplan.check.${key}`, el.checked);
        updateCheckRow(el);
      });
    });

    // Notes / any input
    $$("[data-persist]").forEach((el) => {
      const key = el.getAttribute("data-persist");
      if (!key) return;
      const saved = storage.get(`sailplan.value.${key}`, "");
      if (typeof saved === "string") el.value = saved;
      el.addEventListener("input", () => storage.set(`sailplan.value.${key}`, el.value));
    });
  }

  function updateCheckRow(input) {
    const row = input.closest(".check");
    if (!row) return;
    row.classList.toggle("done", input.checked);
  }

  function initFakeActions() {
    $$("[data-toast]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const title = btn.getAttribute("data-toast") || "Hotovo";
        const msg = btn.getAttribute("data-toast-msg") || "Akce v demu pouze simuluje chování.";
        toast(title, msg);
      });
    });
  }

  function initTabs() {
    $$("[data-tabs]").forEach((wrap) => {
      const buttons = $$("[data-tab]", wrap);
      const panes = $$("[data-pane]", wrap);
      if (!buttons.length || !panes.length) return;

      function setActive(name) {
        buttons.forEach((b) => b.classList.toggle("active", b.getAttribute("data-tab") === name));
        panes.forEach((p) => (p.style.display = p.getAttribute("data-pane") === name ? "block" : "none"));
      }

      const initial = wrap.getAttribute("data-tabs-default") || buttons[0].getAttribute("data-tab");
      setActive(initial);

      buttons.forEach((b) => {
        b.addEventListener("click", () => setActive(b.getAttribute("data-tab")));
      });
    });
  }

  function initRoleBanner() {
    const role = document.body.getAttribute("data-role");
    const el = $("[data-role-badge]");
    if (!role || !el) return;
    const map = {
      organizer: { label: "Organizátor", cls: "badge good", dot: "good" },
      captain: { label: "Kapitán", cls: "badge warn", dot: "warn" },
      participant: { label: "Účastník", cls: "badge", dot: "" },
    };
    const r = map[role] || { label: role, cls: "badge", dot: "" };
    el.className = r.cls;
    el.innerHTML = `<span class="dot"></span>${escapeHtml(r.label)} • demo role`;
  }

  function initProgressBars() {
    $$("[data-progress]").forEach((el) => {
      const v = Number(el.getAttribute("data-progress")) || 0;
      const bar = $("span", el);
      if (bar) bar.style.width = `${Math.max(0, Math.min(100, v))}%`;
    });
  }

  // boot
  initTheme();
  initDropdowns();
  initActiveNav();
  initThemeToggle();
  initPersistedInputs();
  initFakeActions();
  initTabs();
  initRoleBanner();
  initProgressBars();
})();


