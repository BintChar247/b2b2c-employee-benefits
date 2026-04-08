-- ============================================================
-- B2B2C Employee Benefits Portal — Daily Offer "Spin & Save"
-- Migration 002
-- ============================================================

-- Daily deal prizes (managed by admin)
CREATE TABLE IF NOT EXISTS daily_prizes (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  label          text NOT NULL,
  description    text,
  emoji          text NOT NULL,
  partner_name   text,
  partner_url    text,
  category       text NOT NULL CHECK (category IN ('coffee','meal','ride','grocery','cashback','wellness','bonus','jackpot')),
  color_hex      text DEFAULT '#E60012',
  weight         int DEFAULT 10,
  voucher_prefix text DEFAULT 'MUFG',
  is_active      boolean DEFAULT true,
  created_at     timestamptz DEFAULT now()
);

-- Each employee's spin history
CREATE TABLE IF NOT EXISTS daily_spins (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_code  text NOT NULL,
  prize_id       uuid REFERENCES daily_prizes(id),
  voucher_code   text NOT NULL,
  spun_at        timestamptz DEFAULT now(),
  expires_at     timestamptz NOT NULL,
  is_used        boolean DEFAULT false,
  used_at        timestamptz,
  streak_day     int DEFAULT 1
);

-- Streak tracking (one row per employee, upserted on each spin)
CREATE TABLE IF NOT EXISTS spin_streaks (
  employee_code   text PRIMARY KEY,
  current_streak  int DEFAULT 0,
  longest_streak  int DEFAULT 0,
  last_spin_date  date,
  bonus_unlocked  boolean DEFAULT false,
  updated_at      timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS daily_spins_employee_code_idx ON daily_spins (employee_code);
CREATE INDEX IF NOT EXISTS daily_spins_spun_at_idx ON daily_spins (spun_at DESC);

-- ── RLS ──────────────────────────────────────────────────────

ALTER TABLE daily_prizes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_spins   ENABLE ROW LEVEL SECURITY;
ALTER TABLE spin_streaks  ENABLE ROW LEVEL SECURITY;

-- Employees can read active prizes
CREATE POLICY "daily_prizes_read_active"
  ON daily_prizes FOR SELECT USING (is_active = true);

-- Admin full access to prizes
CREATE POLICY "daily_prizes_admin_all"
  ON daily_prizes FOR ALL USING (true);

-- Employees can read their own spins
CREATE POLICY "daily_spins_read_own"
  ON daily_spins FOR SELECT
  USING (employee_code = current_setting('request.jwt.claims', true)::json->>'employee_code');

-- Employees can insert spins
CREATE POLICY "daily_spins_insert"
  ON daily_spins FOR INSERT WITH CHECK (true);

-- Employees can update their own spin (mark used)
CREATE POLICY "daily_spins_update_own"
  ON daily_spins FOR UPDATE
  USING (employee_code = current_setting('request.jwt.claims', true)::json->>'employee_code');

-- Streak: read/upsert own row
CREATE POLICY "spin_streaks_own"
  ON spin_streaks FOR ALL
  USING (employee_code = current_setting('request.jwt.claims', true)::json->>'employee_code');
