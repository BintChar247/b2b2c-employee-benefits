# B2B2C Employee Benefits Portal — Master Plan

> **Framework**: WAT (Workflows · Agents · Tools)
> **Developer**: Claude Code
> **Stack**: Vite + Vanilla JS · Supabase · GitHub · GitHub Pages / Vercel
> **Design Baseline**: Slide 18 mock screens from `B2B2C_Benefits_Portal_Presentation.html`

---

## What We're Building

A **mobile-first web app** that gives employees exclusive access to special financing offers from Adira Finance, Home Credit, and Zurich Insurance. The app is a **discovery and simulation layer only** — actual purchases happen on the provider's own storefront via external redirect.

---

## Design Language (from Mock Screens)

All UI must match the 3 phone mockups on Slide 18 ("Di genggaman setiap karyawan"):

| Token           | Value                                      |
|-----------------|--------------------------------------------|
| Background      | `#111111`                                  |
| Card background | `#1c1c1e`                                  |
| Card border     | `#3a3a3c`                                  |
| Primary accent  | `#E60012` (MUFG Red)                       |
| Blue accent     | `#5E9EFF` (links, data-fill indicators)    |
| Success green   | `#34C759` (Pra-Disetujui badge)            |
| Primary text    | `#ffffff`                                  |
| Muted text      | `#86868b`                                  |
| Header gradient | `linear-gradient(135deg, #1a0005, #2d0008)`|
| Border radius   | `38px` (phone frame) / `12px` (cards) / `9px` (chips) |
| Language        | **Bahasa Indonesia** throughout            |
| Currency        | IDR — abbreviated (`Rp 890rb/bln`, `Rp 1.2jt`) in cards, full in tables |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    PONSEL KARYAWAN                          │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           B2B2C Benefits Portal (PWA)                 │  │
│  │                                                       │  │
│  │  [Login] → [Beranda] → [Produk] → [Detail] → REDIRECT │  │
│  │               ↓                       ↓              │  │
│  │           [Aktif]               [Simulator EMI]      │  │
│  │               ↓                                      │  │
│  │            [Profil]                                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                         │            │                      │
└─────────────────────────┼────────────┼──────────────────────┘
                          ▼            ▼
                   ┌──────────┐   ┌──────────────────────┐
                   │ Supabase │   │  Provider Storefronts │
                   │          │   │  ● adira.co.id        │
                   │ employee │   │  ● homecredit.co.id   │
                   │ _codes   │   │  ● zurich.co.id       │
                   │ offers   │   └──────────────────────┘
                   │ providers│
                   │ redirect │
                   │ _events  │
                   └──────────┘
