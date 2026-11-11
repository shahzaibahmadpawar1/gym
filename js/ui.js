(function () {
  const icons = {
    dashboard: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>`,
    leads: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    members: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    packages: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
    fees: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>`,
    revenue: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    expenses: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
    trainers: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="3"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M5 10h2"/><path d="M17 10h2"/></svg>`,
    attendance: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    inventory: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8V21H3V8"/><path d="M1 3h22v5H1z"/><path d="M10 12h4"/></svg>`,
    reports: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    audit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    search: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
    bell: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    menu: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`,
    close: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
    plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  };

  let lastFocus = null;
  let trapHandler = null;
  let escHandler = null;

  function esc(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function toast(message, type = "default") {
    const root = document.getElementById("toast-root");
    if (!root) return;
    const el = document.createElement("div");
    el.className = `toast ${type === "success" ? "success" : type === "error" ? "error" : ""}`;
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transform = "translateY(8px)";
      el.style.transition = "0.25s";
      setTimeout(() => el.remove(), 250);
    }, 2800);
  }

  function getFocusable(container) {
    return [
      ...container.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      ),
    ].filter((el) => el.offsetParent !== null || el === document.activeElement);
  }

  function openModal(html) {
    closeModal();
    lastFocus = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "overlay open";
    overlay.id = "app-modal";
    overlay.innerHTML = `<div class="modal" role="dialog" aria-modal="true">${html}</div>`;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    const dialog = overlay.querySelector(".modal");
    const focusables = getFocusable(dialog);
    (focusables[0] || dialog).focus?.();

    trapHandler = (e) => {
      if (e.key !== "Tab") return;
      const list = getFocusable(dialog);
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    escHandler = (e) => {
      if (e.key === "Escape") closeModal();
    };
    document.addEventListener("keydown", trapHandler);
    document.addEventListener("keydown", escHandler);
    return overlay;
  }

  function closeModal() {
    document.getElementById("app-modal")?.remove();
    document.body.style.overflow = "";
    if (trapHandler) document.removeEventListener("keydown", trapHandler);
    if (escHandler) document.removeEventListener("keydown", escHandler);
    trapHandler = null;
    escHandler = null;
    if (lastFocus && lastFocus.focus) {
      try {
        lastFocus.focus();
      } catch (_) {}
    }
    lastFocus = null;
  }

  function confirmDialog({ title, message, confirmLabel = "Confirm", danger = false }) {
    return new Promise((resolve) => {
      openModal(`
        <div class="modal-header">
          <div>
            <h2 id="confirm-title">${esc(title)}</h2>
            <p class="muted-sm" style="margin-top:6px">${esc(message)}</p>
          </div>
          <button class="btn-icon" data-cancel aria-label="Close">${icons.close}</button>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" data-cancel>Cancel</button>
          <button class="btn ${danger ? "btn-danger" : "btn-primary"}" data-ok>${esc(confirmLabel)}</button>
        </div>
      `);
      const root = document.getElementById("app-modal");
      root.querySelector(".modal")?.setAttribute("aria-labelledby", "confirm-title");
      root.querySelectorAll("[data-cancel]").forEach((b) =>
        b.addEventListener("click", () => {
          closeModal();
          resolve(false);
        })
      );
      root.querySelector("[data-ok]").addEventListener("click", () => {
        closeModal();
        resolve(true);
      });
    });
  }

  function promptDialog({ title, message, label = "Reason", confirmLabel = "Confirm", required = true }) {
    return new Promise((resolve) => {
      const id = "prompt-field-" + Date.now();
      openModal(`
        <div class="modal-header">
          <div>
            <h2 id="prompt-title">${esc(title)}</h2>
            <p class="muted-sm" style="margin-top:6px">${esc(message || "")}</p>
          </div>
          <button class="btn-icon" data-cancel aria-label="Close">${icons.close}</button>
        </div>
        <div class="form-grid" style="padding:0 4px">
          <div class="field full">
            <label for="${id}">${esc(label)}</label>
            <input id="${id}" ${required ? "required" : ""} />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" data-cancel>Cancel</button>
          <button class="btn btn-primary" data-ok>${esc(confirmLabel)}</button>
        </div>
      `);
      const root = document.getElementById("app-modal");
      root.querySelector(".modal")?.setAttribute("aria-labelledby", "prompt-title");
      const input = document.getElementById(id);
      root.querySelectorAll("[data-cancel]").forEach((b) =>
        b.addEventListener("click", () => {
          closeModal();
          resolve(null);
        })
      );
      root.querySelector("[data-ok]").addEventListener("click", () => {
        const val = input.value.trim();
        if (required && !val) {
          input.focus();
          return;
        }
        closeModal();
        resolve(val);
      });
    });
  }

  function statusChip(status) {
    const raw = status || "";
    const s = String(raw)
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
    return `<span class="status status-${esc(s)}">${esc(raw)}</span>`;
  }

  function initialsAvatar(initials, cls = "") {
    return `<div class="avatar ${esc(cls)}">${esc(initials || "?")}</div>`;
  }

  function emptyState({ title, text, actionLabel, actionAttr }) {
    return `
      <div class="empty">
        <h3>${esc(title)}</h3>
        <p>${esc(text)}</p>
        ${actionLabel ? `<button class="btn btn-primary" ${actionAttr || ""}>${esc(actionLabel)}</button>` : ""}
      </div>
    `;
  }

  function pageHeader({ title, subtitle, actionsHtml = "" }) {
    return `
      <div class="page-header">
        <div>
          <h1>${esc(title)}</h1>
          ${subtitle ? `<p>${esc(subtitle)}</p>` : ""}
        </div>
        <div class="toolbar-right">${actionsHtml}</div>
      </div>
    `;
  }

  function bindRowNav(root, selector = "tr[data-id]") {
    root.querySelectorAll(selector).forEach((row) => {
      row.setAttribute("tabindex", "0");
      row.setAttribute("role", "link");
      row.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          row.click();
        }
      });
    });
  }

  function moneyLine(inv) {
    const list = inv.listPrice != null ? inv.listPrice : inv.amount;
    const conc = inv.concessionAmount || 0;
    if (conc > 0) {
      return `<span class="money"><s class="muted-sm">${esc(Store.formatPKR(list))}</s> ${esc(Store.formatPKR(inv.amount))}</span>
        <div class="muted-sm">Concession ${esc(Store.formatPKR(conc))}</div>`;
    }
    return `<span class="money">${esc(Store.formatPKR(inv.amount))}</span>`;
  }

  function concessionBadge(memberId) {
    const c = Store.getActiveConcession(memberId);
    if (!c) return "";
    const until = c.mode === "lifetime" || !c.endDate ? "Lifetime" : `until ${Store.formatDate(c.endDate)}`;
    return `<span class="pill accent">Concession ${esc(Store.formatPKR(c.amount))} · ${esc(until)}</span>`;
  }

  function destroyCharts(container) {
    if (!container || !window.Chart) return;
    Object.values(Chart.instances || {}).forEach((c) => {
      try {
        if (container.contains(c.canvas)) c.destroy();
      } catch (_) {}
    });
  }

  function safeChart(fn) {
    if (!window.Chart) return null;
    try {
      return fn();
    } catch (e) {
      console.warn("Chart failed", e);
      return null;
    }
  }

  window.UI = {
    icons,
    esc,
    toast,
    openModal,
    closeModal,
    confirmDialog,
    promptDialog,
    statusChip,
    initialsAvatar,
    emptyState,
    pageHeader,
    bindRowNav,
    moneyLine,
    concessionBadge,
    destroyCharts,
    safeChart,
  };
})();
