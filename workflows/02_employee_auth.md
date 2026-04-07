# Workflow: 02 — Employee Code Authentication

## Objective
Allow employees to log in using a unique employee code. Validate the code against the Supabase `employee_codes` table. On success, navigate to the personalized Beranda (home) screen, which greets the employee by name. No passwords required.

> **Design baseline**: Mock screen from Slide 18 of `B2B2C_Benefits_Portal_Presentation.html`
> **Theme**: Dark — `#111` background, MUFG Red `#E60012` accents, white text
> **Language**: Bahasa Indonesia

---

## Supabase Table: `employee_codes`
```sql
CREATE TABLE employee_codes (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code        text UNIQUE NOT NULL,          -- e.g. "EMP-001234"
  name        text,                          -- employee display name (e.g. "Budi Santoso")
  company     text,                          -- employer company name
  is_active   boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
```

Row Level Security (RLS): enabled. Anon users can SELECT only where `is_active = true`.

---

## Auth Flow (Frontend: `auth.js`)

```
[ Login Screen ]
   └─ Karyawan enters code → tap "Akses Penawaran Saya"
        └─ Query Supabase: SELECT * FROM employee_codes WHERE code = $input AND is_active = true
             ├─ FOUND → store { code, name, company } in sessionStorage
             │            → navigate to Beranda (home screen)
             │            → Beranda shows "Selamat pagi 👋 [name]"
             └─ NOT FOUND → inline error "Kode tidak dikenali. Hubungi HR Anda."
```

### Session Persistence
- Store auth state in `sessionStorage` (clears on tab close — no persistent login)
- On every route load, check `sessionStorage` for `emp_session`
- If no session → redirect to login screen
- If session valid → Beranda loads with employee's name pre-filled in greeting

### Session Object (sessionStorage key: `emp_session`)
```json
{
  "code": "EMP-001001",
  "name": "Budi Santoso",
  "company": "PT Mitra Sejahtera"
}
```

### Logout
- Clear `sessionStorage.removeItem('emp_session')`
- Redirect to login screen
- Accessible from Profil tab → "Keluar"

---

## UI Spec — Login Screen (Mobile-First, Dark Theme)

```
Background: #111111 (full screen)

[ Portal Logo — centered, top 1/3 ]

[ Tagline ]
  "Akses penawaran eksklusif karyawan"
  font: 13px, color: #86868b

[ Input ]
  placeholder: "Masukkan Kode Karyawan"
  style: background #1c1c1e, border 1px solid #3a3a3c, text white
  auto-trim, auto-uppercase on input

[ CTA Button ]
  "Akses Penawaran Saya →"
  background: #E60012, color: #fff, full-width, border-radius 12px
  loading state: spinner while Supabase query in flight

[ Error State ]
  inline below input: "Kode tidak dikenali. Hubungi HR Anda."
  color: #FF453A (system red), no page reload

[ Footer ]
  "Program eksklusif untuk karyawan mitra terdaftar"
  font: 11px, color: #86868b
```

---

## Post-Login: Beranda Home Screen (from Mock)

After successful login the app navigates to the Beranda tab. The home screen (as per mock Phone 1) renders:

```
[ Status bar — dark ]  9:41  ●●● ⚡

[ Header card — dark red gradient #1a0005 → #2d0008 ]
  "Selamat pagi 👋"        ← grey, 9.5px
  "[Employee Name]"        ← white, bold 12px
  [ Rp savings badge ]  [ X Pra-disetujui badge (red) ]

[ Search bar ]
  🔍 "Cari produk..."  — dark pill bg

[ Category chips — horizontal scroll ]
  [Motor ●] [Elektronik] [Kesehatan] [+6]
  Active chip: #E60012 bg, white text
  Inactive chip: rgba(0,0,0,0.06) bg, #aaa text

[ Section: "✨ Pilihan untukmu" ]
  2-column mini cards — featured offers

[ Featured offer banner ]
  Product name, installment amount, "Ajukan" button

[ Bottom Nav — fixed ]
  🏠 Beranda  🛍️ Produk  📋 Aktif  👤 Profil
  Active tab text: #E60012
```

---

## Security Notes
- Use Supabase anon key (public-safe) — RLS prevents data leakage
- Never expose service role key in frontend
- Employee codes are case-insensitive — normalize to `input.trim().toUpperCase()` before querying
- Inactive codes (`is_active = false`) return the same "not recognised" message — do not reveal reason

---

## Expected Output
- Login screen renders on 375px dark background
- Valid code → session set → Beranda loads with employee name in greeting
- Invalid/inactive code → inline red error, no navigation
- Refresh with valid session → stays on last active tab

## Edge Cases
- **Supabase down**: "Layanan sementara tidak tersedia. Silakan coba lagi."
- **Empty input**: Disable CTA button until `input.length >= 3`
- **Copy-paste with whitespace**: `input.trim().toUpperCase()` before querying
- **Deactivated code**: Same error as invalid — never reveal `is_active` state
