# Admin Page Plan — B2B2C Employee Benefits Portal

> **Goal:** A separate, standalone admin page at `/admin.html` for creating, reading, updating, and deleting product offerings, providers, and employee codes — with a live analytics panel. No login required.

---

## 1. Architecture Overview

### Approach: Vite Multi-Page App (MPA)

The admin page lives as a **second entry point** alongside the existing `src/index.html`. Vite natively supports MPA — one small config change unlocks this. The admin page shares the same Supabase credentials but is **completely isolated** from the employee-facing SPA state and routing.

```
src/
├── index.html          ← Employee app (unchanged)
├── app.js              ← Employee app entry (unchanged)
├── admin.html          ← NEW: Admin entry HTML
├── admin.js            ← NEW: Admin app entry JS
├── admin.css           ← NEW: Admin-specific styles (desktop-first)
├── admin/
│   ├── offers.js       ← Offers CRUD module
│   ├── providers.js    ← Providers CRUD module
│   ├── employees.js    ← Employee codes CRUD module
│   └── analytics.js    ← Analytics / redirect events module
└── styles.css          ← Employee app CSS (unchanged)
```

### Why Separate Entry?

- Zero risk of breaking the employee-facing app
- Admin can use a desktop-first, wider layout (the main app is 375px mobile-first)
- Different CSS design tokens (light or neutral theme, or same dark theme in a wider layout)
- Can be deployed to a different path or subdomain later (e.g., `/admin`, `admin.yourdomain.com`)

---

## 2. Vite Config Change

Update `vite.config.js` to declare both entry points:

```js
// vite.config.js
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main:  'src/index.html',   // employee app
        admin: 'src/admin.html',   // admin page
      }
    }
  },
  server: { port: 5173 }
})
```

In dev mode, the admin page is accessible at: `http://localhost:5173/admin.html`
In production build, it outputs to: `dist/admin.html`

---

## 3. Supabase Access: Service Key vs Anon Key

### The Problem

The current Supabase setup uses the **anon (public) key** and enforces Row Level Security (RLS):
- `providers` and `offers` tables: **SELECT only** (public read, no write)
- `employee_codes`: only active codes visible
- `redirect_events`: anon INSERT only

This means the anon key **cannot** INSERT, UPDATE, or DELETE offers or providers — by design.

### Solution Options

**Option A — Service Role Key (Recommended for admin)**

Add a second env variable: `VITE_SUPABASE_SERVICE_KEY`

The service role key **bypasses RLS** — it can read and write everything. This is appropriate for an admin tool. Since the admin page has no login protection, this key must be treated carefully — consider putting the admin page behind a `.htaccess` basic auth or IP restriction at the hosting layer.

```js
// admin.js
const adminClient = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_KEY   // bypasses RLS
)
```

> ⚠️ **Security note:** The service key will be embedded in the built JS bundle since this is a frontend app. For a production deployment this is acceptable only if the admin URL is restricted at the network/hosting level (e.g., IP allowlist, VPN, basic auth header). Never commit `.env` to git.

**Option B — Relaxed RLS Policies (Simpler but less secure)**

Add write policies to `offers` and `providers` for the anon role. The existing anon key is then sufficient. This is simpler but means anyone with the anon key can mutate data.

**Recommended: Option A**, with a note in the README to restrict admin URL access at the CDN/hosting layer.

---

## 4. Admin Page Layout

