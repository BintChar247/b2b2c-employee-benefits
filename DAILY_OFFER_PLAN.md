# Daily Offer — "Spin & Save" Feature Plan

> **Goal:** Drive daily return visits to the employee benefits portal by giving each user one free spin of a Wheel of Fortune per day — unlocking micro-discounts on everyday items (coffee, meals, rides, groceries). The spin is quick, fun, and creates a habit loop separate from the main financing offers.

---

## 1. Concept & Engagement Mechanics

### Core Loop
1. User opens the app → sees a **"Spin Today's Wheel"** banner on Beranda
2. Taps the banner → Wheel of Fortune animation plays (~3 seconds)
3. Wheel lands on a prize → User receives a **voucher code** with a short expiry (e.g. valid until midnight)
4. User taps "Use Now" → redirected to the partner's redemption URL with the code pre-filled
5. Tomorrow, the wheel resets and they can spin again

### Why It Works
- **One spin per day** — creates a daily reason to open the app
- **Time-limited vouchers** (expire at midnight) — creates urgency
- **Lightweight prizes** (coffee, meals, ride discounts) — low-cost, high-frequency relevance
- **Guaranteed win** — the wheel always gives *something* (worst prize = small discount, best = free item)
- **Streak bonus** — spin 5 days in a row → unlock a bonus prize (shown as a progress bar)

---

## 2. Wheel Prize Categories

### Everyday Prize Types
| Emoji | Category | Example Prize | Example Partner |
|-------|----------|--------------|-----------------|
| ☕ | Coffee | Free Americano | Kopi Kenangan, Fore, Janji Jiwa |
| 🍱 | Meal | Rp 15.000 off GrabFood | GrabFood, GoFood, ShopeeFood |
| 🛵 | Ride | Rp 10.000 Gojek credit | Gojek, Grab |
| 🛒 | Grocery | 10% off Alfamart | Alfamart, Indomaret |
| 🎁 | Bonus | 5% off any portal offer | Internal — applies to financing |
| 💸 | Cashback | Rp 5.000 cashback | GoPay, OVO, Dana |
| 🏥 | Wellness | Free teleconsult | Halodoc, Alodokter |
| ⭐ | Jackpot | Free lunch up to Rp 50.000 | Random partner — rare slot |

### Rarity Tiers
- **Common (60%)** — small discounts: coffee, Rp 5k-10k off meals
- **Uncommon (30%)** — mid-tier: ride credits, grocery discounts
- **Rare (9%)** — cashback, wellness
- **Jackpot (1%)** — free lunch / premium prize

---

## 3. Database Schema

### New Tables

```sql
-- Daily deal prizes (managed by admin)
CREATE TABLE daily_prizes (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  label         text NOT NULL,           -- "Free Americano"
  description   text,                    -- "Valid at Kopi Kenangan outlets"
  emoji         text NOT NULL,           -- "☕"
  partner_name  text,                    -- "Kopi Kenangan"
  partner_url   text,                    -- Redemption URL (with {{code}} placeholder)
  category      text NOT NULL,           -- 'coffee' | 'meal' | 'ride' | 'grocery' | 'cashback' | 'wellness' | 'bonus' | 'jackpot'
  color_hex     text DEFAULT '#E60012',  -- Wheel segment colour
  weight        int DEFAULT 10,          -- Relative probability weight (higher = more likely)
  voucher_prefix text DEFAULT 'MUFG',    -- Code prefix e.g. "MUFG-COFFEE-XXXXXX"
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

-- Each employee's spin history
CREATE TABLE daily_spins (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_code  text NOT NULL,
  prize_id       uuid REFERENCES daily_prizes(id),
  voucher_code   text NOT NULL,           -- Generated unique code e.g. "MUFG-COFFEE-847291"
  spun_at        timestamptz DEFAULT now(),
  expires_at     timestamptz NOT NULL,    -- Typically midnight of the same day (WIB)
  is_used        boolean DEFAULT false,
  used_at        timestamptz,
  streak_day     int DEFAULT 1            -- Day N of consecutive spin streak
);

-- Streak tracking (one row per employee, upserted on each spin)
CREATE TABLE spin_streaks (
  employee_code   text PRIMARY KEY,
  current_streak  int DEFAULT 0,
  longest_streak  int DEFAULT 0,
  last_spin_date  date,
  bonus_unlocked  boolean DEFAULT false,  -- True when streak >= 5
  updated_at      timestamptz DEFAULT now()
);
```

### RLS Policies

```sql
-- Employees can read active prizes (for wheel display)
CREATE POLICY "daily_prizes_read_active"
  ON daily_prizes FOR SELECT USING (is_active = true);

-- Employees can read their own spins only
CREATE POLICY "daily_spins_read_own"
  ON daily_spins FOR SELECT USING (employee_code = current_setting('request.jwt.claims', true)::json->>'employee_code');

-- Employees can insert a spin (rate-limited by app logic to 1/day)
CREATE POLICY "daily_spins_insert"
  ON daily_spins FOR INSERT WITH CHECK (true);

-- Employees can update their own spin (mark as used)
CREATE POLICY "daily_spins_update_own"
  ON daily_spins FOR UPDATE USING (employee_code = current_setting('request.jwt.claims', true)::json->>'employee_code');
```

