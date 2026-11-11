# Ubaid's Gym — Management System (Frontend Prototype)

Modern orange/coral gym operations UI for a **single location**, **PKR**, traditional membership gym with optional personal training.

No backend yet — data lives in browser `localStorage` (`ubaids_gym_v2`). Built to validate UX and **anti-fraud / permission rules** before a Next.js port.

## Run

```bash
npx serve .
```

Open the URL shown. Default mode is **segregated** — pick **Admin**, **Male staff**, or **Female staff**. In unified mode the login shows Admin + Staff.

Unit helpers (optional):

```bash
node tests/store-rules.mjs
```

## Unified vs segregated (member model)

`settings.memberModel` is `segregated` (default) or `unified`.

| | Unified | Segregated (default) |
|---|---|---|
| Login | Admin + Staff | Admin + Male staff + Female staff |
| Staff visibility | All members / leads / fees / attendance | Own gender desk only |
| Gender `other` | Visible to all staff | Admin only until admin assigns a desk (`male`/`female`) |
| Create member/lead gender | Free choice | Locked to staff’s desk |

Admin can switch the model in **Settings → Operating model** (confirm required). Staff accounts are managed there; each staff user needs a `staffGender` desk before segregated mode can be enabled. Trainers, packages, inventory, expenses, and revenue stay gym-wide (not desk-split).

## Roles and permission matrix

Enforcement is in `js/store.js` via `Store.can(permission)` / `Store.require(permission)`. Hiding a button is **not** security — every mutator checks permissions. Denied attempts write an audit entry with action `denied` and throw `"Not allowed"`.

| Capability | Admin | Staff (unified) | Staff (segregated) |
|---|---|---|---|
| Add member + assign existing package | Yes | Yes (all) | Yes (own desk gender) |
| Edit member after create | Yes | No | No |
| See/edit members of own desk | All | All | Own desk only |
| Assign desk on gender “other” | Yes | No | No |
| Switch memberModel / create staff users | Yes | No | No |
| Assign / renew at package price (− concession) | Yes | Yes | Yes (visible members) |
| Override start date or price (reason required) | Yes | No | No |
| Collect fees (full invoice amount only) | Yes | Yes | Yes (visible members) |
| See per-member / per-invoice amounts | Yes | Yes | Yes (visible) |
| See revenue / expense / P&L / open-dues **totals** | Yes | No | No |
| Revenue page / Reports page | Yes | No (route blocked) | No |
| Void payment / invoice (reason required) | Yes | No | No |
| Grant concession (when none active) | Yes | Yes | Yes (visible) |
| Edit / revoke / replace concession | Yes | No | No |
| Add expense (date = today for staff) | Yes | Yes (own rows only, no totals) | Same |
| Delete expense | Yes | No | No |
| Freeze / unfreeze membership | Yes | No | No |
| Receive trainer commission | Yes | No | No |
| Packages / Settings / Audit | Yes | No | No |
| Dispose inventory | Yes | No | No |
| Stock in/out | Yes | Yes | Yes |
| Stock adjust (set qty) | Yes | No | No |
| Attendance check-in | Yes | Yes | Yes (own desk) |
| Leads add / edit / convert | Yes | Yes | Yes (own desk) |
| Reset demo data | Yes | No | No |

## Business rules

### Membership dates and amounts
- **Staff** never types start date or price. Start = day after current/upcoming **paid** membership end, else today. Registration date = today.
- End date = start + `durationDays` − 1 (**inclusive**). Day Pass starting today ends today.
- Invoice amount = package list price − active concession (if start falls in concession window). Admin may override date/price only with a **written reason** (audited).
- Renewals do **not** cancel the current membership or lose unused days; new term is `upcoming` until start.
- Exactly one open membership invoice per assignment (reuse matching open invoice when present).
- Payment amount always equals invoice amount (full pay). No caller-supplied amount.
- Invoices are immutable; admin void sets status `void` with reason.
- Payment void is soft: status `void`, keeps history, excluded from revenue.

