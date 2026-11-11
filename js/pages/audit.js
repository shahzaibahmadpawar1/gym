window.Pages = window.Pages || {};

Pages.audit = {
  render(root) {
    const state = {
      role: "all",
      userId: "all",
      action: "all",
      entity: "all",
      range: "30",
      from: "",
      to: "",
      q: "",
      staffOnly: false,
      limit: 40,
      expanded: null,
    };

    const actions = [
      "all",
      "login",
      "logout",
      "role_switch",
      "create",
      "update",
      "delete",
      "collect",
      "void",
      "dispose",
      "checkin",
      "denied",
      "override",
    ];
    const entities = ["all", ...new Set(Store.state.auditLog.map((r) => r.entity).filter(Boolean))];

    const paint = () => {
      let rows = [...Store.state.auditLog];
      if (state.staffOnly) rows = rows.filter((r) => r.userRole === "staff");
      if (state.role !== "all") rows = rows.filter((r) => r.userRole === state.role);
      if (state.userId !== "all") rows = rows.filter((r) => r.userId === state.userId);
      if (state.action !== "all") rows = rows.filter((r) => r.action === state.action);
      if (state.entity !== "all") rows = rows.filter((r) => r.entity === state.entity);

      let from = state.from;
      let to = state.to;
      const today = Store.todayLocal();
      if (state.range === "today") {
        from = today;
        to = today;
      } else if (state.range === "7") {
        from = Store.addDays(today, -6);
        to = today;
      } else if (state.range === "30") {
        from = Store.addDays(today, -29);
        to = today;
      }
      if (from) rows = rows.filter((r) => Store.toLocalDate(r.at) >= from);
      if (to) rows = rows.filter((r) => Store.toLocalDate(r.at) <= to);
      if (state.q.trim()) {
        const q = state.q.trim().toLowerCase();
        rows = rows.filter((r) => (r.summary || "").toLowerCase().includes(q));
      }

      const visible = rows.slice(0, state.limit);

      root.innerHTML = `
        ${UI.pageHeader({
          title: "Audit log",
          subtitle: "Admin only · append-only activity including denied attempts",
        })}
        <div class="toolbar audit-filters">
          <label class="pill accent ${state.staffOnly ? "active" : ""}" style="cursor:pointer">
            <input type="checkbox" id="staff-only" ${state.staffOnly ? "checked" : ""} style="margin-right:6px" />
            Staff activity only
          </label>
          <select id="f-role" aria-label="Filter by role">
            <option value="all">All roles</option>
            <option value="admin" ${state.role === "admin" ? "selected" : ""}>Admin</option>
            <option value="staff" ${state.role === "staff" ? "selected" : ""}>Staff</option>
          </select>
          <select id="f-user" aria-label="Filter by user">
            <option value="all">All users</option>
            ${Store.state.users.map((u) => `<option value="${u.id}" ${state.userId === u.id ? "selected" : ""}>${UI.esc(u.name)}</option>`).join("")}
          </select>
          <select id="f-action" aria-label="Filter by action">
            ${actions.map((a) => `<option value="${a}" ${state.action === a ? "selected" : ""}>${a}</option>`).join("")}
          </select>
          <select id="f-entity" aria-label="Filter by entity">
            ${entities.map((e) => `<option value="${e}" ${state.entity === e ? "selected" : ""}>${e}</option>`).join("")}
          </select>
          <select id="f-range" aria-label="Date range">
            <option value="today" ${state.range === "today" ? "selected" : ""}>Today</option>
            <option value="7" ${state.range === "7" ? "selected" : ""}>7 days</option>
            <option value="30" ${state.range === "30" ? "selected" : ""}>30 days</option>
            <option value="custom" ${state.range === "custom" ? "selected" : ""}>Custom</option>
          </select>
          ${
            state.range === "custom"
              ? `<input type="date" id="f-from" value="${UI.esc(state.from)}" aria-label="From" />
                 <input type="date" id="f-to" value="${UI.esc(state.to)}" aria-label="To" />`
              : ""
          }
          <div class="search-box" style="min-width:180px">
            ${UI.icons.search}
            <input id="f-q" placeholder="Search summary" value="${UI.esc(state.q)}" aria-label="Search summary" />
          </div>
        </div>
        <div class="card">
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>When</th><th>Role</th><th>User</th><th>Action</th><th>Entity</th><th>Summary</th><th></th></tr></thead>
              <tbody>
                ${
                  visible.length
                    ? visible
                        .map((r) => {
                          const roleClass = r.userRole === "admin" ? "status-active" : r.userRole === "staff" ? "status-new" : "status-pending";
                          const hasDiff = r.before || r.after;
                          const open = state.expanded === r.id;
                          return `<tr>
                            <td>${Store.formatDateTime(r.at)}</td>
                            <td><span class="status ${roleClass}">${UI.esc(r.userRole || "—")}</span></td>
                            <td>${UI.esc(r.userName || r.userId)}</td>
                            <td><span class="pill">${UI.esc(r.action)}</span></td>
                            <td>${UI.esc(r.entity || "—")}</td>
                            <td>${UI.esc(r.summary)}</td>
                            <td>${hasDiff ? `<button class="btn btn-ghost btn-sm" data-expand="${UI.esc(r.id)}">${open ? "Hide" : "Diff"}</button>` : ""}</td>
                          </tr>
                          ${
                            open && hasDiff
                              ? `<tr class="audit-diff"><td colspan="7">
                                  <div class="grid-2">
                                    <div><strong>Before</strong><pre class="audit-pre">${UI.esc(JSON.stringify(r.before || {}, null, 2))}</pre></div>
                                    <div><strong>After</strong><pre class="audit-pre">${UI.esc(JSON.stringify(r.after || {}, null, 2))}</pre></div>
                                  </div>
                                </td></tr>`
                              : ""
                          }`;
                        })
                        .join("")
                    : `<tr><td colspan="7" class="muted-sm">No matching audit entries</td></tr>`
                }
              </tbody>
            </table>
          </div>
          ${
            rows.length > state.limit
              ? `<div style="padding:12px;text-align:center"><button class="btn btn-ghost" id="load-more">Load more</button></div>`
              : ""
          }
        </div>
      `;

      document.getElementById("staff-only")?.addEventListener("change", (e) => {
        state.staffOnly = e.target.checked;
        paint();
      });
      document.getElementById("f-role")?.addEventListener("change", (e) => {
        state.role = e.target.value;
        paint();
      });
      document.getElementById("f-user")?.addEventListener("change", (e) => {
        state.userId = e.target.value;
        paint();
      });
      document.getElementById("f-action")?.addEventListener("change", (e) => {
        state.action = e.target.value;
        paint();
      });
      document.getElementById("f-entity")?.addEventListener("change", (e) => {
        state.entity = e.target.value;
        paint();
      });
      document.getElementById("f-range")?.addEventListener("change", (e) => {
        state.range = e.target.value;
        paint();
      });
      document.getElementById("f-from")?.addEventListener("change", (e) => {
        state.from = e.target.value;
        paint();
      });
      document.getElementById("f-to")?.addEventListener("change", (e) => {
        state.to = e.target.value;
        paint();
      });
      document.getElementById("f-q")?.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          state.q = e.target.value;
          paint();
        }
      });
      root.querySelectorAll("[data-expand]").forEach((btn) => {
        btn.addEventListener("click", () => {
          state.expanded = state.expanded === btn.dataset.expand ? null : btn.dataset.expand;
          paint();
        });
      });
      document.getElementById("load-more")?.addEventListener("click", () => {
        state.limit += 40;
        paint();
      });
    };

    paint();
  },
};
