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
    const leads = Store.state.leads.filter((l) => l.stage !== "won" && l.stage !== "lost").concat(
      Store.state.leads.filter((l) => l.stage === "won" || l.stage === "lost")
    );

    root.innerHTML = `
      ${UI.pageHeader({
        title: "Leads",
        subtitle: "Walk-ins and enquiries → convert to members",
        actionsHtml: `<button class="btn btn-primary" id="add-lead">${UI.icons.plus} Add lead</button>`,
      })}
      <div class="pipeline">
        ${this.stages
          .map((stage) => {
            const items = Store.state.leads.filter((l) => l.stage === stage.id);
            return `
              <div class="pipeline-col">
                <h4>${stage.label} <span>${items.length}</span></h4>
                ${items
                  .map(
                    (l) => `
                  <div class="lead-card" data-id="${l.id}">
                    <strong>${l.name}</strong>
                    <span>${l.phone}</span>
                    <div class="muted-sm" style="margin-top:6px">${l.source} · Follow-up ${Store.formatDate(l.followUpDate)}</div>
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
      card.addEventListener("click", () => {
        const lead = Store.state.leads.find((l) => l.id === card.dataset.id);
        this.form(lead);
      });
    });
  },

  form(lead = null) {
    UI.openModal(`
      <div class="modal-header">
        <h2>${lead ? "Lead details" : "New lead"}</h2>
        <button class="btn-icon" data-close>${UI.icons.close}</button>
      </div>
      <form id="lead-form" class="form-grid">
        <div class="field"><label>Name</label><input name="name" required value="${lead?.name || ""}" /></div>
        <div class="field"><label>Phone</label><input name="phone" required value="${lead?.phone || ""}" /></div>
        <div class="field"><label>Source</label>
          <select name="source">
            ${["Walk-in", "Instagram", "Facebook", "Referral", "Other"]
              .map((s) => `<option ${lead?.source === s ? "selected" : ""}>${s}</option>`)
              .join("")}
          </select>
        </div>
        <div class="field"><label>Stage</label>
          <select name="stage">
            ${this.stages.map((s) => `<option value="${s.id}" ${lead?.stage === s.id ? "selected" : ""}>${s.label}</option>`).join("")}
          </select>
        </div>
        <div class="field"><label>Follow-up date</label><input type="date" name="followUpDate" value="${lead?.followUpDate || Store.todayISO()}" /></div>
        <div class="field full"><label>Notes</label><textarea name="notes">${lead?.notes || ""}</textarea></div>
      </form>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-close>Cancel</button>
        ${lead && lead.stage !== "won" ? `<button class="btn btn-dark" id="convert-lead">Convert to member</button>` : ""}
        <button class="btn btn-primary" id="save-lead">Save</button>
      </div>
    `);

    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("save-lead").addEventListener("click", () => {
      const form = document.getElementById("lead-form");
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      Store.upsertLead({
        id: lead?.id,
        name: fd.get("name"),
        phone: fd.get("phone"),
        source: fd.get("source"),
        stage: fd.get("stage"),
        followUpDate: fd.get("followUpDate"),
        notes: fd.get("notes"),
      });
      UI.closeModal();
      UI.toast("Lead saved", "success");
      App.renderPage();
    });

    document.getElementById("convert-lead")?.addEventListener("click", () => {
      const member = Store.convertLead(lead.id);
      UI.closeModal();
      UI.toast(`${member.name} created — assign a package next`, "success");
      App.navigate("members/" + member.id);
    });
  },
};
