# Workflow: 04 — EMI Financing Rate Simulator

## Objective
Provide an interactive, in-app EMI (Equated Monthly Installment) calculator that simulates financing scenarios for Adira (vehicle) and Home Credit (consumer) offers. Simulation only — no actual application or transaction is created in this app.

> **Theme**: Dark — `#111` background, MUFG Red `#E60012` accents, white text
> **Language**: Bahasa Indonesia
> **Currency notation**: Abbreviated IDR in inputs (Rp 890rb/bln) and full IDR in output tables

---

## EMI Formula
```
EMI = P × r × (1 + r)^n / ((1 + r)^n − 1)

Where:
  P = Pokok pinjaman (harga − uang muka)
  r = Bunga bulanan (annual rate / 12 / 100)
  n = Tenor dalam bulan

Special case r = 0 (promo 0% interest):
  EMI = P / n
```

---

## Entry Points
1. **"Simulasi Cicilan" button** on any offer card / detail screen → pre-fills offer's default values
2. **Standalone calculator** accessible from bottom of Produk screen or offer detail

---

## Simulator UI (`simulator.js`) — Dark Theme

### Input Section
```
Background: #111, card bg: #1c1c1e, border: 1px solid #3a3a3c

[ Label ]  "Simulasi Cicilan"  — 12px bold, #fff

[ Harga Produk (IDR) ]
  Input field — bg #2c2c2e, border #3a3a3c, text #fff
  Placeholder: "Masukkan harga produk"
  Helper: "Min Rp 500rb — Maks Rp 2M"  — 7px #86868b

[ Uang Muka (Down Payment) ]
  Slider bar: track bg #3a3a3c, fill #E60012, thumb #E60012
  Left label: "10%"  Right label: "50%"
  Center badge: "20%" — bg #E60012, #fff text (updates live)

[ Tenor Pinjaman ]
  Chip selector (row of tap-targets):
  [ 6 ] [ 12 ] [ 24 ] [ 36 ] [ 48 ] [ 60 ]  (bulan)
  Active chip: bg #E60012, text #fff
  Inactive chip: bg rgba(255,255,255,0.06), text #86868b
  Constrained to offer.min_tenure — offer.max_tenure when pre-filled from offer

[ Suku Bunga (% per bulan) ]
  Input (pre-filled from offer, editable)
  bg #2c2c2e, text #fff
  Helper: "Contoh: 0.99 untuk 0.99%/bulan"

[ Button: "Hitung Cicilan" ]
  bg #E60012, full-width, radius 12px, text #fff bold
  → results update below immediately; button can be optional if live calculation is implemented
```

### Output Section
```
┌────────────────────────────────────────┐
│  Estimasi Cicilan Anda                 │  ← 10px, #86868b, uppercase
│                                        │
│  Cicilan / Bulan       Rp 890.000      │  ← 18px bold, #fff (prominent)
│  ─────────────────────────────────     │
│  Pokok Pinjaman        Rp 27.900.000   │  ← 12px, #fff
│  Uang Muka             Rp 0            │  ← 12px, #fff
│  Total Pembayaran      Rp 32.040.000   │  ← 12px, #fff
│  Total Bunga           Rp 4.140.000    │  ← 12px, #E60012 (highlight cost)
│                                        │
│  ⚠️ Simulasi saja. Bunga final         │  ← 9px, #86868b italic
│     tergantung persetujuan provider.  │
└────────────────────────────────────────┘
```

### Amortisation Table (Collapsible)
Triggered by "Lihat Rincian Cicilan ▾" toggle:

| Bulan | Cicilan | Pokok | Bunga | Sisa |
|-------|---------|-------|-------|------|
| 1 | Rp 890.000 | Rp 610.303 | Rp 279.000 | Rp 27.289.697 |
| … | … | … | … | … |

Table header: bg #1c1c1e, text #86868b
Table rows: alternating bg #111 / #1c1c1e, text #fff

---

## Pre-Fill Logic (when opened from an offer card)
- `interest_rate` ← `offer.interest_rate`
- `down_payment_pct` ← `offer.down_payment_pct` as default (editable)
- Tenure selector ← constrained to `offer.min_tenure`–`offer.max_tenure`
- Loan amount input ← validated within `offer.min_loan`–`offer.max_loan`

---

## Currency Display Rules
```js
// Full IDR format (output tables)
new Intl.NumberFormat('id-ID', {
  style: 'currency', currency: 'IDR', maximumFractionDigits: 0
}).format(amount)
// → "Rp 890.000"

// Abbreviated format (cards and chips — matching mock style)
function formatIDRAbbr(amount) {
  if (amount >= 1_000_000) return `Rp ${(amount/1_000_000).toFixed(1).replace('.0','')  }jt`
  if (amount >= 1_000)     return `Rp ${Math.round(amount/1_000)}rb`
  return `Rp ${amount}`
}
// → "Rp 890rb", "Rp 1.2jt", "Rp 27.9jt"
```

---

## Validation Rules
- Harga produk: min Rp 500.000 — max Rp 2.000.000.000
- Uang muka: min 0% (promo DP 0%) — max 90%
- Tenor: 3 to 60 bulan
- Suku bunga: 0% to 5% per bulan

---

## Expected Output
- Calculator renders correctly on 375px dark background
- Cicilan amount updates in real-time as sliders/chips change
- "Ajukan di [Provider] →" CTA below results → triggers detail screen (Workflow 05)
- Amortisation table collapses cleanly with smooth animation

## Edge Cases
- **DP 0%**: Some Adira/Home Credit promos allow 0% — allow if `offer.down_payment_pct === 0`
- **Bunga 0%**: Promo rate — use `EMI = P / n`
- **Non-numeric input**: Block non-numeric keystrokes; show inline validation in red
- **Large numbers**: IDR format handles billions — test with Rp 2.000.000.000
- **No offer pre-fill**: Use defaults (0.99% rate, 20% DP, 24 bulan) with full editable inputs
