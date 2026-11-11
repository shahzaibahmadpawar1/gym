window.Pages = window.Pages || {};

Pages.reports = {
  render(root) {
    const month = Store.periodRange("month");
    const rev = Store.revenueInRange(month.from, month.to);
    const exps = Store.expensesInRange(month.from, month.to);
    const expTotal = exps.reduce((s, e) => s + e.amount, 0);
    const activeMs = Store.state.memberships.filter((m) => m.status === "active").length;
    const expiredMs = Store.state.memberships.filter((m) => m.status === "expired").length;
    const dues = Store.openInvoices();
    const attMonth = Store.state.attendance.filter((a) => a.checkedInAt.slice(0, 10) >= month.from);

    root.innerHTML = `
      ${UI.pageHeader({
        title: "Reports",
        subtitle: "Month-to-date snapshot · export-ready tables (UI)",
      })}
      <div class="grid-kpi">
        <div class="card"><div class="kpi-label">Active memberships</div><div class="kpi-value">${activeMs}</div></div>
        <div class="card"><div class="kpi-label">Expired records</div><div class="kpi-value">${expiredMs}</div></div>
        <div class="card"><div class="kpi-label">Open dues</div><div class="kpi-value">${dues.length}</div></div>
        <div class="card"><div class="kpi-label">Check-ins (MTD)</div><div class="kpi-value">${attMonth.length}</div></div>
      </div>
      <div class="grid-2">
        <div class="card ${Store.isAdmin() ? "card-dark" : ""}">
          <div class="card-title" style="margin-bottom:12px">P&amp;L (this month)</div>
          <div class="list-item" style="${Store.isAdmin() ? "border-color:rgba(255,255,255,.1)" : ""}">
            <span>Revenue</span><div class="meta money">${Store.formatPKR(rev.total)}</div>
          </div>
          <div class="list-item" style="${Store.isAdmin() ? "border-color:rgba(255,255,255,.1)" : ""}">
            <span>Expenses</span><div class="meta money">${Store.formatPKR(expTotal)}</div>
          </div>
          <div class="list-item" style="border:none">
            <strong>Net</strong><div class="meta money" style="font-size:1.25rem">${Store.formatPKR(rev.total - expTotal)}</div>
          </div>
        </div>
        <div class="card">
          <div class="card-title" style="margin-bottom:12px">Dues aging</div>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Member</th><th>Due</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                ${
                  dues.length
                    ? dues
                        .map((d) => {
                          const m = Store.getMember(d.memberId);
                          return `<tr><td>${m?.name}</td><td>${Store.formatDate(d.dueDate)}</td><td class="money">${Store.formatPKR(d.amount)}</td><td>${UI.statusChip(d.status)}</td></tr>`;
                        })
                        .join("")
                    : `<tr><td colspan="4" class="muted-sm">No open dues</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:16px">
        <div class="card-header">
          <div class="card-title">Trainer commission pending</div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Trainer</th><th>Member</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              ${Store.state.commissions
                .map((c) => {
                  const t = Store.getTrainer(c.trainerId);
                  const m = Store.getMember(c.memberId);
                  return `<tr><td>${t?.name}</td><td>${m?.name}</td><td class="money">${Store.formatPKR(c.amount)}</td><td>${UI.statusChip(c.status === "received" ? "paid" : "pending")}</td></tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },
};