```

---

## Screen Inventory (from Mock)

| Screen         | Tab         | Mock Reference     | Workflow         |
|----------------|-------------|--------------------|------------------|
| Login          | —           | Pre-login          | 02_employee_auth |
| Beranda        | 🏠 Beranda  | Phone 1 (Discover) | 03_offers_catalog|
| Produk Browse  | 🛍️ Produk   | Phone 2 (Browse)   | 03_offers_catalog|
| Detail Produk  | (overlay)   | Phone 3 (Apply)    | 05_checkout_redirect|
| EMI Simulator  | (overlay)   | —                  | 04_emi_simulator |
| Aktif          | 📋 Aktif    | (Phase 2 placeholder)| —              |
| Profil         | 👤 Profil   | —                  | 02_employee_auth |

---

## Tech Stack

| Layer        | Choice                  | Reason                                         |
|--------------|-------------------------|------------------------------------------------|
| Frontend     | Vite + Vanilla JS       | Zero-config, fast, small bundle for mobile     |
| Styling      | CSS custom (dark theme) | Full control, no framework overrides           |
| Auth         | Supabase (employee code)| Simple lookup, no passwords, RLS security      |
| Database     | Supabase (PostgreSQL)   | Free tier sufficient, real-time ready          |
| Hosting      | GitHub Pages / Vercel   | Free, auto-deploy on push to main              |
| Version Ctrl | GitHub                  | Source of truth + CI/CD                        |

---

## Project Structure (for Claude Code)

```
b2b2c-employee-benefits/
├── workflows/                     ← WAT SOPs (read before coding each feature)
│   ├── 01_setup_environment.md
│   ├── 02_employee_auth.md        ← Dark login + Beranda greeting + Profil tab
│   ├── 03_offers_catalog.md       ← Beranda home + Produk 2-col grid (dark, Bahasa ID)
│   ├── 04_emi_simulator.md        ← EMI calc (dark, IDR rb/jt notation)
│   └── 05_checkout_redirect.md   ← Pre-approved detail screen + redirect
│
├── tools/                         ← Run these scripts for setup & seeding
│   ├── setup_supabase.py          → Outputs SQL schema for Supabase
│   └── seed_offers.py             → Seeds providers, codes, offers
│
├── src/
│   ├── index.html                 ← App shell, single page, dark bg #111
│   ├── app.js                     ← Router / state manager / tab nav
│   ├── auth.js                    ← Login screen + Supabase validation + session
│   ├── offers.js                  ← Beranda + Produk catalog + 2-col grid
│   ├── simulator.js               ← EMI calculator component
│   ├── checkout.js                ← Detail screen + redirect + analytics log
│   └── styles.css                 ← Dark theme CSS (375px base, mobile-first)
│
├── public/
│   └── assets/                    ← Provider logos (SVG preferred)
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql ← Generated by setup_supabase.py
│
├── .env                           ← Local secrets (gitignored)
├── .env.example                   ← Template for team
├── package.json
├── vite.config.js
└── MASTER_PLAN.md                 ← This file
```

---

## Implementation Sequence (for Claude Code)

Follow this order. Each step maps to a workflow file — **read the workflow before coding it**.

### Phase 1 — Foundation
| Step | Task                              | Workflow              | Tool                |
|------|-----------------------------------|-----------------------|---------------------|
| 1    | Create GitHub repo + structure    | 01_setup_environment  | —                   |
| 2    | Set up Supabase tables            | 01_setup_environment  | setup_supabase.py   |
| 3    | Seed demo data                    | 01_setup_environment  | seed_offers.py      |
| 4    | Vite config + dark base CSS/HTML  | 01_setup_environment  | —                   |

### Phase 2 — Auth & Home
| Step | Task                              | Workflow              |
|------|-----------------------------------|-----------------------|
| 5    | Dark login screen (mobile UI)     | 02_employee_auth      |
| 6    | Supabase code validation          | 02_employee_auth      |
| 7    | Session management + Beranda greeting | 02_employee_auth  |
| 8    | Bottom nav (4 tabs) + Profil tab  | 02_employee_auth      |

### Phase 3 — Offers Catalog
| Step | Task                              | Workflow              |
|------|-----------------------------------|-----------------------|
| 9    | Fetch + cache providers & offers  | 03_offers_catalog     |
| 10   | Beranda home screen (Phone 1)     | 03_offers_catalog     |
| 11   | Produk browse screen (Phone 2)    | 03_offers_catalog     |
| 12   | Category/brand filter chips       | 03_offers_catalog     |

### Phase 4 — Detail & Redirect
| Step | Task                              | Workflow              |
|------|-----------------------------------|-----------------------|
| 13   | Pre-approved detail screen (Phone 3) | 05_checkout_redirect|
| 14   | "Ajukan Sekarang" → redirect + UTM | 05_checkout_redirect |
| 15   | Analytics log to Supabase         | 05_checkout_redirect  |

### Phase 5 — EMI Simulator
| Step | Task                              | Workflow              |
|------|-----------------------------------|-----------------------|
| 16   | EMI calculator (dark theme)       | 04_emi_simulator      |
| 17   | Pre-fill from offer card          | 04_emi_simulator      |
| 18   | Amortisation table (collapsible)  | 04_emi_simulator      |

### Phase 6 — Polish & Deploy
| Step | Task                              | Notes                            |
|------|-----------------------------------|----------------------------------|
| 19   | PWA manifest + icons              | Installable on home screen       |
| 20   | Dark skeleton loading screens     | Pulsing dark cards while loading |
| 21   | Error handling + offline state    | Graceful degradation             |
| 22   | Deploy to Vercel / GitHub Pages   | Auto-deploy on push to main      |

---

## Supabase Tables Summary

| Table             | Purpose                                    | RLS                     |
|-------------------|--------------------------------------------|-------------------------|
| `providers`       | Adira, Home Credit, Zurich metadata        | SELECT: open             |
| `employee_codes`  | Valid employee codes + name + company      | SELECT: active only      |
| `offers`          | Special offers with rates, terms, emojis   | SELECT: open             |
| `redirect_events` | Click analytics per offer per employee     | INSERT: open, no SELECT  |

---

## Key UX Principles (from Mock)

1. **Dark and bold** — `#111` bg, MUFG Red highlights. Never use a white theme.
2. **Bahasa Indonesia everywhere** — all labels, placeholders, CTAs, errors.
3. **Speed signal** — "Disetujui dalam 5 menit", "&lt;5 menit discovery ke pengajuan" — reinforce speed throughout.
4. **Pre-approval feel** — show "✓ Pra-Disetujui" badge (green) on detail screen to build confidence even before provider contact.
5. **Discovery, not transaction** — "Ajukan Sekarang →" CTA is explicit that it opens the provider's platform.
6. **Abbreviated IDR in cards** — `Rp 890rb/bln` not `Rp 890.000/bulan` — matches mock style.
7. **Tap targets ≥ 44px** — mobile first, all interactive elements must be thumb-friendly.

---

## Environment Variables

```dotenv
# Required for frontend (public-safe)
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Required for tools/setup_supabase.py and tools/seed_offers.py (server-only)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key   ← NEVER expose in frontend
```

---

## Demo Test Codes (after seed_offers.py)

| Code         | Name               | Company             | Status    |
|--------------|--------------------|---------------------|-----------|
| EMP-001001   | Demo Karyawan 1    | PT Mitra Sejahtera  | ✅ Aktif  |
| EMP-001002   | Demo Karyawan 2    | PT Mitra Sejahtera  | ✅ Aktif  |
| EMP-TEST01   | Test User          | Demo Corp           | ✅ Aktif  |
| EMP-DEACT1   | —                  | PT Old Company      | ❌ Nonaktif |

---

## Provider Redirect Targets

| Provider     | URL                           | Scope                   |
|--------------|-------------------------------|-------------------------|
| Adira        | https://www.adira.co.id       | Pembiayaan kendaraan    |
| Home Credit  | https://www.homecredit.co.id  | Pembiayaan konsumen     |
| Zurich       | https://www.zurich.co.id      | Asuransi (Phase 2)      |

---

*Rencana ini adalah sumber kebenaran utama. Saat ragu, baca ulang SOP workflow yang relevan.*
