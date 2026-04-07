# Workflow: 05 — Pre-Approved Detail Screen & Provider Redirect

## Objective
When an employee taps an offer card, show a **Pre-Approved Detail Screen** that presents full financing terms inline — matching the mock Phone 3. The "Ajukan Sekarang →" button then redirects to the provider's official storefront. All actual purchases and credit applications happen on the provider's platform. This app is the discovery and simulation layer only.

> **Design baseline**: Mock screen Phone 3 (Apply & Approve) from Slide 18 of `B2B2C_Benefits_Portal_Presentation.html`
> **Theme**: Dark — `#111` background, MUFG Red `#E60012` accents, #5E9EFF blue for data-fill indicators
> **Language**: Bahasa Indonesia

---

## Provider Redirect URLs

| Provider     | Default URL                   | Label in app       |
|--------------|-------------------------------|---------------------|
| Adira Finance | https://www.adira.co.id      | "Adira Finance"     |
| Home Credit  | https://www.homecredit.co.id  | "Home Credit"       |
| Zurich       | https://www.zurich.co.id      | "Zurich Insurance"  |

Each offer row in Supabase has a `checkout_url` that overrides the provider default (campaign landing page).

---

## Pre-Approved Detail Screen (Phone 3 layout)

This screen replaces a generic interstitial — it IS the pre-departure experience, showing full terms before the employee commits to redirect.

```
Background: #111

[ Status bar — dark ]  9:41  ●●● ⚡

[ Top header ]
  ← (back arrow, #5E9EFF)   "[Product Name]"  — 11px bold, #fff

[ Product header card — dark red gradient #1a0005 → #2d0008, padding 10px 12px ]
  [ emoji — 28px ]   [ product details ]
    "Honda Vario 160 CBS"         — 10px bold, #fff
    "Pembiayaan via Adira Finance" — 8px, #86868b
    [ ✓ Pra-Disetujui ]            — bg #34C759 (green), 7.5px bold, #fff

[ Terms table — padding 7px 12px, gap 5px ]
  Harga OTR Jakarta  →  Rp 27.900.000
  Uang Muka          →  Rp 0 (DP 0%)        ← value in #E60012 if DP 0% promo
  Cicilan / bulan    →  Rp 890.000
  Tenor              →  36 bulan
  Each row: border-bottom 1px solid #222, pb 4px
  Label: 8px, #86868b | Value: 8px, #fff bold

[ Data auto-fill banner — blue tint ]
  bg rgba(94,158,255,0.10), border rgba(94,158,255,0.22), radius 8px, padding 5px 9px
  ⚡ "Data otomatis terisi"   — 7.5px bold, #5E9EFF
     "Nama, gaji, rekening dari payroll"  — 7px, #86868b

[ CTA Button — "Ajukan Sekarang →" ]
  bg #E60012, radius 12px, padding 9px, text-align center
  "Ajukan Sekarang →"         — 9.5px bold, #fff
  "Disetujui dalam 5 menit"   — 7.5px, rgba(255,255,255,0.75)

[ EMI Simulator link ]
  Below CTA: "Simulasi cicilan lain →"  — 9px, #5E9EFF, opens Workflow 04

[ Bottom Nav — fixed ]
  🏠 Beranda  🛍️ Produk ●  📋 Aktif  👤 Profil
```

---

## Redirect Flow

```
Employee taps "Ajukan Sekarang →"
  └─ Log redirect_event to Supabase (async, non-blocking)
       └─ Determine URL:
            offer.checkout_url exists? → use it
            else → use provider.website_url
       └─ Append UTM params:
            ?utm_source=b2b2c_portal&utm_medium=employee_app&utm_campaign=EMP_BENEFITS_2026
       └─ window.open(url, '_blank', 'noopener,noreferrer')
            → Opens provider site in new tab/browser
            → App stays open in background
```

### iOS Safari Note — Critical
Call `window.open(...)` **synchronously inside the click handler** — do NOT call it after an `await` (Supabase log). Log the event first as a fire-and-forget, then open the URL:
```js
btn.addEventListener('click', () => {
  logRedirectEvent(offerId, employeeCode)  // fire-and-forget, no await
  window.open(checkoutUrl, '_blank', 'noopener,noreferrer')
})
```

---

## Supabase Analytics: `redirect_events`
```sql
CREATE TABLE redirect_events (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id      uuid REFERENCES offers(id),
  provider_id   uuid REFERENCES providers(id),
  employee_code text,
  redirected_at timestamptz DEFAULT now()
);
-- RLS: INSERT open to anon; SELECT restricted to service role
```

Insert a row on every "Ajukan Sekarang" tap. Gives MUFG/B2B2C visibility into which offers drive the most intent.

---

## "Pra-Disetujui" Badge Logic
The green "✓ Pra-Disetujui" badge on the detail screen is a UI signal, not a real credit decision. Display it when:
- `offer.down_payment_pct === 0` (DP 0% promo)
- OR `offer.is_featured === true`

Always pair with the disclaimer in the terms table: the actual approval happens at the provider.

---

## Expected Output
- Tapping any offer card/product opens the detail screen (not a modal — full screen)
- Terms display correctly pre-filled from the offer's Supabase row
- "Ajukan Sekarang →" opens the correct provider URL in a new tab
- Redirect event is logged asynchronously without blocking the UX
- Employee can return to the app (back button / tab switch) after visiting provider

## Edge Cases
- **Provider URL changes**: Update `providers.website_url` in Supabase — no code deploy needed
- **offer.checkout_url missing**: Fall back to `provider.website_url` gracefully
- **Popup blocked (Android/Chrome)**: Show fallback: "Ketuk di sini untuk membuka Adira →" as a visible link
- **Popup blocked (iOS Safari)**: Prevented by synchronous `window.open` in click handler — should not occur
- **Network error on analytics log**: Fail silently — never block redirect for a tracking failure
