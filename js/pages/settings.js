window.Pages = window.Pages || {};

Pages.settings = {
  render(root) {
    const s = Store.state.settings;

    root.innerHTML = `
      ${UI.pageHeader({
        title: "Settings",
        subtitle: "Gym profile & alert thresholds · Admin only",
      })}
      <div class="grid-2">
        <div class="card">
          <div class="card-title" style="margin-bottom:16px">Gym profile</div>
          <form id="settings-form" class="form-grid">
            <div class="field full"><label>Name</label><input name="gymName" value="${s.gymName}" required /></div>
            <div class="field"><label>Phone</label><input name="phone" value="${s.phone || ""}" /></div>
            <div class="field"><label>Currency</label><input name="currency" value="${s.currency}" disabled /></div>
            <div class="field full"><label>Address</label><input name="address" value="${s.address || ""}" /></div>
            <div class="field"><label>Inactivity days</label><input type="number" name="inactivityDays" min="7" value="${s.inactivityDays}" /></div>
            <div class="field"><label>Expiry windows</label><input value="3 & 7 days" disabled /></div>
          </form>
          <div style="margin-top:20px;display:flex;gap:10px">
            <button class="btn btn-primary" id="save-settings">Save settings</button>
          </div>
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:12px">Demo data</div>
          <p class="muted-sm" style="margin-bottom:16px">This prototype stores everything in your browser (localStorage). Reset restores the original seed for Ubaid's Gym.</p>
          <button class="btn btn-danger" id="reset-data">Reset demo data</button>
          <div style="margin-top:24px">
            <div class="card-title" style="margin-bottom:12px">Users</div>
            ${Store.state.users
              .map(
                (u) => `<div class="list-item">${UI.initialsAvatar(u.name.split(" ").map((w)=>w[0]).join("").slice(0,2))}<div><strong>${u.name}</strong><div class="muted-sm">${u.role} · ${u.title}</div></div></div>`
              )
              .join("")}
          </div>
        </div>
      </div>
    `;

    document.getElementById("save-settings").addEventListener("click", () => {
      const fd = new FormData(document.getElementById("settings-form"));
      try {
        Store.updateSettings({
          gymName: fd.get("gymName"),
          phone: fd.get("phone"),
          address: fd.get("address"),
          inactivityDays: Number(fd.get("inactivityDays")),
        });
        UI.toast("Settings saved", "success");
        App.renderPage();
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });

    document.getElementById("reset-data").addEventListener("click", async () => {
      const ok = await UI.confirmDialog({
        title: "Reset all demo data?",
        message: "Local changes will be wiped and seed data restored.",
        confirmLabel: "Reset",
        danger: true,
      });
      if (!ok) return;
      Store.resetData();
      UI.toast("Demo data reset", "success");
      App.renderPage();
    });
  },
};
