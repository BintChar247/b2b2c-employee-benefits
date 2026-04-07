
-- ============================================================
-- B2B2C Employee Benefits Portal — Supabase Schema
-- ============================================================

-- 1. Providers (Adira, Home Credit, Zurich)
CREATE TABLE IF NOT EXISTS providers (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug         text UNIQUE NOT NULL,
  name         text NOT NULL,
  logo_url     text,
  website_url  text NOT NULL,
  color_hex    text DEFAULT '#0066CC',
  description  text,
  is_active    boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

-- 2. Employee Codes
CREATE TABLE IF NOT EXISTS employee_codes (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  code         text UNIQUE NOT NULL,
  name         text,
  company      text,
  is_active    boolean DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

-- 3. Offers
CREATE TABLE IF NOT EXISTS offers (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_id      uuid REFERENCES providers(id) ON DELETE CASCADE,
  title            text NOT NULL,
  subtitle         text,
  category         text CHECK (category IN ('vehicle','electronics','appliance','personal_loan','insurance')),
  category_label   text,               -- "Motor", "Elektronik", "Perabot", "Pinjaman Tunai"
  product_emoji    text,               -- "🏍️" "🛵" "📱" "🚗" used in place of image
  brand_label      text,               -- "Honda", "Yamaha", "Samsung" for filter chips
  interest_rate    numeric(5,2),
  min_tenure       int DEFAULT 6,
  max_tenure       int DEFAULT 60,
  min_loan         numeric(15,2) DEFAULT 500000,
  max_loan         numeric(15,2) DEFAULT 500000000,
  down_payment_pct numeric(5,2) DEFAULT 20,
  badge            text,
  monthly_from     numeric(15,2),      -- pre-calculated lowest monthly installment for display
  is_featured      boolean DEFAULT false,
  valid_until      date,
  checkout_url     text,
  created_at       timestamptz DEFAULT now()
);

-- 4. Redirect Analytics (optional but recommended)
CREATE TABLE IF NOT EXISTS redirect_events (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  offer_id      uuid REFERENCES offers(id),
  provider_id   uuid REFERENCES providers(id),
  employee_code text,
  redirected_at timestamptz DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE providers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_codes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE redirect_events ENABLE ROW LEVEL SECURITY;

-- Providers: public read
CREATE POLICY IF NOT EXISTS "providers_read_all"
  ON providers FOR SELECT USING (true);

-- Employee Codes: anon can check if a code is valid (active only)
CREATE POLICY IF NOT EXISTS "employee_codes_read_active"
  ON employee_codes FOR SELECT USING (is_active = true);

-- Offers: public read
CREATE POLICY IF NOT EXISTS "offers_read_all"
  ON offers FOR SELECT USING (true);

-- Redirect Events: anon can INSERT (log clicks), no SELECT
CREATE POLICY IF NOT EXISTS "redirect_events_insert"
  ON redirect_events FOR INSERT WITH CHECK (true);
