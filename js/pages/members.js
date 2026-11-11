window.Pages = window.Pages || {};

Pages.members = {
  render(root, route) {
    if (route.params.id) return this.detail(root, route.params.id);
    this.list(root, {
      q: route.params.q || "",
      gender: route.params.gender || "all",
      packageId: route.params.packageId || "all",
      trainerId: route.params.trainerId || "all",
      status: route.params.status || "all",
      endsFrom: route.params.endsFrom || "",
      endsTo: route.params.endsTo || "",
    });
  },

  list(root, filters) {
    const f = {
      q: filters.q || "",
      gender: filters.gender || "all",
      packageId: filters.packageId || "all",
      trainerId: filters.trainerId || "all",
      status: filters.status || "all",
      endsFrom: filters.endsFrom || "",
      endsTo: filters.endsTo || "",
    };
    const today = Store.todayLocal();
    const packages = Store.state.packages;
    const trainers = Store.state.trainers.filter((t) => t.status === "active");

    const enriched = Store.visibleMembers().map((m) => {
      const ms = Store.activeMembership(m.id);
      const st = Store.membershipStatus(ms, today) || m.status;
      const pkg = ms ? Store.getPackage(ms.packageId) : null;
      const pt = Store.activePT(m.id);
      const tr = pt ? Store.getTrainer(pt.trainerId) : null;
      return { m, ms, st, pkg, pt, tr };
    });

    const query = f.q.trim().toLowerCase();
    let rows = enriched.filter(({ m, ms, st, pkg, tr }) => {
      if (query && !(m.name.toLowerCase().includes(query) || m.phone.includes(query))) return false;
      if (f.gender !== "all" && m.gender !== f.gender) return false;
      if (f.packageId === "none") {
        if (pkg) return false;
      } else if (f.packageId !== "all" && pkg?.id !== f.packageId) {
        return false;
      }
      if (f.trainerId === "none") {
        if (tr) return false;
      } else if (f.trainerId !== "all" && tr?.id !== f.trainerId) {
        return false;
      }
      if (f.status !== "all" && st !== f.status) return false;
      if (f.endsFrom) {
        if (!ms?.endDate || ms.endDate < f.endsFrom) return false;
      }
      if (f.endsTo) {
        if (!ms?.endDate || ms.endDate > f.endsTo) return false;
      }
      return true;
    });

    const hasFilters =
      f.gender !== "all" ||
      f.packageId !== "all" ||
      f.trainerId !== "all" ||
      f.status !== "all" ||
      !!f.endsFrom ||
      !!f.endsTo ||
      !!f.q.trim();

    const syncUrl = () => {
      const params = new URLSearchParams();
      if (f.q.trim()) params.set("q", f.q.trim());
      if (f.gender !== "all") params.set("gender", f.gender);
      if (f.packageId !== "all") params.set("packageId", f.packageId);
      if (f.trainerId !== "all") params.set("trainerId", f.trainerId);
      if (f.status !== "all") params.set("status", f.status);
      if (f.endsFrom) params.set("endsFrom", f.endsFrom);
      if (f.endsTo) params.set("endsTo", f.endsTo);
      const qs = params.toString();
      location.hash = "#/members" + (qs ? "?" + qs : "");
    };

    root.innerHTML = `
      ${UI.pageHeader({
        title: "Members",
        subtitle: "Profiles, memberships & optional PT · Expires from/to filter by package end date",
        actionsHtml: `<button class="btn btn-primary" id="add-member">${UI.icons.plus} New member</button>`,
      })}
      <div class="toolbar member-filters">
        <div class="search-box">
          ${UI.icons.search}
          <input id="member-search" placeholder="Search name or phone" value="${UI.esc(f.q)}" aria-label="Search members" />
        </div>
        <label class="filter-field">
          <span class="muted-sm">Gender</span>
          <select id="f-gender" aria-label="Filter by gender" ${Store.isSegregated() && Store.staffDesk() ? "disabled" : ""}>
            <option value="all" ${f.gender === "all" ? "selected" : ""}>All</option>
            <option value="male" ${f.gender === "male" ? "selected" : ""}>Male</option>
            <option value="female" ${f.gender === "female" ? "selected" : ""}>Female</option>
            <option value="other" ${f.gender === "other" ? "selected" : ""}>Other</option>
          </select>
        </label>
        <label class="filter-field">
          <span class="muted-sm">Package</span>
          <select id="f-package" aria-label="Filter by package">
            <option value="all" ${f.packageId === "all" ? "selected" : ""}>All packages</option>
            <option value="none" ${f.packageId === "none" ? "selected" : ""}>No package</option>
            ${packages.map((p) => `<option value="${UI.esc(p.id)}" ${f.packageId === p.id ? "selected" : ""}>${UI.esc(p.name)}</option>`).join("")}
          </select>
        </label>
        <label class="filter-field">
          <span class="muted-sm">Trainer</span>
          <select id="f-trainer" aria-label="Filter by trainer">
            <option value="all" ${f.trainerId === "all" ? "selected" : ""}>All trainers</option>
            <option value="none" ${f.trainerId === "none" ? "selected" : ""}>No trainer</option>
            ${trainers.map((t) => `<option value="${UI.esc(t.id)}" ${f.trainerId === t.id ? "selected" : ""}>${UI.esc(t.name)}</option>`).join("")}
          </select>
        </label>
        <label class="filter-field">
          <span class="muted-sm">Status</span>
          <select id="f-status" aria-label="Filter by status">
            ${["all", "active", "upcoming", "expired", "frozen", "cancelled"]
              .map((s) => `<option value="${s}" ${f.status === s ? "selected" : ""}>${s === "all" ? "All statuses" : s}</option>`)
              .join("")}
          </select>
        </label>
        <label class="filter-field">
          <span class="muted-sm">Expires from</span>
          <input type="date" id="f-ends-from" value="${UI.esc(f.endsFrom)}" aria-label="Membership expires from" title="Show members whose package end date is on or after this day" />
        </label>
        <label class="filter-field">
          <span class="muted-sm">Expires to</span>
          <input type="date" id="f-ends-to" value="${UI.esc(f.endsTo)}" aria-label="Membership expires to" title="Show members whose package end date is on or before this day" />
        </label>
        ${hasFilters ? `<button type="button" class="btn btn-ghost btn-sm" id="clear-filters">Clear</button>` : ""}
      </div>
      <p class="muted-sm" style="margin:-8px 0 12px">${rows.length} member${rows.length === 1 ? "" : "s"}${hasFilters ? " matching filters" : ""}</p>
      <div class="card">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Gender</th>
                <th>Package</th>
                <th>Ends</th>
                <th>Trainer</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${
                rows.length
                  ? rows
                      .map(({ m, ms, st, pkg, tr }) => {
                        return `
                        <tr class="clickable" data-id="${UI.esc(m.id)}" tabindex="0" role="link">
                          <td>
                            <div class="person-cell">
                              ${UI.initialsAvatar(m.photoInitials)}
                              <div><strong>${UI.esc(m.name)}</strong><span>${UI.esc(m.phone)}</span>
                              ${UI.concessionBadge(m.id)}
                              </div>
                            </div>
                          </td>
                          <td>${UI.esc(m.gender || "—")}</td>
                          <td>${UI.esc(pkg?.name || "—")}</td>
                          <td>${ms ? Store.formatDate(ms.endDate) : "—"}</td>
                          <td>${UI.esc(tr?.name || "None")}</td>
                          <td>${UI.statusChip(st || m.status)}</td>
                        </tr>`;
                      })
                      .join("")
                  : `<tr><td colspan="6">${UI.emptyState({
                      title: hasFilters ? "No matches" : "No members",
                      text: hasFilters ? "Try clearing or changing filters." : "Add your first member to get started.",
                    })}</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById("add-member")?.addEventListener("click", () => this.createForm());

    const apply = (patch) => {
      Object.assign(f, patch);
      syncUrl(); // hashchange re-renders with updated filters
    };

    document.getElementById("member-search")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") apply({ q: e.target.value });
    });
    document.getElementById("f-gender")?.addEventListener("change", (e) => apply({ gender: e.target.value }));
    document.getElementById("f-package")?.addEventListener("change", (e) => apply({ packageId: e.target.value }));
    document.getElementById("f-trainer")?.addEventListener("change", (e) => apply({ trainerId: e.target.value }));
    document.getElementById("f-status")?.addEventListener("change", (e) => apply({ status: e.target.value }));
    document.getElementById("f-ends-from")?.addEventListener("change", (e) => apply({ endsFrom: e.target.value }));
    document.getElementById("f-ends-to")?.addEventListener("change", (e) => apply({ endsTo: e.target.value }));
    document.getElementById("clear-filters")?.addEventListener("click", () => {
      location.hash = "#/members";
    });

    root.querySelectorAll("tr[data-id]").forEach((row) => {
      const go = () => App.navigate("members/" + row.dataset.id);
      row.addEventListener("click", go);
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      });
    });
  },

  concessionFieldsHtml(prefix = "con") {
    return `
      <div class="field full" style="margin-top:8px">
        <strong>Concession (optional)</strong>
        <p class="muted-sm">Flat discount per membership invoice whose start falls in the window. Quarterly/annual = one invoice → one discount.</p>
      </div>
      <div class="field"><label for="${prefix}-amount">Concession amount (PKR)</label>
        <input type="number" id="${prefix}-amount" name="concessionAmount" min="0" step="1" placeholder="0 = none" />
      </div>
      <div class="field"><label for="${prefix}-mode">Duration</label>
        <select id="${prefix}-mode" name="concessionMode">
          <option value="months">Number of months</option>
          <option value="lifetime">Lifetime</option>
        </select>
      </div>
      <div class="field" id="${prefix}-months-wrap"><label for="${prefix}-months">Months</label>
        <input type="number" id="${prefix}-months" name="concessionMonths" min="1" value="3" />
      </div>
      <div class="field full"><label for="${prefix}-reason">Concession reason</label>
        <input id="${prefix}-reason" name="concessionReason" placeholder="Required if granting" />
      </div>
      <div class="field full muted-sm" id="${prefix}-preview"></div>
    `;
  },

  wireConcessionPreview(form, packageSelectName = "packageId") {
    const update = () => {
      const pkgId = form.querySelector(`[name="${packageSelectName}"]`)?.value;
      const pkg = Store.getPackage(pkgId);
      const amt = Number(form.querySelector("[name=concessionAmount]")?.value || 0);
      const preview = form.querySelector("[id$=-preview]");
      if (!preview) return;
      if (!pkg || !(amt > 0)) {
        preview.textContent = pkg ? `Package ${Store.formatPKR(pkg.price)} · no concession` : "";
        return;
      }
      const payable = Math.max(0, pkg.price - amt);
      preview.innerHTML = `Package ${UI.esc(Store.formatPKR(pkg.price))} − Concession ${UI.esc(Store.formatPKR(amt))} = <strong>Payable ${UI.esc(Store.formatPKR(payable))}</strong>`;
    };
    form.querySelectorAll("[name=concessionAmount],[name=packageId],[name=concessionMode]").forEach((el) => {
      el.addEventListener("input", update);
      el.addEventListener("change", update);
    });
    form.querySelector("[name=concessionMode]")?.addEventListener("change", (e) => {
      const wrap = form.querySelector("[id$=-months-wrap]");
      if (wrap) wrap.style.display = e.target.value === "lifetime" ? "none" : "";
    });
    update();
  },

  async maybeGrantConcession(memberId, fd, listPrice) {
    const amount = Number(fd.get("concessionAmount") || 0);
    if (!(amount > 0)) return null;
    if (amount > listPrice) throw new Error("Concession cannot exceed package price");
    const reason = String(fd.get("concessionReason") || "").trim();
    if (!reason) throw new Error("Concession reason is required");
    const payable = listPrice - amount;
    if (payable === 0) {
      const ok = await UI.confirmDialog({
        title: "Free membership?",
        message: "Payable will be Rs 0. Confirm free membership.",
        confirmLabel: "Confirm free",
      });
      if (!ok) throw new Error("Free membership not confirmed");
    }
    const existing = Store.getActiveConcession(memberId);
    let replaceConfirm = false;
    if (existing) {
      if (!Store.isAdmin()) throw new Error("Not allowed");
      const ok = await UI.confirmDialog({
        title: "Replace active concession?",
        message: "This member already has an active concession. Replace it?",
        confirmLabel: "Replace",
        danger: true,
      });
      if (!ok) throw new Error("Replacement cancelled");
      replaceConfirm = true;
    }
    return Store.grantConcession({
      memberId,
      amount,
      mode: fd.get("concessionMode") || "months",
      months: Number(fd.get("concessionMonths") || 3),
      reason,
      replaceConfirm,
      replaceReason: "Replaced on member form",
    });
  },

  createForm(prefill = null, leadId = null) {
    const pkgs = Store.state.packages.filter((p) => p.active);
    const trainers = Store.state.trainers.filter((t) => t.status === "active");
    const admin = Store.isAdmin();
    const startHint = Store.todayLocal();
    const desk = Store.staffDesk();
    const lockGender = Store.isSegregated() && !admin && !!desk;
    const defaultGender = lockGender
      ? desk
      : prefill?.gender === "male" || prefill?.gender === "female" || (admin && prefill?.gender === "other")
        ? prefill.gender
        : "male";

    UI.openModal(`
      <div class="modal-header">
        <h2>New member</h2>
        <button class="btn-icon" data-close aria-label="Close">${UI.icons.close}</button>
      </div>
      <form id="member-form" class="form-grid">
        <div class="field"><label for="m-name">Name</label><input id="m-name" name="name" required value="${UI.esc(prefill?.name || "")}" /></div>
        <div class="field"><label for="m-phone">Phone</label><input id="m-phone" name="phone" required value="${UI.esc(prefill?.phone || "")}" /></div>
        <div class="field"><label for="m-gender">Gender</label>
          ${
            lockGender
              ? `<input type="text" value="${desk === "male" ? "Male" : "Female"}" disabled /><input type="hidden" name="gender" value="${UI.esc(desk)}" /><p class="muted-sm">${desk === "male" ? "Male" : "Female"} staff can only add ${desk} members</p>`
              : `<select id="m-gender" name="gender">
                  <option value="male" ${defaultGender === "male" ? "selected" : ""}>Male</option>
                  <option value="female" ${defaultGender === "female" ? "selected" : ""}>Female</option>
                  ${admin ? `<option value="other" ${defaultGender === "other" ? "selected" : ""}>Other</option>` : ""}
                </select>
                ${!admin ? `<p class="muted-sm">Unified mode — you can add male or female members</p>` : ""}`
          }
        </div>
        ${
          admin
            ? `<div class="field"><label for="m-reg">Registration date</label><input id="m-reg" type="date" name="registrationDate" value="${startHint}" /></div>`
            : `<div class="field"><label>Registration date</label><input type="date" value="${startHint}" disabled /><input type="hidden" name="registrationDate" value="${startHint}" /></div>`
        }
        <div class="field full"><label for="m-addr">Address</label><input id="m-addr" name="address" /></div>
        <div class="field"><label for="m-em">Emergency contact</label><input id="m-em" name="emergencyContact" /></div>
        <div class="field"><label for="m-bio">Biometric ID</label><input id="m-bio" name="biometricId" placeholder="ZKTeco ID" /></div>
        <div class="field full"><label for="m-med">Medical notes</label><textarea id="m-med" name="medicalNotes"></textarea></div>
        <div class="field"><label for="m-pkg">Gym package</label>
          <select id="m-pkg" name="packageId"><option value="">Assign later</option>${pkgs.map((p) => `<option value="${p.id}">${UI.esc(p.name)} — ${Store.formatPKR(p.price)}</option>`).join("")}</select>
        </div>
        ${
          admin
            ? `<div class="field"><label for="m-start">Start date</label><input id="m-start" type="date" name="startDate" value="${startHint}" /></div>`
            : `<div class="field"><label>Start date</label><input type="date" value="${startHint}" disabled /><p class="muted-sm">Automatic (today or day after current end)</p></div>`
        }
        <div class="field"><label for="m-tr">Trainer (optional)</label>
          <select id="m-tr" name="trainerId"><option value="">No trainer</option>${trainers.map((t) => `<option value="${t.id}">${UI.esc(t.name)} (${t.payModel})</option>`).join("")}</select>
        </div>
        <div class="field"><label for="m-pt">PT fee (PKR)</label><input id="m-pt" type="number" name="ptFee" min="0" placeholder="If trainer selected" /></div>
        ${this.concessionFieldsHtml("newcon")}
      </form>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="save-member">Create</button>
      </div>
    `);

    const form = document.getElementById("member-form");
    this.wireConcessionPreview(form);
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("save-member").addEventListener("click", async () => {
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      try {
        let gender = fd.get("gender");
        if (lockGender) gender = desk;
        const member = Store.addMember({
          name: fd.get("name"),
          phone: fd.get("phone"),
          gender,
          address: fd.get("address"),
          registrationDate: fd.get("registrationDate"),
          emergencyContact: fd.get("emergencyContact"),
          medicalNotes: fd.get("medicalNotes"),
          biometricId: fd.get("biometricId"),
        });
        if (leadId) Store.markLeadConverted(leadId, member.id);

        const pkgId = fd.get("packageId");
        if (pkgId) {
          const pkg = Store.getPackage(pkgId);
          await this.maybeGrantConcession(member.id, fd, pkg.price);
          const payable = Store.resolvePayable(pkg.price, member.id, Store.computeStaffStartDate(member.id));
          const opts = {
            memberId: member.id,
            packageId: pkgId,
            confirmFree: payable.amount === 0,
          };
          if (admin && fd.get("startDate")) opts.startDate = fd.get("startDate");
          if (admin && fd.get("startDate") && fd.get("startDate") !== Store.computeStaffStartDate(member.id)) {
            opts.overrideReason = "Admin set start on new member";
          }
          Store.assignMembership(opts);
        }

        if (fd.get("trainerId") && fd.get("ptFee")) {
          Store.assignPT({
            memberId: member.id,
            trainerId: fd.get("trainerId"),
            ptFee: fd.get("ptFee"),
            startDate: admin ? fd.get("startDate") || Store.todayLocal() : Store.todayLocal(),
          });
        }
        UI.closeModal();
        UI.toast("Member created", "success");
        App.navigate("members/" + member.id);
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
  },

  detail(root, id) {
    const m = Store.getMember(id);
    if (!m || !Store.memberVisibleToCurrentUser(m)) {
      root.innerHTML = UI.emptyState({
        title: "Not allowed",
        text: "This member is outside your desk, or was not found.",
      });
      return;
    }
    const tab = (location.hash.split("tab=")[1] || "overview").replace(/&.*/, "");
    const today = Store.todayLocal();
    const ms = Store.activeMembership(m.id);
    const st = Store.membershipStatus(ms, today);
    const pkg = ms ? Store.getPackage(ms.packageId) : null;
    const pt = Store.activePT(m.id);
    const tr = pt ? Store.getTrainer(pt.trainerId) : null;
    const memberships = Store.state.memberships.filter((x) => x.memberId === m.id);
    const feeHistory = Store.memberFeeHistory(m.id);
    const visits = Store.state.attendance.filter((a) => a.memberId === m.id);
    const pts = Store.state.ptAssignments.filter((p) => p.memberId === m.id);
    const admin = Store.isAdmin();
    const activeCon = Store.getActiveConcession(m.id);
    const needsDesk =
      admin && Store.isSegregated() && m.gender === "other" && (m.desk !== "male" && m.desk !== "female");
    const deskLabel =
      m.gender === "other"
        ? m.desk
          ? `desk: ${m.desk}`
          : "desk: unassigned"
        : null;

    root.innerHTML = `
      <button class="btn btn-ghost btn-sm" style="margin-bottom:16px" data-back>← Back to members</button>
      <div class="card detail-hero">
        ${UI.initialsAvatar(m.photoInitials, "lg")}
        <div style="flex:1">
          <h1 style="font-size:1.5rem">${UI.esc(m.name)}</h1>
          <p class="muted-sm">${UI.esc(m.phone)} · ${UI.esc(m.gender)}${deskLabel ? " · " + UI.esc(deskLabel) : ""} · Registered ${Store.formatDate(m.registrationDate)}</p>
          <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap">
            ${UI.statusChip(st || m.status)}
            ${pkg ? `<span class="pill">${UI.esc(pkg.name)}</span>` : ""}
            ${tr ? `<span class="pill">${UI.esc(tr.name)}</span>` : `<span class="pill">No trainer</span>`}
            ${UI.concessionBadge(m.id)}
            ${needsDesk ? UI.statusChip("needs desk") : m.gender === "other" && m.desk ? UI.statusChip(m.desk + " desk") : ""}
          </div>
        </div>
        <div class="quick-actions">
          <button class="btn btn-primary btn-sm" data-action="membership">Assign / renew</button>
          <button class="btn btn-dark btn-sm" data-action="pt">Assign PT</button>
          ${
            activeCon
              ? admin
                ? `<button class="btn btn-ghost btn-sm" data-action="manage-con">Manage concession</button>`
                : ""
              : `<button class="btn btn-ghost btn-sm" data-action="give-con">Give concession</button>`
          }
          ${admin ? `<button class="btn btn-ghost btn-sm" data-action="edit">Edit</button>` : ""}
          ${admin && (m.gender === "other" || needsDesk) && Store.isSegregated() ? `<button class="btn btn-ghost btn-sm" data-action="assign-desk">Assign desk</button>` : ""}
          ${admin && ms && st === "active" ? `<button class="btn btn-ghost btn-sm" data-action="freeze">Freeze</button>` : ""}
          ${admin && ms && st === "frozen" ? `<button class="btn btn-ghost btn-sm" data-action="unfreeze">Unfreeze</button>` : ""}
        </div>
      </div>

      <div class="tabs">
        ${["overview", "memberships", "fees", "visits", "pt"]
          .map(
            (t) =>
              `<button class="tab ${tab === t ? "active" : ""}" data-tab="${t}">${t === "fees" ? "Fee history" : t[0].toUpperCase() + t.slice(1)}</button>`
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
    root.querySelector("[data-action='give-con']")?.addEventListener("click", () => this.concessionForm(m));
    root.querySelector("[data-action='manage-con']")?.addEventListener("click", () => this.concessionForm(m, activeCon));
    root.querySelector("[data-action='edit']")?.addEventListener("click", () => this.editForm(m));
    root.querySelector("[data-action='assign-desk']")?.addEventListener("click", () => this.assignDeskForm(m));
    root.querySelector("[data-action='freeze']")?.addEventListener("click", async () => {
      const reason = await UI.promptDialog({ title: "Freeze membership", message: "Reason is required.", label: "Reason" });
      if (reason == null) return;
      try {
        Store.freezeMembership(ms.id, reason);
        UI.toast("Membership frozen", "success");
        App.renderPage();
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
    root.querySelector("[data-action='unfreeze']")?.addEventListener("click", async () => {
      const ok = await UI.confirmDialog({
        title: "Unfreeze membership?",
        message: "End date will be extended by the frozen days.",
        confirmLabel: "Unfreeze",
      });
      if (!ok) return;
      try {
        Store.unfreezeMembership(ms.id);
        UI.toast("Membership unfrozen", "success");
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
            <div class="list-item"><span class="muted">Address</span><div class="meta">${UI.esc(m.address || "—")}</div></div>
            <div class="list-item"><span class="muted">Emergency</span><div class="meta">${UI.esc(m.emergencyContact || "—")}</div></div>
            <div class="list-item"><span class="muted">Biometric ID</span><div class="meta">${UI.esc(m.biometricId || "—")}</div></div>
            <div class="list-item"><span class="muted">Medical</span><div class="meta">${UI.esc(m.medicalNotes || "—")}</div></div>
          </div>
          <div class="card">
            <div class="card-title">Current plan</div>
            <div class="list-item"><span class="muted">Package</span><div class="meta">${UI.esc(pkg?.name || "None")}</div></div>
            <div class="list-item"><span class="muted">Period</span><div class="meta">${ms ? Store.formatDate(ms.startDate) + " → " + Store.formatDate(ms.endDate) : "—"}</div></div>
            <div class="list-item"><span class="muted">Price</span><div class="meta">${ms ? UI.moneyLine(ms) : "—"}</div></div>
            <div class="list-item"><span class="muted">PT</span><div class="meta">${tr ? UI.esc(tr.name) + " · " + Store.formatPKR(pt.ptFee) : "None"}</div></div>
          </div>
        </div>`;
    } else if (tab === "memberships") {
      body.innerHTML = `<div class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>Package</th><th>Start</th><th>End</th><th>List</th><th>Concession</th><th>Payable</th><th>Status</th></tr></thead><tbody>
        ${memberships
          .map((x) => {
            const p = Store.getPackage(x.packageId);
            const computed = Store.membershipStatus(x, today);
            return `<tr><td>${UI.esc(p?.name)}</td><td>${Store.formatDate(x.startDate)}</td><td>${Store.formatDate(x.endDate)}</td>
              <td class="money">${Store.formatPKR(x.listPrice != null ? x.listPrice : x.price)}</td>
              <td class="money">${Store.formatPKR(x.concessionAmount || 0)}</td>
              <td class="money">${Store.formatPKR(x.amount != null ? x.amount : x.price)}</td>
              <td>${UI.statusChip(computed)}</td></tr>`;
          })
          .join("")}
      </tbody></table></div></div>`;
    } else if (tab === "fees") {
      body.innerHTML = `<div class="card"><div class="table-wrap"><table class="data-table">
        <thead><tr><th>Date</th><th>Note</th><th>List</th><th>Concession</th><th>Payable</th><th>Paid</th><th>Collected by</th><th>Status</th></tr></thead><tbody>
        ${
          feeHistory.length
            ? feeHistory
                .map((row) => {
                  const voidPays = (row.payments || []).filter((p) => p.status === "void");
                  return `<tr>
                    <td>${Store.formatDate(row.date)}</td>
                    <td>${UI.esc(row.invoice.note || row.invoice.type)}</td>
                    <td class="money">${Store.formatPKR(row.listPrice)}</td>
                    <td class="money">${Store.formatPKR(row.concessionAmount)}</td>
                    <td class="money">${Store.formatPKR(row.payable)}</td>
                    <td class="money">${Store.formatPKR(row.paid)}${voidPays.length ? " " + UI.statusChip("void") : ""}</td>
                    <td>${UI.esc(row.collectedBy)}</td>
                    <td>${UI.statusChip(row.status)}</td>
                  </tr>`;
                })
                .join("")
            : `<tr><td colspan="8" class="muted-sm">No fee history</td></tr>`
        }
      </tbody></table></div></div>`;
    } else if (tab === "visits") {
      body.innerHTML = `<div class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>When</th><th>Source</th></tr></thead><tbody>
        ${
          visits.length
            ? visits
                .map((v) => `<tr><td>${Store.formatDateTime(v.checkedInAt)}</td><td>${UI.esc(v.source)}</td></tr>`)
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
                  return `<tr><td>${UI.esc(t?.name)}</td><td class="money">${Store.formatPKR(p.ptFee)}</td><td>${Store.formatDate(p.startDate)} → ${Store.formatDate(p.endDate)}</td><td>${UI.statusChip(p.status)}</td></tr>`;
                })
                .join("")
            : `<tr><td colspan="4" class="muted-sm">No PT assignments</td></tr>`
        }
      </tbody></table></div></div>`;
    }
  },

  assignDeskForm(member) {
    UI.openModal(`
      <div class="modal-header">
        <h2>Assign desk</h2>
        <button class="btn-icon" data-close aria-label="Close">${UI.icons.close}</button>
      </div>
      <p class="muted-sm" style="margin-bottom:12px">Gender is “other”. Assign a male or female staff desk so that desk can see this member.</p>
      <form id="desk-form" class="form-grid">
        <div class="field full"><label for="d-desk">Staff desk</label>
          <select id="d-desk" name="desk" required>
            <option value="male" ${member.desk === "male" ? "selected" : ""}>Male desk</option>
            <option value="female" ${member.desk === "female" ? "selected" : ""}>Female desk</option>
          </select>
        </div>
      </form>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="save-desk">Save desk</button>
      </div>
    `);
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("save-desk").addEventListener("click", () => {
      const form = document.getElementById("desk-form");
      if (!form.reportValidity()) return;
      try {
        Store.assignMemberDesk(member.id, new FormData(form).get("desk"));
        UI.closeModal();
        UI.toast("Desk assigned", "success");
        App.renderPage();
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
  },

  editForm(member) {
    UI.openModal(`
      <div class="modal-header"><h2>Edit member</h2><button class="btn-icon" data-close aria-label="Close">${UI.icons.close}</button></div>
      <form id="edit-member" class="form-grid">
        <div class="field"><label for="e-name">Name</label><input id="e-name" name="name" required value="${UI.esc(member.name)}" /></div>
        <div class="field"><label for="e-phone">Phone</label><input id="e-phone" name="phone" required value="${UI.esc(member.phone)}" /></div>
        <div class="field"><label for="e-gender">Gender</label>
          <select id="e-gender" name="gender">
            ${["male", "female", "other"].map((g) => `<option value="${g}" ${member.gender === g ? "selected" : ""}>${g}</option>`).join("")}
          </select>
        </div>
        ${
          Store.isSegregated()
            ? `<div class="field"><label for="e-desk">Desk (gender other)</label>
                <select id="e-desk" name="desk">
                  <option value="" ${!member.desk ? "selected" : ""}>Unassigned</option>
                  <option value="male" ${member.desk === "male" ? "selected" : ""}>Male</option>
                  <option value="female" ${member.desk === "female" ? "selected" : ""}>Female</option>
                </select>
              </div>`
            : ""
        }
        <div class="field"><label for="e-reg">Registration date</label><input id="e-reg" type="date" name="registrationDate" value="${UI.esc(member.registrationDate)}" /></div>
        <div class="field full"><label for="e-addr">Address</label><input id="e-addr" name="address" value="${UI.esc(member.address || "")}" /></div>
        <div class="field"><label for="e-em">Emergency contact</label><input id="e-em" name="emergencyContact" value="${UI.esc(member.emergencyContact || "")}" /></div>
        <div class="field"><label for="e-bio">Biometric ID</label><input id="e-bio" name="biometricId" value="${UI.esc(member.biometricId || "")}" /></div>
        <div class="field"><label for="e-status">Status</label>
          <select id="e-status" name="status">
            <option value="active" ${member.status === "active" ? "selected" : ""}>active</option>
            <option value="inactive" ${member.status === "inactive" ? "selected" : ""}>inactive</option>
          </select>
        </div>
        <div class="field full"><label for="e-med">Medical notes</label><textarea id="e-med" name="medicalNotes">${UI.esc(member.medicalNotes || "")}</textarea></div>
      </form>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="save-edit">Save</button>
      </div>
    `);
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("save-edit").addEventListener("click", () => {
      const form = document.getElementById("edit-member");
      if (!form.reportValidity()) return;
      try {
        const data = Object.fromEntries(new FormData(form).entries());
        if (data.gender === "male" || data.gender === "female") data.desk = null;
        else if (data.desk === "") data.desk = null;
        Store.updateMember(member.id, data);
        UI.closeModal();
        UI.toast("Member updated", "success");
        App.renderPage();
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
  },

  concessionForm(member, existing = null) {
    const admin = Store.isAdmin();
    UI.openModal(`
      <div class="modal-header">
        <h2>${existing ? "Manage concession" : "Give concession"}</h2>
        <button class="btn-icon" data-close aria-label="Close">${UI.icons.close}</button>
      </div>
      <p class="muted-sm" style="margin-bottom:12px">Flat PKR discount per membership invoice in the validity window (not multiplied by package length).</p>
      <form id="con-form" class="form-grid">
        <div class="field"><label for="c-amt">Amount (PKR)</label>
          <input id="c-amt" type="number" name="amount" min="1" required value="${existing ? existing.amount : ""}" ${existing && !admin ? "disabled" : ""} />
        </div>
        <div class="field"><label for="c-mode">Duration</label>
          <select id="c-mode" name="mode" ${existing && !admin ? "disabled" : ""}>
            <option value="months" ${!existing || existing.mode === "months" ? "selected" : ""}>Number of months</option>
            <option value="lifetime" ${existing?.mode === "lifetime" ? "selected" : ""}>Lifetime</option>
          </select>
        </div>
        <div class="field" id="c-months-wrap"><label for="c-months">Months</label>
          <input id="c-months" type="number" name="months" min="1" value="${existing?.months || 3}" ${existing && !admin ? "disabled" : ""} />
        </div>
        <div class="field full"><label for="c-reason">Reason</label>
          <input id="c-reason" name="reason" required value="${UI.esc(existing?.reason || "")}" ${existing && !admin ? "disabled" : ""} />
        </div>
      </form>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-close>Cancel</button>
        ${existing && admin ? `<button class="btn btn-danger" id="revoke-con">Revoke</button>` : ""}
        ${!existing || admin ? `<button class="btn btn-primary" id="save-con">${existing ? "Save" : "Grant"}</button>` : ""}
      </div>
    `);
    const sync = () => {
      document.getElementById("c-months-wrap").style.display =
        document.getElementById("c-mode").value === "lifetime" ? "none" : "";
    };
    sync();
    document.getElementById("c-mode")?.addEventListener("change", sync);
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("save-con")?.addEventListener("click", async () => {
      const form = document.getElementById("con-form");
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      try {
        if (existing) {
          Store.editConcession(existing.id, {
            amount: fd.get("amount"),
            mode: fd.get("mode"),
            months: fd.get("months"),
            reason: fd.get("reason"),
          });
        } else {
          const amount = Number(fd.get("amount"));
          if (amount === 0) {
            /* n/a */
          }
          Store.grantConcession({
            memberId: member.id,
            amount,
            mode: fd.get("mode"),
            months: Number(fd.get("months") || 3),
            reason: fd.get("reason"),
          });
        }
        UI.closeModal();
        UI.toast(existing ? "Concession updated" : "Concession granted", "success");
        App.renderPage();
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
    document.getElementById("revoke-con")?.addEventListener("click", async () => {
      const reason = await UI.promptDialog({ title: "Revoke concession", label: "Reason" });
      if (reason == null) return;
      try {
        Store.revokeConcession(existing.id, reason);
        UI.closeModal();
        UI.toast("Concession revoked", "success");
        App.renderPage();
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
  },

  assignMembership(member) {
    const pkgs = Store.state.packages.filter((p) => p.active);
    const admin = Store.isAdmin();
    const autoStart = Store.computeStaffStartDate(member.id);
    UI.openModal(`
      <div class="modal-header"><h2>Assign / renew package</h2><button class="btn-icon" data-close aria-label="Close">${UI.icons.close}</button></div>
      <p class="muted-sm" style="margin-bottom:12px">Renewals start the day after the current paid membership ends. End date is computed from package duration (inclusive).</p>
      <form id="ms-form" class="form-grid">
        <div class="field full"><label for="ms-pkg">Package</label>
          <select id="ms-pkg" name="packageId" required>${pkgs.map((p) => `<option value="${p.id}">${UI.esc(p.name)} — ${Store.formatPKR(p.price)}</option>`).join("")}</select>
        </div>
        ${
          admin
            ? `<div class="field"><label for="ms-start">Start date</label><input id="ms-start" type="date" name="startDate" value="${autoStart}" /></div>
               <div class="field"><label for="ms-price">Price override (optional)</label><input id="ms-price" type="number" name="priceOverride" min="0" placeholder="Leave blank for package − concession" /></div>
               <div class="field full"><label for="ms-reason">Override reason (required if changing date/price)</label><input id="ms-reason" name="overrideReason" /></div>`
            : `<div class="field full"><label>Start date</label><input type="date" value="${autoStart}" disabled />
               <p class="muted-sm">Automatic: ${Store.formatDate(autoStart)}</p></div>`
        }
        ${this.concessionFieldsHtml("mscon")}
      </form>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="save-ms">Assign</button>
      </div>
    `);
    const form = document.getElementById("ms-form");
    this.wireConcessionPreview(form);
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("save-ms").addEventListener("click", async () => {
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      try {
        const pkg = Store.getPackage(fd.get("packageId"));
        if (Number(fd.get("concessionAmount") || 0) > 0) {
          await this.maybeGrantConcession(member.id, fd, pkg.price);
        }
        const start = admin && fd.get("startDate") ? fd.get("startDate") : autoStart;
        const preview = Store.resolvePayable(pkg.price, member.id, start);
        const override = fd.get("priceOverride");
        const opts = {
          memberId: member.id,
          packageId: fd.get("packageId"),
          confirmFree: preview.amount === 0 || Number(override) === 0,
        };
        if (admin) {
          opts.startDate = fd.get("startDate");
          opts.priceOverride = override ? Number(override) : null;
          opts.overrideReason = fd.get("overrideReason");
        }
        Store.assignMembership(opts);
        UI.closeModal();
        UI.toast("Membership assigned — invoice created", "success");
        App.renderPage();
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
  },

  assignPTForm(member) {
    const trainers = Store.state.trainers.filter((t) => t.status === "active");
    UI.openModal(`
      <div class="modal-header"><h2>Assign personal trainer</h2><button class="btn-icon" data-close aria-label="Close">${UI.icons.close}</button></div>
      <p class="muted-sm" style="margin-bottom:16px">Fixed trainers: member pays gym. Commission trainers: member pays trainer; gym logs commission.</p>
      <form id="pt-form" class="form-grid">
        <div class="field full"><label for="pt-tr">Trainer</label>
          <select id="pt-tr" name="trainerId" required>${trainers.map((t) => `<option value="${t.id}">${UI.esc(t.name)} — ${t.payModel}${t.payModel === "commission" ? " (" + t.commissionPercent + "%)" : ""}</option>`).join("")}</select>
        </div>
        <div class="field"><label for="pt-fee">PT fee (PKR)</label><input id="pt-fee" type="number" name="ptFee" required min="1" /></div>
        <div class="field"><label for="pt-start">Start</label><input id="pt-start" type="date" name="startDate" value="${Store.todayLocal()}" /></div>
        <div class="field"><label for="pt-end">End</label><input id="pt-end" type="date" name="endDate" value="${Store.addDays(Store.todayLocal(), 30)}" /></div>
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
      try {
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
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
  },
};
