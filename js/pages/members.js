window.Pages = window.Pages || {};

Pages.members = {
  render(root, route) {
    if (route.params.id) return this.detail(root, route.params.id);
    this.list(root, route.params.q || "");
  },

  list(root, q) {
    const query = (q || "").toLowerCase();
    let members = Store.state.members;
    if (query) {
      members = members.filter(
        (m) => m.name.toLowerCase().includes(query) || m.phone.includes(query)
      );
    }

    root.innerHTML = `
      ${UI.pageHeader({
        title: "Members",
        subtitle: "Profiles, memberships & optional PT",
        actionsHtml: `<button class="btn btn-primary" id="add-member">${UI.icons.plus} New member</button>`,
      })}
      <div class="toolbar">
        <div class="search-box">
          ${UI.icons.search}
          <input id="member-search" placeholder="Search name or phone" value="${q || ""}" />
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Package</th>
                <th>Ends</th>
                <th>Trainer</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${
                members.length
                  ? members
                      .map((m) => {
                        const ms = Store.activeMembership(m.id);
                        const pkg = ms ? Store.getPackage(ms.packageId) : null;
                        const pt = Store.activePT(m.id);
                        const tr = pt ? Store.getTrainer(pt.trainerId) : null;
                        return `
                        <tr class="clickable" data-id="${m.id}">
                          <td>
                            <div class="person-cell">
                              ${UI.initialsAvatar(m.photoInitials)}
                              <div><strong>${m.name}</strong><span>${m.phone}</span></div>
                            </div>
                          </td>
                          <td>${pkg?.name || "—"}</td>
                          <td>${ms ? Store.formatDate(ms.endDate) : "—"}</td>
                          <td>${tr?.name || "None"}</td>
                          <td>${UI.statusChip(ms?.status || m.status)}</td>
                        </tr>`;
                      })
                      .join("")
                  : `<tr><td colspan="5">${UI.emptyState({ title: "No members", text: "Add your first member to get started." })}</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById("add-member")?.addEventListener("click", () => this.createForm());
    document.getElementById("member-search")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") App.navigate("members?q=" + encodeURIComponent(e.target.value.trim()));
    });
    root.querySelectorAll("tr[data-id]").forEach((row) => {
      row.addEventListener("click", () => App.navigate("members/" + row.dataset.id));
    });
  },

  createForm() {
    const pkgs = Store.state.packages.filter((p) => p.active);
    const trainers = Store.state.trainers.filter((t) => t.status === "active");
    UI.openModal(`
      <div class="modal-header">
        <h2>New member</h2>
        <button class="btn-icon" data-close>${UI.icons.close}</button>
      </div>
      <form id="member-form" class="form-grid">
        <div class="field"><label>Name</label><input name="name" required /></div>
        <div class="field"><label>Phone</label><input name="phone" required /></div>
        <div class="field"><label>Gender</label>
          <select name="gender"><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select>
        </div>
        <div class="field"><label>Registration date</label><input type="date" name="registrationDate" value="${Store.todayISO()}" /></div>
        <div class="field full"><label>Address</label><input name="address" /></div>
        <div class="field"><label>Emergency contact</label><input name="emergencyContact" /></div>
        <div class="field"><label>Biometric ID</label><input name="biometricId" placeholder="ZKTeco ID" /></div>
        <div class="field full"><label>Medical notes</label><textarea name="medicalNotes"></textarea></div>
        <div class="field"><label>Gym package</label>
          <select name="packageId"><option value="">Assign later</option>${pkgs.map((p) => `<option value="${p.id}">${p.name} — ${Store.formatPKR(p.price)}</option>`).join("")}</select>
        </div>
        <div class="field"><label>Start date</label><input type="date" name="startDate" value="${Store.todayISO()}" /></div>
        <div class="field"><label>Trainer (optional)</label>
          <select name="trainerId"><option value="">No trainer</option>${trainers.map((t) => `<option value="${t.id}">${t.name} (${t.payModel})</option>`).join("")}</select>
        </div>
        <div class="field"><label>PT fee (PKR)</label><input type="number" name="ptFee" min="0" placeholder="If trainer selected" /></div>
      </form>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="save-member">Create</button>
      </div>
    `);

    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("save-member").addEventListener("click", () => {
      const form = document.getElementById("member-form");
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      const member = Store.addMember({
        name: fd.get("name"),
        phone: fd.get("phone"),
        gender: fd.get("gender"),
        address: fd.get("address"),
        registrationDate: fd.get("registrationDate"),
        emergencyContact: fd.get("emergencyContact"),
        medicalNotes: fd.get("medicalNotes"),
        biometricId: fd.get("biometricId"),
      });
      if (fd.get("packageId")) {
        Store.assignMembership({
          memberId: member.id,
          packageId: fd.get("packageId"),
          startDate: fd.get("startDate"),
        });
      }
      if (fd.get("trainerId") && fd.get("ptFee")) {
        Store.assignPT({
          memberId: member.id,
          trainerId: fd.get("trainerId"),
          ptFee: fd.get("ptFee"),
          startDate: fd.get("startDate"),
        });
      }
      UI.closeModal();
      UI.toast("Member created", "success");
      App.navigate("members/" + member.id);
    });
  },

  detail(root, id) {
    const m = Store.getMember(id);
    if (!m) {
      root.innerHTML = UI.emptyState({ title: "Member not found", text: "Go back to the members list." });
      return;
    }
    const tab = (location.hash.split("tab=")[1] || "overview").replace(/&.*/, "");
    const ms = Store.activeMembership(m.id);
    const pkg = ms ? Store.getPackage(ms.packageId) : null;
    const pt = Store.activePT(m.id);
    const tr = pt ? Store.getTrainer(pt.trainerId) : null;
    const memberships = Store.state.memberships.filter((x) => x.memberId === m.id);
    const payments = Store.state.payments.filter((p) => {
      const inv = Store.state.invoices.find((i) => i.id === p.invoiceId);
      return inv && inv.memberId === m.id;
    });
    const visits = Store.state.attendance.filter((a) => a.memberId === m.id);
    const pts = Store.state.ptAssignments.filter((p) => p.memberId === m.id);
    const admin = Store.isAdmin();

    root.innerHTML = `
      <button class="btn btn-ghost btn-sm" style="margin-bottom:16px" data-back>← Back to members</button>
      <div class="card detail-hero">
        ${UI.initialsAvatar(m.photoInitials, "lg")}
        <div style="flex:1">
          <h1 style="font-size:1.5rem">${m.name}</h1>
          <p class="muted-sm">${m.phone} · ${m.gender} · Registered ${Store.formatDate(m.registrationDate)}</p>
          <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
            ${UI.statusChip(m.status)}
            ${ms ? UI.statusChip(ms.status) : UI.statusChip("inactive")}
            ${pkg ? `<span class="pill">${pkg.name}</span>` : ""}
            ${tr ? `<span class="pill">${tr.name}</span>` : `<span class="pill">No trainer</span>`}
          </div>
        </div>
        <div class="quick-actions">
          <button class="btn btn-primary btn-sm" data-action="membership">Assign / renew</button>
          <button class="btn btn-dark btn-sm" data-action="pt">Assign PT</button>
          ${admin && ms && ms.status === "active" ? `<button class="btn btn-ghost btn-sm" data-action="freeze">Freeze</button>` : ""}
        </div>
      </div>

      <div class="tabs">
        ${["overview", "memberships", "payments", "visits", "pt"]
          .map(
            (t) =>
              `<button class="tab ${tab === t ? "active" : ""}" data-tab="${t}">${t[0].toUpperCase() + t.slice(1)}</button>`
          )
          .join("")}
      </div>
      <div id="member-tab-body"></div>
    `;

    root.querySelector("[data-back]").addEventListener("click", () => App.navigate("members"));
    root.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        location.hash = `#/members/${id}?tab=${btn.dataset.tab}`;
        this.detail(root, id);
      });
    });
    root.querySelector("[data-action='membership']")?.addEventListener("click", () => this.assignMembership(m));
    root.querySelector("[data-action='pt']")?.addEventListener("click", () => this.assignPTForm(m));
    root.querySelector("[data-action='freeze']")?.addEventListener("click", async () => {
      const reason = prompt("Freeze reason?");
      if (reason == null) return;
      try {
        Store.freezeMembership(ms.id, reason);
        UI.toast("Membership frozen", "success");
        App.renderPage();
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });

    const body = document.getElementById("member-tab-body");
    if (tab === "overview") {
      body.innerHTML = `
        <div class="grid-2">
          <div class="card">
            <div class="card-title">Profile</div>
            <div class="list-item"><span class="muted">Address</span><div class="meta">${m.address || "—"}</div></div>
            <div class="list-item"><span class="muted">Emergency</span><div class="meta">${m.emergencyContact || "—"}</div></div>
            <div class="list-item"><span class="muted">Biometric ID</span><div class="meta">${m.biometricId || "—"}</div></div>
            <div class="list-item"><span class="muted">Medical</span><div class="meta">${m.medicalNotes || "—"}</div></div>
          </div>
          <div class="card">
            <div class="card-title">Current plan</div>
            <div class="list-item"><span class="muted">Package</span><div class="meta">${pkg?.name || "None"}</div></div>
            <div class="list-item"><span class="muted">Period</span><div class="meta">${ms ? Store.formatDate(ms.startDate) + " → " + Store.formatDate(ms.endDate) : "—"}</div></div>
            <div class="list-item"><span class="muted">Price</span><div class="meta money">${ms ? Store.formatPKR(ms.price) : "—"}</div></div>
            <div class="list-item"><span class="muted">PT</span><div class="meta">${tr ? tr.name + " · " + Store.formatPKR(pt.ptFee) : "None"}</div></div>
          </div>
        </div>`;
    } else if (tab === "memberships") {
      body.innerHTML = `<div class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>Package</th><th>Start</th><th>End</th><th>Price</th><th>Status</th></tr></thead><tbody>
        ${memberships
          .map((x) => {
            const p = Store.getPackage(x.packageId);
            return `<tr><td>${p?.name}</td><td>${Store.formatDate(x.startDate)}</td><td>${Store.formatDate(x.endDate)}</td><td class="money">${Store.formatPKR(x.price)}</td><td>${UI.statusChip(x.status)}</td></tr>`;
          })
          .join("")}
      </tbody></table></div></div>`;
    } else if (tab === "payments") {
      body.innerHTML = `<div class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>Date</th><th>Method</th><th>Amount</th></tr></thead><tbody>
        ${
          payments.length
            ? payments
                .map(
                  (p) =>
                    `<tr><td>${Store.formatDateTime(p.paidAt)}</td><td>${p.method}</td><td class="money">${Store.formatPKR(p.amount)}</td></tr>`
                )
                .join("")
            : `<tr><td colspan="3" class="muted-sm">No payments yet</td></tr>`
        }
      </tbody></table></div></div>`;
    } else if (tab === "visits") {
      body.innerHTML = `<div class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>When</th><th>Source</th></tr></thead><tbody>
        ${
          visits.length
            ? visits
                .map((v) => `<tr><td>${Store.formatDateTime(v.checkedInAt)}</td><td>${v.source}</td></tr>`)
                .join("")
            : `<tr><td colspan="2" class="muted-sm">No visits yet</td></tr>`
        }
      </tbody></table></div></div>`;
    } else if (tab === "pt") {
      body.innerHTML = `<div class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>Trainer</th><th>Fee</th><th>Period</th><th>Status</th></tr></thead><tbody>
        ${
          pts.length
            ? pts
                .map((p) => {
                  const t = Store.getTrainer(p.trainerId);
                  return `<tr><td>${t?.name}</td><td class="money">${Store.formatPKR(p.ptFee)}</td><td>${Store.formatDate(p.startDate)} → ${Store.formatDate(p.endDate)}</td><td>${UI.statusChip(p.status)}</td></tr>`;
                })
                .join("")
            : `<tr><td colspan="4" class="muted-sm">No PT assignments</td></tr>`
        }
      </tbody></table></div></div>`;
    }
  },

  assignMembership(member) {
    const pkgs = Store.state.packages.filter((p) => p.active);
    const admin = Store.isAdmin();
    UI.openModal(`
      <div class="modal-header"><h2>Assign / renew package</h2><button class="btn-icon" data-close>${UI.icons.close}</button></div>
      <form id="ms-form" class="form-grid">
        <div class="field full"><label>Package</label>
          <select name="packageId" required>${pkgs.map((p) => `<option value="${p.id}">${p.name} — ${Store.formatPKR(p.price)}</option>`).join("")}</select>
        </div>
        <div class="field"><label>Start date</label><input type="date" name="startDate" value="${Store.todayISO()}" required /></div>
        ${admin ? `<div class="field"><label>Price override (optional)</label><input type="number" name="priceOverride" min="0" placeholder="Leave blank for package price" /></div>` : ""}
      </form>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="save-ms">Assign</button>
      </div>
    `);
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("save-ms").addEventListener("click", () => {
      const fd = new FormData(document.getElementById("ms-form"));
      const override = fd.get("priceOverride");
      Store.assignMembership({
        memberId: member.id,
        packageId: fd.get("packageId"),
        startDate: fd.get("startDate"),
        priceOverride: override ? Number(override) : null,
      });
      UI.closeModal();
      UI.toast("Membership assigned — invoice created", "success");
      App.renderPage();
    });
  },

  assignPTForm(member) {
    const trainers = Store.state.trainers.filter((t) => t.status === "active");
    UI.openModal(`
      <div class="modal-header"><h2>Assign personal trainer</h2><button class="btn-icon" data-close>${UI.icons.close}</button></div>
      <p class="muted-sm" style="margin-bottom:16px">Fixed trainers: member pays gym. Commission trainers: member pays trainer; gym logs commission.</p>
      <form id="pt-form" class="form-grid">
        <div class="field full"><label>Trainer</label>
          <select name="trainerId" required>${trainers.map((t) => `<option value="${t.id}">${t.name} — ${t.payModel}${t.payModel === "commission" ? " (" + t.commissionPercent + "%)" : ""}</option>`).join("")}</select>
        </div>
        <div class="field"><label>PT fee (PKR)</label><input type="number" name="ptFee" required min="1" /></div>
        <div class="field"><label>Start</label><input type="date" name="startDate" value="${Store.todayISO()}" /></div>
        <div class="field"><label>End</label><input type="date" name="endDate" value="${Store.addDays(Store.todayISO(), 30)}" /></div>
      </form>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="save-pt">Assign</button>
      </div>
    `);
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("save-pt").addEventListener("click", () => {
      const form = document.getElementById("pt-form");
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      Store.assignPT({
        memberId: member.id,
        trainerId: fd.get("trainerId"),
        ptFee: fd.get("ptFee"),
        startDate: fd.get("startDate"),
        endDate: fd.get("endDate"),
      });
      UI.closeModal();
      UI.toast("PT assigned", "success");
      App.renderPage();
    });
  },
};
