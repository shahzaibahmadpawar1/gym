window.Pages = window.Pages || {};

Pages.inventory = {
  render(root) {
    const items = Store.state.inventory;
    const low = Store.lowStock();
    const admin = Store.isAdmin();

    root.innerHTML = `
      ${UI.pageHeader({
        title: "Inventory",
        subtitle: "Internal stock & equipment · no retail sales",
        actionsHtml: `
          <button class="btn btn-ghost" id="move-stock">Stock move</button>
          <button class="btn btn-primary" id="add-item">${UI.icons.plus} Add item</button>
        `,
      })}
      ${
        low.length
          ? `<div class="card" style="margin-bottom:16px;border-color:#ffd4c2;background:var(--color-accent-soft)">
              <strong>Low stock:</strong> ${low.map((i) => i.name + " (" + i.qty + ")").join(", ")}
            </div>`
          : ""
      }
      <div class="card">
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Item</th><th>Category</th><th>Qty</th><th>Min</th><th>Location</th><th>Status</th><th></th></tr></thead>
            <tbody>
              ${items
                .map((i) => {
                  const pct = i.minQty ? Math.min(100, Math.round((i.qty / Math.max(i.minQty * 2, 1)) * 100)) : 100;
                  return `<tr>
                    <td><strong>${i.name}</strong><div class="muted-sm">${i.note || ""}</div></td>
                    <td>${i.category}</td>
                    <td style="min-width:120px">
                      <div class="money">${i.qty}</div>
                      <div class="progress" style="margin-top:6px"><span style="width:${pct}%;background:${i.qty <= i.minQty ? "var(--color-danger)" : "var(--color-accent)"}"></span></div>
                    </td>
                    <td>${i.minQty}</td>
                    <td>${i.location || "—"}</td>
                    <td>${UI.statusChip(i.status)}</td>
                    <td>
                      <div class="row-actions">
                        ${admin && i.status !== "disposed" ? `<button class="btn btn-ghost btn-sm" data-dispose="${i.id}">Dispose</button>` : ""}
                      </div>
                    </td>
                  </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
      ${
        Store.state.disposals.length
          ? `<div class="card" style="margin-top:16px">
              <div class="card-title" style="margin-bottom:12px">Disposal / scrap history</div>
              <div class="table-wrap"><table class="data-table"><thead><tr><th>When</th><th>Item</th><th>Buyer</th><th>Proceeds</th></tr></thead><tbody>
                ${Store.state.disposals
                  .map((d) => {
                    const item = Store.state.inventory.find((i) => i.id === d.itemId);
                    return `<tr><td>${Store.formatDateTime(d.at)}</td><td>${item?.name}</td><td>${d.buyer || "—"}</td><td class="money">${Store.formatPKR(d.proceeds)}</td></tr>`;
                  })
                  .join("")}
              </tbody></table></div>
            </div>`
          : ""
      }
    `;

    document.getElementById("add-item")?.addEventListener("click", () => this.itemForm());
    document.getElementById("move-stock")?.addEventListener("click", () => this.moveForm());
    root.querySelectorAll("[data-dispose]").forEach((btn) => {
      btn.addEventListener("click", () => this.disposeForm(btn.dataset.dispose));
    });
  },

  itemForm() {
    UI.openModal(`
      <div class="modal-header"><h2>Add inventory item</h2><button class="btn-icon" data-close>${UI.icons.close}</button></div>
      <form id="inv-form" class="form-grid">
        <div class="field full"><label>Name</label><input name="name" required /></div>
        <div class="field"><label>Category</label>
          <select name="category"><option>equipment</option><option>consumable</option><option>other</option></select>
        </div>
        <div class="field"><label>Status</label>
          <select name="status"><option value="in-use">in-use</option><option value="stored">stored</option></select>
        </div>
        <div class="field"><label>Qty</label><input type="number" name="qty" min="0" value="1" /></div>
        <div class="field"><label>Min qty</label><input type="number" name="minQty" min="0" value="1" /></div>
        <div class="field full"><label>Location</label><input name="location" /></div>
        <div class="field full"><label>Note</label><input name="note" /></div>
      </form>
      <div class="modal-footer"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="save-inv">Save</button></div>
    `);
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("save-inv").addEventListener("click", () => {
      const form = document.getElementById("inv-form");
      if (!form.reportValidity()) return;
      Store.upsertInventoryItem(Object.fromEntries(new FormData(form).entries()));
      UI.closeModal();
      UI.toast("Item added", "success");
      App.renderPage();
    });
  },

  moveForm() {
    const items = Store.state.inventory.filter((i) => i.status !== "disposed");
    UI.openModal(`
      <div class="modal-header"><h2>Stock movement</h2><button class="btn-icon" data-close>${UI.icons.close}</button></div>
      <form id="mv-form" class="form-grid">
        <div class="field full"><label>Item</label>
          <select name="itemId">${items.map((i) => `<option value="${i.id}">${i.name} (qty ${i.qty})</option>`).join("")}</select>
        </div>
        <div class="field"><label>Type</label>
          <select name="type"><option value="in">Stock in</option><option value="out">Stock out</option><option value="adjust">Set qty</option></select>
        </div>
        <div class="field"><label>Qty</label><input type="number" name="qty" min="0" required /></div>
        <div class="field full"><label>Reason</label><input name="reason" required /></div>
      </form>
      <div class="modal-footer"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="save-mv">Apply</button></div>
    `);
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("save-mv").addEventListener("click", () => {
      const form = document.getElementById("mv-form");
      if (!form.reportValidity()) return;
      const fd = Object.fromEntries(new FormData(form).entries());
      Store.moveStock(fd);
      UI.closeModal();
      UI.toast("Stock updated", "success");
      App.renderPage();
    });
  },

  disposeForm(itemId) {
    const item = Store.state.inventory.find((i) => i.id === itemId);
    UI.openModal(`
      <div class="modal-header"><h2>Dispose / scrap — ${item?.name}</h2><button class="btn-icon" data-close>${UI.icons.close}</button></div>
      <p class="muted-sm" style="margin-bottom:16px">Admin only. Optional proceeds count as scrap revenue.</p>
      <form id="disp-form" class="form-grid">
        <div class="field full"><label>Buyer (scrap dealer / individual)</label><input name="buyer" /></div>
        <div class="field"><label>Proceeds (PKR)</label><input type="number" name="proceeds" min="0" value="0" /></div>
        <div class="field full"><label>Note</label><input name="note" /></div>
      </form>
      <div class="modal-footer"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-danger" id="save-disp">Dispose</button></div>
    `);
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("save-disp").addEventListener("click", () => {
      try {
        const fd = Object.fromEntries(new FormData(document.getElementById("disp-form")).entries());
        Store.disposeItem({ itemId, ...fd });
        UI.closeModal();
        UI.toast("Item disposed", "success");
        App.renderPage();
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
  },
};
