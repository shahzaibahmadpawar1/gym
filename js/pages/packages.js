window.Pages = window.Pages || {};

Pages.packages = {
  render(root) {
    const pkgs = Store.state.packages;

    root.innerHTML = `
      ${UI.pageHeader({
        title: "Packages",
        subtitle: "Gym access plans only — PT is assigned separately",
        actionsHtml: `<button class="btn btn-primary" id="add-pkg">${UI.icons.plus} New package</button>`,
      })}
      <div class="card">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Duration</th>
                <th>Price</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${pkgs
                .map(
                  (p) => `
                <tr>
                  <td><strong>${p.name}</strong><div class="muted-sm">${p.description || ""}</div></td>
                  <td>${p.durationDays} days</td>
                  <td class="money">${Store.formatPKR(p.price)}</td>
                  <td>${UI.statusChip(p.active ? "active" : "inactive")}</td>
                  <td>
                    <div class="row-actions">
                      <button class="btn btn-ghost btn-sm" data-edit="${p.id}">Edit</button>
                    </div>
                  </td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById("add-pkg")?.addEventListener("click", () => this.form());
    root.querySelectorAll("[data-edit]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const pkg = Store.getPackage(btn.dataset.edit);
        this.form(pkg);
      });
    });
  },

  form(pkg = null) {
    UI.openModal(`
      <div class="modal-header">
        <h2>${pkg ? "Edit package" : "New package"}</h2>
        <button class="btn-icon" data-close>${UI.icons.close}</button>
      </div>
      <form id="pkg-form" class="form-grid">
        <div class="field full"><label>Name</label><input name="name" required value="${pkg?.name || ""}" /></div>
        <div class="field"><label>Duration (days)</label><input name="durationDays" type="number" min="1" required value="${pkg?.durationDays || 30}" /></div>
        <div class="field"><label>Price (PKR)</label><input name="price" type="number" min="0" required value="${pkg?.price || ""}" /></div>
        <div class="field full"><label>Description</label><textarea name="description">${pkg?.description || ""}</textarea></div>
        <div class="field"><label>Active</label>
          <select name="active">
            <option value="true" ${pkg?.active !== false ? "selected" : ""}>Yes</option>
            <option value="false" ${pkg?.active === false ? "selected" : ""}>No</option>
          </select>
        </div>
      </form>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="save-pkg">Save</button>
      </div>
    `);

    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("save-pkg").addEventListener("click", () => {
      const form = document.getElementById("pkg-form");
      if (!form.reportValidity()) return;
      const fd = new FormData(form);
      Store.upsertPackage({
        id: pkg?.id,
        name: fd.get("name"),
        durationDays: Number(fd.get("durationDays")),
        price: Number(fd.get("price")),
        description: fd.get("description"),
        active: fd.get("active") === "true",
      });
      UI.closeModal();
      UI.toast("Package saved", "success");
      App.renderPage();
    });
  },
};
