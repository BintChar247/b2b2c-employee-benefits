/**
 * offers.js — Beranda (home) + Produk (catalog) screens
 * Workflow: 03_offers_catalog
 */

import { supabase, state, navigate, esc, toggleTheme, getTheme } from './app.js'
import { getDailySpinState } from './daily.js'

// ============================================================
// Demo offers — used when Supabase is not configured
// ============================================================
const DEMO_OFFERS = [
  {
    id: 'demo-1',
    title: 'Honda Vario 160 CBS',
    subtitle: 'Motor baru cicilan ringan, DP 0% khusus karyawan',
    category: 'vehicle', category_label: 'Motor',
    product_emoji: '🏍️', brand_label: 'Honda',
    interest_rate: 0.75, min_tenure: 12, max_tenure: 48,
    min_loan: 5000000, max_loan: 30000000,
    down_payment_pct: 0, badge: 'DP 0%', monthly_from: 890000,
    is_featured: true, valid_until: '2026-12-31',
    checkout_url: 'https://www.adira.co.id/produk/kendaraan-bermotor',
    providers: { slug: 'adira', name: 'Adira Finance', website_url: 'https://www.adira.co.id', color_hex: '#E8281E' },
  },
  {
    id: 'demo-2',
    title: 'Yamaha NMAX Turbo',
    subtitle: 'Motor premium dengan bunga spesial karyawan mitra',
    category: 'vehicle', category_label: 'Motor',
    product_emoji: '🛵', brand_label: 'Yamaha',
    interest_rate: 0.85, min_tenure: 12, max_tenure: 48,
    min_loan: 8000000, max_loan: 35000000,
    down_payment_pct: 10, badge: 'Disc 15%', monthly_from: 1050000,
    is_featured: true, valid_until: '2026-12-31',
    checkout_url: 'https://www.adira.co.id/produk/kendaraan-bermotor',
    providers: { slug: 'adira', name: 'Adira Finance', website_url: 'https://www.adira.co.id', color_hex: '#E8281E' },
  },
  {
    id: 'demo-3',
    title: 'Toyota Avanza — Bunga 0.99%',
    subtitle: 'Mobil keluarga terpercaya, bunga terendah khusus karyawan',
    category: 'vehicle', category_label: 'Mobil',
    product_emoji: '🚗', brand_label: 'Toyota',
    interest_rate: 0.99, min_tenure: 24, max_tenure: 60,
    min_loan: 50000000, max_loan: 200000000,
    down_payment_pct: 20, badge: '0.99%/bln', monthly_from: 2800000,
    is_featured: true, valid_until: '2026-12-31',
    checkout_url: 'https://www.adira.co.id/produk/mobil',
    providers: { slug: 'adira', name: 'Adira Finance', website_url: 'https://www.adira.co.id', color_hex: '#E8281E' },
  },
  {
    id: 'demo-4',
    title: 'Samsung Galaxy A55',
    subtitle: 'HP terbaru tanpa uang muka, langsung bawa pulang',
    category: 'electronics', category_label: 'Elektronik',
    product_emoji: '📱', brand_label: 'Samsung',
    interest_rate: 1.49, min_tenure: 3, max_tenure: 24,
    min_loan: 500000, max_loan: 15000000,
    down_payment_pct: 0, badge: '0% DP', monthly_from: 650000,
    is_featured: true, valid_until: '2026-12-31',
    checkout_url: 'https://www.homecredit.co.id/produk/elektronik',
    providers: { slug: 'home_credit', name: 'Home Credit', website_url: 'https://www.homecredit.co.id', color_hex: '#E30613' },
  },
  {
    id: 'demo-5',
    title: 'Laptop ASUS ROG — Disc 20%',
    subtitle: 'Laptop gaming & kerja dengan diskon eksklusif karyawan',
    category: 'electronics', category_label: 'Elektronik',
    product_emoji: '💻', brand_label: 'ASUS',
    interest_rate: 0.99, min_tenure: 6, max_tenure: 24,
    min_loan: 3000000, max_loan: 20000000,
    down_payment_pct: 0, badge: 'Disc 20%', monthly_from: 890000,
    is_featured: true, valid_until: '2026-12-31',
    checkout_url: 'https://www.homecredit.co.id/produk/elektronik',
    providers: { slug: 'home_credit', name: 'Home Credit', website_url: 'https://www.homecredit.co.id', color_hex: '#E30613' },
  },
  {
    id: 'demo-6',
    title: 'AC Samsung WindFree',
    subtitle: 'AC inverter hemat energi, bunga flat 0.99% per bulan',
    category: 'appliance', category_label: 'Perabot',
    product_emoji: '❄️', brand_label: 'Samsung',
    interest_rate: 0.99, min_tenure: 6, max_tenure: 36,
    min_loan: 1000000, max_loan: 20000000,
    down_payment_pct: 10, badge: 'FLAT 0.99%', monthly_from: 420000,
    is_featured: false, valid_until: '2026-12-31',
    checkout_url: 'https://www.homecredit.co.id/produk/perabot',
    providers: { slug: 'home_credit', name: 'Home Credit', website_url: 'https://www.homecredit.co.id', color_hex: '#E30613' },
  },
  {
    id: 'demo-7',
    title: 'Pinjaman Tunai Karyawan',
    subtitle: 'Dana tunai cair dalam 1 hari, hingga Rp 40 juta',
    category: 'personal_loan', category_label: 'Pinjaman',
    product_emoji: '💰', brand_label: null,
    interest_rate: 1.75, min_tenure: 6, max_tenure: 30,
    min_loan: 2000000, max_loan: 40000000,
    down_payment_pct: 0, badge: 'Cair 1 Hari', monthly_from: 750000,
    is_featured: false, valid_until: '2026-12-31',
    checkout_url: 'https://www.homecredit.co.id/produk/pinjaman-tunai',
    providers: { slug: 'home_credit', name: 'Home Credit', website_url: 'https://www.homecredit.co.id', color_hex: '#E30613' },
  },
  {
    id: 'demo-8',
    title: 'Honda HR-V — Promo Karyawan',
    subtitle: 'SUV compact dengan cicilan eksklusif dan tenor panjang',
    category: 'vehicle', category_label: 'Mobil',
    product_emoji: '🚙', brand_label: 'Honda',
    interest_rate: 1.05, min_tenure: 24, max_tenure: 60,
    min_loan: 100000000, max_loan: 350000000,
    down_payment_pct: 20, badge: 'LOW RATE', monthly_from: 4200000,
    is_featured: false, valid_until: '2026-12-31',
    checkout_url: 'https://www.adira.co.id/produk/mobil',
    providers: { slug: 'adira', name: 'Adira Finance', website_url: 'https://www.adira.co.id', color_hex: '#E8281E' },
  },
]