### Concessions
- Flat PKR discount **per membership invoice** whose `startDate` is inside `[startDate, endDate]` (lifetime = no end).
- Quarterly/annual packages: **one invoice → one discount** (not multiplied by months of access).
- Modes: `lifetime` or `months` (`endDate = start + N months − 1 day`).
- Both roles may grant when none is active (reason required). Only admin may edit/revoke/replace.
- Payable 0 requires explicit free-membership confirm. Concession cannot exceed list price.

### Staff money visibility
Staff never sees aggregate money KPIs, Revenue, Reports P&L, expense totals, or open-dues PKR total. Dashboard staff variant shows counts only.

### Audit
Login, logout, role switch, creates/updates/deletes/voids/collects/disposals/check-ins, concessions, overrides, settings, reset, and **denied** attempts. No page-view logs. Entries include `userName`, `userRole`, and optional `before`/`after`.

**Reset demo data** restores seed state including the sample audit log (demo presentation).

## Modules

Dashboard · Leads · Members · Packages · Fee collection · Attendance · Trainers · Revenue · Expenses · Inventory · Reports · Audit log · Settings

## Stack

HTML · CSS · vanilla JS · Chart.js (CDN, degrades if unavailable) · Plus Jakarta Sans

## Changelog (this hardening pass)

| File | Changes |
|---|---|
| `js/store.js` | Permissions, local dates, computed membership status, renewals, soft voids, concessions, inactive logic, disposal qty, enriched audit |
| `js/data.js` | Relative seed, schema v2, concession sample, XSS test member, current-month revenue, inclusive ends |
| `js/ui.js` | `esc()`, modal a11y (dialog/focus/Esc/Tab), `promptDialog`, money/concession helpers |
| `js/app.js` | Admin-only revenue/reports routes; login/logout/role_switch audit hooks; mobile role badge |
| `index.html` | Login audit via `switchRole(..., { login: true })` |
| `js/pages/*` | Staff money scrub, concessions UI, fee history, lead convert form, inventory/attendance/audit upgrades |
| `css/shell.css`, `css/components.css` | Mobile overflow, modal scroll, audit filters, role badge |
| `tests/store-rules.mjs` | Pure helper unit tests |
| `README.md` | Matrix, business rules, acceptance checklist |

## Manual acceptance checklist

- [ ] Staff session: no revenue/expense totals on dashboard, expenses, fees (open dues shows **count** only); Revenue/Reports blocked.
- [ ] Console as staff: `Store.assignMembership({ memberId:'m-1', packageId:'pkg-1', startDate:'2020-01-01', priceOverride:1 })` → throws Not allowed, audit `denied`.
- [ ] Staff renews member ending in 3 days: start = day after end, price = package (− concession), one invoice, no editable date/amount fields.
- [ ] Staff cannot edit member (no Edit button; `Store.updateMember` throws).
- [ ] Grant Rs 1,000 / 3 months on Rs 5,000 package: next 3 monthly renewals payable 4,000; 4th is 5,000. Lifetime never expires. Over-price concession rejected. Staff can grant when none active; cannot revoke.
- [ ] Audit shows login/logout, actions, denied; filters by role/user/action/date; before/after on edits.
- [ ] Fresh demo: monthly revenue ≠ Rs 0; no double invoice; status expired after end date; XSS member name renders as text; Day Pass same-day end; lead convert opens form (no duplicate auto-member); partial disposal works; new members not inactive; local dates near midnight correct; no horizontal page scroll at 360px.
- [ ] Void payment: row stays as Void, revenue drops, reason required.
- [ ] Reset demo data restores seed including sample audit.

### Checklist results (fill when verifying)

| Case | Result | Notes |
|---|---|---|
| Staff no aggregates | | |
| Staff override denied | | |
| Staff renew chaining | | |
| Staff cannot edit member | | |
| Concession 3 months / lifetime | | |
| Audit filters + denied | | |
| 12 fixes smoke | | |
| Soft void payment | | |
