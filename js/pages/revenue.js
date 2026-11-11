window.Pages = window.Pages || {};

Pages.revenue = {
  render(root) {
    let period = "month";
    const paint = () => {
      const range = Store.periodRange(period);
      const rev = Store.revenueInRange(range.from, range.to);
      const rows = [
        ...rev.payments.map((p) => {
          const inv = Store.state.invoices.find((i) => i.id === p.invoiceId);
          const m = Store.getMember(inv?.memberId);
          return {
            at: p.paidAt,
            label: m?.name || "Payment",
            source: inv?.type === "pt_gym" ? "PT (gym)" : "Membership",
            amount: p.amount,
          };
        }),
        ...rev.commissions.map((c) => {
          const t = Store.getTrainer(c.trainerId);
          return { at: c.receivedAt, label: t?.name || "Trainer", source: "Commission", amount: c.amount };
        }),
        ...rev.scrap.map((d) => {
          const item = Store.state.inventory.find((i) => i.id === d.itemId);
          return { at: d.at, label: item?.name || "Scrap", source: "Scrap", amount: d.proceeds };
        }),
      ].sort((a, b) => (a.at < b.at ? 1 : -1));

      root.innerHTML = `
        ${UI.pageHeader({
          title: "Revenue",
          subtitle: `${Store.formatDate(range.from)} → ${Store.formatDate(range.to)} · PKR`,
        })}
        <div class="toolbar">
          <div class="pill-row" id="period-pills">
            ${["day", "week", "month", "year"]
              .map((p) => `<button class="pill accent ${period === p ? "active" : ""}" data-period="${p}">${p}</button>`)
              .join("")}
          </div>
        </div>
        <div class="grid-kpi">
          <div class="card"><div class="kpi-label">Total</div><div class="kpi-value" style="font-size:1.4rem">${Store.formatPKR(rev.total)}</div></div>
          <div class="card"><div class="kpi-label">Memberships</div><div class="kpi-value" style="font-size:1.25rem">${Store.formatPKR(rev.membership)}</div></div>
          <div class="card"><div class="kpi-label">PT via gym</div><div class="kpi-value" style="font-size:1.25rem">${Store.formatPKR(rev.ptGym)}</div></div>
          <div class="card"><div class="kpi-label">Commissions + scrap</div><div class="kpi-value" style="font-size:1.25rem">${Store.formatPKR(rev.commission + rev.scrap)}</div></div>
        </div>
        <div class="grid-2">
          <div class="card">
            <div class="card-header"><div class="card-title">Breakdown</div></div>
            <div class="chart-box"><canvas id="rev-donut"></canvas></div>
          </div>
          <div class="card">
            <div class="card-header"><div class="card-title">Transactions</div></div>
            <div class="table-wrap">
              <table class="data-table">
                <thead><tr><th>When</th><th>Who / what</th><th>Source</th><th>Amount</th></tr></thead>
                <tbody>
                  ${
                    rows.length
                      ? rows
                          .map(
                            (r) =>
                              `<tr><td>${Store.formatDateTime(r.at)}</td><td>${r.label}</td><td>${r.source}</td><td class="money">${Store.formatPKR(r.amount)}</td></tr>`
                          )
                          .join("")
                      : `<tr><td colspan="4" class="muted-sm">No revenue in this period</td></tr>`
                  }
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;

      root.querySelectorAll("[data-period]").forEach((btn) => {
        btn.addEventListener("click", () => {
          period = btn.dataset.period;
          paint();
        });
      });

      const ctx = document.getElementById("rev-donut");
      if (ctx && window.Chart) {
        new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: ["Memberships", "PT (gym)", "Commissions", "Scrap"],
            datasets: [
              {
                data: [rev.membership, rev.ptGym, rev.commission, rev.scrap],
                backgroundColor: ["#ff6b35", "#1a1d23", "#ffb088", "#9aa3b5"],
                borderWidth: 0,
              },
            ],
          },
          options: {
            plugins: { legend: { position: "bottom", labels: { boxWidth: 10 } } },
            cutout: "65%",
            maintainAspectRatio: false,
          },
        });
      }
    };

    paint();
  },
};
