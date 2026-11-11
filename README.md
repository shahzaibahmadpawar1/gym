# Ubaid's Gym — Management System (Frontend Prototype)

Modern orange/coral gym operations UI for a **single location**, **PKR**, traditional membership gym with optional personal training.

No backend yet — data lives in browser `localStorage`. Built to validate UX before a Next.js port.

## Run

Open `index.html` in a browser (double-click or any static server):

```bash
npx serve .
```

Then open the URL shown, pick **Admin** or **Staff**, and explore.

## Roles

- **Admin** — full access (packages, commissions, voids, audit, settings, scrap disposal)
- **Staff** — members, fee collection, attendance, routine expenses; cannot edit packages/commissions/audit

Switch roles anytime from the sidebar.

## Modules

Dashboard · Leads · Members · Packages · Fee collection · Attendance · Trainers · Revenue · Expenses · Inventory · Reports · Audit log · Settings

## Stack

HTML · CSS · vanilla JS · Chart.js (CDN) · Plus Jakarta Sans