---

## 4. Frontend Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/daily.js` | Wheel logic, spin animation, voucher display |
| `src/daily.css` | Wheel styles, animation keyframes, voucher card |

### Modified Files

| File | Change |
|------|--------|
| `src/app.js` | Add `'daily'` to screen router; add `dailySpin` state |
| `src/offers.js` | Add Daily Offer banner card to `renderBeranda()` |
| `src/styles.css` | Minor additions for banner card on Beranda |
| `src/admin/daily.js` | New admin section for managing prizes |

---

## 5. UI/UX Design

### 5.1 Beranda Banner Card

Placed **above** the "Pilihan untukmu" section — high-visibility slot.

```
┌──────────────────────────────────────────┐
│  🎡  Daily Spin                    [ ! ] │
│  Putar roda & menangkan hadiah hari ini  │
│                                          │
│  ┌─────────────────────┐  Streak: 🔥3   │
│  │   PUTAR SEKARANG →  │                │
│  └─────────────────────┘                │
└──────────────────────────────────────────┘
```

- **Already spun today:** Banner changes to show the prize won, with a "Use Now" button and a countdown to midnight reset
- **Streak indicator:** Shows flame emoji + current day count (e.g. 🔥3 = 3-day streak)
- **Glow animation** on the button to draw the eye (CSS `box-shadow` pulse)

### 5.2 Wheel of Fortune Screen (`screen: 'daily'`)

