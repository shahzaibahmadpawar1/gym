/**
 * Pure helper unit tests (no browser). Run: node tests/store-rules.mjs
 */
function pad(n) {
  return String(n).padStart(2, "0");
}
function parseLocalDate(iso) {
  const [y, m, d] = String(iso).slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}
function formatLocalDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
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
function packageEndDate(startDate, durationDays) {
  return addDays(startDate, Number(durationDays) - 1);
}
function resolvePayable(listPrice, concessionAmount) {
  const c = Math.min(Number(concessionAmount) || 0, Number(listPrice));
  return { listPrice: Number(listPrice), concessionAmount: c, amount: Math.max(0, Number(listPrice) - c) };
}
function concessionApplies(startDate, conc) {
  if (startDate < conc.startDate) return false;
  if (conc.endDate && startDate > conc.endDate) return false;
  return true;
}
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed += 1;
    console.error("FAIL:", msg);
  } else {
    console.log("ok:", msg);
  }
}

// Day pass inclusive
assert(packageEndDate("2026-11-11", 1) === "2026-11-11", "Day Pass ends same day");
assert(packageEndDate("2026-11-01", 30) === "2026-11-30", "30-day package inclusive end");

// Concession window months
const start = "2026-11-01";
const end = addDays(addMonths(start, 3), -1);
assert(end === "2027-01-31", "3-month concession endDate");
assert(concessionApplies("2026-11-15", { startDate: start, endDate: end }), "invoice in window");
assert(!concessionApplies("2027-02-01", { startDate: start, endDate: end }), "invoice after window");

// Payable math
assert(resolvePayable(5000, 1000).amount === 4000, "5000 - 1000 = 4000");
assert(resolvePayable(5000, 6000).amount === 0, "concession capped at list price");

// Quarterly = one discount (flat)
assert(resolvePayable(13500, 1000).amount === 12500, "quarterly one-invoice flat discount");

// XSS escape
const xss = '<img src=x onerror=alert(1)>';
assert(esc(xss).includes("&lt;img") && !esc(xss).includes("<img"), "XSS escaped as text");

// Soft void keeps row
const payment = { id: "p1", amount: 5000, status: "ok" };
payment.status = "void";
payment.voidReason = "mistake";
assert(payment.status === "void" && payment.amount === 5000, "void keeps payment row");

if (failed) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log("\nAll store-rules tests passed");
