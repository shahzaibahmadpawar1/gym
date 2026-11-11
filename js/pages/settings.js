window.Pages = window.Pages || {};

Pages.settings = {
  render(root) {
    const s = Store.state.settings;
    const model = s.memberModel || "segregated";
    root.innerHTML = `
      ${UI.pageHeader({
        title: "Settings",
        subtitle: "Gym profile, operating model & staff · Admin only",
      })}
      <div class="grid-2">
        <div class="card">
          <div class="card-title" style="margin-bottom:16px">Gym profile</div>
          <form id="settings-form" class="form-grid">
            <div class="field full"><label for="set-name">Name</label><input id="set-name" name="gymName" value="${UI.esc(s.gymName)}" required /></div>
            <div class="field"><label for="set-phone">Phone</label><input id="set-phone" name="phone" value="${UI.esc(s.phone || "")}" /></div>
            <div class="field"><label for="set-cur">Currency</label><input id="set-cur" name="currency" value="${UI.esc(s.currency)}" disabled /></div>
            <div class="field full"><label for="set-addr">Address</label><input id="set-addr" name="address" value="${UI.esc(s.address || "")}" /></div>
            <div class="field"><label for="set-inact">Inactivity days</label><input id="set-inact" type="number" name="inactivityDays" min="7" value="${UI.esc(s.inactivityDays)}" /></div>
            <div class="field"><label>Expiry windows</label><input value="3 & 7 days" disabled /></div>
          </form>
          <div style="margin-top:20px;display:flex;gap:10px">
            <button class="btn btn-primary" id="save-settings">Save settings</button>
          </div>
        </div>

        <div class="card">
          <div class="card-title" style="margin-bottom:8px">Operating model</div>
          <p class="muted-sm" style="margin-bottom:16px">
            <strong>Segregated</strong> (default): male and female staff only see their desk’s members, leads, fees and attendance.
            <strong>Unified</strong>: all staff see all members.
          </p>
          <div class="form-grid">
            <div class="field full">
              <label for="set-model">Member data model</label>
              <select id="set-model">
                <option value="segregated" ${model === "segregated" ? "selected" : ""}>Segregated — male / female desks</option>
                <option value="unified" ${model === "unified" ? "selected" : ""}>Unified — combined desk</option>
              </select>
            </div>
          </div>
          <div style="margin-top:16px">
            <button class="btn btn-dark" id="save-model">Save operating model</button>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="card-header">
          <div>
            <div class="card-title">Staff accounts</div>
            <div class="card-subtitle">Only admin can create and assign staff desks</div>
          </div>
          <button class="btn btn-primary btn-sm" id="add-staff">${UI.icons.plus} Add staff</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Name</th><th>Title</th><th>Desk</th><th></th></tr></thead>
            <tbody>
              ${Store.state.users
                .map((u) => {
                  const desk =
                    u.role === "admin"
                      ? "Admin (all)"
                      : u.staffGender
                        ? u.staffGender
                        : model === "segregated"
                          ? "Unassigned"
                          : "Unified";
                  return `<tr>
                    <td>
                      <div class="person-cell">
                        ${UI.initialsAvatar(u.name.split(" ").map((w) => w[0]).join("").slice(0, 2))}
                        <div><strong>${UI.esc(u.name)}</strong><span>${UI.esc(u.role)}</span></div>
                      </div>
                    </td>
                    <td>${UI.esc(u.title || "—")}</td>
                    <td>${UI.statusChip(desk)}</td>
                    <td>${
                      u.role === "staff"
                        ? `<button class="btn btn-ghost btn-sm" data-edit-user="${UI.esc(u.id)}">Edit</button>`
                        : ""
                    }</td>
                  </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card" style="margin-top:16px">
        <div class="card-title" style="margin-bottom:12px">Demo data</div>
        <p class="muted-sm" style="margin-bottom:16px">Reset restores the seed (segregated by default) including male and female staff.</p>
        <button class="btn btn-danger" id="reset-data">Reset demo data</button>
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

    document.getElementById("save-model")?.addEventListener("click", async () => {
      const next = document.getElementById("set-model").value;
      const prev = Store.state.settings.memberModel || "segregated";
      if (next === prev) {
        UI.toast("No change", "success");
        return;
      }
      const ok = await UI.confirmDialog({
        title: next === "segregated" ? "Switch to segregated mode?" : "Switch to unified mode?",
        message:
          next === "segregated"
            ? "Staff will only see members, leads, fees and attendance for their gender desk. Login will show Male/Female staff."
            : "All staff will see all members. Login will show a single Staff card.",
        confirmLabel: "Switch model",
        danger: next === "segregated",
      });
      if (!ok) return;
      try {
        Store.updateSettings({ memberModel: next });
        UI.toast("Operating model updated — re-login recommended", "success");
        App.renderPage();
        App.renderShell();
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });

    document.getElementById("add-staff")?.addEventListener("click", () => this.staffForm());
    root.querySelectorAll("[data-edit-user]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const user = Store.state.users.find((u) => u.id === btn.dataset.editUser);
        this.staffForm(user);
      });
    });

    document.getElementById("reset-data").addEventListener("click", async () => {
      const ok = await UI.confirmDialog({
        title: "Reset all demo data?",
        message: "Local changes will be wiped and seed data restored.",
        confirmLabel: "Reset",
        danger: true,
      });
      if (!ok) return;
      try {
        Store.resetData();
        UI.toast("Demo data reset", "success");
        App.renderPage();
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
  },

  staffForm(user = null) {
    const segregated = Store.isSegregated();
    UI.openModal(`
      <div class="modal-header">
        <h2>${user ? "Edit staff" : "Add staff"}</h2>
        <button class="btn-icon" data-close aria-label="Close">${UI.icons.close}</button>
      </div>
      <form id="staff-form" class="form-grid">
        <div class="field"><label for="st-name">Name</label><input id="st-name" name="name" required value="${UI.esc(user?.name || "")}" /></div>
        <div class="field"><label for="st-title">Title</label><input id="st-title" name="title" value="${UI.esc(user?.title || "Front Desk")}" /></div>
        <div class="field full"><label for="st-gender">Staff desk${segregated ? " (required)" : ""}</label>
          <select id="st-gender" name="staffGender" ${segregated ? "required" : ""}>
            ${!segregated ? `<option value="">Unified (no desk)</option>` : ""}
            <option value="male" ${user?.staffGender === "male" ? "selected" : ""}>Male desk</option>
            <option value="female" ${user?.staffGender === "female" ? "selected" : ""}>Female desk</option>
          </select>
        </div>
      </form>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="save-staff">Save</button>
      </div>
    `);
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("save-staff").addEventListener("click", () => {
      const form = document.getElementById("staff-form");
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      try {
        Store.upsertUser({
          id: user?.id,
          name: fd.get("name"),
          title: fd.get("title"),
          staffGender: fd.get("staffGender") || null,
        });
        UI.closeModal();
        UI.toast(user ? "Staff updated" : "Staff created", "success");
        App.renderPage();
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
  },
};
