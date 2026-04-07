#!/usr/bin/env python3
"""
Tool: seed_offers.py
Purpose: Seeds Supabase with demo providers, employee codes, and offers
         for the B2B2C Employee Benefits Portal.
Run after setup_supabase.py (Workflow 01).

Usage:
  python tools/seed_offers.py

Requires .env:
  SUPABASE_URL=https://xxxx.supabase.co
  SUPABASE_SERVICE_KEY=your-service-role-key
"""

import os
import sys
import json
import requests
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
    sys.exit(1)

HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=representation",
}


def upsert(table: str, data: list, conflict_col: str = None) -> list:
    """Upsert rows into a Supabase table."""
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    params = {}
    headers = dict(HEADERS)
    if conflict_col:
        headers["Prefer"] = f"resolution=merge-duplicates,return=representation"
        params["on_conflict"] = conflict_col

    resp = requests.post(url, headers=headers, params=params, json=data)
    if resp.status_code not in (200, 201):
        print(f"  ERROR seeding {table}: {resp.status_code} — {resp.text}")
        return []
    return resp.json()


# ============================================================
# SEED DATA
# ============================================================

PROVIDERS = [
    {
        "slug": "adira",
        "name": "Adira Finance",
        "logo_url": "https://www.adira.co.id/favicon.ico",
        "website_url": "https://www.adira.co.id",
        "color_hex": "#E8281E",
        "description": "Indonesia's leading vehicle financing company",
        "is_active": True,
    },
    {
        "slug": "home_credit",
        "name": "Home Credit",
        "logo_url": "https://www.homecredit.co.id/favicon.ico",
        "website_url": "https://www.homecredit.co.id",
        "color_hex": "#E30613",
        "description": "Consumer financing for electronics and appliances",
        "is_active": True,
    },
    {
        "slug": "zurich",
        "name": "Zurich Insurance",
        "logo_url": "https://www.zurich.co.id/favicon.ico",
        "website_url": "https://www.zurich.co.id",
        "color_hex": "#003781",
        "description": "Comprehensive insurance solutions",
        "is_active": True,
    },
]

EMPLOYEE_CODES = [
    {"code": "EMP-001001", "name": "Demo Employee 1",  "company": "PT Mitra Sejahtera",  "is_active": True},
    {"code": "EMP-001002", "name": "Demo Employee 2",  "company": "PT Mitra Sejahtera",  "is_active": True},
    {"code": "EMP-002001", "name": "Demo Employee 3",  "company": "PT Karya Mandiri",    "is_active": True},
    {"code": "EMP-002002", "name": "Demo Employee 4",  "company": "PT Karya Mandiri",    "is_active": True},
    {"code": "EMP-TEST01", "name": "Test User",        "company": "Demo Corp",           "is_active": True},
    {"code": "EMP-DEACT1", "name": "Inactive Employee","company": "PT Old Company",      "is_active": False},
]

