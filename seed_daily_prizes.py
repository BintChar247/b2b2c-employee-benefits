#!/usr/bin/env python3
"""
seed_daily_prizes.py — Seed the daily_prizes table with 8 starter prizes.
Usage: python seed_daily_prizes.py
Requires: VITE_SUPABASE_URL and VITE_SUPABASE_SERVICE_KEY in .env
"""

import os, sys
from pathlib import Path

# Load .env manually (no python-dotenv dependency required)
env_path = Path(__file__).parent / '.env'
if env_path.exists():
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))

try:
    from supabase import create_client
except ImportError:
    sys.exit('supabase-py not installed. Run: pip install supabase')

url = os.environ.get('VITE_SUPABASE_URL', '')
key = os.environ.get('VITE_SUPABASE_SERVICE_KEY') or os.environ.get('VITE_SUPABASE_ANON_KEY', '')

if not url or not key:
    sys.exit('Missing VITE_SUPABASE_URL / VITE_SUPABASE_SERVICE_KEY in .env')

supabase = create_client(url, key)

PRIZES = [
    {
        'label':          'Free Americano',
        'description':    'Valid di semua outlet Kopi Kenangan. Tunjukkan kode ke kasir.',
        'emoji':          '☕',
        'partner_name':   'Kopi Kenangan',
        'partner_url':    'https://www.kopikenangan.com/redeem?code={{code}}',
        'category':       'coffee',
        'color_hex':      '#6F4E37',
        'weight':         20,
        'voucher_prefix': 'MUFG-COFFEE',
        'is_active':      True,
    },
    {
        'label':          'Diskon Rp 15.000 GrabFood',
        'description':    'Min. order Rp 30.000. Berlaku 1x per akun.',
        'emoji':          '🍱',
        'partner_name':   'GrabFood',
        'partner_url':    'https://food.grab.com/promo/{{code}}',
        'category':       'meal',
        'color_hex':      '#00B14F',
        'weight':         20,
        'voucher_prefix': 'MUFG-GRAB',
        'is_active':      True,
    },
    {
        'label':          'Kredit Gojek Rp 10.000',
        'description':    'Berlaku untuk GoRide & GoCar. Min. jarak 3 km.',
        'emoji':          '🛵',
        'partner_name':   'Gojek',
        'partner_url':    'https://www.gojek.com/promo?code={{code}}',
        'category':       'ride',
        'color_hex':      '#00AA5B',
        'weight':         15,
        'voucher_prefix': 'MUFG-RIDE',
        'is_active':      True,
    },
    {
        'label':          'Diskon 10% Alfamart',
        'description':    'Max diskon Rp 20.000. Scan barcode di kasir.',
        'emoji':          '🛒',
        'partner_name':   'Alfamart',
        'partner_url':    'https://www.alfamart.co.id/promo/{{code}}',
        'category':       'grocery',
        'color_hex':      '#E60012',
        'weight':         15,
        'voucher_prefix': 'MUFG-ALFA',
        'is_active':      True,
    },
    {
        'label':          'Cashback Rp 5.000 GoPay',
        'description':    'Berlaku untuk transaksi min. Rp 25.000 via GoPay.',
        'emoji':          '💸',
        'partner_name':   'GoPay',
        'partner_url':    'https://www.gopay.co.id/promo?code={{code}}',
        'category':       'cashback',
        'color_hex':      '#0083CA',
        'weight':         10,
        'voucher_prefix': 'MUFG-PAY',
        'is_active':      True,
    },
    {
        'label':          'Gratis Teleconsult Halodoc',
        'description':    'Konsultasi dokter umum gratis 1x. Valid 24 jam.',
        'emoji':          '🏥',
        'partner_name':   'Halodoc',
        'partner_url':    'https://www.halodoc.com/redeem/{{code}}',
        'category':       'wellness',
        'color_hex':      '#0FAB87',
        'weight':         9,
        'voucher_prefix': 'MUFG-HALO',
        'is_active':      True,
    },
    {
        'label':          'Diskon 5% Produk Portal',
        'description':    'Berlaku untuk semua pengajuan di portal ini. Masukkan kode saat checkout.',
        'emoji':          '🎁',
        'partner_name':   'Portal MUFG',
        'partner_url':    '',
        'category':       'bonus',
        'color_hex':      '#8E44AD',
        'weight':         10,
        'voucher_prefix': 'MUFG-BONUS',
        'is_active':      True,
    },
    {
        'label':          'Makan Siang Gratis s/d Rp 50.000',
        'description':    'Jackpot! Berlaku di GoFood / GrabFood pilihan. 1x per bulan per karyawan.',
        'emoji':          '⭐',
        'partner_name':   'Random Partner',
        'partner_url':    'https://food.grab.com/jackpot?code={{code}}',
        'category':       'jackpot',
        'color_hex':      '#F39C12',
        'weight':         1,
        'voucher_prefix': 'MUFG-JACKPOT',
        'is_active':      True,
    },
]

def run():
    print(f'Seeding {len(PRIZES)} daily prizes…')
    result = supabase.table('daily_prizes').upsert(PRIZES, on_conflict='label').execute()
    if hasattr(result, 'error') and result.error:
        print(f'Error: {result.error}')
        sys.exit(1)
    inserted = len(result.data) if result.data else '?'
    print(f'Done — {inserted} prizes upserted.')

if __name__ == '__main__':
    run()