### Overall Layout (Desktop-first, ~1200px wide)

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: B2B2C Admin  |  [Offers] [Providers] [Employees]   │
│                       |  [Analytics]         [● Live]       │
├───────────┬─────────────────────────────────────────────────┤
│           │                                                   │
│  SIDEBAR  │   MAIN CONTENT PANEL                            │
│  (nav +   │   (changes based on active section)             │
│  stats)   │                                                   │
│           │                                                   │
└───────────┴─────────────────────────────────────────────────┘
```

**Header bar:**
- App name + logo on the left
- Section tabs across the top: Offers | Providers | Employees | Analytics
- Connection status indicator (Supabase connected / demo mode)

**Sidebar (left, ~220px):**
- Summary stats: total offers, active offers, providers count, employee codes
- Quick filter shortcuts (by category, by provider)
- "Add New" button shortcut

**Main panel:**
- Renders the active section's content

---

## 5. Section A — Offers Management (Primary Feature)

### A1. Offers List View

The default view when the admin page loads.

**Layout:** Full-width data table with the following columns:

| Column | Notes |
|--------|-------|
| Emoji | Visual preview of `product_emoji` |
| Title | `title` — clickable to open edit form |
| Category | Colour-coded pill (`vehicle`, `electronics`, etc.) |
| Provider | Provider name |
| Badge | e.g. "DP 0%" |
| Rate | `interest_rate`% /bln |
| Monthly From | `monthly_from` formatted as Rp |
| Featured | Toggle switch (inline) |
| Valid Until | Date or "—" if null |
| Status | Active / Expired based on `valid_until` |
| Actions | [Edit] [Duplicate] [Delete] buttons |

**Table features:**
- **Sort** by any column (click column header)
- **Filter** row above table: by category dropdown, by provider dropdown, by featured checkbox, by "active only" toggle
- **Search** bar: free-text search across title, subtitle, brand_label
- **Pagination** or infinite scroll (whichever is simpler given data volume)
- **Row count** summary: "Showing 12 of 24 offers"
- **Bulk actions** toolbar (appears when rows are checked): Bulk delete, Bulk toggle featured, Bulk set valid_until

### A2. Add / Edit Offer Form

Opens as a **slide-in panel** from the right side (or a modal for simpler implementation). Contains all `offers` table fields, organised into logical groups:

#### Group 1: Identity
| Field | Input Type | Validation |
|-------|-----------|------------|
| Title | Text input | Required, max 100 chars |
| Subtitle | Textarea (2 rows) | Optional, max 200 chars |
| Product Emoji | Emoji picker grid (pre-set options + custom text input) | Required |

**Emoji picker:** Show a grid of common emojis: 🏍️ 🛵 🚗 🚙 🚐 📱 💻 ❄️ 🏠 💰 🛡️ 📦 — plus a text field for custom entry.

#### Group 2: Classification
| Field | Input Type | Options |
|-------|-----------|---------|
| Category | Dropdown select | vehicle / electronics / appliance / personal_loan / insurance |
| Category Label | Auto-filled from category, editable | "Motor", "Elektronik", etc. |
| Brand Label | Text input with datalist suggestions | Honda, Yamaha, Samsung, ASUS, Toyota, LG, ... |
| Provider | Dropdown (loaded from providers table) | Adira Finance / Home Credit / Zurich |

#### Group 3: Financing Terms
| Field | Input Type | Notes |
|-------|-----------|-------|
| Interest Rate (%/bln) | Number input (step 0.01) | Required, e.g. 0.75 |
| Min Tenure (months) | Number input | Required, e.g. 6 |
| Max Tenure (months) | Number input | Required, e.g. 60 |
| Min Loan Amount (Rp) | Currency input with Rp prefix | e.g. 500,000 |
| Max Loan Amount (Rp) | Currency input with Rp prefix | e.g. 200,000,000 |
| Down Payment % | Number input (step 1) | e.g. 0, 10, 20 |
| Monthly From (Rp) | Currency input | Pre-calculated helper shown beside it |

**Monthly From helper:** A small "Calculate" button next to the Monthly From field. Clicking it auto-calculates the minimum monthly installment based on `min_loan`, `down_payment_pct`, `interest_rate`, and `min_tenure` using the standard flat-rate EMI formula:
```
principal = min_loan * (1 - down_payment_pct/100)
monthly_from = principal * (1 + interest_rate/100 * min_tenure) / min_tenure
```

#### Group 4: Display & Marketing
| Field | Input Type | Notes |
|-------|-----------|-------|
| Badge Text | Text input with suggestions | "DP 0%", "Disc 15%", "LOW RATE", "Cair 1 Hari", "0.99%/bln" — suggestion chips shown below |
| Is Featured | Toggle switch | Controls Beranda "Pilihan untukmu" section |

#### Group 5: Availability
| Field | Input Type | Notes |
|-------|-----------|-------|
| Valid Until | Date picker | Leave empty = always valid; shows "Expires in X days" helper |
| Checkout URL | URL input | Override provider URL for this specific offer |

#### Group 6: Live Preview (right panel or bottom)
A small mobile-frame preview that shows:
- How the offer will look as a **mini-card** (Beranda grid)
- How it will look as a **product card** (Produk grid)
- Updates live as fields are edited

#### Form Actions
- **Save** — creates new or updates existing record
- **Save & Add Another** — saves and resets form for next entry
- **Duplicate** — available in edit mode; clones the offer with "(Copy)" suffix
- **Cancel** — discards changes
- **Delete** — available in edit mode; requires confirmation dialog

**Validation:**
- Required field highlighting with inline error messages
- Warn if valid_until is in the past
- Warn if checkout_url is not a valid URL
- Warn if monthly_from seems inconsistent with loan terms (>20% deviation)

### A3. Duplicate Offer

Right-clicking (or clicking the Duplicate button) on any offer creates an identical copy with:
- Title suffixed with " (Copy)"
- `is_featured` set to false
- Opens immediately in edit mode for adjustment

---

## 6. Section B — Providers Management

### B1. Providers List

Card grid layout (one card per provider), showing:
- Provider logo URL (rendered as `<img>` if valid URL, else placeholder)
- Provider name and slug
- Brand colour swatch
- Website URL (clickable link)
- Number of linked offers
- Active/inactive status
- [Edit] [Toggle Active] buttons

### B2. Add / Edit Provider Form

| Field | Input Type | Notes |
|-------|-----------|-------|
| Name | Text | "Adira Finance" |
| Slug | Text (auto-generated from name, editable) | "adira", "home_credit" — used as identifier |
| Logo URL | URL input + preview | Shows `<img>` preview below field |
| Website URL | URL input | Main storefront URL |
| Brand Colour | Colour picker (`<input type="color">`) + hex text input | e.g. #E8281E |
| Description | Textarea | Short description shown in UI |
| Is Active | Toggle | Inactive providers' offers are hidden |

---

## 7. Section C — Employee Codes Management

### C1. Employee Codes Table

| Column | Notes |
|--------|-------|
| Code | e.g. EMP-001001 — monospaced |
| Name | Employee display name |
| Company | Employer / company |
| Status | Active / Inactive toggle (inline) |
| Created At | Date |
| Actions | [Edit] [Deactivate] [Delete] |

**Features:**
- Search by code, name, or company
- Filter by company (dropdown auto-populated from data)
- Filter by active/inactive

### C2. Add / Edit Employee Code Form

| Field | Input Type | Notes |
|-------|-----------|-------|
| Code | Text | Must be unique; auto-generate button (`EMP-XXXXXX`) |
| Name | Text | Employee's full name |
| Company | Text with datalist (existing companies) | |
| Is Active | Toggle | |

**Bulk Import feature:**
A secondary "Bulk Import" button opens a textarea where admins can paste CSV data in the format:
```
code,name,company
EMP-100001,Budi Santoso,PT Mitra Sejahtera
EMP-100002,Siti Rahayu,PT Mitra Sejahtera
```
A preview table is shown before confirming the import. Duplicate codes are flagged with a warning (skip or overwrite option).

### C3. Code Generator

A small utility widget:
- "Generate codes for company" — enter company name + count (e.g. 50)
- Auto-generates codes in sequence: `EMP-100001` → `EMP-100050`
- Previews the list before inserting

---

## 8. Section D — Analytics Dashboard

Read-only view of the `redirect_events` table with aggregations.

### D1. Summary Cards (top row)
- **Total Redirects** — all-time count
- **This Month** — redirects in current calendar month
- **This Week** — redirects in current week
- **Top Offer** — offer with most redirects (name + count)

### D2. Redirects Over Time (line chart)
- X-axis: dates (last 30 days by default)
- Y-axis: redirect count per day
- Rendered using a simple Canvas-based chart (Chart.js via CDN, or pure SVG)
- Toggle: Last 7 days / Last 30 days / Last 90 days

### D3. Offer Leaderboard (table)
| Offer Title | Provider | Category | Total Redirects | Last Redirect |
|-------------|---------|---------|-----------------|--------------|
Sorted by total redirects descending. Click any row to see redirect history for that offer.

### D4. Provider Breakdown (bar or pie chart)
Redirects grouped by provider (Adira vs Home Credit vs Zurich).

### D5. Raw Events Table (bottom, collapsible)
- `offer_id` (resolved to title) | `provider` | `employee_code` | `redirected_at`
- Paginated, newest first
- Exportable as CSV (client-side download, no server needed)

---

## 9. UX Patterns and Interactions

### Notifications / Toast System
- Success toast: "✓ Offer saved" (green, auto-dismiss 3s)
- Error toast: "✗ Failed to save — check your connection" (red, manual dismiss)
- Warning toast: "⚠ Offer valid_until is in the past" (yellow)

Toasts appear in the top-right corner, stack if multiple are shown.

### Confirmation Dialogs
- Deleting an offer: "Delete 'Honda Vario 160 CBS'? This cannot be undone." → [Cancel] [Delete]
- Bulk delete: "Delete 5 offers? This cannot be undone." → [Cancel] [Delete 5]

### Unsaved Changes Warning
If the user has edited a form and tries to navigate away (close panel, switch tab), show a browser-native `beforeunload` warning or an inline modal.

### Loading States
- Table: skeleton rows while fetching
- Form save button: spinner while saving, disabled during request
- Analytics charts: skeleton placeholder while aggregating

### Keyboard Shortcuts
- `Ctrl/Cmd + S` — save current form
- `Escape` — close slide-in panel / modal
- `Ctrl/Cmd + N` — open "Add New Offer" form

---

## 10. Implementation Files

### New Files to Create

| File | Purpose |
|------|---------|
| `src/admin.html` | Admin page HTML shell (desktop layout, separate head/body) |
| `src/admin.js` | Admin app bootstrap, tab routing, Supabase admin client init |
| `src/admin.css` | Desktop-first styles, form layout, table styles, toast/modal |
| `src/admin/offers.js` | Offers list + form module |
| `src/admin/providers.js` | Providers list + form module |
| `src/admin/employees.js` | Employee codes list + form + bulk import |
| `src/admin/analytics.js` | Analytics dashboard, chart rendering |
| `src/admin/components.js` | Shared UI: toast, modal, skeleton, emoji picker |
| `src/admin/supabase.js` | Admin Supabase client (uses service key) |

### Files to Modify

| File | Change |
|------|--------|
| `vite.config.js` | Add `admin: 'src/admin.html'` to `rollupOptions.input` |
| `.env.example` | Add `VITE_SUPABASE_SERVICE_KEY=your_service_key_here` |
| `.env` | Add actual service key (never commit) |

---

## 11. Implementation Order (Recommended)

1. **Config + scaffolding** — `vite.config.js` update, `admin.html` shell, `admin.js` bootstrap, `admin.css` base layout, `admin/supabase.js`
2. **Shared components** — toast notification system, modal/confirmation dialog, skeleton loaders (`admin/components.js`)
3. **Offers list** — read-only table with sort/filter/search (verifies Supabase connection works)
4. **Offers form** — add/edit form with all fields, validation, live preview
5. **Providers section** — simpler than offers, good confidence builder
6. **Employee codes section** — including bulk import and code generator
7. **Analytics section** — last, as it's read-only and relatively self-contained
8. **Polish** — keyboard shortcuts, unsaved changes warning, responsive adjustments

---

## 12. CSS Design Approach

The admin page should feel distinct from the mobile employee app but remain visually coherent.

**Recommended approach:** Keep the same dark theme (`#111111` background, `#E60012` MUFG red accents) but redesign for **desktop widths** (minimum 900px, optimal 1200px). This avoids the need for a separate design language and the dark admin aesthetic is modern and professional.