// ============================================================
// IDR formatting helpers (from Workflow 04 spec)
// ============================================================
export function formatIDRAbbr(amount) {
  if (!amount) return 'Rp 0'
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(1).replace('.0', '')}jt`
  if (amount >= 1_000)     return `Rp ${Math.round(amount / 1_000)}rb`
  return `Rp ${amount}`
}

export function formatIDRFull(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount || 0)
}

// ============================================================
// Data loading
// ============================================================
export async function loadOffers() {
  if (state.offersLoaded) return

  // Try sessionStorage cache first
  try {
    const cached = sessionStorage.getItem('offers_cache')
    if (cached) {
      const parsed = JSON.parse(cached)
      state.offers = parsed
      state.offersLoaded = true
      return
    }
  } catch (_) { /* ignore */ }

  if (!supabase) {
    state.offers = DEMO_OFFERS
    state.offersLoaded = true
    return
  }

  try {
    const today = new Date().toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('offers')
      .select('*, providers(*)')
      .or(`valid_until.is.null,valid_until.gte.${today}`)
      .order('is_featured', { ascending: false })

    if (error) throw error
    state.offers = data || []
    state.offersLoaded = true
    sessionStorage.setItem('offers_cache', JSON.stringify(state.offers))
  } catch (err) {
    console.error('[offers] Load failed, using demo data:', err)
    state.offers = DEMO_OFFERS
    state.offersLoaded = true
  }
}

// ============================================================
// Category definitions
// ============================================================
const CATEGORIES = [
  { id: 'all',          label: 'Semua ●' },
  { id: 'vehicle',      label: 'Motor' },
  { id: 'electronics',  label: 'Elektronik' },
  { id: 'appliance',    label: 'Perabot' },
  { id: 'personal_loan',label: 'Pinjaman' },
]

// ============================================================
// BERANDA SCREEN (Phone 1 layout)
// ============================================================
export function renderBeranda(el) {
  const session = state.session || {}
  const offers   = state.offers
  const category = state.activeCategory || 'all'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Selamat pagi 👋' : hour < 17 ? 'Selamat siang 👋' : 'Selamat malam 👋'

  // Pre-approval count: featured offers with DP 0%
  const preapprovalCount = offers.filter(o => o.is_featured && o.down_payment_pct === 0).length || 3

  // Filtered offers for mini-grid
  const filteredOffers = category === 'all'
    ? offers
    : offers.filter(o => o.category === category)

  const featuredOffers = filteredOffers.filter(o => o.is_featured).slice(0, 4)
  const topBannerOffer = offers.find(o => o.is_featured && o.category === 'vehicle') || offers[0]

  el.innerHTML = `
    <div class="status-bar">
      <span>9:41</span>
      <span class="status-icons">●●● ⚡</span>
    </div>

    <div class="home-header">
      <div class="home-header-top">
        <div>
          <div class="home-greeting">${greeting}</div>
          <div class="home-name">${esc(session.name || 'Karyawan')}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
          <button class="theme-toggle" id="theme-toggle-btn" title="Ganti tampilan">
            ${getTheme() === 'dark' ? '☀️' : '🌙'}
          </button>
          <div class="home-badges">
            <div class="badge-savings">💰 Rp 2.5jt</div>
            <div class="badge-preapproval">${preapprovalCount} Pra-disetujui ●●</div>
          </div>
        </div>
      </div>

      <div class="search-bar">
        <span>🔍</span>
        <input type="text" placeholder="Cari produk..." readonly
          onclick="this.placeholder='Cari produk...'" />
      </div>
    </div>

    <!-- Category chips -->
    <div class="chips-row" id="category-chips">
      ${CATEGORIES.map(c => `
        <button class="chip ${category === c.id ? 'active' : ''}" data-cat="${c.id}">
          ${esc(c.label)}
        </button>
      `).join('')}
    </div>

    <div class="scroll-area pb-nav" id="beranda-scroll">
      <!-- Daily Spin Banner -->
      <div id="daily-spin-banner">
        ${renderDailyBannerPlaceholder()}
      </div>

      <!-- Section: Pilihan untukmu -->
      ${featuredOffers.length > 0 ? `
        <div class="section-header">
          <span class="section-title">✨ Pilihan untukmu</span>
          <span class="section-link" id="lihat-semua">Lihat semua →</span>
        </div>

        <div class="mini-grid" id="mini-grid">
          ${featuredOffers.slice(0, 4).map(renderMiniCard).join('')}
        </div>
      ` : renderNoOffers()}

      <!-- Featured banner -->
      ${topBannerOffer ? renderFeaturedBanner(topBannerOffer) : ''}

      <!-- All provider section -->
      <div class="section-header mt-8">
        <span class="section-title">🏷️ Semua Penawaran</span>
      </div>
      <div class="mini-grid" id="all-grid">
        ${filteredOffers.slice(0, 6).map(renderMiniCard).join('')}
      </div>
    </div>
  `

  attachBerandaListeners(el)

  // Load offers if not yet loaded
  if (!state.offersLoaded) {
    loadOffers().then(() => renderBeranda(el))
  }
}

// ============================================================
// Daily Spin Banner
// ============================================================
function renderDailyBannerPlaceholder() {
  return `
    <div class="daily-banner-card" id="daily-banner-inner" data-action="open-daily">
      <div class="daily-banner-icon">🎡</div>
      <div class="daily-banner-text">
        <div class="daily-banner-title">Daily Spin</div>
        <div class="daily-banner-sub">Putar roda &amp; menangkan hadiah hari ini</div>
        <button class="daily-banner-btn">PUTAR SEKARANG →</button>
      </div>
    </div>
  `
}

function renderDailyBannerLoaded(alreadySpun, streak) {
  const streakN = streak?.current_streak || 0
  if (alreadySpun) {
    const prize = alreadySpun.daily_prizes || {}
    return `
      <div class="daily-banner-card already-spun" id="daily-banner-inner" data-action="open-daily">
        <div class="daily-banner-icon">${prize.emoji || '🎁'}</div>
        <div class="daily-banner-text">
          <div class="daily-banner-title">Kamu sudah menang hari ini!</div>
          <div class="daily-banner-sub">${esc(prize.label || 'Hadiah')} — ${esc(prize.partner_name || '')}</div>
          <button class="daily-banner-btn">Lihat Hadiahmu →</button>
          ${streakN > 0 ? `<div class="daily-banner-streak">🔥${streakN} hari berturut-turut</div>` : ''}
        </div>
      </div>
    `
  }
  return `
    <div class="daily-banner-card" id="daily-banner-inner" data-action="open-daily">
      <div class="daily-banner-icon">🎡</div>
      <div class="daily-banner-text">
        <div class="daily-banner-title">Daily Spin</div>
        <div class="daily-banner-sub">Putar roda &amp; menangkan hadiah hari ini</div>
        <button class="daily-banner-btn">PUTAR SEKARANG →</button>
        ${streakN > 0 ? `<div class="daily-banner-streak">🔥${streakN} hari berturut-turut</div>` : ''}
      </div>
    </div>
  `
}

function renderMiniCard(offer) {
  const provider = offer.providers
  const abbr = provider?.slug === 'adira' ? 'Adira' : provider?.slug === 'home_credit' ? 'HC' : 'Zurich'
  return `
    <div class="mini-card" data-offer-id="${esc(offer.id)}">
      <div class="mini-card-emoji">${offer.product_emoji || getCategoryEmoji(offer.category)}</div>
      <div class="mini-card-name">${esc(offer.title)}</div>
      <div class="mini-card-sub">${esc(offer.badge || '')} · ${esc(abbr)}</div>
    </div>
  `
}

function renderFeaturedBanner(offer) {
  return `
    <div class="featured-banner" data-offer-id="${esc(offer.id)}" id="featured-banner">
      <div class="featured-banner-left">
        <div class="banner-badge">🔥 Terbatas</div>
        <div class="banner-name">${esc(offer.title)}</div>
        <div class="banner-amount">ab ${formatIDRAbbr(offer.monthly_from)}/bln</div>
      </div>
      <button class="btn-ajukan-sm">Ajukan</button>
    </div>
  `
}

function renderNoOffers() {
  return `
    <div class="error-state">
      Belum ada penawaran saat ini — cek kembali besok
    </div>
  `
}

function attachBerandaListeners(el) {
  // Category chips
  el.querySelector('#category-chips')?.addEventListener('click', e => {
    const btn = e.target.closest('.chip')
    if (!btn) return
    state.activeCategory = btn.dataset.cat || 'all'
    renderBeranda(el)
  })

  // Offer cards
  el.addEventListener('click', e => {
    // Daily banner tap
    if (e.target.closest('[data-action="open-daily"]')) {
      navigate('daily')
      return
    }
    const card = e.target.closest('[data-offer-id]')
    if (!card) return
    const offerId = card.dataset.offerId
    const offer = state.offers.find(o => o.id === offerId)
    if (offer) navigate('detail', { offer })
  })

  // Theme toggle
  el.querySelector('#theme-toggle-btn')?.addEventListener('click', () => {
    toggleTheme()
    const btn = el.querySelector('#theme-toggle-btn')
    if (btn) btn.textContent = getTheme() === 'dark' ? '☀️' : '🌙'
  })

  // Lihat semua → go to Produk
  el.querySelector('#lihat-semua')?.addEventListener('click', () => {
    state.activeTab = 'produk'
    navigate('main', { tab: 'produk' })
  })

  // Load real daily banner state asynchronously
  const session = state.session || {}
  const employeeCode = session.code || 'demo'
  getDailySpinState(employeeCode).then(({ alreadySpun, streak }) => {
    const bannerEl = el.querySelector('#daily-spin-banner')
    if (bannerEl) bannerEl.innerHTML = renderDailyBannerLoaded(alreadySpun, streak)
  }).catch(() => { /* keep placeholder */ })
}

// ============================================================
// PRODUK SCREEN (Phone 2 layout)
// ============================================================
export function renderProduk(el) {
  const offers = state.offers
  const activeBrand = state.activeBrand || 'all'

  // Build brand filter chips dynamically
  const brands = ['Semua', ...new Set(
    offers
      .filter(o => o.brand_label)
      .map(o => o.brand_label)
  )]
  const hasDP0 = offers.some(o => o.down_payment_pct === 0)

  // Filter offers
  let filtered = offers
  if (activeBrand === 'DP 0%') {
    filtered = offers.filter(o => o.down_payment_pct === 0)
  } else if (activeBrand !== 'Semua' && activeBrand !== 'all') {
    filtered = offers.filter(o => o.brand_label === activeBrand)
  }

  // Separate wide-format cards (cars/premium)
  const wideCategories = new Set(['vehicle'])
  const vehicleOffers  = filtered.filter(o => o.category === 'vehicle' && !o.is_featured)
  const normalOffers   = filtered.filter(o => o.category !== 'vehicle' || o.is_featured)

  el.innerHTML = `
    <div class="status-bar">
      <span>9:41</span>
      <span class="status-icons">●●● ⚡</span>
    </div>

    <div class="produk-header">
      <span style="font-size:22px;cursor:pointer;color:var(--blue)">‹</span>
      <span class="produk-title">Motor &amp; Produk Karyawan</span>
      <button class="produk-filter-btn">Filter</button>
    </div>

    <!-- Brand / filter chips -->
    <div class="chips-row" id="brand-chips">
      ${brands.map(b => `
        <button class="chip ${(activeBrand === b || (activeBrand === 'all' && b === 'Semua')) ? 'active' : ''}"
                data-brand="${esc(b)}">
          ${esc(b)}
        </button>
      `).join('')}
      ${hasDP0 ? `<button class="chip ${activeBrand === 'DP 0%' ? 'active' : ''}" data-brand="DP 0%">DP 0%</button>` : ''}
    </div>

    <div class="scroll-area pb-nav">
      ${filtered.length === 0 ? renderNoOffers() : ''}

      <!-- 2-column grid: featured + electronics + appliances + loans -->
      ${normalOffers.length > 0 ? `
        <div class="product-grid" id="product-grid">
          ${normalOffers.map(renderProductCard).join('')}
        </div>
      ` : ''}

      <!-- Wide-format: cars/premium vehicles -->
      ${vehicleOffers.length > 0 ? `
        <div style="padding: 0 14px 14px; display: flex; flex-direction: column; gap: 8px;" id="wide-grid">
          ${vehicleOffers.map(renderWideCard).join('')}
        </div>
      ` : ''}
    </div>
  `

  attachProdukListeners(el)

  if (!state.offersLoaded) {
    loadOffers().then(() => renderProduk(el))
  }
}

function renderProductCard(offer) {
  const provider = offer.providers
  const abbr = providerAbbr(provider?.slug)
  return `
    <div class="product-card" data-offer-id="${esc(offer.id)}">
      <div class="provider-chip">${esc(abbr)}</div>
      <div class="product-card-emoji">${offer.product_emoji || getCategoryEmoji(offer.category)}</div>
      <div class="product-card-name">${esc(offer.title)}</div>
      <div class="product-card-badge">${esc(offer.badge || '')}</div>
      <div class="product-card-amount">${formatIDRAbbr(offer.monthly_from)}/bln</div>
    </div>
  `
}

function renderWideCard(offer) {
  const provider = offer.providers
  const abbr = providerAbbr(provider?.slug)
  return `
    <div class="product-card-wide" data-offer-id="${esc(offer.id)}">
      <div class="product-card-wide-emoji">${offer.product_emoji || '🚗'}</div>
      <div class="product-card-wide-info">
        <div class="product-card-wide-name">${esc(offer.title)}</div>
        <div class="product-card-wide-sub">${esc(offer.subtitle || '')}</div>
        <div class="product-card-wide-badge">${esc(offer.badge || '')} · ${esc(abbr)}</div>
      </div>
      <button class="btn-lihat">Lihat</button>
    </div>
  `
}

function attachProdukListeners(el) {
  // Brand chips
  el.querySelector('#brand-chips')?.addEventListener('click', e => {
    const btn = e.target.closest('.chip')
    if (!btn) return
    state.activeBrand = btn.dataset.brand || 'all'
    renderProduk(el)
  })

  // Offer cards → detail
  el.addEventListener('click', e => {
    const card = e.target.closest('[data-offer-id]')
    if (!card) return
    const offerId = card.dataset.offerId
    const offer = state.offers.find(o => o.id === offerId)
    if (offer) navigate('detail', { offer })
  })
}

// ============================================================
// Helpers
// ============================================================
function providerAbbr(slug) {
  if (slug === 'adira') return 'Adira'
  if (slug === 'home_credit') return 'HC'
  if (slug === 'zurich') return 'Zurich'
  return slug || '?'
}

function getCategoryEmoji(category) {
  const map = {
    vehicle: '🚗',
    electronics: '📱',
    appliance: '🏠',
    personal_loan: '💰',
    insurance: '🛡️',
  }
  return map[category] || '🏷️'
}
