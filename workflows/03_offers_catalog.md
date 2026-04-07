# Workflow: 03 — Offers Catalog

## Objective
Display employee-exclusive special offers from Adira Finance (vehicle financing) and Home Credit (consumer financing) across two main screens: **Beranda** (home/discovery) and **Produk** (product browse). The catalog is read-only — no transactions occur in this app.

> **Design baseline**: Mock screens Phone 1 (Discover) and Phone 2 (Browse) from Slide 18 of `B2B2C_Benefits_Portal_Presentation.html`
> **Theme**: Dark — `#111` background, MUFG Red `#E60012` accents, white text
> **Language**: Bahasa Indonesia

---

## Supabase Tables

### `providers`
```sql
CREATE TABLE providers (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug        text UNIQUE NOT NULL,   -- 'adira' | 'home_credit' | 'zurich'
  name        text NOT NULL,          -- "Adira Finance"
  logo_url    text,
  website_url text NOT NULL,          -- Redirect target for checkout
  color_hex   text,                   -- Brand colour for UI chips
  description text
);
```

### `offers`
```sql
CREATE TABLE offers (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id      uuid REFERENCES providers(id),
  title            text NOT NULL,
  subtitle         text,
  category         text,               -- 'vehicle' | 'electronics' | 'appliance' | 'personal_loan'
  category_label   text,               -- "Motor", "Elektronik", "Perabot", "Pinjaman Tunai"
  product_emoji    text,               -- "🏍️" "🛵" "📱" "🚗" — used in place of image
  brand_label      text,               -- "Honda", "Yamaha", "Samsung" — for filter chips
  interest_rate    numeric(5,2),       -- e.g. 0.99 for 0.99% per month
  min_tenure       int,
  max_tenure       int,
  min_loan         numeric(15,2),
  max_loan         numeric(15,2),
  down_payment_pct numeric(5,2),
  badge            text,               -- e.g. "DP 0%", "Disc 15%", "0%/12bln"
  monthly_from     numeric(15,2),      -- pre-calculated lowest monthly installment for display
  is_featured      boolean DEFAULT false,
  valid_until      date,
  checkout_url     text,
  created_at       timestamptz DEFAULT now()
);
```

RLS: SELECT open to all authenticated sessions (app-level auth via sessionStorage).

---

## Screen 1: Beranda (Home / Discovery)

Rendered when `Beranda` tab is active. Matches mock Phone 1.

### Layout
```
[ Status bar — dark ]

[ Header — dark red gradient: #1a0005 → #2d0008, padding 10px 12px ]
  "Selamat pagi 👋"           9.5px, #86868b
  "[Employee Name]"           12px bold, #fff
  [ 💰 Rp Xjt savings ]  [ X Pra-disetujui ●● ]
  ↑ savings badge: bg rgba(0,0,0,0.09), text #E60012
  ↑ pre-approval badge: bg #E60012, text #fff

[ Search bar — pill ]
  🔍 "Cari produk..."  bg rgba(0,0,0,0.06), border-radius 9px

[ Category chips — horizontal scroll, no wrap ]
  [Motor ●active] [Elektronik] [Kesehatan] [+6]
  Active: bg #E60012, text #fff
  Inactive: bg rgba(0,0,0,0.06), text #aaa

[ Section header ]
  "✨ Pilihan untukmu" — 8.5px bold, #fff, left
  "Lihat semua →"    — 7.5px, #5E9EFF, right

[ Featured mini-cards — 2 columns ]
  ┌──────────────┐ ┌──────────────┐
  │ 🏍️           │ │ 📱           │
  │ Honda Vario  │ │ Samsung A55  │
  │ DP 0% · Adira│ │ Disc 20% · HC│
  └──────────────┘ └──────────────┘
  Left card: bg rgba(230,0,18,0.12), border rgba(230,0,18,0.28)
  Right card: bg rgba(191,90,242,0.12), border rgba(191,90,242,0.28)

[ Featured offer banner — full width ]
  bg rgba(230,0,18,0.14), border rgba(230,0,18,0.22)
  Left: badge "Terbatas", product name, installment "Rp 890rb/bln"
  Right: "Ajukan" button — bg #E60012, radius 7px

[ Bottom Nav — fixed 48px ]
  🏠 Beranda ●  🛍️ Produk  📋 Aktif  👤 Profil
```

