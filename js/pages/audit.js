window.Pages = window.Pages || {};

Pages.audit = {
  render(root) {
    let action = "all";
    const paint = () => {
      let rows = Store.state.auditLog;
      if (action !== "all") rows = rows.filter((r) => r.action === action);

      root.innerHTML = `
        ${UI.pageHeader({
          title: "Audit log",
          subtitle: "Admin only · create, update, delete, collect, void, dispose, check-in",
        })}
        <div class="toolbar">
          <div class="pill-row">
            ${["all", "create", "update", "delete", "collect", "void", "dispose", "checkin"]
              .map((a) => `<button class="pill accent ${action === a ? "active" : ""}" data-action="${a}">${a}</button>`)
              .join("")}
          </div>
        </div>
        <div class="card">
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>When</th><th>User</th><th>Action</th><th>Entity</th><th>Summary</th></tr></thead>
              <tbody>
                ${rows
                  .map((r) => {
                    const u = Store.state.users.find((x) => x.id === r.userId);
                    return `<tr>
                      <td>${Store.formatDateTime(r.at)}</td>
                      <td>${u?.name || r.userId}</td>
                      <td><span class="pill">${r.action}</span></td>
                      <td>${r.entity}</td>
                      <td>${r.summary}</td>
                    </tr>`;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;

      root.querySelectorAll("[data-action]").forEach((btn) => {
        btn.addEventListener("click", () => {
          action = btn.dataset.action;
          paint();
        });
      });
    };
    paint();
  },
};