Key CSS additions needed:
- Two-column `grid` layout (sidebar + main panel)
- `<table>` styling with hover rows, sticky header
- Slide-in panel: fixed right-side drawer, `transform: translateX(100%)` → `translateX(0)`
- Form layout: two-column field grid with labels above inputs
- Toggle switch component
- Toast stack (fixed top-right, `position: fixed; top: 20px; right: 20px`)
- Colour picker with hex preview swatch

---

## 13. Security Reminders

Since there is no login on this page:

1. **Never commit the service key** to git. It should only live in `.env` (already gitignored).
2. **Restrict admin URL at the hosting layer** — for GitHub Pages or Vercel, this means using a deployment protection rule, IP restriction, or moving admin to a separate, access-controlled deployment.
3. Consider adding a simple **environment-variable-based passphrase** check in `admin.js` as a minimum deterrent:
   ```js
   const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET
   if (ADMIN_SECRET && prompt('Enter admin passphrase:') !== ADMIN_SECRET) {
     document.body.innerHTML = '<h1>Access denied</h1>'
     throw new Error('Unauthorised')
   }
   ```
   This is not true security but prevents casual discovery.
4. **Audit log:** The `redirect_events` table already logs clicks. Consider adding a simple `admin_events` table to record admin mutations (who changed what, when) — useful for debugging and accountability.

