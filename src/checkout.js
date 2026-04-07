/**
 * checkout.js — Pre-Approved Detail Screen + provider redirect + analytics
 * Workflow: 05_checkout_redirect
 */

import { supabase, state, navigate, goBack, esc } from './app.js'
import { formatIDRAbbr, formatIDRFull } from './offers.js'

// ============================================================
// Analytics: log redirect event (fire-and-forget)
// ============================================================
function logRedirectEvent(offer) {
  if (!supabase) return
  const session = state.session || {}
  supabase
    .from('redirect_events')
    .insert({
      offer_id:      offer.id,
      provider_id:   offer.providers?.id || offer.provider_id || null,
      employee_code: session.code || null,
    })
    .then(() => {}) // intentionally ignored
    .catch(() => {}) // never block redirect
}

// ============================================================
// Build redirect URL with UTM params
// ============================================================
function buildRedirectUrl(offer) {
  const base =
    offer.checkout_url ||
    offer.providers?.website_url ||
    'https://www.adira.co.id'

  const url = new URL(base)
  url.searchParams.set('utm_source',   'b2b2c_portal')
  url.searchParams.set('utm_medium',   'employee_app')
  url.searchParams.set('utm_campaign', 'EMP_BENEFITS_2026')
  return url.toString()
}

// ============================================================
// DETAIL SCREEN render
// ============================================================
export function renderDetail(el, offer) {
  if (!offer) {
    goBack()
    return
  }

  const provider    = offer.providers || {}
  const isPreapproved = offer.down_payment_pct === 0 || offer.is_featured

  // Calculate sample installment at default tenor midpoint
  const tenor = offer.max_tenure || 36
  const loan  = offer.max_loan   || offer.min_loan || 10_000_000
  const dp    = (offer.down_payment_pct || 0) / 100
  const P     = loan * (1 - dp)
  const r     = (offer.interest_rate || 0.99) / 100
  const emi   = r === 0 ? P / tenor : P * r * Math.pow(1 + r, tenor) / (Math.pow(1 + r, tenor) - 1)

  const dpAmount = loan * dp

  el.innerHTML = `
    <div class="status-bar">
      <span>9:41</span>
      <span class="status-icons">●●● ⚡</span>
    </div>

    <!-- Header -->
    <div class="detail-header">
      <button class="back-btn" id="detail-back">‹</button>
      <span class="detail-header-title">${esc(offer.title)}</span>
      <span></span>
    </div>

    <div class="scroll-area pb-nav">
      <!-- Product hero card -->
      <div class="detail-hero">
        <div class="detail-hero-emoji">${offer.product_emoji || '🏷️'}</div>
        <div class="detail-hero-info">
          <div class="detail-hero-name">${esc(offer.title)}</div>
          <div class="detail-hero-provider">Pembiayaan via ${esc(provider.name || 'Provider')}</div>
          ${isPreapproved
            ? `<div class="badge-approved">✓ Pra-Disetujui</div>`
            : ''}
        </div>
      </div>

      <!-- Terms table -->
      <div class="terms-table">
        <div class="terms-row">
          <span class="terms-label">Nilai Produk</span>
          <span class="terms-value">${formatIDRFull(loan)}</span>
        </div>
        <div class="terms-row">
          <span class="terms-label">Uang Muka</span>
          <span class="terms-value ${offer.down_payment_pct === 0 ? 'red' : ''}">${
            offer.down_payment_pct === 0
              ? `Rp 0 (DP 0%)`
              : `${formatIDRFull(dpAmount)} (${offer.down_payment_pct}%)`
          }</span>
        </div>
        <div class="terms-row">
          <span class="terms-label">Cicilan / bulan</span>
          <span class="terms-value">${formatIDRFull(Math.round(emi))}</span>
        </div>
        <div class="terms-row">
          <span class="terms-label">Tenor</span>
          <span class="terms-value">${tenor} bulan</span>
        </div>
        <div class="terms-row">
          <span class="terms-label">Bunga</span>
          <span class="terms-value">${offer.interest_rate || 0.99}% / bulan</span>
        </div>
        ${offer.valid_until ? `
        <div class="terms-row">
          <span class="terms-label">Berlaku hingga</span>
          <span class="terms-value">${formatDate(offer.valid_until)}</span>
        </div>` : ''}
      </div>

      <!-- Data auto-fill banner -->
      <div class="data-autofill-banner">
        <div class="autofill-title">⚡ Data otomatis terisi</div>
        <div class="autofill-sub">Nama, gaji, rekening dari payroll</div>
      </div>

      <!-- CTA -->
      <div class="detail-cta-section">
        <button class="btn-ajukan-main" id="btn-ajukan">
          <span class="btn-ajukan-label">Ajukan Sekarang →</span>
          <span class="btn-ajukan-sub">Disetujui dalam 5 menit</span>
        </button>

        <div class="popup-fallback hidden" id="popup-fallback">
          <a href="#" id="popup-fallback-link" target="_blank" rel="noopener noreferrer">
            Ketuk di sini untuk membuka ${esc(provider.name || 'provider')} →
          </a>
        </div>

        <button class="btn-simulasi" id="btn-simulasi">
          Simulasi cicilan lain →
        </button>
      </div>

      <!-- Offer description -->
      ${offer.subtitle ? `
        <div class="detail-subtitle">${esc(offer.subtitle)}</div>
      ` : ''}

      <div class="detail-disclaimer">
        * Simulasi saja. Persetujuan dan suku bunga final ditentukan oleh provider.
        Jumlah cicilan dapat berbeda tergantung kebijakan kredit masing-masing lembaga.
      </div>
    </div>
  `

  attachDetailListeners(el, offer)
}

function attachDetailListeners(el, offer) {
  // Back
  el.querySelector('#detail-back')?.addEventListener('click', goBack)

  // Ajukan — MUST be synchronous (iOS Safari popup rules)
  el.querySelector('#btn-ajukan')?.addEventListener('click', () => {
    const redirectUrl = buildRedirectUrl(offer)

    // Fire-and-forget analytics — no await
    logRedirectEvent(offer)

    // Synchronous open — must not follow an await
    const win = window.open(redirectUrl, '_blank', 'noopener,noreferrer')

    // Fallback if popup was blocked
    if (!win || win.closed || typeof win.closed === 'undefined') {
      const fallback = el.querySelector('#popup-fallback')
      const link     = el.querySelector('#popup-fallback-link')
      if (fallback && link) {
        link.href = redirectUrl
        fallback.classList.remove('hidden')
      }
    }
  })

  // Simulator
  el.querySelector('#btn-simulasi')?.addEventListener('click', () => {
    navigate('simulator', { offer })
  })
}

// ============================================================
// Helper
// ============================================================
function formatDate(dateStr) {
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'long', year: 'numeric',
    }).format(new Date(dateStr))
  } catch (_) {
    return dateStr
  }
}
