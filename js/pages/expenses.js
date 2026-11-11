window.Pages = window.Pages || {};

Pages.expenses = {
  categories: [
    "rent",
    "utilities",
    "salaries",
    "trainer_salary",
    "maintenance",
    "marketing",
    "stock_purchase",
    "other",
  ],

  render(root) {
    const admin = Store.isAdmin();
    const expenses = admin ? Store.state.expenses : Store.visibleExpenses();
    const month = Store.periodRange("month");
    const monthTotal = Store.expensesInRange(month.from, month.to).reduce((s, e) => s + e.amount, 0);

    root.innerHTML = `
      ${UI.pageHeader({
        title: "Expenses",
        subtitle: admin ? "All categorized spend · PKR" : "Your expense entries only · no totals",
        actionsHtml: `<button class="btn btn-primary" id="add-exp">${UI.icons.plus} Add expense</button>`,
      })}
      ${
        admin
          ? `<div class="grid-kpi" style="grid-template-columns:repeat(2,1fr)">
        <div class="card"><div class="kpi-label">This month</div><div class="kpi-value" style="font-size:1.5rem">${Store.formatPKR(monthTotal)}</div></div>
        <div class="card"><div class="kpi-label">All recorded</div><div class="kpi-value" style="font-size:1.5rem">${Store.formatPKR(Store.state.expenses.reduce((s, e) => s + e.amount, 0))}</div></div>
      </div>`
          : ""
      }
      <div class="card">
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Date</th><th>Category</th><th>Note</th><th>Method</th><th>Amount</th>${admin ? "<th></th>" : ""}</tr></thead>
            <tbody>
              ${
                expenses.length
                  ? expenses
                      .map(
                        (e) => `<tr>
                    <td>${Store.formatDate(e.date)}</td>
                    <td><span class="pill">${UI.esc(e.category.replace("_", " "))}</span></td>
                    <td>${UI.esc(e.note || "—")}</td>
                    <td>${UI.esc(e.method)}</td>
                    <td class="money">${Store.formatPKR(e.amount)}</td>
                    ${admin ? `<td><button class="btn btn-danger btn-sm" data-del="${UI.esc(e.id)}">Delete</button></td>` : ""}
                  </tr>`
                      )
                      .join("")
                  : `<tr><td colspan="${admin ? 6 : 5}" class="muted-sm">No expenses yet</td></tr>`
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById("add-exp")?.addEventListener("click", () => this.form());
    root.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const ok = await UI.confirmDialog({
          title: "Delete expense?",
          message: "This cannot be undone in the prototype.",
          confirmLabel: "Delete",
          danger: true,
        });
        if (!ok) return;
        try {
          Store.deleteExpense(btn.dataset.del);
          UI.toast("Expense deleted", "success");
          App.renderPage();
        } catch (e) {
          UI.toast(e.message, "error");
        }
      });
    });
  },

  form() {
    const admin = Store.isAdmin();
    const today = Store.todayLocal();
    UI.openModal(`
      <div class="modal-header"><h2>Add expense</h2><button class="btn-icon" data-close aria-label="Close">${UI.icons.close}</button></div>
      <form id="exp-form" class="form-grid">
        <div class="field"><label for="exp-cat">Category</label>
          <select id="exp-cat" name="category">${this.categories.map((c) => `<option value="${c}">${c.replace("_", " ")}</option>`).join("")}</select>
        </div>
        <div class="field"><label for="exp-amt">Amount (PKR)</label><input id="exp-amt" type="number" name="amount" min="1" required /></div>
        ${
          admin
            ? `<div class="field"><label for="exp-date">Date</label><input id="exp-date" type="date" name="date" value="${today}" /></div>`
            : `<div class="field"><label>Date</label><input type="date" value="${today}" disabled /><input type="hidden" name="date" value="${today}" /><p class="muted-sm">Staff entries are dated today</p></div>`
        }
        <div class="field"><label for="exp-method">Method</label>
          <select id="exp-method" name="method"><option>cash</option><option>card</option><option>bank</option><option>jazzcash</option><option>easypaisa</option></select>
        </div>
        <div class="field full"><label for="exp-note">Note</label><input id="exp-note" name="note" /></div>
      </form>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="save-exp">Save</button>
      </div>
    `);
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("save-exp").addEventListener("click", () => {
      const form = document.getElementById("exp-form");
      if (!form.reportValidity()) return;
      try {
        Store.addExpense(Object.fromEntries(new FormData(form).entries()));
        UI.closeModal();
        UI.toast("Expense added", "success");
        App.renderPage();
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
  },
};