# Offers are inserted after providers so we can look up provider IDs
OFFERS_TEMPLATES = [
    # --- ADIRA: Motor ---
    {
        "provider_slug": "adira",
        "title": "Honda Vario 160 CBS",
        "subtitle": "Motor baru cicilan ringan, DP 0% khusus karyawan",
        "category": "vehicle",
        "category_label": "Motor",
        "product_emoji": "🏍️",
        "brand_label": "Honda",
        "interest_rate": 0.75,
        "min_tenure": 12,
        "max_tenure": 48,
        "min_loan": 5_000_000,
        "max_loan": 30_000_000,
        "down_payment_pct": 0,
        "badge": "DP 0%",
        "monthly_from": 890_000,
        "is_featured": True,
        "valid_until": "2026-12-31",
        "checkout_url": "https://www.adira.co.id/produk/kendaraan-bermotor",
    },
    {
        "provider_slug": "adira",
        "title": "Yamaha NMAX Turbo",
        "subtitle": "Motor premium dengan bunga spesial karyawan mitra",
        "category": "vehicle",
        "category_label": "Motor",
        "product_emoji": "🛵",
        "brand_label": "Yamaha",
        "interest_rate": 0.85,
        "min_tenure": 12,
        "max_tenure": 48,
        "min_loan": 8_000_000,
        "max_loan": 35_000_000,
        "down_payment_pct": 10,
        "badge": "Disc 15%",
        "monthly_from": 1_050_000,
        "is_featured": True,
        "valid_until": "2026-12-31",
        "checkout_url": "https://www.adira.co.id/produk/kendaraan-bermotor",
    },
    # --- ADIRA: Mobil ---
    {
        "provider_slug": "adira",
        "title": "Toyota Avanza — Bunga 0.99%",
        "subtitle": "Mobil keluarga terpercaya, bunga terendah khusus karyawan",
        "category": "vehicle",
        "category_label": "Mobil",
        "product_emoji": "🚗",
        "brand_label": "Toyota",
        "interest_rate": 0.99,
        "min_tenure": 24,
        "max_tenure": 60,
        "min_loan": 50_000_000,
        "max_loan": 200_000_000,
        "down_payment_pct": 20,
        "badge": "0.99%/bln",
        "monthly_from": 2_800_000,
        "is_featured": True,
        "valid_until": "2026-12-31",
        "checkout_url": "https://www.adira.co.id/produk/mobil",
    },
    {
        "provider_slug": "adira",
        "title": "Honda HR-V — Promo Karyawan",
        "subtitle": "SUV compact dengan cicilan eksklusif dan tenor panjang",
        "category": "vehicle",
        "category_label": "Mobil",
        "product_emoji": "🚙",
        "brand_label": "Honda",
        "interest_rate": 1.05,
        "min_tenure": 24,
        "max_tenure": 60,
        "min_loan": 100_000_000,
        "max_loan": 350_000_000,
        "down_payment_pct": 20,
        "badge": "LOW RATE",
        "monthly_from": 4_200_000,
        "is_featured": False,
        "valid_until": "2026-12-31",
        "checkout_url": "https://www.adira.co.id/produk/mobil",
    },
    # --- HOME CREDIT: Elektronik ---
    {
        "provider_slug": "home_credit",
        "title": "Samsung Galaxy A55",
        "subtitle": "HP terbaru tanpa uang muka, langsung bawa pulang",
        "category": "electronics",
        "category_label": "Elektronik",
        "product_emoji": "📱",
        "brand_label": "Samsung",
        "interest_rate": 1.49,
        "min_tenure": 3,
        "max_tenure": 24,
        "min_loan": 500_000,
        "max_loan": 15_000_000,
        "down_payment_pct": 0,
        "badge": "0% DP",
        "monthly_from": 650_000,
        "is_featured": True,
        "valid_until": "2026-12-31",
        "checkout_url": "https://www.homecredit.co.id/produk/elektronik",
    },
    {
        "provider_slug": "home_credit",
        "title": "Laptop ASUS ROG — Disc 20%",
        "subtitle": "Laptop gaming & kerja dengan diskon eksklusif karyawan",
        "category": "electronics",
        "category_label": "Elektronik",
        "product_emoji": "💻",
        "brand_label": "ASUS",
        "interest_rate": 0.99,
        "min_tenure": 6,
        "max_tenure": 24,
        "min_loan": 3_000_000,
        "max_loan": 20_000_000,
        "down_payment_pct": 0,
        "badge": "Disc 20%",
        "monthly_from": 890_000,
        "is_featured": True,
        "valid_until": "2026-12-31",
        "checkout_url": "https://www.homecredit.co.id/produk/elektronik",
    },
    # --- HOME CREDIT: Perabot ---
    {
        "provider_slug": "home_credit",
        "title": "AC Samsung WindFree",
        "subtitle": "AC inverter hemat energi, bunga flat 0.99% per bulan",
        "category": "appliance",
        "category_label": "Perabot",
        "product_emoji": "❄️",
        "brand_label": "Samsung",
        "interest_rate": 0.99,
        "min_tenure": 6,
        "max_tenure": 36,
        "min_loan": 1_000_000,
        "max_loan": 20_000_000,
        "down_payment_pct": 10,
        "badge": "FLAT 0.99%",
        "monthly_from": 420_000,
        "is_featured": False,
        "valid_until": "2026-12-31",
        "checkout_url": "https://www.homecredit.co.id/produk/perabot",
    },
    # --- HOME CREDIT: Pinjaman Tunai ---
    {
        "provider_slug": "home_credit",
        "title": "Pinjaman Tunai Karyawan",
        "subtitle": "Dana tunai cair dalam 1 hari, hingga Rp 40 juta",
        "category": "personal_loan",
        "category_label": "Pinjaman",
        "product_emoji": "💰",
        "brand_label": None,
        "interest_rate": 1.75,
        "min_tenure": 6,
        "max_tenure": 30,
        "min_loan": 2_000_000,
        "max_loan": 40_000_000,
        "down_payment_pct": 0,
        "badge": "Cair 1 Hari",
        "monthly_from": 750_000,
        "is_featured": False,
        "valid_until": "2026-12-31",
        "checkout_url": "https://www.homecredit.co.id/produk/pinjaman-tunai",
    },
]


def main():
    print("=" * 60)
    print("B2B2C Benefits Portal — Seeding Data")
    print("=" * 60)

    # 1. Seed Providers
    print("\n[1/3] Seeding providers...")
    provider_rows = upsert("providers", PROVIDERS, conflict_col="slug")
    provider_map = {p["slug"]: p["id"] for p in provider_rows}
    print(f"  ✅ {len(provider_rows)} providers seeded: {list(provider_map.keys())}")

    # 2. Seed Employee Codes
    print("\n[2/3] Seeding employee codes...")
    code_rows = upsert("employee_codes", EMPLOYEE_CODES, conflict_col="code")
    print(f"  ✅ {len(code_rows)} employee codes seeded")
    print("  Test codes: EMP-001001, EMP-001002, EMP-TEST01")

    # 3. Seed Offers
    print("\n[3/3] Seeding offers...")
    if not provider_map:
        print("  ERROR: No provider IDs found — did providers seed correctly?")
        sys.exit(1)

    offers_to_insert = []
    for tmpl in OFFERS_TEMPLATES:
        slug = tmpl.pop("provider_slug")
        provider_id = provider_map.get(slug)
        if not provider_id:
            print(f"  WARN: Provider slug '{slug}' not found — skipping offer: {tmpl['title']}")
            continue
        tmpl["provider_id"] = provider_id
        offers_to_insert.append(tmpl)

    offer_rows = upsert("offers", offers_to_insert)
    print(f"  ✅ {len(offer_rows)} offers seeded")

    print("\n" + "=" * 60)
    print("✅ SEED COMPLETE")
    print("=" * 60)
    print()
    print("Valid test employee codes:")
    for ec in EMPLOYEE_CODES:
        status = "✅ active" if ec["is_active"] else "❌ inactive"
        print(f"  {ec['code']:15s}  {ec['name']:20s}  {status}")
    print()
    print("Next step: npm run dev")


if __name__ == "__main__":
    main()
