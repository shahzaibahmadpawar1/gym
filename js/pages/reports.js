window.Pages = window.Pages || {};

Pages.reports = {
  render(root) {
    const month = Store.periodRange("month");
    const rev = Store.revenueInRange(month.from, month.to);
    const exps = Store.expensesInRange(month.from, month.to);
    const expTotal = exps.reduce((s, e) => s + e.amount, 0);
    const today = Store.todayLocal();
    const activeMs = Store.state.memberships.filter((m) => Store.membershipStatus(m, today) === "active").length;
    const expiredMs = Store.state.memberships.filter((m) => Store.membershipStatus(m, today) === "expired").length;
    const dues = Store.openInvoices().filter((i) => i.type !== "pt_info");
    const attMonth = Store.state.attendance.filter((a) => Store.toLocalDate(a.checkedInAt) >= month.from);
    const consThisMonth = Store.concessionsGivenThisMonth();
    const discountTotal = Store.totalDiscountThisMonth();

    root.innerHTML = `
      ${UI.pageHeader({
        title: "Reports",
        subtitle: "Admin only · month-to-date snapshot",
      })}
      <div class="grid-kpi">
        <div class="card"><div class="kpi-label">Active memberships</div><div class="kpi-value">${activeMs}</div></div>
        <div class="card"><div class="kpi-label">Expired records</div><div class="kpi-value">${expiredMs}</div></div>
        <div class="card"><div class="kpi-label">Open dues</div><div class="kpi-value">${dues.length}</div></div>
        <div class="card"><div class="kpi-label">Check-ins (MTD)</div><div class="kpi-value">${attMonth.length}</div></div>
      </div>
      <div class="grid-2">
        <div class="card card-dark">
          <div class="card-title" style="margin-bottom:12px">P&amp;L (this month)</div>
          <div class="list-item" style="border-color:rgba(255,255,255,.1)">
            <span>Revenue (net collected)</span><div class="meta money">${Store.formatPKR(rev.total)}</div>
          </div>
          <div class="list-item" style="border-color:rgba(255,255,255,.1)">
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
                          return `<tr><td>${UI.esc(m?.name)}</td><td>${Store.formatDate(d.dueDate)}</td><td class="money">${Store.formatPKR(d.amount)}</td><td>${UI.statusChip(d.status)}</td></tr>`;
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
          <div>
            <div class="card-title">Concessions given</div>
            <div class="card-subtitle">Total discount applied this month: ${Store.formatPKR(discountTotal)}</div>
          </div>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Member</th><th>Amount</th><th>Mode</th><th>Valid until</th><th>Granted by</th><th>Status</th></tr></thead>
            <tbody>
              ${(Store.state.concessions || [])
                .map((c) => {
                  const m = Store.getMember(c.memberId);
                  const granter = Store.state.users.find((u) => u.id === c.grantedBy);
                  return `<tr>
                    <td>${UI.esc(m?.name)}</td>
                    <td class="money">${Store.formatPKR(c.amount)}</td>
                    <td>${UI.esc(c.mode)}${c.months ? " · " + c.months + " mo" : ""}</td>
                    <td>${c.mode === "lifetime" || !c.endDate ? "Lifetime" : Store.formatDate(c.endDate)}</td>
                    <td>${UI.esc(granter?.name || c.grantedBy)}</td>
                    <td>${UI.statusChip(c.status)}</td>
                  </tr>`;
                })
                .join("") || `<tr><td colspan="6" class="muted-sm">No concessions</td></tr>`}
            </tbody>
          </table>
        </div>
        <p class="muted-sm" style="margin-top:8px">${consThisMonth.length} concession(s) granted this month</p>
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
                  return `<tr><td>${UI.esc(t?.name)}</td><td>${UI.esc(m?.name)}</td><td class="money">${Store.formatPKR(c.amount)}</td><td>${UI.statusChip(c.status === "received" ? "paid" : "pending")}</td></tr>`;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },
};
