(function () {
  const STORAGE_KEY = "ubaids_gym_v1";
  const SESSION_KEY = "ubaids_gym_session";

  function deepClone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    const seed = deepClone(window.GYM_SEED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }

  let state = load();

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function uid(prefix) {
    return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  }

  function todayISO() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function daysBetween(a, b) {
    const ms = new Date(b) - new Date(a);
    return Math.round(ms / 86400000);
  }

  function addDays(dateStr, days) {
    const d = new Date(dateStr);
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  function formatPKR(n) {
    const num = Number(n) || 0;
    return "Rs " + num.toLocaleString("en-PK");
  }

  function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatDateTime(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
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
    return u && u.role === "admin";
  }

  function switchRole(role) {
    const user = state.users.find((u) => u.role === role);
    if (user) setSession(user);
    return user;
  }

  function audit(action, entity, entityId, summary) {
    const user = currentUser();
    state.auditLog.unshift({
      id: uid("au"),
      at: new Date().toISOString(),
      userId: user ? user.id : "system",
      action,
      entity,
      entityId,
      summary,
    });
    save();
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

  function activeMembership(memberId) {
    return state.memberships
      .filter((m) => m.memberId === memberId)
      .sort((a, b) => (a.endDate < b.endDate ? 1 : -1))[0];
  }

  function activePT(memberId) {
    return state.ptAssignments.find((p) => p.memberId === memberId && p.status === "active");
  }

  function openInvoices() {
    return state.invoices.filter((i) => i.status === "open" || i.status === "overdue");
  }

  function refreshOverdue() {
    const today = todayISO();
    state.invoices.forEach((inv) => {
      if (inv.status === "open" && inv.dueDate < today) inv.status = "overdue";
    });
    save();
  }

  function expiringMemberships(withinDays) {
    const today = todayISO();
    const limit = addDays(today, withinDays);
    return state.memberships.filter(
      (m) => m.status === "active" && m.endDate >= today && m.endDate <= limit
    );
  }

  function inactiveMembers() {
    const days = state.settings.inactivityDays || 21;
    const cutoff = addDays(todayISO(), -days);
    return state.members.filter((m) => {
      if (m.status !== "active") return false;
      const visits = state.attendance
        .filter((a) => a.memberId === m.id)
        .sort((a, b) => (a.checkedInAt < b.checkedInAt ? 1 : -1));
      if (!visits.length) return true;
      return visits[0].checkedInAt.slice(0, 10) < cutoff;
    });
  }

  function lowStock() {
    return state.inventory.filter((i) => i.status !== "disposed" && i.qty <= i.minQty);
  }

  function revenueInRange(from, to) {
    const payments = state.payments.filter((p) => {
      const d = p.paidAt.slice(0, 10);
      return d >= from && d <= to;
    });
    const commissions = state.commissions.filter(
      (c) => c.status === "received" && c.receivedAt && c.receivedAt.slice(0, 10) >= from && c.receivedAt.slice(0, 10) <= to
    );
    const scrap = state.disposals.filter(
      (d) => d.at.slice(0, 10) >= from && d.at.slice(0, 10) <= to && d.proceeds > 0
    );

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
    const today = new Date();
    const to = today.toISOString().slice(0, 10);
    const fromDate = new Date(today);
    if (period === "day") {
      /* same day */
    } else if (period === "week") {
      fromDate.setDate(fromDate.getDate() - 6);
    } else if (period === "month") {
      fromDate.setDate(1);
    } else if (period === "year") {
      fromDate.setMonth(0, 1);
    }
    return { from: fromDate.toISOString().slice(0, 10), to };
  }

  function resetData() {
    state = deepClone(window.GYM_SEED);
    save();
  }

  // Mutations
  function upsertPackage(pkg) {
    if (pkg.id) {
      const i = state.packages.findIndex((p) => p.id === pkg.id);
      if (i >= 0) state.packages[i] = { ...state.packages[i], ...pkg };
      audit("update", "package", pkg.id, `Updated package ${pkg.name}`);
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
    const member = {
      id: uid("m"),
      name: data.name,
      phone: data.phone,
      gender: data.gender,
      address: data.address || "",
      registrationDate: data.registrationDate || todayISO(),
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
    const i = state.members.findIndex((m) => m.id === id);
    if (i < 0) return null;
    state.members[i] = { ...state.members[i], ...patch };
    audit("update", "member", id, `Updated member ${state.members[i].name}`);
    save();
    return state.members[i];
  }

  function assignMembership({ memberId, packageId, startDate, priceOverride }) {
    const pkg = getPackage(packageId);
    if (!pkg) throw new Error("Package not found");
    const start = startDate || todayISO();
    const end = addDays(start, pkg.durationDays);
    const price = priceOverride != null && isAdmin() ? Number(priceOverride) : pkg.price;

    // expire previous active
    state.memberships.forEach((m) => {
      if (m.memberId === memberId && m.status === "active") m.status = "cancelled";
    });

    const ms = {
      id: uid("ms"),
      memberId,
      packageId,
      startDate: start,
      endDate: end,
      price,
      status: "active",
      freezeReason: null,
    };
    state.memberships.unshift(ms);

    const inv = {
      id: uid("inv"),
      memberId,
      type: "membership",
      refId: ms.id,
      amount: price,
      dueDate: start,
      status: "open",
      note: `${pkg.name} membership`,
    };
    state.invoices.unshift(inv);
    audit("create", "membership", ms.id, `Assigned ${pkg.name} to ${getMember(memberId)?.name}`);
    save();
    return { membership: ms, invoice: inv };
  }

  function freezeMembership(membershipId, reason, until) {
    if (!isAdmin()) throw new Error("Admin only");
    const m = state.memberships.find((x) => x.id === membershipId);
    if (!m) return null;
    m.status = "frozen";
    m.freezeReason = reason || "";
    m.freezeUntil = until || null;
    audit("update", "membership", membershipId, `Froze membership (${reason || "no reason"})`);
    save();
    return m;
  }

  function assignPT({ memberId, trainerId, ptFee, startDate, endDate }) {
    const trainer = getTrainer(trainerId);
    if (!trainer) throw new Error("Trainer not found");

    state.ptAssignments.forEach((p) => {
      if (p.memberId === memberId && p.status === "active") p.status = "ended";
    });

    const pt = {
      id: uid("pt"),
      memberId,
      trainerId,
      ptFee: Number(ptFee),
      startDate: startDate || todayISO(),
      endDate: endDate || addDays(todayISO(), 30),
      status: "active",
    };
    state.ptAssignments.unshift(pt);

    if (trainer.payModel === "fixed") {
      const inv = {
        id: uid("inv"),
        memberId,
        type: "pt_gym",
        refId: pt.id,
        amount: Number(ptFee),
        dueDate: pt.startDate,
        status: "open",
        note: `PT fee via gym — ${trainer.name}`,
      };
      state.invoices.unshift(inv);
    } else {
      state.invoices.unshift({
        id: uid("inv"),
        memberId,
        type: "pt_info",
        refId: pt.id,
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
    const inv = state.invoices.find((i) => i.id === invoiceId);
    if (!inv) throw new Error("Invoice not found");
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
    };
    state.payments.unshift(payment);
    inv.status = "paid";
    audit("collect", "payment", payment.id, `Collected ${formatPKR(payment.amount)} (${method})`);
    save();
    return payment;
  }

  function voidPayment(paymentId) {
    if (!isAdmin()) throw new Error("Admin only");
    const pay = state.payments.find((p) => p.id === paymentId);
    if (!pay) return null;
    const inv = state.invoices.find((i) => i.id === pay.invoiceId);
    if (inv) inv.status = "open";
    state.payments = state.payments.filter((p) => p.id !== paymentId);
    audit("void", "payment", paymentId, `Voided payment ${formatPKR(pay.amount)}`);
    save();
  }

  function receiveCommission(commissionId) {
    const c = state.commissions.find((x) => x.id === commissionId);
    if (!c) return null;
    c.status = "received";
    c.receivedAt = new Date().toISOString();
    audit("collect", "commission", c.id, `Received commission ${formatPKR(c.amount)}`);
    save();
    return c;
  }

  function addExpense(data) {
    const exp = {
      id: uid("exp"),
      category: data.category,
      amount: Number(data.amount),
      date: data.date || todayISO(),
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
    if (!isAdmin()) throw new Error("Admin only");
    const exp = state.expenses.find((e) => e.id === id);
    state.expenses = state.expenses.filter((e) => e.id !== id);
    if (exp) audit("delete", "expense", id, `Deleted expense ${formatPKR(exp.amount)}`);
    save();
  }

  function upsertTrainer(data) {
    if (!isAdmin()) throw new Error("Admin only");
    if (data.id) {
      const i = state.trainers.findIndex((t) => t.id === data.id);
      state.trainers[i] = { ...state.trainers[i], ...data };
      audit("update", "trainer", data.id, `Updated trainer ${data.name}`);
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

  function checkIn({ memberId, source }) {
    const member = getMember(memberId);
    if (!member) throw new Error("Member not found");
    const ms = activeMembership(memberId);
    const warnings = [];
    if (!ms || ms.status === "expired" || (ms.endDate && ms.endDate < todayISO())) {
      warnings.push("Membership expired or missing");
    }
    if (ms && ms.status === "frozen") warnings.push("Membership is frozen");
    const dues = openInvoices().filter((i) => i.memberId === memberId);
    if (dues.length) warnings.push("Outstanding dues");

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
    if (data.id) {
      const i = state.inventory.findIndex((x) => x.id === data.id);
      state.inventory[i] = { ...state.inventory[i], ...data };
      audit("update", "inventory", data.id, `Updated item ${data.name}`);
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
    const item = state.inventory.find((i) => i.id === itemId);
    if (!item) throw new Error("Item not found");
    const q = Number(qty);
    if (type === "in") item.qty += q;
    else if (type === "out") item.qty = Math.max(0, item.qty - q);
    else if (type === "adjust") item.qty = q;
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

  function disposeItem({ itemId, buyer, proceeds, note }) {
    if (!isAdmin()) throw new Error("Admin only");
    const item = state.inventory.find((i) => i.id === itemId);
    if (!item) throw new Error("Item not found");
    item.status = "disposed";
    item.qty = 0;
    const d = {
      id: uid("disp"),
      itemId,
      buyer: buyer || "",
      proceeds: Number(proceeds) || 0,
      note: note || "",
      at: new Date().toISOString(),
      by: currentUser()?.id,
    };
    state.disposals.unshift(d);
    audit("dispose", "inventory", itemId, `Disposed ${item.name}` + (d.proceeds ? ` for ${formatPKR(d.proceeds)}` : ""));
    save();
    return d;
  }

  function upsertLead(data) {
    if (data.id) {
      const i = state.leads.findIndex((l) => l.id === data.id);
      state.leads[i] = { ...state.leads[i], ...data };
      audit("update", "lead", data.id, `Updated lead ${data.name}`);
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
      followUpDate: data.followUpDate || todayISO(),
      assignedTo: data.assignedTo || currentUser()?.id,
    };
    state.leads.unshift(lead);
    audit("create", "lead", lead.id, `Added lead ${lead.name}`);
    save();
    return lead;
  }

  function convertLead(leadId) {
    const lead = state.leads.find((l) => l.id === leadId);
    if (!lead) return null;
    lead.stage = "won";
    const member = addMember({
      name: lead.name,
      phone: lead.phone,
      gender: "male",
      address: "",
      registrationDate: todayISO(),
    });
    audit("update", "lead", leadId, `Converted lead ${lead.name} → member`);
    save();
    return member;
  }

  function updateSettings(patch) {
    if (!isAdmin()) throw new Error("Admin only");
    state.settings = { ...state.settings, ...patch };
    audit("update", "settings", "settings", "Updated gym settings");
    save();
    return state.settings;
  }

  window.Store = {
    get state() {
      return state;
    },
    reload() {
      state = load();
      return state;
    },
    save,
    resetData,
    uid,
    todayISO,
    daysBetween,
    addDays,
    formatPKR,
    formatDate,
    formatDateTime,
    getSession,
    setSession,
    clearSession,
    currentUser,
    isAdmin,
    switchRole,
    audit,
    getMember,
    getTrainer,
    getPackage,
    activeMembership,
    activePT,
    openInvoices,
    refreshOverdue,
    expiringMemberships,
    inactiveMembers,
    lowStock,
    revenueInRange,
    expensesInRange,
    periodRange,
    upsertPackage,
    addMember,
    updateMember,
    assignMembership,
    freezeMembership,
    assignPT,
    collectPayment,
    voidPayment,
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
    updateSettings,
  };

  Store.refreshOverdue();
})();