### Pre-Approval Badge Logic
Count offers where `is_featured = true` and `down_payment_pct = 0` as "pre-approved" for display purposes (this is a UI flourish — actual pre-approval happens at the provider).

---

## Screen 2: Produk (Browse / Catalog)

Rendered when `Produk` tab is active. Matches mock Phone 2.

### Layout
```
[ Status bar — dark ]

[ Page header — dark ]
  ← (back-styled, #5E9EFF)   "Motor & Mobil"   "Filter" (right, #86868b)

[ Filter chips — horizontal scroll ]
  [Semua ●active] [Honda] [Yamaha] [DP 0%]
  Active: bg #E60012, radius 7px, text #fff bold
  Inactive: bg rgba(0,0,0,0.06), radius 7px, text #aaa

[ 2-Column Offer Grid ]
  ┌─────────────────┐ ┌─────────────────┐
  │ [emoji — 18px]  │ │ [emoji — 18px]  │
  │ Product name    │ │ Product name    │
  │ DP 0%           │ │ Disc 15%        │
  │ Rp 890rb/bln    │ │ Rp 650rb/bln    │
  │ [Adira chip ↗]  │ │ [Adira chip ↗]  │
  └─────────────────┘ └─────────────────┘

  Card: bg rgba(230,0,18,0.10), border rgba(230,0,18,0.18), radius 9px, padding 7px
  Provider chip (top-right): bg #E60012, radius 3px, 5.5px white text — "Adira" or "HC"
  Product name: 7.5px bold, #fff
  Badge (DP 0%): 7px, #E60012
  Monthly: 7px, #86868b

[ Wide-format card — spans both columns ]
  For cars/premium items: flex row with emoji + name + badge + "Lihat" button
  bg rgba(230,0,18,0.10), "Lihat" button bg #E60012

[ Bottom Nav — fixed ]
  🏠 Beranda  🛍️ Produk ●  📋 Aktif  👤 Profil
```

### Tab & Filter Chip Logic
- **Top-level tabs** (bottom nav): Beranda / Produk / Aktif / Profil
- **Produk screen filter chips**: populated dynamically from `offers.brand_label` + "Semua" + "DP 0%"
- **Category switcher** (Beranda chips): maps to `offers.category` — tap "Motor" shows only vehicle offers on Beranda

### Aktif Tab (Placeholder for Phase 2)
Shows a "Belum ada produk aktif" empty state with a CTA to browse Produk. Full active-products tracking is out of scope for Phase 1 (all transactions happen at provider).

### Profil Tab
Shows:
- Employee code and name from session
- Company name
- App version
- "Keluar" (logout) button

---

## Data Loading Strategy
1. On app load (post-auth), fetch all providers and offers in a single Supabase query with JOIN
2. Cache result in `sessionStorage` as `offers_cache` — avoids re-fetching on tab switches
3. Show skeleton loading cards (dark, pulsing) while data loads
4. Client-side filtering for tabs/chips — no re-fetch needed

### Display Format for Installment Amounts
Use abbreviated IDR notation matching the mock:
- < 1,000,000 → "Rp 890rb/bln"
- ≥ 1,000,000 → "Rp 1.2jt/bln"
- Full amount in detail screen → "Rp 27.900.000"

---

## Expected Output
- Beranda loads within 1-2s on mobile with employee greeting and featured offers
- Category chips filter featured offers on Beranda instantly (client-side)
- Produk tab shows 2-column grid with provider badges
- Filter chips on Produk filter by brand/DP 0% instantly (client-side)
- Tapping any offer card opens the Pre-Approved Detail screen (Workflow 05)

## Edge Cases
- **No offers available**: "Belum ada penawaran saat ini — cek kembali besok" with provider logos
- **Expired offers** (`valid_until < today`): Hide from catalog, handle in seed/admin
- **Missing emoji**: Fall back to category emoji (🚗 for vehicle, 📱 for electronics)
- **Slow connection**: Show dark skeleton cards, not blank space
- **Long product name**: Truncate to 2 lines with ellipsis
