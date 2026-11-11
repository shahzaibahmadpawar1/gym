window.Pages = window.Pages || {};

Pages.dashboard = {
  render(root) {
    const period = "month";
    const range = Store.periodRange(period);
    const rev = Store.revenueInRange(range.from, range.to);
    const exps = Store.expensesInRange(range.from, range.to);
    const expTotal = exps.reduce((s, e) => s + e.amount, 0);
    const members = Store.state.members;
    const active = members.filter((m) => m.status === "active").length;
    const monthStart = range.from;
    const newThisMonth = members.filter((m) => m.registrationDate >= monthStart).length;
    const today = Store.todayISO();
    const attToday = Store.state.attendance.filter((a) => a.checkedInAt.slice(0, 10) === today);
    const expiring3 = Store.expiringMemberships(3);
    const expiring7 = Store.expiringMemberships(7);
    const dues = Store.openInvoices();
    const inactive = Store.inactiveMembers();
    const low = Store.lowStock();
    const admin = Store.isAdmin();

    const recentPay = Store.state.payments.slice(0, 5);
    const recentAtt = Store.state.attendance.slice(0, 5);

    root.innerHTML = `
      ${UI.pageHeader({
        title: "Dashboard",
        subtitle: "Live snapshot for Ubaid's Gym · " + Store.formatDate(today),
        actionsHtml: `
          <div class="quick-actions">
            <button class="btn btn-primary" data-go="members">${UI.icons.plus} Add member</button>
            <button class="btn btn-dark" data-go="fees">Collect fee</button>
            <button class="btn btn-ghost" data-go="attendance">Check in</button>
          </div>
        `,
      })}

      <div class="bento">
        <div class="card interactive span-3">
          <div class="card-header" style="margin-bottom:12px">
            <div class="kpi-label">Total members</div>
            <div class="kpi-icon">${UI.icons.members}</div>
          </div>
          <div class="kpi-value">${members.length}</div>
          <div style="margin-top:8px"><span class="trend up">↑ active ops</span></div>
        </div>
        <div class="card interactive span-3">
          <div class="card-header" style="margin-bottom:12px">
            <div class="kpi-label">Active members</div>
            <div class="kpi-icon">${UI.icons.attendance}</div>
          </div>
          <div class="kpi-value">${active}</div>
          <div class="muted-sm" style="margin-top:8px">${newThisMonth} new this month</div>
        </div>
        <div class="card interactive span-3">
          <div class="card-header" style="margin-bottom:12px">
            <div class="kpi-label">Attendance today</div>
            <div class="kpi-icon">${UI.icons.attendance}</div>
          </div>
          <div class="kpi-value">${attToday.length}</div>
          <div class="muted-sm" style="margin-top:8px">Check-in only</div>
        </div>
        <div class="card interactive span-3">
          <div class="card-header" style="margin-bottom:12px">
            <div class="kpi-label">Revenue (month)</div>
            <div class="kpi-icon">${UI.icons.revenue}</div>
          </div>
          <div class="kpi-value" style="font-size:1.55rem">${Store.formatPKR(rev.total)}</div>
          <div class="muted-sm" style="margin-top:8px">${admin ? "Expenses " + Store.formatPKR(expTotal) : "Collected this month"}</div>
        </div>

        <div class="card card-accent span-5">
          <div class="card-header">
            <div>
              <div class="card-title">Needs attention</div>
              <div class="card-subtitle">Expiries, dues, inactivity & stock</div>
            </div>
          </div>
          <div class="attention-item"><strong>${expiring3.length}</strong><span>memberships end in 3 days</span></div>
          <div class="attention-item"><strong>${expiring7.length}</strong><span>memberships end in 7 days</span></div>
          <div class="attention-item"><strong>${dues.length}</strong><span>open / overdue invoices</span></div>
          <div class="attention-item"><strong>${inactive.length}</strong><span>inactive (no visit ${Store.state.settings.inactivityDays}+ days)</span></div>
          <div class="attention-item"><strong>${low.length}</strong><span>low stock items</span></div>
        </div>

        <div class="card span-7">
          <div class="card-header">
            <div>
              <div class="card-title">Revenue by source</div>
              <div class="card-subtitle">This month · PKR</div>
            </div>
          </div>
          <div class="chart-box sm"><canvas id="chart-rev-source"></canvas></div>
        </div>

        <div class="card span-8">
          <div class="card-header">
            <div>
              <div class="card-title">${admin ? "Revenue vs expenses" : "Attendance trend"}</div>
              <div class="card-subtitle">Last 7 days</div>
            </div>
          </div>
          <div class="chart-box"><canvas id="chart-main"></canvas></div>
        </div>

        <div class="card span-4">
          <div class="card-header">
            <div class="card-title">Expiring soon</div>
            <button class="btn btn-ghost btn-sm" data-go="members">View</button>
          </div>
          ${
            expiring7.length
              ? expiring7
                  .slice(0, 5)
                  .map((ms) => {
                    const m = Store.getMember(ms.memberId);
                    const days = Store.daysBetween(today, ms.endDate);
                    return `<div class="list-item">
                      ${UI.initialsAvatar(m?.photoInitials)}
                      <div><strong>${m?.name || "—"}</strong><div class="muted-sm">Ends ${Store.formatDate(ms.endDate)}</div></div>
                      <div class="meta"><span class="status status-frozen">${days}d</span></div>
                    </div>`;
                  })
                  .join("")
              : `<p class="muted-sm">No memberships expiring in 7 days.</p>`
          }
        </div>

        <div class="card span-6">
          <div class="card-header">
            <div class="card-title">Recent check-ins</div>
            <button class="btn btn-ghost btn-sm" data-go="attendance">Open</button>
          </div>
          ${recentAtt
            .map((a) => {
              const m = Store.getMember(a.memberId);
              return `<div class="list-item">
                ${UI.initialsAvatar(m?.photoInitials)}
                <div><strong>${m?.name || "—"}</strong><div class="muted-sm">${a.source}</div></div>
                <div class="meta muted-sm">${Store.formatDateTime(a.checkedInAt)}</div>
              </div>`;
            })
            .join("")}
        </div>

        <div class="card span-6">
          <div class="card-header">
            <div class="card-title">Recent payments</div>
            <button class="btn btn-ghost btn-sm" data-go="fees">Open</button>
          </div>
          ${recentPay
            .map((p) => {
              const inv = Store.state.invoices.find((i) => i.id === p.invoiceId);
              const m = Store.getMember(inv?.memberId);
              return `<div class="list-item">
                ${UI.initialsAvatar(m?.photoInitials)}
                <div><strong>${m?.name || "—"}</strong><div class="muted-sm">${p.method}</div></div>
                <div class="meta money" style="color:var(--color-success)">${Store.formatPKR(p.amount)}</div>
              </div>`;
            })
            .join("")}
        </div>
      </div>
    `;

    root.querySelectorAll("[data-go]").forEach((btn) => {
      btn.addEventListener("click", () => App.navigate(btn.dataset.go));
    });

    const srcCtx = document.getElementById("chart-rev-source");
    if (srcCtx && window.Chart) {
      new Chart(srcCtx, {
        type: "doughnut",
        data: {
          labels: ["Memberships", "PT (gym)", "Commissions", "Scrap"],
          datasets: [
            {
              data: [rev.membership, rev.ptGym, rev.commission, rev.scrap],
              backgroundColor: ["#ff6b35", "#1a1d23", "#ffb088", "#c4c9d4"],
              borderWidth: 0,
            },
          ],
        },
        options: {
          plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { family: "Plus Jakarta Sans" } } } },
          cutout: "68%",
          maintainAspectRatio: false,
        },
      });
    }

    const mainCtx = document.getElementById("chart-main");
    if (mainCtx && window.Chart) {
      const labels = [];
      const attData = [];
      const revData = [];
      const expData = [];
      for (let i = 6; i >= 0; i--) {
        const d = Store.addDays(today, -i);
        labels.push(Store.formatDate(d).split(" ").slice(0, 2).join(" "));
        attData.push(Store.state.attendance.filter((a) => a.checkedInAt.slice(0, 10) === d).length);
        const dayRev = Store.revenueInRange(d, d).total;
        revData.push(dayRev);
        expData.push(Store.expensesInRange(d, d).reduce((s, e) => s + e.amount, 0));
      }

      new Chart(mainCtx, {
        type: "bar",
        data: admin
          ? {
              labels,
              datasets: [
                { label: "Revenue", data: revData, backgroundColor: "#ff6b35", borderRadius: 8 },
                { label: "Expenses", data: expData, backgroundColor: "#1a1d23", borderRadius: 8 },
              ],
            }
          : {
              labels,
              datasets: [{ label: "Check-ins", data: attData, backgroundColor: "#ff6b35", borderRadius: 8 }],
            },
        options: {
          plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { family: "Plus Jakarta Sans" } } } },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: "#eee" }, beginAtZero: true },
          },
          maintainAspectRatio: false,
        },
      });
    }
  },
};
