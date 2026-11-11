window.Pages = window.Pages || {};

Pages.fees = {
  render(root) {
    const open = Store.openInvoices().filter((i) => i.type !== "pt_info");
    const paid = Store.state.payments.slice(0, 20);
    const methods = ["cash", "card", "bank", "jazzcash", "easypaisa"];

    root.innerHTML = `
      ${UI.pageHeader({
        title: "Fee collection",
        subtitle: "Full invoice payments only · Staff can collect",
      })}
      <div class="grid-2">
        <div class="card card-dark">
          <div class="card-header">
            <div>
              <div class="card-title">Open dues</div>
              <div class="card-subtitle">${open.length} invoices awaiting full payment</div>
            </div>
            <div class="kpi-value" style="font-size:1.4rem">${Store.formatPKR(open.reduce((s, i) => s + i.amount, 0))}</div>
          </div>
          ${
            open.length
              ? open
                  .map((inv) => {
                    const m = Store.getMember(inv.memberId);
                    return `
                    <div class="list-item" style="border-color:rgba(255,255,255,.08)">
                      ${UI.initialsAvatar(m?.photoInitials)}
                      <div>
                        <strong style="color:#fff">${m?.name || "—"}</strong>
                        <div class="muted-sm" style="color:rgba(255,255,255,.65)">${inv.note || inv.type} · Due ${Store.formatDate(inv.dueDate)}</div>
                      </div>
                      <div class="meta">
                        <div class="money" style="color:#fff;margin-bottom:6px">${Store.formatPKR(inv.amount)}</div>
                        ${UI.statusChip(inv.status)}
                      </div>
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
                      ${methods
                        .map(
                          (method) =>
                            `<button class="pill accent" data-collect="${inv.id}" data-method="${method}">${method}</button>`
                        )
                        .join("")}
                    </div>`;
                  })
                  .join("")
              : `<p class="muted-sm" style="color:rgba(255,255,255,.7)">No open dues. Nice work.</p>`
          }
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">Recent collections</div>
          </div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Member</th><th>Method</th><th>Amount</th><th>When</th>${Store.isAdmin() ? "<th></th>" : ""}</tr></thead>
              <tbody>
                ${paid
                  .map((p) => {
                    const inv = Store.state.invoices.find((i) => i.id === p.invoiceId);
                    const m = Store.getMember(inv?.memberId);
                    return `<tr>
                      <td>${m?.name || "—"}</td>
                      <td>${p.method}</td>
                      <td class="money">${Store.formatPKR(p.amount)}</td>
                      <td>${Store.formatDateTime(p.paidAt)}</td>
                      ${
                        Store.isAdmin()
                          ? `<td><button class="btn btn-danger btn-sm" data-void="${p.id}">Void</button></td>`
                          : ""
                      }
                    </tr>`;
                  })
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    root.querySelectorAll("[data-collect]").forEach((btn) => {
      btn.addEventListener("click", () => {
        try {
          Store.collectPayment({ invoiceId: btn.dataset.collect, method: btn.dataset.method });
          UI.toast("Payment collected", "success");
          App.renderPage();
        } catch (e) {
          UI.toast(e.message, "error");
        }
      });
    });

    root.querySelectorAll("[data-void]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ok = await UI.confirmDialog({
          title: "Void payment?",
          message: "This reopens the invoice. Admin only.",
          confirmLabel: "Void",
          danger: true,
        });
        if (!ok) return;
        try {
          Store.voidPayment(btn.dataset.void);
          UI.toast("Payment voided", "success");
          App.renderPage();
        } catch (e) {
          UI.toast(e.message, "error");
        }
      });
    });
  },
};
