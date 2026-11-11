window.Pages = window.Pages || {};

Pages.attendance = {
  visibleAttendance() {
    return Store.state.attendance.filter((a) =>
      Store.memberVisibleToCurrentUser(Store.getMember(a.memberId))
    );
  },

  render(root) {
    const today = Store.todayLocal();
    const att = this.visibleAttendance();
    const todayList = att.filter((a) => Store.toLocalDate(a.checkedInAt) === today);
    const members = Store.visibleMembers().filter((m) => m.status === "active");
    const weekFrom = Store.periodRange("week").from;

    root.innerHTML = `
      ${UI.pageHeader({
        title: "Attendance",
        subtitle: "Check-in only · Manual or ZKTeco device simulation",
        actionsHtml: `
          <button class="btn btn-dark" id="sim-device">Simulate device ping</button>
          <button class="btn btn-primary" id="manual-checkin">${UI.icons.plus} Manual check-in</button>
        `,
      })}
      <div class="grid-kpi">
        <div class="card"><div class="kpi-label">Today</div><div class="kpi-value">${todayList.length}</div></div>
        <div class="card"><div class="kpi-label">This week</div><div class="kpi-value">${att.filter((a) => Store.toLocalDate(a.checkedInAt) >= weekFrom).length}</div></div>
        <div class="card"><div class="kpi-label">Active members</div><div class="kpi-value">${members.length}</div></div>
        <div class="card"><div class="kpi-label">Mode</div><div class="kpi-value" style="font-size:1.2rem">In only</div></div>
      </div>
      <div class="grid-2">
        <div class="card">
          <div class="card-header"><div class="card-title">Today's check-ins</div></div>
          ${
            todayList.length
              ? todayList
                  .map((a) => {
                    const m = Store.getMember(a.memberId);
                    return `<div class="list-item">
                      ${UI.initialsAvatar(m?.photoInitials)}
                      <div><strong>${UI.esc(m?.name)}</strong><div class="muted-sm">${UI.esc(a.source)}${m?.biometricId ? " · " + UI.esc(m.biometricId) : ""}</div></div>
                      <div class="meta muted-sm">${Store.formatDateTime(a.checkedInAt)}</div>
                    </div>`;
                  })
                  .join("")
              : UI.emptyState({ title: "No check-ins yet", text: "Use manual check-in or simulate a device event." })
          }
        </div>
        <div class="card">
          <div class="card-header"><div class="card-title">7-day trend</div></div>
          <div class="chart-box"><canvas id="att-chart"></canvas></div>
        </div>
      </div>
    `;

    document.getElementById("manual-checkin")?.addEventListener("click", () => this.checkInModal("manual"));
    document.getElementById("sim-device")?.addEventListener("click", () => this.checkInModal("device-sim"));

    UI.safeChart(() => {
      const labels = [];
      const data = [];
      for (let i = 6; i >= 0; i--) {
        const d = Store.addDays(today, -i);
        labels.push(Store.formatDate(d).split(" ").slice(0, 2).join(" "));
        data.push(att.filter((a) => Store.toLocalDate(a.checkedInAt) === d).length);
      }
      const ctx = document.getElementById("att-chart");
      if (!ctx) return;
      new Chart(ctx, {
        type: "line",
        data: {
          labels,
          datasets: [
            {
              label: "Check-ins",
              data,
              borderColor: "#ff6b35",
              backgroundColor: "rgba(255,107,53,.15)",
              fill: true,
              tension: 0.35,
            },
          ],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { stepSize: 1 } } },
          maintainAspectRatio: false,
        },
      });
    });
  },

  checkInModal(source) {
    const today = Store.todayLocal();
    const members = Store.visibleMembers().filter((m) => m.status === "active");
    UI.openModal(`
      <div class="modal-header">
        <h2>${source === "device-sim" ? "Device check-in" : "Manual check-in"}</h2>
        <button class="btn-icon" data-close aria-label="Close">${UI.icons.close}</button>
      </div>
      <form id="att-form" class="form-grid">
        <div class="field full"><label for="att-member">Member</label>
          <select id="att-member" name="memberId" required>
            ${
              members.length
                ? members.map((m) => `<option value="${m.id}">${UI.esc(m.name)} ${m.biometricId ? "(" + UI.esc(m.biometricId) + ")" : ""}</option>`).join("")
                : `<option value="" disabled selected>No members on your desk</option>`
            }
          </select>
        </div>
      </form>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="do-checkin">Check in</button>
      </div>
    `);
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("do-checkin").addEventListener("click", async () => {
      const fd = new FormData(document.getElementById("att-form"));
      const memberId = fd.get("memberId");
      const ms = Store.activeMembership(memberId);
      const st = Store.membershipStatus(ms, today);
      let adminOverrideReason = null;

      if (!ms || st === "expired" || st === "cancelled" || st === "frozen") {
        if (!Store.isAdmin()) {
          UI.toast(
            st === "frozen" ? "Membership is frozen — staff cannot check in" : "Membership expired or missing — staff cannot check in",
            "error"
          );
          return;
        }
        adminOverrideReason = await UI.promptDialog({
          title: st === "frozen" ? "Frozen membership" : "Expired / missing membership",
          message: "Admin override requires a reason.",
          label: "Override reason",
        });
        if (adminOverrideReason == null) return;
      }

      try {
        let result = Store.checkIn({ memberId, source, adminOverrideReason });
        if (result.needsDuesConfirm) {
          const ok = await UI.confirmDialog({
            title: "Outstanding dues",
            message: "This member has open invoices. Check in anyway?",
            confirmLabel: "Check in anyway",
          });
          if (!ok) return;
          result = Store.checkIn({ memberId, source, adminOverrideReason, confirmDues: true });
        }
        UI.closeModal();
        if (result.warnings?.length) {
          UI.toast("Checked in with warnings: " + result.warnings.join(", "), "error");
        } else {
          UI.toast("Checked in", "success");
        }
        App.renderPage();
      } catch (e) {
        UI.toast(e.message, "error");
      }
    });
  },
};
