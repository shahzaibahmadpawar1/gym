window.Pages = window.Pages || {};

Pages.dashboard = {
  render(root) {
    const admin = Store.isAdmin();
    const today = Store.todayLocal();
    const members = Store.visibleMembers();
    const memberIds = new Set(members.map((m) => m.id));
    const activeMembers = members.filter((m) => {
      const ms = Store.activeMembership(m.id);
      return Store.membershipStatus(ms, today) === "active";
    });
    const monthStart = Store.periodRange("month").from;
    const newThisMonth = members.filter((m) => m.registrationDate >= monthStart);
    const attVisible = Store.state.attendance.filter((a) => memberIds.has(a.memberId));
    const attToday = attVisible.filter((a) => Store.toLocalDate(a.checkedInAt) === today);
    const expiring3 = Store.expiringMemberships(3).filter((ms) => memberIds.has(ms.memberId));
    const expiring7 = Store.expiringMemberships(7).filter((ms) => memberIds.has(ms.memberId));
    const dues = Store.visibleOpenInvoices();
    const inactive = Store.inactiveMembers().filter((m) => memberIds.has(m.id));
    const low = Store.lowStock();
    const recentAtt = attVisible.slice(0, 5);
    const recentPay = Store.state.payments
      .filter((p) => {
        if (p.status === "void") return false;
        const inv = Store.state.invoices.find((i) => i.id === p.invoiceId);
        return inv && memberIds.has(inv.memberId);
      })
      .slice(0, 5);

    let rev = null;
    let expTotal = 0;
    if (admin) {
      const range = Store.periodRange("month");
      rev = Store.revenueInRange(range.from, range.to);
      expTotal = Store.expensesInRange(range.from, range.to).reduce((s, e) => s + e.amount, 0);
    }

    root.innerHTML = `
      ${UI.pageHeader({
        title: "Dashboard",
        subtitle: "Live snapshot for Ubaid's Gym · " + Store.formatDate(today) + " · click a card for details",
        actionsHtml: `
          <div class="quick-actions">
            <button class="btn btn-primary" data-go="members">${UI.icons.plus} Add member</button>
            <button class="btn btn-dark" data-go="fees">Collect fee</button>
            <button class="btn btn-ghost" data-go="attendance">Check in</button>
          </div>
        `,
      })}

      <div class="bento">
        <button type="button" class="card interactive span-3" data-drill="members-all" aria-label="View all members">
          <div class="card-header" style="margin-bottom:12px">
            <div class="kpi-label">Total members</div>
            <div class="kpi-icon">${UI.icons.members}</div>
          </div>
          <div class="kpi-value">${members.length}</div>
          <div class="muted-sm" style="margin-top:8px">View list</div>
        </button>
        <button type="button" class="card interactive span-3" data-drill="members-active" aria-label="View active members">
          <div class="card-header" style="margin-bottom:12px">
            <div class="kpi-label">Active members</div>
            <div class="kpi-icon">${UI.icons.attendance}</div>
          </div>
          <div class="kpi-value">${activeMembers.length}</div>
          <div class="muted-sm" style="margin-top:8px">${newThisMonth.length} new this month</div>
        </button>
        <button type="button" class="card interactive span-3" data-drill="attendance-today" aria-label="View today's attendance">
          <div class="card-header" style="margin-bottom:12px">
            <div class="kpi-label">Attendance today</div>
            <div class="kpi-icon">${UI.icons.attendance}</div>
          </div>
          <div class="kpi-value">${attToday.length}</div>
          <div class="muted-sm" style="margin-top:8px">Who checked in</div>
        </button>
        <button type="button" class="card interactive span-3" data-drill="${admin ? "revenue-month" : "dues"}" aria-label="${admin ? "View revenue details" : "View open dues"}">
          <div class="card-header" style="margin-bottom:12px">
            <div class="kpi-label">${admin ? "Revenue (month)" : "Open dues"}</div>
            <div class="kpi-icon">${admin ? UI.icons.revenue : UI.icons.fees}</div>
          </div>
          <div class="kpi-value" style="font-size:1.55rem">${admin ? Store.formatPKR(rev.total) : dues.length}</div>
          <div class="muted-sm" style="margin-top:8px">${admin ? "Expenses " + Store.formatPKR(expTotal) : "Count only · no totals"}</div>
        </button>

        <div class="card card-accent span-5">
          <div class="card-header">
            <div>
              <div class="card-title">Needs attention</div>
              <div class="card-subtitle">Click a row for details</div>
            </div>
          </div>
          <button type="button" class="attention-item attention-btn" data-drill="expiring-3"><strong>${expiring3.length}</strong><span>memberships end in 3 days</span></button>
          <button type="button" class="attention-item attention-btn" data-drill="expiring-7"><strong>${expiring7.length}</strong><span>memberships end in 7 days</span></button>
          <button type="button" class="attention-item attention-btn" data-drill="dues"><strong>${dues.length}</strong><span>open / overdue invoices</span></button>
          <button type="button" class="attention-item attention-btn" data-drill="inactive"><strong>${inactive.length}</strong><span>inactive (no visit ${Store.state.settings.inactivityDays}+ days)</span></button>
          <button type="button" class="attention-item attention-btn" data-drill="low-stock"><strong>${low.length}</strong><span>low stock items</span></button>
        </div>

        ${
          admin
            ? `<button type="button" class="card interactive span-7" data-drill="revenue-month" aria-label="View revenue by source" style="text-align:left">
          <div class="card-header">
            <div>
              <div class="card-title">Revenue by source</div>
              <div class="card-subtitle">This month · PKR · click for breakdown</div>
            </div>
          </div>
          <div class="chart-box sm"><canvas id="chart-rev-source"></canvas></div>
        </button>`
            : `<div class="card span-7">
          <div class="card-header">
            <div>
              <div class="card-title">Front desk today</div>
              <div class="card-subtitle">Ops snapshot · click a row</div>
            </div>
          </div>
          <button type="button" class="attention-item attention-btn" data-drill="attendance-today" style="color:inherit;border-color:var(--color-border)"><strong>${attToday.length}</strong><span>check-ins today</span></button>
          <button type="button" class="attention-item attention-btn" data-drill="expiring-3" style="color:inherit;border-color:var(--color-border)"><strong>${expiring3.length}</strong><span>ending in 3 days</span></button>
          <button type="button" class="attention-item attention-btn" data-drill="dues" style="color:inherit;border-color:var(--color-border)"><strong>${dues.length}</strong><span>members with open dues</span></button>
        </div>`
        }

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
            <button class="btn btn-ghost btn-sm" data-drill="expiring-7">View all</button>
          </div>
          ${
            expiring7.length
              ? expiring7
                  .slice(0, 5)
                  .map((ms) => {
                    const m = Store.getMember(ms.memberId);
                    const days = Store.daysBetween(today, ms.endDate);
                    return `<button type="button" class="list-item list-btn" data-member="${UI.esc(m?.id || "")}">
                      ${UI.initialsAvatar(m?.photoInitials)}
                      <div><strong>${UI.esc(m?.name || "—")}</strong><div class="muted-sm">Ends ${Store.formatDate(ms.endDate)}</div></div>
                      <div class="meta"><span class="status status-frozen">${days}d</span></div>
                    </button>`;
                  })
                  .join("")
              : `<p class="muted-sm">No memberships expiring in 7 days.</p>`
          }
        </div>

        <div class="card span-6">
          <div class="card-header">
            <div class="card-title">Recent check-ins</div>
            <button class="btn btn-ghost btn-sm" data-drill="attendance-today">Today</button>
          </div>
          ${recentAtt
            .map((a) => {
              const m = Store.getMember(a.memberId);
              return `<button type="button" class="list-item list-btn" data-member="${UI.esc(m?.id || "")}">
                ${UI.initialsAvatar(m?.photoInitials)}
                <div><strong>${UI.esc(m?.name || "—")}</strong><div class="muted-sm">${UI.esc(a.source)}</div></div>
                <div class="meta muted-sm">${Store.formatDateTime(a.checkedInAt)}</div>
              </button>`;
            })
            .join("")}
        </div>

        <div class="card span-6">
          <div class="card-header">
            <div class="card-title">Recent payments</div>
            <button class="btn btn-ghost btn-sm" data-go="fees">Open</button>
          </div>
          ${
            recentPay.length
              ? recentPay
                  .map((p) => {
                    const inv = Store.state.invoices.find((i) => i.id === p.invoiceId);
                    const m = Store.getMember(inv?.memberId);
                    return `<button type="button" class="list-item list-btn" data-member="${UI.esc(m?.id || "")}">
                ${UI.initialsAvatar(m?.photoInitials)}
                <div><strong>${UI.esc(m?.name || "—")}</strong><div class="muted-sm">${UI.esc(p.method)}</div></div>
                <div class="meta money" style="color:var(--color-success)">${Store.formatPKR(p.amount)}</div>
              </button>`;
                  })
                  .join("")
              : `<p class="muted-sm">No recent payments</p>`
          }
        </div>
      </div>
    `;

    root.querySelectorAll("[data-go]").forEach((btn) => {
      btn.addEventListener("click", () => App.navigate(btn.dataset.go));
    });

    root.querySelectorAll("[data-drill]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this.openDrill(el.dataset.drill);
      });
    });

    root.querySelectorAll("[data-member]").forEach((el) => {
      el.addEventListener("click", () => {
        if (el.dataset.member) App.navigate("members/" + el.dataset.member);
      });
    });

    if (admin) {
      UI.safeChart(() => {
        const srcCtx = document.getElementById("chart-rev-source");
        if (!srcCtx) return;
        const pieData = [rev.membership, rev.ptGym, rev.commission, rev.scrap];
        const pieTotal = pieData.reduce((s, n) => s + n, 0) || 1;
        const pieLabels = ["Memberships", "PT (gym)", "Commissions", "Scrap"].map(
          (label, i) => `${label} ${Math.round((pieData[i] / pieTotal) * 100)}%`
        );
        new Chart(srcCtx, {
          type: "doughnut",
          data: {
            labels: pieLabels,
            datasets: [
              {
                data: pieData,
                backgroundColor: ["#ff6b35", "#1a1d23", "#ffb088", "#7a8499"],
                borderWidth: 0,
              },
            ],
          },
          options: {
            plugins: {
              legend: { position: "bottom", labels: { boxWidth: 10, font: { family: "Plus Jakarta Sans", size: 11 } } },
              tooltip: {
                callbacks: {
                  label(ctx) {
                    const v = ctx.raw || 0;
                    const pct = Math.round((v / pieTotal) * 100);
                    return ` ${Store.formatPKR(v)} (${pct}%)`;
                  },
                },
              },
            },
            cutout: "68%",
            maintainAspectRatio: false,
          },
        });
      });
    }

    UI.safeChart(() => {
      const mainCtx = document.getElementById("chart-main");
      if (!mainCtx) return;
      const labels = [];
      const attData = [];
      const revData = [];
      const expData = [];
      for (let i = 6; i >= 0; i--) {
        const d = Store.addDays(today, -i);
        labels.push(Store.formatDate(d).split(" ").slice(0, 2).join(" "));
        attData.push(attVisible.filter((a) => Store.toLocalDate(a.checkedInAt) === d).length);
        if (admin) {
          revData.push(Store.revenueInRange(d, d).total);
          expData.push(Store.expensesInRange(d, d).reduce((s, e) => s + e.amount, 0));
        }
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
    });
  },

  openDrill(kind) {
    const today = Store.todayLocal();
    const admin = Store.isAdmin();

    const memberRow = (m, meta) => `
      <button type="button" class="list-item list-btn" data-open-member="${UI.esc(m.id)}">
        ${UI.initialsAvatar(m.photoInitials)}
        <div><strong>${UI.esc(m.name)}</strong><div class="muted-sm">${UI.esc(m.phone)}</div></div>
        <div class="meta muted-sm">${UI.esc(meta || "")}</div>
      </button>`;

    let title = "";
    let subtitle = "";
    let body = "";
    let footerAction = null;

    if (kind === "members-all") {
      const list = Store.visibleMembers();
      title = "All members";
      subtitle = `${list.length} profiles`;
      body = list.map((m) => {
        const ms = Store.activeMembership(m.id);
        const st = Store.membershipStatus(ms, today);
        return memberRow(m, st);
      }).join("") || `<p class="muted-sm">No members</p>`;
      footerAction = { label: "Open members", go: "members" };
    } else if (kind === "members-active") {
      const list = Store.visibleMembers().filter((m) => Store.membershipStatus(Store.activeMembership(m.id), today) === "active");
      title = "Active members";
      subtitle = `${list.length} with an active membership today`;
      body = list.map((m) => {
        const ms = Store.activeMembership(m.id);
        const pkg = ms ? Store.getPackage(ms.packageId) : null;
        return memberRow(m, pkg ? `${pkg.name} · ends ${Store.formatDate(ms.endDate)}` : "");
      }).join("") || `<p class="muted-sm">No active members</p>`;
      footerAction = { label: "Open members", go: "members" };
    } else if (kind === "attendance-today") {
      const list = Store.state.attendance.filter(
        (a) =>
          Store.toLocalDate(a.checkedInAt) === today &&
          Store.memberVisibleToCurrentUser(Store.getMember(a.memberId))
      );
      title = "Attendance today";
      subtitle = `${list.length} check-in${list.length === 1 ? "" : "s"} · ${Store.formatDate(today)}`;
      body =
        list
          .map((a) => {
            const m = Store.getMember(a.memberId);
            if (!m) return "";
            return `
            <button type="button" class="list-item list-btn" data-open-member="${UI.esc(m.id)}">
              ${UI.initialsAvatar(m.photoInitials)}
              <div><strong>${UI.esc(m.name)}</strong><div class="muted-sm">${UI.esc(a.source)}${m.biometricId ? " · " + UI.esc(m.biometricId) : ""}</div></div>
              <div class="meta muted-sm">${Store.formatDateTime(a.checkedInAt)}</div>
            </button>`;
          })
          .join("") || `<p class="muted-sm">No check-ins yet today</p>`;
      footerAction = { label: "Open attendance", go: "attendance" };
    } else if (kind === "dues") {
      const list = Store.visibleOpenInvoices();
      title = "Open / overdue invoices";
      subtitle = `${list.length} invoice${list.length === 1 ? "" : "s"} awaiting payment`;
      body =
        list
          .map((inv) => {
            const m = Store.getMember(inv.memberId);
            return `
            <button type="button" class="list-item list-btn" data-open-member="${UI.esc(m?.id || "")}">
              ${UI.initialsAvatar(m?.photoInitials)}
              <div><strong>${UI.esc(m?.name || "—")}</strong><div class="muted-sm">${UI.esc(inv.note || inv.type)} · due ${Store.formatDate(inv.dueDate)}</div></div>
              <div class="meta">
                <div class="money">${Store.formatPKR(inv.amount)}</div>
                ${UI.statusChip(inv.status)}
              </div>
            </button>`;
          })
          .join("") || `<p class="muted-sm">No open dues</p>`;
      footerAction = { label: "Fee collection", go: "fees" };
    } else if (kind === "expiring-3" || kind === "expiring-7") {
      const days = kind === "expiring-3" ? 3 : 7;
      const list = Store.expiringMemberships(days).filter((ms) =>
        Store.memberVisibleToCurrentUser(Store.getMember(ms.memberId))
      );
      title = `Expiring in ${days} days`;
      subtitle = `${list.length} membership${list.length === 1 ? "" : "s"}`;
      body =
        list
          .map((ms) => {
            const m = Store.getMember(ms.memberId);
            const pkg = Store.getPackage(ms.packageId);
            const left = Store.daysBetween(today, ms.endDate);
            return `
            <button type="button" class="list-item list-btn" data-open-member="${UI.esc(m?.id || "")}">
              ${UI.initialsAvatar(m?.photoInitials)}
              <div><strong>${UI.esc(m?.name || "—")}</strong><div class="muted-sm">${UI.esc(pkg?.name || "Package")} · ends ${Store.formatDate(ms.endDate)}</div></div>
              <div class="meta"><span class="status status-frozen">${left}d left</span></div>
            </button>`;
          })
          .join("") || `<p class="muted-sm">None in this window</p>`;
      footerAction = { label: "Open members", go: "members" };
    } else if (kind === "inactive") {
      const list = Store.inactiveMembers().filter((m) => Store.memberVisibleToCurrentUser(m));
      title = "Inactive members";
      subtitle = `No visit in ${Store.state.settings.inactivityDays}+ days`;
      body =
        list
          .map((m) => {
            const visits = Store.state.attendance
              .filter((a) => a.memberId === m.id)
              .sort((a, b) => (a.checkedInAt < b.checkedInAt ? 1 : -1));
            const last = visits[0] ? Store.formatDate(Store.toLocalDate(visits[0].checkedInAt)) : "Never visited";
            return memberRow(m, `Last: ${last}`);
          })
          .join("") || `<p class="muted-sm">No inactive members</p>`;
      footerAction = { label: "Open members", go: "members" };
    } else if (kind === "low-stock") {
      const list = Store.lowStock();
      title = "Low stock";
      subtitle = `${list.length} item${list.length === 1 ? "" : "s"} at or below minimum`;
      body =
        list
          .map(
            (i) => `
          <div class="list-item">
            <div><strong>${UI.esc(i.name)}</strong><div class="muted-sm">${UI.esc(i.location || "—")} · min ${i.minQty}</div></div>
            <div class="meta money">${i.qty} left</div>
          </div>`
          )
          .join("") || `<p class="muted-sm">Stock looks fine</p>`;
      footerAction = { label: "Open inventory", go: "inventory" };
    } else if (kind === "revenue-month") {
      if (!admin) {
        UI.toast("Admin only", "error");
        return;
      }
      const range = Store.periodRange("month");
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
            memberId: m?.id,
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

      title = "Revenue this month";
      subtitle = `${Store.formatDate(range.from)} → ${Store.formatDate(range.to)} · total ${Store.formatPKR(rev.total)}`;
      body = `
        <div class="grid-kpi" style="grid-template-columns:repeat(2,1fr);margin-bottom:12px">
          <div class="card" style="padding:12px"><div class="kpi-label">Memberships</div><div class="money">${Store.formatPKR(rev.membership)}</div></div>
          <div class="card" style="padding:12px"><div class="kpi-label">PT (gym)</div><div class="money">${Store.formatPKR(rev.ptGym)}</div></div>
          <div class="card" style="padding:12px"><div class="kpi-label">Commissions</div><div class="money">${Store.formatPKR(rev.commission)}</div></div>
          <div class="card" style="padding:12px"><div class="kpi-label">Scrap</div><div class="money">${Store.formatPKR(rev.scrap)}</div></div>
        </div>
        ${
          rows.length
            ? rows
                .map(
                  (r) => `
            <${r.memberId ? 'button type="button"' : "div"} class="list-item ${r.memberId ? "list-btn" : ""}" ${r.memberId ? `data-open-member="${UI.esc(r.memberId)}"` : ""}>
              <div><strong>${UI.esc(r.label)}</strong><div class="muted-sm">${UI.esc(r.source)} · ${Store.formatDateTime(r.at)}</div></div>
              <div class="meta money">${Store.formatPKR(r.amount)}</div>
            </${r.memberId ? "button" : "div"}>`
                )
                .join("")
            : `<p class="muted-sm">No revenue in this period</p>`
        }`;
      footerAction = { label: "Open revenue page", go: "revenue" };
    } else {
      return;
    }

    UI.openModal(`
      <div class="modal-header">
        <div>
          <h2 id="drill-title">${UI.esc(title)}</h2>
          <p class="muted-sm" style="margin-top:6px">${UI.esc(subtitle)}</p>
        </div>
        <button class="btn-icon" data-close aria-label="Close">${UI.icons.close}</button>
      </div>
      <div class="drill-list">${body}</div>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-close>Close</button>
        ${footerAction ? `<button class="btn btn-primary" data-go-footer="${UI.esc(footerAction.go)}">${UI.esc(footerAction.label)}</button>` : ""}
      </div>
    `);

    const modal = document.getElementById("app-modal");
    modal.querySelector(".modal")?.setAttribute("aria-labelledby", "drill-title");
    modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    modal.querySelector("[data-go-footer]")?.addEventListener("click", (e) => {
      UI.closeModal();
      App.navigate(e.currentTarget.dataset.goFooter);
    });
    modal.querySelectorAll("[data-open-member]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.openMember;
        UI.closeModal();
        if (id) App.navigate("members/" + id);
      });
    });
  },
};
