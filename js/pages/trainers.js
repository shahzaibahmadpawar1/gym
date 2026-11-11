window.Pages = window.Pages || {};

Pages.trainers = {
  render(root, route) {
    if (route.params.id) return this.detail(root, route.params.id);

    const trainers = Store.state.trainers;
    const admin = Store.isAdmin();

    root.innerHTML = `
      ${UI.pageHeader({
        title: "Trainers",
        subtitle: "Fixed salary or commission · PT separate from gym packages",
        actionsHtml: admin ? `<button class="btn btn-primary" id="add-trainer">${UI.icons.plus} Add trainer</button>` : "",
      })}
      <div class="card">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr><th>Trainer</th><th>Specialty</th><th>Pay model</th><th>Clients</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${trainers
                .map((t) => {
                  const clients = Store.state.ptAssignments.filter((p) => p.trainerId === t.id && p.status === "active").length;
                  const pay =
                    t.payModel === "fixed"
                      ? `Fixed · ${Store.formatPKR(t.salary)}/${t.payCycle}`
                      : `Commission · gym ${t.commissionPercent}%`;
                  return `<tr class="clickable" data-id="${t.id}">
                    <td><div class="person-cell">${UI.initialsAvatar(t.name.split(" ").map((w)=>w[0]).join("").slice(0,2))}<div><strong>${t.name}</strong><span>${t.phone}</span></div></div></td>
                    <td>${t.specialty || "—"}</td>
                    <td>${pay}</td>
                    <td>${clients}</td>
                    <td>${UI.statusChip(t.status)}</td>
                  </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById("add-trainer")?.addEventListener("click", () => this.form());
    root.querySelectorAll("tr[data-id]").forEach((row) => {
      row.addEventListener("click", () => App.navigate("trainers/" + row.dataset.id));
    });
  },

  detail(root, id) {
    const t = Store.getTrainer(id);
    if (!t) {
      root.innerHTML = UI.emptyState({ title: "Trainer not found", text: "" });
      return;
    }
    const clients = Store.state.ptAssignments.filter((p) => p.trainerId === id && p.status === "active");
    const commissions = Store.state.commissions.filter((c) => c.trainerId === id);
    const admin = Store.isAdmin();

    root.innerHTML = `
      <button class="btn btn-ghost btn-sm" style="margin-bottom:16px" data-back>← Back</button>
      <div class="card detail-hero">
        ${UI.initialsAvatar(t.name.split(" ").map((w)=>w[0]).join("").slice(0,2), "lg")}
        <div style="flex:1">
          <h1 style="font-size:1.5rem">${t.name}</h1>
          <p class="muted-sm">${t.phone} · ${t.specialty}</p>
          <div style="margin-top:10px">${UI.statusChip(t.status)} <span class="pill">${t.payModel}</span></div>
        </div>
        ${admin ? `<button class="btn btn-ghost" id="edit-trainer">Edit</button>` : ""}
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-title" style="margin-bottom:12px">Pay model</div>
          ${
            t.payModel === "fixed"
              ? `<p>Member pays <strong>gym</strong> for PT. Gym pays trainer salary <strong>${Store.formatPKR(t.salary)}</strong> / ${t.payCycle}.</p>`
              : `<p>Member pays <strong>trainer</strong>. Trainer remits <strong>${t.commissionPercent}%</strong> commission to gym.</p>`
          }
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:12px">Active clients (${clients.length})</div>
          ${
            clients.length
              ? clients
                  .map((p) => {
                    const m = Store.getMember(p.memberId);
                    return `<div class="list-item">${UI.initialsAvatar(m?.photoInitials)}<div><strong>${m?.name}</strong><div class="muted-sm">PT fee ${Store.formatPKR(p.ptFee)}</div></div></div>`;
                  })
                  .join("")
              : `<p class="muted-sm">No active clients</p>`
          }
        </div>
      </div>
      ${
        t.payModel === "commission"
          ? `<div class="card" style="margin-top:16px">
              <div class="card-header"><div class="card-title">Commissions</div></div>
              <div class="table-wrap"><table class="data-table"><thead><tr><th>Member</th><th>PT fee</th><th>Gym cut</th><th>Status</th><th></th></tr></thead><tbody>
                ${commissions
                  .map((c) => {
                    const m = Store.getMember(c.memberId);
                    return `<tr>
                      <td>${m?.name}</td>
                      <td class="money">${Store.formatPKR(c.ptFee)}</td>
                      <td class="money">${Store.formatPKR(c.amount)} (${c.percent}%)</td>
                      <td>${UI.statusChip(c.status === "received" ? "paid" : "pending")}</td>
                      <td>${c.status === "pending" ? `<button class="btn btn-primary btn-sm" data-recv="${c.id}">Mark received</button>` : Store.formatDateTime(c.receivedAt)}</td>
                    </tr>`;
                  })
                  .join("") || `<tr><td colspan="5" class="muted-sm">No commission rows</td></tr>`}
              </tbody></table></div>
            </div>`
          : ""
      }
    `;

    root.querySelector("[data-back]").addEventListener("click", () => App.navigate("trainers"));
    document.getElementById("edit-trainer")?.addEventListener("click", () => this.form(t));
    root.querySelectorAll("[data-recv]").forEach((btn) => {
      btn.addEventListener("click", () => {
        Store.receiveCommission(btn.dataset.recv);
        UI.toast("Commission recorded as gym revenue", "success");
        App.renderPage();
      });
    });
  },

  form(trainer = null) {
    if (!Store.isAdmin()) {
      UI.toast("Admin only", "error");
      return;
    }
    UI.openModal(`
      <div class="modal-header"><h2>${trainer ? "Edit trainer" : "Add trainer"}</h2><button class="btn-icon" data-close>${UI.icons.close}</button></div>
      <form id="tr-form" class="form-grid">
        <div class="field"><label>Name</label><input name="name" required value="${trainer?.name || ""}" /></div>
        <div class="field"><label>Phone</label><input name="phone" required value="${trainer?.phone || ""}" /></div>
        <div class="field"><label>Specialty</label><input name="specialty" value="${trainer?.specialty || ""}" /></div>
        <div class="field"><label>Pay model</label>
          <select name="payModel" id="pay-model">
            <option value="fixed" ${trainer?.payModel === "fixed" ? "selected" : ""}>Fixed salary</option>
            <option value="commission" ${trainer?.payModel === "commission" ? "selected" : ""}>Commission</option>
          </select>
        </div>
        <div class="field" id="salary-field"><label>Monthly salary (PKR)</label><input type="number" name="salary" value="${trainer?.salary || ""}" /></div>
        <div class="field" id="comm-field"><label>Gym commission %</label><input type="number" name="commissionPercent" min="1" max="100" value="${trainer?.commissionPercent || 30}" /></div>
      </form>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="save-tr">Save</button>
      </div>
    `);

    const sync = () => {
      const model = document.getElementById("pay-model").value;
      document.getElementById("salary-field").style.display = model === "fixed" ? "" : "none";
      document.getElementById("comm-field").style.display = model === "commission" ? "" : "none";
    };
    sync();
    document.getElementById("pay-model").addEventListener("change", sync);
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("save-tr").addEventListener("click", () => {
      const form = document.getElementById("tr-form");
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      try {
        const t = Store.upsertTrainer({
          id: trainer?.id,
          name: fd.get("name"),
          phone: fd.get("phone"),
          specialty: fd.get("specialty"),
          payModel: fd.get("payModel"),
          salary: fd.get("salary"),
          payCycle: "monthly",
          commissionPercent: fd.get("commissionPercent"),
        });
        UI.closeModal();
        UI.toast("Trainer saved", "success");
        App.navigate("trainers/" + t.id);
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
  },
};
