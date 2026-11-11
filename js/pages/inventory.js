window.Pages = window.Pages || {};

Pages.inventory = {
  render(root) {
    const items = Store.state.inventory;
    const low = Store.lowStock();
    const admin = Store.isAdmin();
    const movements = Store.state.inventoryMovements.slice(0, 30);

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
              <strong>Low stock:</strong> ${low.map((i) => UI.esc(i.name) + " (" + i.qty + ")").join(", ")}
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
                    <td><strong>${UI.esc(i.name)}</strong><div class="muted-sm">${UI.esc(i.note || "")}</div></td>
                    <td>${UI.esc(i.category)}</td>
                    <td style="min-width:120px">
                      <div class="money">${i.qty}</div>
                      <div class="progress" style="margin-top:6px"><span style="width:${pct}%;background:${i.qty <= i.minQty ? "var(--color-danger)" : "var(--color-accent)"}"></span></div>
                    </td>
                    <td>${i.minQty}</td>
                    <td>${UI.esc(i.location || "—")}</td>
                    <td>${UI.statusChip(i.status)}</td>
                    <td>
                      <div class="row-actions">
                        ${admin && i.status !== "disposed" && i.qty > 0 ? `<button class="btn btn-ghost btn-sm" data-dispose="${UI.esc(i.id)}">Dispose</button>` : ""}
                      </div>
                    </td>
                  </tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-title" style="margin-bottom:12px">Stock movement history</div>
        <div class="table-wrap"><table class="data-table"><thead><tr><th>When</th><th>Item</th><th>Type</th><th>Qty</th><th>Reason</th></tr></thead><tbody>
          ${
            movements.length
              ? movements
                  .map((mv) => {
                    const item = Store.state.inventory.find((i) => i.id === mv.itemId);
                    return `<tr><td>${Store.formatDateTime(mv.at)}</td><td>${UI.esc(item?.name)}</td><td>${UI.esc(mv.type)}</td><td>${mv.qty}</td><td>${UI.esc(mv.reason || "—")}</td></tr>`;
                  })
                  .join("")
              : `<tr><td colspan="5" class="muted-sm">No movements</td></tr>`
          }
        </tbody></table></div>
      </div>
      ${
        Store.state.disposals.length
          ? `<div class="card" style="margin-top:16px">
              <div class="card-title" style="margin-bottom:12px">Disposal / scrap history</div>
              <div class="table-wrap"><table class="data-table"><thead><tr><th>When</th><th>Item</th><th>Qty</th><th>Buyer</th><th>Proceeds</th></tr></thead><tbody>
                ${Store.state.disposals
                  .map((d) => {
                    const item = Store.state.inventory.find((i) => i.id === d.itemId);
                    return `<tr><td>${Store.formatDateTime(d.at)}</td><td>${UI.esc(item?.name)}</td><td>${d.qty ?? "—"}</td><td>${UI.esc(d.buyer || "—")}</td><td class="money">${Store.formatPKR(d.proceeds)}</td></tr>`;
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
      <div class="modal-header"><h2>Add inventory item</h2><button class="btn-icon" data-close aria-label="Close">${UI.icons.close}</button></div>
      <form id="inv-form" class="form-grid">
        <div class="field full"><label for="inv-name">Name</label><input id="inv-name" name="name" required /></div>
        <div class="field"><label for="inv-cat">Category</label>
          <select id="inv-cat" name="category"><option>equipment</option><option>consumable</option><option>other</option></select>
        </div>
        <div class="field"><label for="inv-status">Status</label>
          <select id="inv-status" name="status"><option value="in-use">in-use</option><option value="stored">stored</option></select>
        </div>
        <div class="field"><label for="inv-qty">Qty</label><input id="inv-qty" type="number" name="qty" min="0" value="1" /></div>
        <div class="field"><label for="inv-min">Min qty</label><input id="inv-min" type="number" name="minQty" min="0" value="1" /></div>
        <div class="field full"><label for="inv-loc">Location</label><input id="inv-loc" name="location" /></div>
        <div class="field full"><label for="inv-note">Note</label><input id="inv-note" name="note" /></div>
      </form>
      <div class="modal-footer"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="save-inv">Save</button></div>
    `);
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("save-inv").addEventListener("click", () => {
      const form = document.getElementById("inv-form");
      if (!form.reportValidity()) return;
      try {
        Store.upsertInventoryItem(Object.fromEntries(new FormData(form).entries()));
        UI.closeModal();
        UI.toast("Item added", "success");
        App.renderPage();
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
  },

  moveForm() {
    const items = Store.state.inventory.filter((i) => i.status !== "disposed");
    const admin = Store.isAdmin();
    UI.openModal(`
      <div class="modal-header"><h2>Stock movement</h2><button class="btn-icon" data-close aria-label="Close">${UI.icons.close}</button></div>
      <form id="mv-form" class="form-grid">
        <div class="field full"><label for="mv-item">Item</label>
          <select id="mv-item" name="itemId">${items.map((i) => `<option value="${i.id}">${UI.esc(i.name)} (qty ${i.qty})</option>`).join("")}</select>
        </div>
        <div class="field"><label for="mv-type">Type</label>
          <select id="mv-type" name="type">
            <option value="in">Stock in</option>
            <option value="out">Stock out</option>
            ${admin ? `<option value="adjust">Set qty</option>` : ""}
          </select>
        </div>
        <div class="field"><label for="mv-qty">Qty</label><input id="mv-qty" type="number" name="qty" min="0" required /></div>
        <div class="field full"><label for="mv-reason">Reason</label><input id="mv-reason" name="reason" required /></div>
      </form>
      <div class="modal-footer"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-primary" id="save-mv">Apply</button></div>
    `);
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("save-mv").addEventListener("click", () => {
      const form = document.getElementById("mv-form");
      if (!form.reportValidity()) return;
      try {
        Store.moveStock(Object.fromEntries(new FormData(form).entries()));
        UI.closeModal();
        UI.toast("Stock updated", "success");
        App.renderPage();
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
  },

  disposeForm(itemId) {
    const item = Store.state.inventory.find((i) => i.id === itemId);
    UI.openModal(`
      <div class="modal-header"><h2>Dispose / scrap — ${UI.esc(item?.name)}</h2><button class="btn-icon" data-close aria-label="Close">${UI.icons.close}</button></div>
      <p class="muted-sm" style="margin-bottom:16px">Admin only. Partial disposal reduces qty; status becomes disposed only at 0.</p>
      <form id="disp-form" class="form-grid">
        <div class="field"><label for="disp-qty">Quantity (1–${item?.qty || 0})</label>
          <input id="disp-qty" type="number" name="qty" min="1" max="${item?.qty || 1}" value="1" required />
        </div>
        <div class="field full"><label for="disp-buyer">Buyer (scrap dealer / individual)</label><input id="disp-buyer" name="buyer" /></div>
        <div class="field"><label for="disp-proceeds">Proceeds (PKR)</label><input id="disp-proceeds" type="number" name="proceeds" min="0" value="0" /></div>
        <div class="field full"><label for="disp-note">Note</label><input id="disp-note" name="note" /></div>
      </form>
      <div class="modal-footer"><button class="btn btn-ghost" data-close>Cancel</button><button class="btn btn-danger" id="save-disp">Dispose</button></div>
    `);
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("save-disp").addEventListener("click", () => {
      try {
        const fd = Object.fromEntries(new FormData(document.getElementById("disp-form")).entries());
        Store.disposeItem({ itemId, ...fd });
        UI.closeModal();
        UI.toast("Disposal recorded", "success");
        App.renderPage();
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
  },
};
