(function () {
  if (!Store.getSession()) {
    location.href = "index.html";
    return;
  }

  const NAV = [
    { section: "Overview" },
    { id: "dashboard", label: "Dashboard", icon: "dashboard" },
    { section: "Front desk" },
    { id: "leads", label: "Leads", icon: "leads" },
    { id: "members", label: "Members", icon: "members" },
    { id: "packages", label: "Packages", icon: "packages", adminOnly: true },
    { id: "fees", label: "Fee collection", icon: "fees" },
    { id: "attendance", label: "Attendance", icon: "attendance" },
    { section: "Business" },
    { id: "trainers", label: "Trainers", icon: "trainers" },
    { id: "revenue", label: "Revenue", icon: "revenue", adminOnly: true },
    { id: "expenses", label: "Expenses", icon: "expenses" },
    { id: "inventory", label: "Inventory", icon: "inventory" },
    { section: "System" },
    { id: "reports", label: "Reports", icon: "reports", adminOnly: true },
    { id: "audit", label: "Audit log", icon: "audit", adminOnly: true },
    { id: "settings", label: "Settings", icon: "settings", adminOnly: true },
  ];

  const ADMIN_ROUTES = new Set(["packages", "audit", "settings", "revenue", "reports"]);

  const routes = window.Pages || {};

  function parseHash() {
    const raw = location.hash.replace(/^#\/?/, "") || "dashboard";
    const [path, query = ""] = raw.split("?");
    const parts = path.split("/").filter(Boolean);
    const params = Object.fromEntries(new URLSearchParams(query));
    parts.slice(1).forEach((p, i) => {
      if (i === 0) params.id = p;
    });
    return { name: parts[0] || "dashboard", params, parts };
  }

  function navigate(to) {
    location.hash = "#/" + to.replace(/^\//, "");
  }

  function renderSidebar() {
    const user = Store.currentUser();
    const { name } = parseHash();
    const admin = Store.isAdmin();

    const navHtml = NAV.map((item) => {
      if (item.section) return `<div class="nav-section">${UI.esc(item.section)}</div>`;
      if (item.adminOnly && !admin) return "";
      const active = name === item.id ? "active" : "";
      return `<a class="nav-item ${active}" href="#/${item.id}">${UI.icons[item.icon] || ""}<span>${UI.esc(item.label)}</span></a>`;
    }).join("");

    document.getElementById("sidebar").innerHTML = `
      <div class="sidebar-brand">
        <div class="logo-mark">UG</div>
        <div>
          <strong>Ubaid's Gym</strong>
          <span>Single location · PKR</span>
        </div>
      </div>
      <nav class="nav-list">${navHtml}</nav>
      <div class="sidebar-footer">
        <div class="role-switch">
          ${
            Store.isSegregated()
              ? `<button type="button" class="${admin ? "active" : ""}" data-desk="admin">Admin</button>
                 <button type="button" class="${!admin && user.staffGender === "male" ? "active" : ""}" data-desk="male">Male</button>
                 <button type="button" class="${!admin && user.staffGender === "female" ? "active" : ""}" data-desk="female">Female</button>`
              : `<button type="button" class="${admin ? "active" : ""}" data-desk="admin">Admin</button>
                 <button type="button" class="${!admin ? "active" : ""}" data-desk="staff">Staff</button>`
          }
        </div>
        <div class="user-chip">
          ${UI.initialsAvatar(user.name.split(" ").map((w) => w[0]).join("").slice(0, 2))}
          <div class="info">
            <strong>${UI.esc(user.name)}</strong>
            <span>${UI.esc(user.title)}${Store.isSegregated() && user.staffGender ? " · " + user.staffGender : ""}</span>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:8px" id="logout-btn">Sign out</button>
      </div>
    `;

    document.querySelectorAll("[data-desk]").forEach((btn) => {
      btn.addEventListener("click", () => {
        try {
          Store.loginAsDesk(btn.dataset.desk, { roleSwitch: true });
          UI.toast(`Switched to ${btn.dataset.desk}`, "success");
          renderShell();
          renderPage();
        } catch (e) {
          UI.toast(e.message, "error");
        }
      });
    });

    document.getElementById("logout-btn")?.addEventListener("click", () => {
      Store.logout();
      location.href = "index.html";
    });
  }

  function notifCount() {
    const visibleIds = new Set(Store.visibleMembers().map((m) => m.id));
    const expiring = Store.expiringMemberships(7).filter((ms) => visibleIds.has(ms.memberId));
    const dues = Store.visibleOpenInvoices();
    const inactive = Store.inactiveMembers().filter((m) => visibleIds.has(m.id));
    return expiring.length + dues.length + Store.lowStock().length + inactive.length;
  }

  function roleBadgeLabel() {
    const u = Store.currentUser();
    if (Store.isAdmin()) return "Admin";
    if (Store.isSegregated() && u?.staffGender === "male") return "Male";
    if (Store.isSegregated() && u?.staffGender === "female") return "Female";
    return "Staff";
  }

  function renderTopbar() {
    const roleLabel = roleBadgeLabel();
    const short =
      roleLabel === "Admin" ? "A" : roleLabel === "Male" ? "M" : roleLabel === "Female" ? "F" : "S";
    document.getElementById("topbar").innerHTML = `
      <button class="btn-icon mobile-menu-btn" id="menu-btn" aria-label="Open menu">${UI.icons.menu}</button>
      <div class="search-box">
        ${UI.icons.search}
        <input type="search" id="global-search" placeholder="Search members, trainers, invoices..." aria-label="Global search" />
      </div>
      <div class="topbar-actions">
        <button class="btn-icon notif-btn" id="notif-btn" aria-label="Alerts" title="Alerts">
          ${UI.icons.bell}
          <span class="badge">${notifCount()}</span>
        </button>
        <span class="status ${Store.isAdmin() ? "status-active" : "status-new"} role-badge" data-short="${short}"><span class="role-badge-text">${roleLabel}</span></span>
      </div>
    `;

    document.getElementById("menu-btn")?.addEventListener("click", () => {
      document.getElementById("sidebar").classList.toggle("open");
      const bd = document.getElementById("sidebar-backdrop");
      bd.style.display = document.getElementById("sidebar").classList.contains("open") ? "block" : "none";
      bd.classList.toggle("open", document.getElementById("sidebar").classList.contains("open"));
    });

    document.getElementById("sidebar-backdrop")?.addEventListener("click", () => {
      document.getElementById("sidebar").classList.remove("open");
      const bd = document.getElementById("sidebar-backdrop");
      bd.style.display = "none";
      bd.classList.remove("open");
    });

    document.getElementById("notif-btn")?.addEventListener("click", () => navigate("dashboard"));

    document.getElementById("global-search")?.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const q = e.target.value.trim();
      if (!q) return;
      navigate("members?q=" + encodeURIComponent(q));
    });
  }

  function renderShell() {
    renderSidebar();
    renderTopbar();
  }

  function renderPage() {
    Store.refreshOverdue();
    const route = parseHash();
    const page = routes[route.name];
    const root = document.getElementById("page-root");
    root.classList.remove("fade-in");
    void root.offsetWidth;
    root.classList.add("fade-in");

    if (ADMIN_ROUTES.has(route.name) && !Store.isAdmin()) {
      root.innerHTML = UI.emptyState({
        title: "Admin only",
        text: "Switch to Admin in the sidebar to access this area.",
      });
      renderSidebar();
      return;
    }

    if (!page) {
      root.innerHTML = UI.emptyState({ title: "Not found", text: "This page does not exist yet." });
      return;
    }

    try {
      page.render(root, route);
    } catch (err) {
      console.error(err);
      root.innerHTML = UI.emptyState({ title: "Something went wrong", text: String(err.message || err) });
    }
    renderSidebar();
    renderTopbar();
    document.getElementById("sidebar")?.classList.remove("open");
  }

  window.App = { navigate, parseHash, renderPage, renderShell };

  window.addEventListener("hashchange", renderPage);
  renderShell();
  renderPage();
})();