---

## 14. Quick-Reference: Offers Field Cheat Sheet

For reference during implementation, here are all `offers` table fields and their admin form mappings:

| DB Column | Form Field | Input Type | Required |
|-----------|-----------|-----------|---------|
| `title` | Title | text | ✓ |
| `subtitle` | Subtitle | textarea | — |
| `category` | Category | select | ✓ |
| `category_label` | Category Label | text (auto) | ✓ |
| `product_emoji` | Emoji | emoji picker | ✓ |
| `brand_label` | Brand | text + datalist | — |
| `provider_id` | Provider | select (FK) | ✓ |
| `interest_rate` | Rate (%/bln) | number | ✓ |
| `min_tenure` | Min Tenure (months) | number | ✓ |
| `max_tenure` | Max Tenure (months) | number | ✓ |
| `min_loan` | Min Loan (Rp) | number (currency) | ✓ |
| `max_loan` | Max Loan (Rp) | number (currency) | ✓ |
| `down_payment_pct` | Down Payment % | number | ✓ |
| `badge` | Badge Text | text + suggestions | — |
| `monthly_from` | Monthly From (Rp) | number + calculator | — |
| `is_featured` | Featured | toggle | ✓ |
| `valid_until` | Valid Until | date picker | — |
| `checkout_url` | Checkout URL | url | — |

---

*Plan version 1.0 — ready for implementation.*
