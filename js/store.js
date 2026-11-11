(function () {
  const STORAGE_KEY = "ubaids_gym_v2";
  const SESSION_KEY = "ubaids_gym_session";
  const SCHEMA_VERSION = window.GYM_SCHEMA_VERSION || 2;

  const PERMS = {
    "member.create": ["admin", "staff"],
    "member.update": ["admin"],
    "membership.assign": ["admin", "staff"],
    "membership.override": ["admin"],
    "membership.freeze": ["admin"],
    "membership.unfreeze": ["admin"],
    "payment.collect": ["admin", "staff"],
    "payment.void": ["admin"],
    "invoice.void": ["admin"],
    "expense.create": ["admin", "staff"],
    "expense.delete": ["admin"],
    "expense.edit": ["admin"],
    "concession.grant": ["admin", "staff"],
    "concession.edit": ["admin"],
    "concession.revoke": ["admin"],
    "package.manage": ["admin"],
    "trainer.manage": ["admin"],
    "commission.receive": ["admin"],
    "settings.update": ["admin"],
    "audit.view": ["admin"],
    "inventory.dispose": ["admin"],
    "inventory.manage": ["admin", "staff"],
    "inventory.adjust": ["admin"],
    "lead.manage": ["admin", "staff"],
    "attendance.checkin": ["admin", "staff"],
    "pt.assign": ["admin", "staff"],
    "money.aggregates": ["admin"],
    "data.reset": ["admin"],
    "users.manage": ["admin"],
    "member.desk": ["admin"],
  };

  function deepClone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function todayLocal() {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function parseLocalDate(iso) {
    if (!iso) return null;
    const datePart = String(iso).slice(0, 10);
    const [y, m, d] = datePart.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }

  function formatLocalDate(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function toLocalDate(isoOrDate) {
    if (!isoOrDate) return null;
    if (isoOrDate instanceof Date) return formatLocalDate(isoOrDate);
    if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrDate)) return isoOrDate;
    const d = new Date(isoOrDate);
    if (Number.isNaN(d.getTime())) return String(isoOrDate).slice(0, 10);
    return formatLocalDate(d);
  }

  function addDays(dateStr, days) {
    const d = parseLocalDate(dateStr);
    d.setDate(d.getDate() + days);
    return formatLocalDate(d);
  }

  function addMonths(dateStr, months) {
    const d = parseLocalDate(dateStr);
    d.setMonth(d.getMonth() + months);
    return formatLocalDate(d);
  }

  function daysBetween(a, b) {
    const da = parseLocalDate(a);
    const db = parseLocalDate(b);
    return Math.round((db - da) / 86400000);
  }

  function todayISO() {
    return todayLocal();
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.schemaVersion === SCHEMA_VERSION) return parsed;
      }
      // migrate from old key or wrong schema → re-seed
      localStorage.removeItem("ubaids_gym_v1");
    } catch (_) {}
    const seed = deepClone(window.GYM_SEED);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    } catch (_) {}
    return seed;
  }

  let state = load();

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("localStorage save failed", e);
    }
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function formatPKR(n) {
    const num = Number(n) || 0;
    return "Rs " + num.toLocaleString("en-PK");
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const d = parseLocalDate(toLocalDate(iso));
    if (!d) return "—";
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return formatDate(iso);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    } catch (_) {
      return null;
    }
  }

  function setSession(user) {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  }

  function clearSession() {
    sessionStorage.removeItem(SESSION_KEY);
  }

  function currentUser() {
    return getSession();
  }

  function isAdmin() {
    const u = currentUser();
    return !!(u && u.role === "admin");
  }

  function isStaff() {
    const u = currentUser();
    return !!(u && u.role === "staff");
  }

  function can(permission) {
    const u = currentUser();
    if (!u) return false;
    const roles = PERMS[permission];
    if (!roles) return false;
    return roles.includes(u.role);
  }

  function audit(action, entity, entityId, summary, extra = {}) {
    const user = currentUser();
    const entry = {
      id: uid("au"),
      at: new Date().toISOString(),
      userId: user ? user.id : "system",
      userName: user ? user.name : "System",
      userRole: user ? user.role : "system",
      action,
      entity,
      entityId: entityId || null,
      summary,
    };
    if (extra.before) entry.before = extra.before;
    if (extra.after) entry.after = extra.after;
    if (extra.reason) entry.reason = extra.reason;
    state.auditLog.unshift(entry);
    save();
    return entry;
  }

  function require(permission, detail) {
    if (can(permission)) return true;
    const u = currentUser();
    audit(
      "denied",
      "permission",
      permission,
      `Denied ${permission}${detail ? ": " + detail : ""} (role=${u?.role || "none"})`
    );
    throw new Error("Not allowed");
  }

  function changedFields(before, after) {
    const b = {};
    const a = {};
    const keys = new Set([...Object.keys(before || {}), ...Object.keys(after || {})]);
    keys.forEach((k) => {
      if (JSON.stringify(before?.[k]) !== JSON.stringify(after?.[k])) {
        b[k] = before?.[k];
        a[k] = after?.[k];
      }
    });
    return { before: b, after: a };
  }

  function isSegregated() {
    return (state.settings.memberModel || "segregated") === "segregated";
  }

  function staffDesk() {
    if (!isStaff() || !isSegregated()) return null;
    return currentUser()?.staffGender || null;
  }

  function effectiveMemberDesk(member) {
    if (!member) return null;
    if (member.gender === "male" || member.gender === "female") return member.gender;
    return member.desk || null;
  }

  function memberVisibleToCurrentUser(member) {
    if (!member) return false;
    if (isAdmin()) return true;
    if (!isSegregated()) return true;
    const desk = staffDesk();
    if (!desk) return false;
    const eff = effectiveMemberDesk(member);
    return eff === desk;
  }

  function requireMemberAccess(memberId, detail) {
    const member = getMember(memberId);
    if (!member) throw new Error("Member not found");
    if (memberVisibleToCurrentUser(member)) return member;
    require("member.desk", detail || `staff desk blocked member ${memberId}`);
    throw new Error("Not allowed");
  }

  function visibleMembers() {
    return state.members.filter((m) => memberVisibleToCurrentUser(m));
  }

  function leadVisibleToCurrentUser(lead) {
    if (!lead) return false;
    if (isAdmin()) return true;
    if (!isSegregated()) return true;
    const desk = staffDesk();
    if (!desk) return false;
    if (lead.convertedMemberId) {
      return memberVisibleToCurrentUser(getMember(lead.convertedMemberId));
    }
    const g = lead.gender || null;
    if (g === "male" || g === "female") return g === desk;
    if (g === "other") return false;
    return false;
  }

  function visibleLeads() {
    return state.leads.filter((l) => leadVisibleToCurrentUser(l));
  }

  function visibleOpenInvoices() {
    return openInvoices().filter((inv) => {
      if (inv.type === "pt_info") return false;
      return memberVisibleToCurrentUser(getMember(inv.memberId));
    });
  }

  function loginAs(userId, opts = {}) {
    const user = state.users.find((u) => u.id === userId);
    if (!user) return null;
    if (isSegregated() && user.role === "staff" && !user.staffGender) {
      throw new Error("Staff gender desk is not assigned — ask admin");
    }
    const prev = currentUser();
    setSession(user);
    const deskLabel = user.staffGender ? `/${user.staffGender}` : "";
    if (opts.login) {
      audit("login", "session", user.id, `Login as ${user.name} (${user.role}${deskLabel})`);
    } else if (opts.roleSwitch && prev && prev.id !== user.id) {
      audit("role_switch", "session", user.id, `Switched to ${user.name} (${user.role}${deskLabel})`, {
        before: { userId: prev.id, role: prev.role, staffGender: prev.staffGender || null },
        after: { userId: user.id, role: user.role, staffGender: user.staffGender || null },
      });
    }
    return user;
  }

  /** Resolve login card: admin | staff | male | female */
  function loginAsDesk(deskKey, opts = {}) {
    if (deskKey === "admin") {
      const admin = state.users.find((u) => u.role === "admin");
      return loginAs(admin?.id, opts);
    }
    if (deskKey === "staff" || (!isSegregated() && (deskKey === "male" || deskKey === "female"))) {
      const staff = state.users.find((u) => u.role === "staff" && u.staffGender === "male")
        || state.users.find((u) => u.role === "staff");
      return loginAs(staff?.id, opts);
    }
    if (deskKey === "male" || deskKey === "female") {
      const staff = state.users.find((u) => u.role === "staff" && u.staffGender === deskKey);
      return loginAs(staff?.id, opts);
    }
    return null;
  }

  function switchRole(role, opts = {}) {
    // Back-compat: role admin|staff — in segregated mode staff → male desk
    if (role === "admin") return loginAsDesk("admin", opts);
    if (role === "staff") return loginAsDesk(isSegregated() ? "male" : "staff", opts);
    if (role === "male" || role === "female") return loginAsDesk(role, opts);
    return null;
  }

  function logout() {
    const user = currentUser();
    if (user) {
      audit("logout", "session", user.id, `Logout ${user.name} (${user.role})`);
    }
    clearSession();
  }

  function getMember(id) {
    return state.members.find((m) => m.id === id);
  }

  function getTrainer(id) {
    return state.trainers.find((t) => t.id === id);
  }

  function getPackage(id) {
    return state.packages.find((p) => p.id === id);
  }

  function membershipStatus(ms, today) {
    if (!ms) return "expired";
    const t = today || todayLocal();
    if (ms.status === "cancelled") return "cancelled";
    if (ms.status === "frozen") return "frozen";
    if (ms.startDate > t) return "upcoming";
    if (ms.endDate < t) return "expired";
    return "active";
  }

  function syncMembershipStatuses() {
    const today = todayLocal();
    state.memberships.forEach((ms) => {
      if (ms.status === "cancelled" || ms.status === "frozen") return;
      const computed = membershipStatus(ms, today);
      if (computed === "upcoming" || computed === "active" || computed === "expired") {
        ms.status = computed;
      }
    });
  }

  function activeMembership(memberId) {
    const today = todayLocal();
    const list = state.memberships.filter((m) => m.memberId === memberId);
    const active = list.find((m) => membershipStatus(m, today) === "active");
    if (active) return active;
    const frozen = list.find((m) => membershipStatus(m, today) === "frozen");
    if (frozen) return frozen;
    const upcoming = list
      .filter((m) => membershipStatus(m, today) === "upcoming")
      .sort((a, b) => (a.startDate > b.startDate ? 1 : -1))[0];
    if (upcoming) return upcoming;
    return list.sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0] || null;
  }

  function currentOrUpcomingPaidMembership(memberId) {
    const today = todayLocal();
    const list = state.memberships
      .filter((m) => m.memberId === memberId)
      .filter((m) => {
        const st = membershipStatus(m, today);
        if (st !== "active" && st !== "upcoming" && st !== "frozen") return false;
        const inv = state.invoices.find((i) => i.refId === m.id && i.type === "membership");
        if (!inv) return true;
        return inv.status === "paid";
      })
      .sort((a, b) => (a.endDate < b.endDate ? 1 : -1));
    return list[0] || null;
  }

  function computeStaffStartDate(memberId) {
    const paid = currentOrUpcomingPaidMembership(memberId);
    if (paid) return addDays(paid.endDate, 1);
    return todayLocal();
  }

  function packageEndDate(startDate, durationDays) {
    return addDays(startDate, Number(durationDays) - 1);
  }

  function activePT(memberId) {
    return state.ptAssignments.find((p) => p.memberId === memberId && p.status === "active");
  }

  function openInvoices() {
    return state.invoices.filter((i) => i.status === "open" || i.status === "overdue");
  }

  function refreshOverdue() {
    const today = todayLocal();
    syncMembershipStatuses();
    refreshConcessionStatuses();
    state.invoices.forEach((inv) => {
      if (inv.status === "open" && inv.dueDate < today) inv.status = "overdue";
    });
    save();
  }

  function expiringMemberships(withinDays) {
    const today = todayLocal();
    const limit = addDays(today, withinDays);
    return state.memberships.filter((m) => {
      const st = membershipStatus(m, today);
      return st === "active" && m.endDate >= today && m.endDate <= limit;
    });
  }

  function inactiveMembers() {
    const days = state.settings.inactivityDays || 21;
    const cutoff = addDays(todayLocal(), -days);
    return state.members.filter((m) => {
      const visits = state.attendance
        .filter((a) => a.memberId === m.id)
        .sort((a, b) => (a.checkedInAt < b.checkedInAt ? 1 : -1));
      let ref;
      if (visits.length) {
        ref = toLocalDate(visits[0].checkedInAt);
      } else {
        const ms = state.memberships
          .filter((x) => x.memberId === m.id)
          .sort((a, b) => (a.startDate < b.startDate ? 1 : -1))[0];
        const reg = m.registrationDate;
        const start = ms?.startDate || reg;
        ref = reg >= start ? reg : start;
      }
      return ref < cutoff;
    });
  }

  function lowStock() {
    return state.inventory.filter((i) => i.status !== "disposed" && i.qty <= i.minQty);
  }

  function paymentLocalDate(p) {
    return toLocalDate(p.paidAt);
  }

  function revenueInRange(from, to) {
    require("money.aggregates");
    const payments = state.payments.filter((p) => {
      if (p.status === "void") return false;
      const d = paymentLocalDate(p);
      return d >= from && d <= to;
    });
    const commissions = state.commissions.filter((c) => {
      if (c.status !== "received" || !c.receivedAt) return false;
      const d = toLocalDate(c.receivedAt);
      return d >= from && d <= to;
    });
    const scrap = state.disposals.filter((d) => {
      const day = toLocalDate(d.at);
      return day >= from && day <= to && d.proceeds > 0;
    });

    let membership = 0;
    let ptGym = 0;
    payments.forEach((p) => {
      const inv = state.invoices.find((i) => i.id === p.invoiceId);
      if (!inv) return;
      if (inv.type === "membership") membership += p.amount;
      if (inv.type === "pt_gym") ptGym += p.amount;
    });

    const commissionTotal = commissions.reduce((s, c) => s + c.amount, 0);
    const scrapTotal = scrap.reduce((s, d) => s + (d.proceeds || 0), 0);

    return {
      membership,
      ptGym,
      commission: commissionTotal,
      scrap: scrapTotal,
      other: 0,
      total: membership + ptGym + commissionTotal + scrapTotal,
      payments,
      commissions,
      scrap,
    };
  }

  function expensesInRange(from, to) {
    return state.expenses.filter((e) => e.date >= from && e.date <= to);
  }

  function periodRange(period) {
    const today = todayLocal();
    const to = today;
    const fromDate = parseLocalDate(today);
    if (period === "week") {
      fromDate.setDate(fromDate.getDate() - 6);
    } else if (period === "month") {
      fromDate.setDate(1);
    } else if (period === "year") {
      fromDate.setMonth(0, 1);
    }
    return { from: formatLocalDate(fromDate), to };
  }

  function resetData() {
    require("data.reset");
    state = deepClone(window.GYM_SEED);
    save();
  }

  /* ---------- Concessions ---------- */

  function refreshConcessionStatuses() {
    const today = todayLocal();
    (state.concessions || []).forEach((c) => {
      if (c.status === "revoked") return;
      if (c.mode === "lifetime" || !c.endDate) {
        c.status = "active";
      } else if (c.endDate < today) {
        c.status = "expired";
      } else if (c.startDate > today) {
        c.status = "active";
      } else {
        c.status = "active";
      }
    });
  }

  function getActiveConcession(memberId) {
    refreshConcessionStatuses();
    const today = todayLocal();
    return (state.concessions || []).find((c) => {
      if (c.memberId !== memberId) return false;
      if (c.status === "revoked" || c.status === "expired") return false;
      if (c.startDate > today) return false;
      if (c.endDate && c.endDate < today) return false;
      return true;
    }) || null;
  }

  function concessionAppliesToStart(concession, startDate) {
    if (!concession) return false;
    if (concession.status === "revoked") return false;
    if (startDate < concession.startDate) return false;
    if (concession.endDate && startDate > concession.endDate) return false;
    return true;
  }

  function resolvePayable(listPrice, memberId, startDate) {
    const conc = getActiveConcession(memberId);
    if (conc && concessionAppliesToStart(conc, startDate)) {
      const concessionAmount = Math.min(Number(conc.amount), Number(listPrice));
      return {
        listPrice: Number(listPrice),
        concessionId: conc.id,
        concessionAmount,
        amount: Math.max(0, Number(listPrice) - concessionAmount),
        concession: conc,
      };
    }
    return {
      listPrice: Number(listPrice),
      concessionId: null,
      concessionAmount: 0,
      amount: Number(listPrice),
      concession: null,
    };
  }

  function grantConcession(data) {
    require("concession.grant");
    const memberId = data.memberId;
    const member = requireMemberAccess(memberId, "concession outside desk");
    const amount = Number(data.amount);
    if (!(amount > 0)) throw new Error("Concession must be greater than 0");

    const existing = getActiveConcession(memberId);
    if (existing) {
      if (!isAdmin()) {
        require("concession.revoke", "staff cannot replace active concession");
      }
      if (!data.replaceConfirm) throw new Error("Active concession exists — confirm replacement");
      revokeConcession(existing.id, data.replaceReason || "Replaced by new concession", { silent: true });
    }

    const mode = data.mode === "lifetime" ? "lifetime" : "months";
    const months = mode === "months" ? Math.max(1, Number(data.months) || 1) : null;
    const startDate = data.startDate || todayLocal();
    let endDate = null;
    if (mode === "months") {
      endDate = addDays(addMonths(startDate, months), -1);
    }
    const reason = (data.reason || "").trim();
    if (!reason) throw new Error("Reason is required");

    const user = currentUser();
    const conc = {
      id: uid("con"),
      memberId,
      amount,
      mode,
      months,
      startDate,
      endDate,
      reason,
      grantedBy: user?.id,
      grantedAt: new Date().toISOString(),
      status: "active",
      revokedBy: null,
      revokedAt: null,
      revokeReason: null,
    };
    if (!state.concessions) state.concessions = [];
    state.concessions.unshift(conc);
    audit("create", "concession", conc.id, `Granted concession ${formatPKR(amount)} (${mode}${months ? " " + months + " mo" : ""}) to ${member.name}`, {
      after: { amount, mode, months, startDate, endDate, reason },
    });
    save();
    return conc;
  }

  function revokeConcession(id, reason, opts = {}) {
    require("concession.revoke");
    const c = (state.concessions || []).find((x) => x.id === id);
    if (!c) throw new Error("Concession not found");
    const r = (reason || "").trim();
    if (!r) throw new Error("Revoke reason is required");
    const before = { status: c.status };
    c.status = "revoked";
    c.revokedBy = currentUser()?.id;
    c.revokedAt = new Date().toISOString();
    c.revokeReason = r;
    if (!opts.silent) {
      audit("update", "concession", id, `Revoked concession ${formatPKR(c.amount)}: ${r}`, {
        before,
        after: { status: "revoked", revokeReason: r },
      });
    }
    save();
    return c;
  }

  function editConcession(id, patch) {
    require("concession.edit");
    const c = (state.concessions || []).find((x) => x.id === id);
    if (!c) throw new Error("Concession not found");
    if (c.status === "revoked") throw new Error("Cannot edit revoked concession");
    const before = { amount: c.amount, mode: c.mode, months: c.months, endDate: c.endDate, reason: c.reason };
    if (patch.amount != null) {
      const amount = Number(patch.amount);
      if (!(amount > 0)) throw new Error("Concession must be greater than 0");
      c.amount = amount;
    }
    if (patch.mode) {
      c.mode = patch.mode === "lifetime" ? "lifetime" : "months";
      if (c.mode === "lifetime") {
        c.months = null;
        c.endDate = null;
      } else {
        c.months = Math.max(1, Number(patch.months || c.months || 1));
        c.endDate = addDays(addMonths(c.startDate, c.months), -1);
      }
    } else if (patch.months != null && c.mode === "months") {
      c.months = Math.max(1, Number(patch.months));
      c.endDate = addDays(addMonths(c.startDate, c.months), -1);
    }
    if (patch.reason != null) {
      const reason = String(patch.reason).trim();
      if (!reason) throw new Error("Reason is required");
      c.reason = reason;
    }
    const diff = changedFields(before, {
      amount: c.amount,
      mode: c.mode,
      months: c.months,
      endDate: c.endDate,
      reason: c.reason,
    });
    audit("update", "concession", id, `Edited concession for ${getMember(c.memberId)?.name}`, diff);
    save();
    return c;
  }

  /* ---------- Mutations ---------- */

  function upsertPackage(pkg) {
    require("package.manage");
    if (pkg.id) {
      const i = state.packages.findIndex((p) => p.id === pkg.id);
      if (i >= 0) {
        const before = { ...state.packages[i] };
        state.packages[i] = { ...state.packages[i], ...pkg };
        const diff = changedFields(before, state.packages[i]);
        audit("update", "package", pkg.id, `Updated package ${pkg.name}`, diff);
      }
    } else {
      pkg.id = uid("pkg");
      pkg.active = pkg.active !== false;
      state.packages.push(pkg);
      audit("create", "package", pkg.id, `Created package ${pkg.name}`);
    }
    save();
    return pkg;
  }

  function addMember(data) {
    require("member.create");
    let gender = data.gender;
    let desk = data.desk || null;
    if (isSegregated() && isStaff()) {
      const deskG = staffDesk();
      if (!deskG) throw new Error("Staff desk not assigned");
      // Segregated: male staff → male only; female staff → female only
      if (gender && gender !== deskG) {
        require(
          "member.desk",
          `${deskG} staff tried to create ${gender} member`
        );
      }
      gender = deskG;
      desk = null;
    }
    if (gender === "male" || gender === "female") desk = null;
    if (gender === "other" && isSegregated() && desk && !isAdmin()) {
      require("member.desk", "staff cannot assign desk");
    }
    const registrationDate = isAdmin() && data.registrationDate ? data.registrationDate : todayLocal();
    const member = {
      id: uid("m"),
      name: data.name,
      phone: data.phone,
      gender: gender || "male",
      desk: gender === "other" ? desk || null : null,
      address: data.address || "",
      registrationDate,
      emergencyContact: data.emergencyContact || "",
      medicalNotes: data.medicalNotes || "",
      status: "active",
      biometricId: data.biometricId || "",
      photoInitials: data.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    };
    state.members.unshift(member);
    audit("create", "member", member.id, `Added member ${member.name}`);
    save();
    return member;
  }

  function updateMember(id, patch) {
    require("member.update");
    const i = state.members.findIndex((m) => m.id === id);
    if (i < 0) return null;
    const before = { ...state.members[i] };
    const allowed = [
      "name",
      "phone",
      "gender",
      "address",
      "emergencyContact",
      "medicalNotes",
      "biometricId",
      "status",
      "registrationDate",
      "desk",
    ];
    const clean = {};
    allowed.forEach((k) => {
      if (patch[k] !== undefined) clean[k] = patch[k];
    });
    if (clean.desk !== undefined && !isAdmin()) {
      require("member.desk", "staff cannot set desk");
    }
    state.members[i] = { ...state.members[i], ...clean };
    if (state.members[i].gender === "male" || state.members[i].gender === "female") {
      state.members[i].desk = null;
    }
    if (clean.name) {
      state.members[i].photoInitials = clean.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
    }
    const diff = changedFields(before, state.members[i]);
    audit("update", "member", id, `Updated member ${state.members[i].name}`, diff);
    save();
    return state.members[i];
  }

  function assignMemberDesk(memberId, desk) {
    require("member.desk");
    const member = getMember(memberId);
    if (!member) throw new Error("Member not found");
    if (member.gender !== "other") throw new Error("Desk assignment is only for gender “other”");
    if (desk !== "male" && desk !== "female") throw new Error("Desk must be male or female");
    const before = { desk: member.desk };
    member.desk = desk;
    audit("update", "member", memberId, `Assigned desk ${desk} for ${member.name}`, {
      before,
      after: { desk },
    });
    save();
    return member;
  }

  function upsertUser(data) {
    require("users.manage");
    if (data.id) {
      const i = state.users.findIndex((u) => u.id === data.id);
      if (i < 0) throw new Error("User not found");
      if (state.users[i].role === "admin") throw new Error("Cannot edit admin account in demo");
      const before = { ...state.users[i] };
      const next = {
        ...state.users[i],
        name: data.name || state.users[i].name,
        title: data.title != null ? data.title : state.users[i].title,
        staffGender: data.staffGender === "male" || data.staffGender === "female" ? data.staffGender : state.users[i].staffGender,
      };
      if (isSegregated() && next.role === "staff" && !next.staffGender) {
        throw new Error("Staff gender desk is required in segregated mode");
      }
      state.users[i] = next;
      audit("update", "user", data.id, `Updated staff ${next.name}`, changedFields(before, next));
      save();
      return next;
    }
    if (data.role === "admin") throw new Error("Cannot create another admin in demo");
    const staffGender = data.staffGender === "male" || data.staffGender === "female" ? data.staffGender : null;
    if (isSegregated() && !staffGender) throw new Error("Staff gender desk is required in segregated mode");
    const user = {
      id: uid("u"),
      name: data.name,
      role: "staff",
      title: data.title || "Front Desk",
      staffGender,
    };
    state.users.push(user);
    audit("create", "user", user.id, `Created staff ${user.name} (${staffGender || "unified"})`);
    save();
    return user;
  }

  function findOpenInvoiceForMembership(membershipId) {
    return state.invoices.find(
      (i) => i.refId === membershipId && i.type === "membership" && (i.status === "open" || i.status === "overdue")
    );
  }

  function assignMembership(opts) {
    require("membership.assign");
    const { memberId, packageId } = opts;
    requireMemberAccess(memberId, "assign membership outside desk");
    const pkg = getPackage(packageId);
    if (!pkg) throw new Error("Package not found");

    let start;
    let priceOverride = null;
    let overrideReason = (opts.overrideReason || "").trim();

    if (isStaff()) {
      if (opts.startDate || opts.priceOverride != null) {
        require("membership.override", "staff attempted date/price override");
      }
      start = computeStaffStartDate(memberId);
    } else {
      const defaultStart = computeStaffStartDate(memberId);
      if (opts.startDate && opts.startDate !== defaultStart) {
        if (!overrideReason) throw new Error("Override reason required for custom start date");
        start = opts.startDate;
        audit("override", "membership", memberId, `Admin override start date → ${start}`, {
          before: { startDate: defaultStart },
          after: { startDate: start },
          reason: overrideReason,
        });
      } else {
        start = opts.startDate || defaultStart;
      }
      if (opts.priceOverride != null && opts.priceOverride !== "" && Number(opts.priceOverride) !== pkg.price) {
        if (!overrideReason) throw new Error("Override reason required for price override");
        priceOverride = Number(opts.priceOverride);
        audit("override", "membership", memberId, `Admin price override ${formatPKR(pkg.price)} → ${formatPKR(priceOverride)}`, {
          before: { price: pkg.price },
          after: { price: priceOverride },
          reason: overrideReason,
        });
      }
    }

    const end = packageEndDate(start, pkg.durationDays);
    const today = todayLocal();
    const status = start > today ? "upcoming" : "active";

    // Do NOT cancel current membership — chain renewals
    const ms = {
      id: uid("ms"),
      memberId,
      packageId,
      startDate: start,
      endDate: end,
      listPrice: pkg.price,
      concessionId: null,
      concessionAmount: 0,
      price: pkg.price,
      amount: pkg.price,
      status,
      freezeReason: null,
      freezeUntil: null,
      frozenDays: 0,
    };

    let payable;
    if (priceOverride != null) {
      payable = {
        listPrice: pkg.price,
        concessionId: null,
        concessionAmount: 0,
        amount: priceOverride,
      };
    } else {
      payable = resolvePayable(pkg.price, memberId, start);
      if (payable.concession) {
        audit("update", "concession", payable.concessionId, `Applied concession to membership invoice for ${getMember(memberId)?.name}`, {
          after: { listPrice: payable.listPrice, concessionAmount: payable.concessionAmount, amount: payable.amount },
        });
      }
    }

    if (payable.amount < 0) throw new Error("Payable cannot be negative");
    if (payable.amount === 0 && !opts.confirmFree) {
      throw new Error("Free membership requires confirmation");
    }
    if (payable.concessionAmount > payable.listPrice) {
      throw new Error("Concession cannot exceed package price");
    }

    ms.listPrice = payable.listPrice;
    ms.concessionId = payable.concessionId;
    ms.concessionAmount = payable.concessionAmount;
    ms.price = payable.amount;
    ms.amount = payable.amount;

    // Reuse open invoice for same membership if somehow exists; otherwise create one
    let inv = null;
    state.memberships.unshift(ms);
    inv = {
      id: uid("inv"),
      memberId,
      type: "membership",
      refId: ms.id,
      listPrice: ms.listPrice,
      concessionId: ms.concessionId,
      concessionAmount: ms.concessionAmount,
      amount: ms.amount,
      dueDate: start,
      status: "open",
      note: `${pkg.name} membership`,
    };
    // If an identical open renewal already exists for this member+package starting same day, reuse
    const existingOpen = state.invoices.find(
      (i) =>
        i.memberId === memberId &&
        i.type === "membership" &&
        (i.status === "open" || i.status === "overdue") &&
        i.dueDate === start &&
        i.listPrice === ms.listPrice
    );
    if (existingOpen) {
      // Link existing open invoice to new membership instead of double-billing
      existingOpen.refId = ms.id;
      existingOpen.listPrice = ms.listPrice;
      existingOpen.concessionId = ms.concessionId;
      existingOpen.concessionAmount = ms.concessionAmount;
      existingOpen.amount = ms.amount;
      existingOpen.note = `${pkg.name} membership`;
      inv = existingOpen;
    } else {
      state.invoices.unshift(inv);
    }

    audit("create", "membership", ms.id, `Assigned ${pkg.name} to ${getMember(memberId)?.name} (${start} → ${end}, ${formatPKR(ms.amount)})`);
    save();
    return { membership: ms, invoice: inv };
  }

  function freezeMembership(membershipId, reason, until) {
    require("membership.freeze");
    const m = state.memberships.find((x) => x.id === membershipId);
    if (!m) return null;
    const r = (reason || "").trim();
    if (!r) throw new Error("Freeze reason is required");
    const before = { status: m.status, endDate: m.endDate };
    m.status = "frozen";
    m.freezeReason = r;
    m.freezeUntil = until || null;
    m.frozenAt = todayLocal();
    audit("update", "membership", membershipId, `Froze membership (${r})`, {
      before,
      after: { status: "frozen", freezeReason: r },
    });
    save();
    return m;
  }

  function unfreezeMembership(membershipId) {
    require("membership.unfreeze");
    const m = state.memberships.find((x) => x.id === membershipId);
    if (!m) return null;
    if (m.status !== "frozen") throw new Error("Membership is not frozen");
    const frozenFrom = m.frozenAt || m.startDate;
    const frozenDays = Math.max(0, daysBetween(frozenFrom, todayLocal()));
    const before = { status: m.status, endDate: m.endDate, frozenDays: m.frozenDays || 0 };
    m.endDate = addDays(m.endDate, frozenDays);
    m.frozenDays = (m.frozenDays || 0) + frozenDays;
    m.status = membershipStatus({ ...m, status: "active" }, todayLocal());
    m.freezeReason = null;
    m.freezeUntil = null;
    m.frozenAt = null;
    audit("update", "membership", membershipId, `Unfroze membership, extended ${frozenDays} day(s)`, {
      before,
      after: { status: m.status, endDate: m.endDate, frozenDays: m.frozenDays },
    });
    save();
    return m;
  }

  function assignPT({ memberId, trainerId, ptFee, startDate, endDate }) {
    require("pt.assign");
    requireMemberAccess(memberId, "assign PT outside desk");
    const trainer = getTrainer(trainerId);
    if (!trainer) throw new Error("Trainer not found");

    state.ptAssignments.forEach((p) => {
      if (p.memberId === memberId && p.status === "active") p.status = "ended";
    });

    const start = startDate || todayLocal();
    const pt = {
      id: uid("pt"),
      memberId,
      trainerId,
      ptFee: Number(ptFee),
      startDate: start,
      endDate: endDate || addDays(start, 30),
      status: "active",
    };
    state.ptAssignments.unshift(pt);

    if (trainer.payModel === "fixed") {
      state.invoices.unshift({
        id: uid("inv"),
        memberId,
        type: "pt_gym",
        refId: pt.id,
        listPrice: Number(ptFee),
        concessionId: null,
        concessionAmount: 0,
        amount: Number(ptFee),
        dueDate: pt.startDate,
        status: "open",
        note: `PT fee via gym — ${trainer.name}`,
      });
    } else {
      state.invoices.unshift({
        id: uid("inv"),
        memberId,
        type: "pt_info",
        refId: pt.id,
        listPrice: Number(ptFee),
        concessionId: null,
        concessionAmount: 0,
        amount: Number(ptFee),
        dueDate: pt.startDate,
        status: "info",
        note: `PT paid to trainer — gym commission ${trainer.commissionPercent}%`,
      });
      const amount = Math.round((Number(ptFee) * trainer.commissionPercent) / 100);
      state.commissions.unshift({
        id: uid("com"),
        trainerId,
        memberId,
        ptFee: Number(ptFee),
        percent: trainer.commissionPercent,
        amount,
        status: "pending",
        receivedAt: null,
        note: `Commission due from ${trainer.name}`,
      });
    }

    audit("create", "pt", pt.id, `Assigned PT ${trainer.name} to ${getMember(memberId)?.name}`);
    save();
    return pt;
  }

  function collectPayment({ invoiceId, method }) {
    require("payment.collect");
    const inv = state.invoices.find((i) => i.id === invoiceId);
    if (!inv) throw new Error("Invoice not found");
    requireMemberAccess(inv.memberId, "collect payment outside desk");
    if (inv.status === "paid" || inv.status === "info" || inv.status === "void") {
      throw new Error("Invoice not collectible");
    }
    const user = currentUser();
    const payment = {
      id: uid("pay"),
      invoiceId,
      amount: inv.amount,
      method,
      paidAt: new Date().toISOString(),
      collectedBy: user ? user.id : null,
      status: "ok",
    };
    state.payments.unshift(payment);
    inv.status = "paid";
    audit("collect", "payment", payment.id, `Collected ${formatPKR(payment.amount)} (${method})`);
    save();
    return payment;
  }

  function voidPayment(paymentId, reason) {
    require("payment.void");
    const pay = state.payments.find((p) => p.id === paymentId);
    if (!pay) return null;
    if (pay.status === "void") throw new Error("Already voided");
    const r = (reason || "").trim();
    if (!r) throw new Error("Void reason is required");
    const inv = state.invoices.find((i) => i.id === pay.invoiceId);
    if (inv && inv.status === "paid") inv.status = "open";
    pay.status = "void";
    pay.voidedBy = currentUser()?.id;
    pay.voidedAt = new Date().toISOString();
    pay.voidReason = r;
    audit("void", "payment", paymentId, `Voided payment ${formatPKR(pay.amount)}: ${r}`, {
      before: { status: "ok" },
      after: { status: "void" },
      reason: r,
    });
    save();
    return pay;
  }

  function voidInvoice(invoiceId, reason) {
    require("invoice.void");
    const inv = state.invoices.find((i) => i.id === invoiceId);
    if (!inv) throw new Error("Invoice not found");
    if (inv.status === "void") throw new Error("Already voided");
    const r = (reason || "").trim();
    if (!r) throw new Error("Void reason is required");
    const before = { status: inv.status };
    inv.status = "void";
    inv.voidReason = r;
    inv.voidedBy = currentUser()?.id;
    inv.voidedAt = new Date().toISOString();
    audit("void", "invoice", invoiceId, `Voided invoice ${formatPKR(inv.amount)}: ${r}`, {
      before,
      after: { status: "void" },
      reason: r,
    });
    save();
    return inv;
  }

  function receiveCommission(commissionId) {
    require("commission.receive");
    const c = state.commissions.find((x) => x.id === commissionId);
    if (!c) return null;
    c.status = "received";
    c.receivedAt = new Date().toISOString();
    audit("collect", "commission", c.id, `Received commission ${formatPKR(c.amount)}`);
    save();
    return c;
  }

  function addExpense(data) {
    require("expense.create");
    const date = isStaff() ? todayLocal() : data.date || todayLocal();
    if (isStaff() && data.date && data.date !== todayLocal()) {
      // ignore staff backdating — forced today
    }
    const exp = {
      id: uid("exp"),
      category: data.category,
      amount: Number(data.amount),
      date,
      note: data.note || "",
      method: data.method || "cash",
      createdBy: currentUser()?.id,
    };
    state.expenses.unshift(exp);
    audit("create", "expense", exp.id, `Added ${data.category} expense ${formatPKR(exp.amount)}`);
    save();
    return exp;
  }

  function deleteExpense(id) {
    require("expense.delete");
    const exp = state.expenses.find((e) => e.id === id);
    state.expenses = state.expenses.filter((e) => e.id !== id);
    if (exp) audit("delete", "expense", id, `Deleted expense ${formatPKR(exp.amount)}`);
    save();
  }

  function visibleExpenses() {
    if (isAdmin()) return state.expenses;
    const uid_ = currentUser()?.id;
    return state.expenses.filter((e) => e.createdBy === uid_);
  }

  function upsertTrainer(data) {
    require("trainer.manage");
    if (data.id) {
      const i = state.trainers.findIndex((t) => t.id === data.id);
      const before = { ...state.trainers[i] };
      state.trainers[i] = { ...state.trainers[i], ...data };
      audit("update", "trainer", data.id, `Updated trainer ${data.name}`, changedFields(before, state.trainers[i]));
      save();
      return state.trainers[i];
    }
    const t = {
      id: uid("tr"),
      name: data.name,
      phone: data.phone,
      specialty: data.specialty || "",
      status: "active",
      payModel: data.payModel,
      salary: data.payModel === "fixed" ? Number(data.salary) : null,
      payCycle: data.payModel === "fixed" ? data.payCycle || "monthly" : null,
      commissionPercent: data.payModel === "commission" ? Number(data.commissionPercent) : null,
    };
    state.trainers.unshift(t);
    audit("create", "trainer", t.id, `Added trainer ${t.name}`);
    save();
    return t;
  }

  function checkIn({ memberId, source, adminOverrideReason, confirmDues }) {
    require("attendance.checkin");
    const member = requireMemberAccess(memberId, "check-in outside desk");
    const today = todayLocal();
    const ms = activeMembership(memberId);
    const st = membershipStatus(ms, today);
    const warnings = [];

    if (!ms || st === "expired" || st === "cancelled") {
      if (!isAdmin() || !(adminOverrideReason || "").trim()) {
        throw new Error("Membership expired or missing — admin override with reason required");
      }
      audit("override", "attendance", memberId, `Admin check-in override (expired): ${adminOverrideReason}`, {
        reason: adminOverrideReason,
      });
    }
    if (ms && st === "frozen") {
      if (!isAdmin() || !(adminOverrideReason || "").trim()) {
        throw new Error("Membership is frozen — admin override with reason required");
      }
      audit("override", "attendance", memberId, `Admin check-in override (frozen): ${adminOverrideReason}`, {
        reason: adminOverrideReason,
      });
    }

    const dues = openInvoices().filter((i) => i.memberId === memberId && i.type !== "pt_info");
    if (dues.length) {
      warnings.push("Outstanding dues");
      if (!confirmDues) {
        return { blocked: true, needsDuesConfirm: true, warnings, dues };
      }
    }

    const att = {
      id: uid("att"),
      memberId,
      checkedInAt: new Date().toISOString(),
      source: source || "manual",
    };
    state.attendance.unshift(att);
    audit("checkin", "attendance", att.id, `Checked in ${member.name} (${att.source})`);
    save();
    return { attendance: att, warnings };
  }

  function upsertInventoryItem(data) {
    require("inventory.manage");
    if (data.id) {
      const i = state.inventory.findIndex((x) => x.id === data.id);
      const before = { ...state.inventory[i] };
      state.inventory[i] = { ...state.inventory[i], ...data };
      audit("update", "inventory", data.id, `Updated item ${data.name}`, changedFields(before, state.inventory[i]));
      save();
      return state.inventory[i];
    }
    const item = {
      id: uid("invt"),
      name: data.name,
      category: data.category || "equipment",
      qty: Number(data.qty) || 0,
      minQty: Number(data.minQty) || 0,
      location: data.location || "",
      status: data.status || "stored",
      note: data.note || "",
    };
    state.inventory.unshift(item);
    audit("create", "inventory", item.id, `Added inventory ${item.name}`);
    save();
    return item;
  }

  function moveStock({ itemId, type, qty, reason }) {
    require("inventory.manage");
    const item = state.inventory.find((i) => i.id === itemId);
    if (!item) throw new Error("Item not found");
    if (item.status === "disposed") throw new Error("Item is disposed");
    const q = Number(qty);
    if (!(q > 0) && type !== "adjust") throw new Error("Quantity must be positive");
    if (type === "in") item.qty += q;
    else if (type === "out") {
      if (q > item.qty) throw new Error(`Not enough stock (available ${item.qty})`);
      item.qty -= q;
    }     else if (type === "adjust") {
      require("inventory.adjust");
      item.qty = q;
    }
    const mv = {
      id: uid("mv"),
      itemId,
      type,
      qty: q,
      reason: reason || "",
      at: new Date().toISOString(),
      by: currentUser()?.id,
    };
    state.inventoryMovements.unshift(mv);
    audit("update", "inventory", itemId, `Stock ${type}: ${item.name} (${q})`);
    save();
    return { item, movement: mv };
  }

  function disposeItem({ itemId, qty, buyer, proceeds, note }) {
    require("inventory.dispose");
    const item = state.inventory.find((i) => i.id === itemId);
    if (!item) throw new Error("Item not found");
    const q = Number(qty);
    if (!(q >= 1) || q > item.qty) throw new Error(`Quantity must be between 1 and ${item.qty}`);
    item.qty -= q;
    if (item.qty === 0) item.status = "disposed";
    const d = {
      id: uid("disp"),
      itemId,
      qty: q,
      buyer: buyer || "",
      proceeds: Number(proceeds) || 0,
      note: note || "",
      at: new Date().toISOString(),
      by: currentUser()?.id,
    };
    state.disposals.unshift(d);
    audit(
      "dispose",
      "inventory",
      itemId,
      `Disposed ${q} × ${item.name}` + (d.proceeds ? ` for ${formatPKR(d.proceeds)}` : "")
    );
    save();
    return d;
  }

  function upsertLead(data) {
    require("lead.manage");
    let gender = data.gender || null;
    if (isSegregated() && isStaff()) {
      const desk = staffDesk();
      if (!desk) throw new Error("Staff desk not assigned");
      // Same desk rule as members: male staff → male leads only
      if (gender && gender !== desk) {
        require("member.desk", `${desk} staff tried to manage ${gender} lead`);
      }
      gender = desk;
    }
    if (data.id) {
      const i = state.leads.findIndex((l) => l.id === data.id);
      if (i < 0) throw new Error("Lead not found");
      if (!leadVisibleToCurrentUser(state.leads[i])) {
        require("member.desk", "lead outside desk");
      }
      const before = { ...state.leads[i] };
      state.leads[i] = { ...state.leads[i], ...data, gender: gender || data.gender || state.leads[i].gender || null };
      audit("update", "lead", data.id, `Updated lead ${data.name}`, changedFields(before, state.leads[i]));
      save();
      return state.leads[i];
    }
    const lead = {
      id: uid("ld"),
      name: data.name,
      phone: data.phone,
      source: data.source || "Walk-in",
      stage: data.stage || "new",
      notes: data.notes || "",
      followUpDate: data.followUpDate || todayLocal(),
      assignedTo: data.assignedTo || currentUser()?.id,
      convertedMemberId: null,
      gender: gender || (isSegregated() && isStaff() ? staffDesk() : data.gender || null),
    };
    state.leads.unshift(lead);
    audit("create", "lead", lead.id, `Added lead ${lead.name}`);
    save();
    return lead;
  }

  /** Mark lead won + link member after New Member form completes (idempotent). */
  function markLeadConverted(leadId, memberId) {
    require("lead.manage");
    const lead = state.leads.find((l) => l.id === leadId);
    if (!lead) return null;
    if (!leadVisibleToCurrentUser(lead) && !isAdmin()) {
      require("member.desk", "convert lead outside desk");
    }
    requireMemberAccess(memberId, "convert lead to member outside desk");
    if (lead.convertedMemberId) return lead;
    lead.stage = "won";
    lead.convertedMemberId = memberId;
    audit("update", "lead", leadId, `Converted lead ${lead.name} → member ${memberId}`);
    save();
    return lead;
  }

  /** @deprecated use markLeadConverted after form — kept for compatibility, now throws if already converted */
  function convertLead(leadId) {
    const lead = state.leads.find((l) => l.id === leadId);
    if (!lead) return null;
    if (lead.convertedMemberId) {
      return getMember(lead.convertedMemberId);
    }
    // Do not auto-create member — return lead for UI to open form
    return { needsForm: true, lead };
  }

  function updateSettings(patch) {
    require("settings.update");
    const before = { ...state.settings };
    if (patch.memberModel && patch.memberModel !== "unified" && patch.memberModel !== "segregated") {
      throw new Error("Invalid member model");
    }
    if (patch.memberModel === "segregated") {
      const unassigned = state.users.filter((u) => u.role === "staff" && !u.staffGender);
      if (unassigned.length) {
        throw new Error("Assign a gender desk to every staff user before enabling segregated mode");
      }
    }
    state.settings = { ...state.settings, ...patch };
    audit("update", "settings", "settings", "Updated gym settings", changedFields(before, state.settings));
    save();
    return state.settings;
  }

  function memberFeeHistory(memberId) {
    const invoices = state.invoices.filter((i) => i.memberId === memberId && i.type !== "pt_info");
    return invoices.map((inv) => {
      const pays = state.payments.filter((p) => p.invoiceId === inv.id);
      const paidOk = pays.filter((p) => p.status !== "void");
      const paidTotal = paidOk.reduce((s, p) => s + p.amount, 0);
      const lastPay = paidOk.sort((a, b) => (a.paidAt < b.paidAt ? 1 : -1))[0];
      const collector = lastPay ? state.users.find((u) => u.id === lastPay.collectedBy) : null;
      return {
        invoice: inv,
        listPrice: inv.listPrice != null ? inv.listPrice : inv.amount,
        concessionAmount: inv.concessionAmount || 0,
        payable: inv.amount,
        paid: paidTotal,
        status: inv.status,
        date: lastPay ? toLocalDate(lastPay.paidAt) : inv.dueDate,
        collectedBy: collector?.name || (lastPay ? lastPay.collectedBy : "—"),
        payments: pays,
      };
    });
  }

  function concessionsGivenThisMonth() {
    const { from, to } = periodRange("month");
    return (state.concessions || []).filter((c) => {
      const d = toLocalDate(c.grantedAt);
      return d >= from && d <= to;
    });
  }

  function totalDiscountThisMonth() {
    const { from, to } = periodRange("month");
    return state.invoices
      .filter((i) => i.status === "paid" && i.dueDate >= from && i.dueDate <= to)
      .reduce((s, i) => s + (i.concessionAmount || 0), 0);
  }

  window.Store = {
    get state() {
      return state;
    },
    PERMS,
    reload() {
      state = load();
      return state;
    },
    save,
    resetData,
    uid,
    todayISO,
    todayLocal,
    toLocalDate,
    parseLocalDate,
    addDays,
    addMonths,
    daysBetween,
    packageEndDate,
    formatPKR,
    formatDate,
    formatDateTime,
    getSession,
    setSession,
    clearSession,
    currentUser,
    isAdmin,
    isStaff,
    isSegregated,
    staffDesk,
    effectiveMemberDesk,
    memberVisibleToCurrentUser,
    requireMemberAccess,
    visibleMembers,
    visibleLeads,
    visibleOpenInvoices,
    leadVisibleToCurrentUser,
    can,
    require,
    switchRole,
    loginAs,
    loginAsDesk,
    logout,
    audit,
    getMember,
    getTrainer,
    getPackage,
    membershipStatus,
    activeMembership,
    computeStaffStartDate,
    activePT,
    openInvoices,
    refreshOverdue,
    expiringMemberships,
    inactiveMembers,
    lowStock,
    revenueInRange,
    expensesInRange,
    periodRange,
    visibleExpenses,
    upsertPackage,
    addMember,
    updateMember,
    assignMemberDesk,
    upsertUser,
    assignMembership,
    freezeMembership,
    unfreezeMembership,
    assignPT,
    collectPayment,
    voidPayment,
    voidInvoice,
    receiveCommission,
    addExpense,
    deleteExpense,
    upsertTrainer,
    checkIn,
    upsertInventoryItem,
    moveStock,
    disposeItem,
    upsertLead,
    convertLead,
    markLeadConverted,
    updateSettings,
    getActiveConcession,
    grantConcession,
    revokeConcession,
    editConcession,
    resolvePayable,
    memberFeeHistory,
    concessionsGivenThisMonth,
    totalDiscountThisMonth,
    findOpenInvoiceForMembership,
  };

  Store.refreshOverdue();
})();