Full-screen overlay or dedicated screen (follows app's existing `navigate()` pattern).

```
┌─────────────────────────────┐
│  ← Back        🎡 Daily Spin │
│                              │
│    ┌──────────────────┐      │
│    │    [WHEEL SVG]   │      │  ← 8 coloured segments, rotating
│    │       🔺 pointer │      │
│    └──────────────────┘      │
│                              │
│    ┌──────────────────┐      │
│    │  🎯 PUTAR RODA!  │      │  ← disabled after spin
│    └──────────────────┘      │
│                              │
│  Kamu punya 1 putaran hari ini│
└─────────────────────────────┘
```

**After spin — Result Card:**

```
┌─────────────────────────────┐
│        🎉 Selamat!           │
│                              │
│     ☕ Free Americano        │
│   di Kopi Kenangan           │
│                              │
│  Kode: MUFG-COFFEE-847291    │  ← tap to copy
│  ⏰ Berlaku hingga 23:59     │
│                              │
│  ┌──────────────────────┐    │
│  │    Gunakan Sekarang  │    │  → opens partner URL
│  └──────────────────────┘    │
│  [ Simpan ke Profil ]        │  → saves to 'Aktif' tab
└─────────────────────────────┘
```

### 5.3 Streak Progress Bar

Shown below the result card:

```
Streak kamu: 🔥3 / 5 hari
[■■■□□] — 2 lagi untuk Bonus Prize!
```

On Day 5, a special **Bonus Spin** is awarded (spins a second, premium-only wheel).

### 5.4 Voucher in "Aktif" Tab

The existing "Aktif" tab (currently unused/placeholder) becomes the voucher wallet:
- Lists all vouchers won today and from past 7 days
- Shows status: Active / Used / Expired
- Tap any active voucher → shows the code + "Use Now" button

---

## 6. Spin Logic (Client-Side)

### Weighted Random Selection

```js
function pickPrize(prizes) {
  const totalWeight = prizes.reduce((sum, p) => sum + p.weight, 0)
  let rand = Math.random() * totalWeight
  for (const prize of prizes) {
    rand -= prize.weight
    if (rand <= 0) return prize
  }
  return prizes[prizes.length - 1]
}
```

### One Spin Per Day Enforcement

Checked client-side first (localStorage cache), then verified server-side:

```js
// Check if already spun today (WIB = UTC+7)
async function hasSpunToday(employeeCode) {
  const todayWIB = new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10)
  const { data } = await supabase
    .from('daily_spins')
    .select('id, prize_id, voucher_code, expires_at')
    .eq('employee_code', employeeCode)
    .gte('spun_at', `${todayWIB}T00:00:00+07:00`)
    .limit(1)
  return data?.length > 0 ? data[0] : null
}
```

### Voucher Code Generation

```js
function generateVoucherCode(prefix = 'MUFG') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars
  const rand = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${prefix}-${rand}`
}
```

### Expiry (Midnight WIB)

```js
function getMidnightWIB() {
  const now = new Date()
  const wib = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  wib.setHours(23, 59, 59, 999)
  // Convert back to UTC
  const offsetMs = 7 * 60 * 60 * 1000
  return new Date(wib.getTime() - offsetMs).toISOString()
}
```

---

## 7. Wheel Animation

Pure CSS + JavaScript — no canvas library needed.

### Approach: CSS `transform: rotate()` on an SVG wheel

```js
function spinWheel(targetSegmentIndex, totalSegments, onComplete) {
  const segmentAngle = 360 / totalSegments
  const targetAngle = 360 - (targetSegmentIndex * segmentAngle + segmentAngle / 2)
  const fullRotations = 5 * 360  // 5 full spins before landing
  const finalAngle = fullRotations + targetAngle

  wheelEl.style.transition = 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
  wheelEl.style.transform = `rotate(${finalAngle}deg)`
  setTimeout(onComplete, 3200)
}
```

**Wheel SVG structure:** 8 pie-slice `<path>` elements, each filled with its `color_hex`, with the emoji and label rendered as `<text>` in the centre of each slice. The pointer is a fixed red triangle above the wheel.

**Sound effect (optional):** A short tick sound using the Web Audio API as the wheel spins — creates satisfying feedback without requiring external assets.

---

## 8. Admin Panel Extension

### New Section: "Daily Prizes"

Adds a 5th tab to the existing admin nav: **Offers | Providers | Employees | Analytics | Daily Prizes**

#### Prize List View
- Table showing all prizes: Emoji | Label | Category | Weight | Partner | Active toggle | [Edit] [Delete]
- Weight visualised as a % bar: `weight / totalWeight * 100`
- "Preview Wheel" button: renders a live preview of the wheel with current prizes and weights

#### Add / Edit Prize Form
| Field | Input | Notes |
|-------|-------|-------|
| Label | Text | "Free Americano" |
| Description | Textarea | Terms / where to redeem |
| Emoji | Emoji picker | Same component as offers |
| Category | Select | coffee / meal / ride / grocery / cashback / wellness / jackpot |
| Partner Name | Text | "Kopi Kenangan" |
| Partner URL | URL | Can include `{{code}}` placeholder |
| Wheel Colour | Colour picker | Segment fill colour |
| Weight | Number (1–100) | Higher = appears more often |
| Voucher Prefix | Text | "MUFG-COFFEE" |
| Is Active | Toggle | Inactive prizes excluded from wheel |

#### Analytics Sub-panel
- Total spins this week / this month
- Prize distribution chart (how often each prize was won)
- Voucher redemption rate (used / issued)
- Streak distribution (how many users at 1, 2, 3, 4, 5+ days)

---

## 9. Implementation Order

1. **DB migration** — add `daily_prizes`, `daily_spins`, `spin_streaks` tables + RLS policies (`002_daily_offers.sql`)
2. **Seed prizes** — add 8 starter prizes via `seed_daily_prizes.py` (mirrors existing `seed_offers.py` pattern)
3. **`src/daily.js` + `src/daily.css`** — wheel component, spin logic, voucher card, streak bar
4. **Beranda banner** — integrate into `renderBeranda()` in `offers.js`; show "already spun" state if applicable
5. **Aktif tab** — wire up the voucher wallet view (replaces placeholder tab)
6. **Admin section** — `src/admin/daily.js` — prize CRUD + wheel preview + analytics
7. **Streak bonus** — implement 5-day streak detection and bonus spin unlock
8. **Polish** — wheel sound, confetti animation on rare prizes, share-to-WhatsApp button for jackpot wins

---

## 10. Demo Mode (No Supabase)

When Supabase is not configured, the feature still works in demo mode:
- Uses `localStorage` to track the daily spin state
- Prize pool is hardcoded (same 8 starter prizes)
- Voucher codes are generated client-side but not persisted
- A `[DEMO]` badge appears on the wheel screen

---

## 11. Claude Code Prompt

Paste this into Claude Code to build the feature:

> Read `DAILY_OFFER_PLAN.md` in this project. Then implement the Daily Offer "Spin & Save" feature in this order:
> 1. Create `supabase/migrations/002_daily_offers.sql` with the three new tables (`daily_prizes`, `daily_spins`, `spin_streaks`) and their RLS policies
> 2. Create `seed_daily_prizes.py` seeding 8 starter prizes following the pattern in `seed_offers.py`
> 3. Create `src/daily.js` and `src/daily.css` — the full wheel component with spin animation, weighted prize selection, voucher card, and streak bar
> 4. Update `src/offers.js` → `renderBeranda()` to insert the Daily Spin banner card above the "Pilihan untukmu" section, showing the spin state (unseen / already spun + prize won)
> 5. Update `src/app.js` to add `'daily'` as a valid screen in the router and import `renderDaily` from `daily.js`
> 6. Update `src/styles.css` to add the banner card styles
> 7. Wire up the "Aktif" tab in `app.js` to show the voucher wallet from `daily_spins`
> 8. Add a "Daily Prizes" tab to `src/admin.html` / `src/admin.js` and create `src/admin/daily.js` for prize CRUD and analytics
>
> Use the existing Supabase client from `app.js`. Follow the existing `navigate()` pattern for screen transitions. Keep the same dark theme. Support demo mode via localStorage when Supabase is not configured.

---

*Plan version 1.0 — ready for implementation.*
