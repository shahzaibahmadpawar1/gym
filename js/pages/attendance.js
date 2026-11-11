window.Pages = window.Pages || {};

Pages.attendance = {
  render(root) {
    const today = Store.todayISO();
    const todayList = Store.state.attendance.filter((a) => a.checkedInAt.slice(0, 10) === today);
    const members = Store.state.members.filter((m) => m.status === "active");

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
        <div class="card"><div class="kpi-label">This week</div><div class="kpi-value">${Store.state.attendance.filter((a) => a.checkedInAt.slice(0, 10) >= Store.periodRange("week").from).length}</div></div>
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
                      <div><strong>${m?.name}</strong><div class="muted-sm">${a.source}${m?.biometricId ? " · " + m.biometricId : ""}</div></div>
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

    const labels = [];
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = Store.addDays(today, -i);
      labels.push(Store.formatDate(d).split(" ").slice(0, 2).join(" "));
      data.push(Store.state.attendance.filter((a) => a.checkedInAt.slice(0, 10) === d).length);
    }
    const ctx = document.getElementById("att-chart");
    if (ctx && window.Chart) {
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
    }
  },

  checkInModal(source) {
    const members = Store.state.members.filter((m) => m.status === "active");
    UI.openModal(`
      <div class="modal-header">
        <h2>${source === "device-sim" ? "Device check-in" : "Manual check-in"}</h2>
        <button class="btn-icon" data-close>${UI.icons.close}</button>
      </div>
      <form id="att-form" class="form-grid">
        <div class="field full"><label>Member</label>
          <select name="memberId" required>
            ${members.map((m) => `<option value="${m.id}">${m.name} ${m.biometricId ? "(" + m.biometricId + ")" : ""}</option>`).join("")}
          </select>
        </div>
      </form>
      <div class="modal-footer">
        <button class="btn btn-ghost" data-close>Cancel</button>
        <button class="btn btn-primary" id="do-checkin">Check in</button>
      </div>
    `);
    document.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", UI.closeModal));
    document.getElementById("do-checkin").addEventListener("click", () => {
      const fd = new FormData(document.getElementById("att-form"));
      const result = Store.checkIn({ memberId: fd.get("memberId"), source });
      UI.closeModal();
      if (result.warnings.length) {
        UI.toast("Checked in with warnings: " + result.warnings.join(", "), "error");
      } else {
        UI.toast("Checked in", "success");
      }
      App.renderPage();
    });
  },
};
