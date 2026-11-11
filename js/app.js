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
    { id: "revenue", label: "Revenue", icon: "revenue" },
    { id: "expenses", label: "Expenses", icon: "expenses" },
    { id: "inventory", label: "Inventory", icon: "inventory" },
    { section: "System" },
    { id: "reports", label: "Reports", icon: "reports" },
    { id: "audit", label: "Audit log", icon: "audit", adminOnly: true },
    { id: "settings", label: "Settings", icon: "settings", adminOnly: true },
  ];

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
      if (item.section) return `<div class="nav-section">${item.section}</div>`;
      if (item.adminOnly && !admin) return "";
      const active = name === item.id ? "active" : "";
      return `<a class="nav-item ${active}" href="#/${item.id}">${UI.icons[item.icon] || ""}<span>${item.label}</span></a>`;
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
          <button type="button" class="${admin ? "active" : ""}" data-role="admin">Admin</button>
          <button type="button" class="${!admin ? "active" : ""}" data-role="staff">Staff</button>
        </div>
        <div class="user-chip">
          ${UI.initialsAvatar(user.name.split(" ").map((w) => w[0]).join("").slice(0, 2))}
          <div class="info">
            <strong>${user.name}</strong>
            <span>${user.title}</span>
          </div>
        </div>
        <button class="btn btn-ghost btn-sm" style="width:100%;margin-top:8px" id="logout-btn">Sign out</button>
      </div>
    `;

    document.querySelectorAll("[data-role]").forEach((btn) => {
      btn.addEventListener("click", () => {
        Store.switchRole(btn.dataset.role);
        UI.toast(`Switched to ${btn.dataset.role}`, "success");
        renderShell();
        renderPage();
      });
    });

    document.getElementById("logout-btn")?.addEventListener("click", () => {
      Store.clearSession();
      location.href = "index.html";
    });
  }

  function notifCount() {
    return (
      Store.expiringMemberships(7).length +
      Store.openInvoices().length +
      Store.lowStock().length +
      Store.inactiveMembers().length
    );
  }

  function renderTopbar() {
    document.getElementById("topbar").innerHTML = `
      <button class="btn-icon mobile-menu-btn" id="menu-btn">${UI.icons.menu}</button>
      <div class="search-box">
        ${UI.icons.search}
        <input type="search" id="global-search" placeholder="Search members, trainers, invoices..." />
      </div>
      <div class="topbar-actions">
        <button class="btn-icon notif-btn" id="notif-btn" title="Alerts">
          ${UI.icons.bell}
          <span class="badge">${notifCount()}</span>
        </button>
        <span class="status ${Store.isAdmin() ? "status-active" : "status-new"}">${Store.isAdmin() ? "Admin" : "Staff"}</span>
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

    if (route.name === "packages" || route.name === "audit" || route.name === "settings") {
      if (!Store.isAdmin()) {
        root.innerHTML = UI.emptyState({
          title: "Admin only",
          text: "Switch to Admin in the sidebar to access this area.",
        });
        renderSidebar();
        return;
      }
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
