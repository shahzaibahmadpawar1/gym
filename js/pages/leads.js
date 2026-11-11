window.Pages = window.Pages || {};

Pages.leads = {
  stages: [
    { id: "new", label: "New" },
    { id: "contacted", label: "Contacted" },
    { id: "trial", label: "Trial" },
    { id: "won", label: "Won" },
    { id: "lost", label: "Lost" },
  ],

  render(root) {
    const desk = Store.staffDesk();
    const lockGender = Store.isSegregated() && Store.isStaff() && !!desk;
    root.innerHTML = `
      ${UI.pageHeader({
        title: "Leads",
        subtitle: lockGender
          ? `Walk-ins and enquiries for the ${desk} desk → convert to members`
          : "Walk-ins and enquiries → convert to members",
        actionsHtml: `<button class="btn btn-primary" id="add-lead">${UI.icons.plus} Add lead</button>`,
      })}
      <div class="pipeline">
        ${this.stages
          .map((stage) => {
            const items = Store.visibleLeads().filter((l) => l.stage === stage.id);
            return `
              <div class="pipeline-col">
                <h4>${UI.esc(stage.label)} <span>${items.length}</span></h4>
                ${items
                  .map(
                    (l) => `
                  <div class="lead-card" data-id="${UI.esc(l.id)}" tabindex="0" role="button">
                    <strong>${UI.esc(l.name)}</strong>
                    <span>${UI.esc(l.phone)}</span>
                    <div class="muted-sm" style="margin-top:6px">${UI.esc(l.source)}${l.gender ? " · " + UI.esc(l.gender) : ""} · Follow-up ${Store.formatDate(l.followUpDate)}</div>
                    ${l.convertedMemberId ? `<div class="muted-sm">Converted</div>` : ""}
                  </div>`
                  )
                  .join("") || `<p class="muted-sm">Empty</p>`}
              </div>`;
          })
          .join("")}
      </div>
    `;

    document.getElementById("add-lead")?.addEventListener("click", () => this.form());
    root.querySelectorAll(".lead-card").forEach((card) => {
      const open = () => {
        const lead = Store.state.leads.find((l) => l.id === card.dataset.id);
        if (!lead || !Store.leadVisibleToCurrentUser(lead)) {
          UI.toast("Lead outside your desk", "error");
          return;
        }
        this.form(lead);
      };
      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          open();
        }
      });
    });
  },

  form(lead = null) {
    const converted = !!(lead && lead.convertedMemberId);
    const desk = Store.staffDesk();
    const admin = Store.isAdmin();
    const lockGender = Store.isSegregated() && Store.isStaff() && !!desk;
    const defaultGender = lockGender
      ? desk
      : lead?.gender === "male" || lead?.gender === "female" || (admin && lead?.gender === "other")
        ? lead.gender
        : "male";

    UI.openModal(`
      <div class="modal-header">
        <h2>${lead ? "Lead details" : "New lead"}</h2>
        <button class="btn-icon" data-close aria-label="Close">${UI.icons.close}</button>
      </div>
      <form id="lead-form" class="form-grid">
        <div class="field"><label for="ld-name">Name</label><input id="ld-name" name="name" required value="${UI.esc(lead?.name || "")}" /></div>
        <div class="field"><label for="ld-phone">Phone</label><input id="ld-phone" name="phone" required value="${UI.esc(lead?.phone || "")}" /></div>
        <div class="field"><label for="ld-source">Source</label>
          <select id="ld-source" name="source">
            ${["Walk-in", "Instagram", "Facebook", "Referral", "Other"]
              .map((s) => `<option ${lead?.source === s ? "selected" : ""}>${s}</option>`)
              .join("")}
          </select>
        </div>
        <div class="field"><label for="ld-gender">Gender</label>
          ${
            lockGender
              ? `<input type="text" value="${desk === "male" ? "Male" : "Female"}" disabled /><input type="hidden" name="gender" value="${UI.esc(desk)}" /><p class="muted-sm">${desk === "male" ? "Male" : "Female"} staff can only add ${desk} leads</p>`
              : `<select id="ld-gender" name="gender">
                  <option value="male" ${defaultGender === "male" ? "selected" : ""}>Male</option>
                  <option value="female" ${defaultGender === "female" ? "selected" : ""}>Female</option>
                  ${admin ? `<option value="other" ${defaultGender === "other" ? "selected" : ""}>Other</option>` : ""}
                </select>`
          }
        </div>
        <div class="field"><label for="ld-stage">Stage</label>
          <select id="ld-stage" name="stage">
            ${this.stages.map((s) => `<option value="${s.id}" ${lead?.stage === s.id ? "selected" : ""}>${s.label}</option>`).join("")}
          </select>
        </div>
        <div class="field"><label for="ld-fu">Follow-up date</label><input id="ld-fu" type="date" name="followUpDate" value="${UI.esc(lead?.followUpDate || Store.todayLocal())}" /></div>
        <div class="field full"><label for="ld-notes">Notes</label><textarea id="ld-notes" name="notes">${UI.esc(lead?.notes || "")}</textarea></div>
      </form>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-close>Cancel</button>
        ${lead && !converted ? `<button class="btn btn-dark" id="convert-lead">Convert to member</button>` : ""}
        ${converted ? `<span class="muted-sm">Already converted</span>` : ""}
        <button class="btn btn-primary" id="save-lead">Save</button>
      </div>
    `);

    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("save-lead").addEventListener("click", () => {
      const form = document.getElementById("lead-form");
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      try {
        let gender = fd.get("gender");
        if (lockGender) gender = desk;
        Store.upsertLead({
          id: lead?.id,
          name: fd.get("name"),
          phone: fd.get("phone"),
          source: fd.get("source"),
          stage: fd.get("stage"),
          followUpDate: fd.get("followUpDate"),
          notes: fd.get("notes"),
          gender,
        });
        UI.closeModal();
        UI.toast("Lead saved", "success");
        App.renderPage();
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });

    document.getElementById("convert-lead")?.addEventListener("click", () => {
      if (lead.convertedMemberId) {
        UI.toast("Already converted", "error");
        return;
      }
      const form = document.getElementById("lead-form");
      const fd = new FormData(form);
      UI.closeModal();
      Pages.members.createForm(
        {
          name: fd.get("name") || lead.name,
          phone: fd.get("phone") || lead.phone,
          source: fd.get("source") || lead.source,
          gender: fd.get("gender") || lead.gender,
        },
        lead.id
      );
    });
  },
};
