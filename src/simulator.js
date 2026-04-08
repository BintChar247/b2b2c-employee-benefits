/**
 * simulator.js — EMI Financing Rate Simulator
 * Workflow: 04_emi_simulator
 */

import { supabase, state, navigate, goBack, esc } from './app.js'
import { formatIDRFull, formatIDRAbbr } from './offers.js'

// ============================================================
// Analytics (mirrors checkout.js)
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
    .then(() => {})
    .catch(() => {})
}

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
// EMI calculation
// ============================================================
function calcEMI(P, rMonthly, n) {
  if (P <= 0 || n <= 0) return 0
  if (rMonthly === 0) return P / n
  return P * rMonthly * Math.pow(1 + rMonthly, n) / (Math.pow(1 + rMonthly, n) - 1)
}

function buildAmortTable(P, rMonthly, n, emi) {
  const rows = []
  let balance = P
  for (let i = 1; i <= n; i++) {
    const interest  = balance * rMonthly
    const principal = emi - interest
    balance = Math.max(0, balance - principal)
    rows.push({ month: i, emi, principal, interest, balance })
  }
  return rows
}

// ============================================================
// Default values when no offer is pre-filled
// ============================================================
const DEFAULTS = {
  price:      10_000_000,
  dpPct:      20,
  tenor:      24,
  rate:       0.99,
  minPrice:   500_000,
  maxPrice:   2_000_000_000,
  minDP:      0,
  maxDP:      90,
  tenorList:  [3, 6, 12, 24, 36, 48, 60],
  minRate:    0,
  maxRate:    5,
}

function offerConstraints(offer) {
  if (!offer) return DEFAULTS
  return {
    price:     offer.max_loan  || DEFAULTS.price,
    dpPct:     offer.down_payment_pct ?? DEFAULTS.dpPct,
    tenor:     offer.max_tenure || DEFAULTS.tenor,
    rate:      offer.interest_rate ?? DEFAULTS.rate,
    minPrice:  offer.min_loan  || DEFAULTS.minPrice,
    maxPrice:  offer.max_loan  || DEFAULTS.maxPrice,
    minDP:     offer.down_payment_pct === 0 ? 0 : DEFAULTS.minDP,
    maxDP:     DEFAULTS.maxDP,
    tenorList: buildTenorList(offer.min_tenure, offer.max_tenure),
    minRate:   DEFAULTS.minRate,
    maxRate:   DEFAULTS.maxRate,
  }
}

function buildTenorList(min = 3, max = 60) {
  const all = [3, 6, 12, 24, 36, 48, 60]
  return all.filter(t => t >= min && t <= max)
}

// ============================================================
// SIMULATOR SCREEN render
// ============================================================
export function renderSimulator(el, offer) {
  const c = offerConstraints(offer)

  // Internal sim state (attached to element to survive re-renders)
  if (!el._sim) {
    el._sim = {
      price:  c.price,
      dpPct:  c.dpPct,
      tenor:  c.tenor,
      rate:   c.rate,
    }
  }
  const sim = el._sim

  const dpAmount = sim.price * (sim.dpPct / 100)
  const P        = Math.max(0, sim.price - dpAmount)
  const r        = sim.rate / 100
  const emi      = calcEMI(P, r, sim.tenor)
  const total    = emi * sim.tenor
  const totalInt = total - P

  el.innerHTML = `
    <div class="status-bar">
      <span>9:41</span>
      <span class="status-icons">●●● ⚡</span>
    </div>

    <div class="sim-header">
      <button class="back-btn" id="sim-back">‹</button>
      <span class="sim-title">Simulasi Cicilan</span>
      <span></span>
    </div>

    <div class="scroll-area pb-nav">

      <!-- Input card -->
      <div class="sim-card">

        <!-- Harga Produk -->
        <div class="sim-field">
          <label class="sim-label">Harga Produk (IDR)</label>
          <input
            type="number"
            class="sim-input"
            id="sim-price"
            value="${sim.price}"
            min="${c.minPrice}"
            max="${c.maxPrice}"
            inputmode="numeric"
            placeholder="Masukkan harga produk"
          />
          <div class="sim-helper">Min ${formatIDRAbbr(c.minPrice)} — Maks ${formatIDRAbbr(c.maxPrice)}</div>
        </div>

        <!-- Uang Muka — two inputs side by side -->
        <div class="sim-field">
          <label class="sim-label">Uang Muka</label>
          <div class="sim-dp-row">
            <div class="sim-dp-col">
              <div class="sim-dp-sublabel">Persentase</div>
              <div class="sim-dp-pct-wrap">
                <input
                  type="number"
                  class="sim-input"
                  id="sim-dp-pct"
                  value="${sim.dpPct}"
                  min="${c.minDP}"
                  max="${c.maxDP}"
                  step="1"
                  inputmode="numeric"
                  placeholder="0"
                />
                <span class="sim-dp-unit">%</span>
              </div>
            </div>
            <div class="sim-dp-sep">=</div>
            <div class="sim-dp-col" style="flex:2;">
              <div class="sim-dp-sublabel">Jumlah (Rp)</div>
              <input
                type="number"
                class="sim-input"
                id="sim-dp-idr"
                value="${Math.round(dpAmount)}"
                min="0"
                inputmode="numeric"
                placeholder="0"
              />
            </div>
          </div>
          <input
            type="range"
            class="sim-slider"
            id="sim-dp"
            min="${c.minDP}"
            max="${c.maxDP}"
            step="1"
            value="${sim.dpPct}"
            style="margin-top:10px;"
          />
          <div class="sim-slider-labels">
            <span>${c.minDP}%</span>
            <span>${c.maxDP}%</span>
          </div>
        </div>

        <!-- Tenor chips -->
        <div class="sim-field">
          <label class="sim-label">Tenor Pinjaman</label>
          <div class="tenor-chips" id="tenor-chips">
            ${c.tenorList.map(t => `
              <button class="chip-tenor ${sim.tenor === t ? 'active' : ''}" data-tenor="${t}">
                ${t}
              </button>
            `).join('')}
          </div>
          <div class="sim-helper">bulan</div>
        </div>

        <!-- Suku Bunga -->
        <div class="sim-field">
          <label class="sim-label">Suku Bunga (% per bulan)</label>
          <input
            type="number"
            class="sim-input"
            id="sim-rate"
            value="${sim.rate}"
            min="${c.minRate}"
            max="${c.maxRate}"
            step="0.01"
            inputmode="decimal"
          />
          <div class="sim-helper">Contoh: 0.99 untuk 0.99%/bulan</div>
        </div>

      </div><!-- /sim-card -->

      <!-- Output card -->
      <div class="sim-result-card" id="sim-result">
        <div class="sim-result-label">ESTIMASI CICILAN ANDA</div>

        <div class="sim-emi">${formatIDRFull(Math.round(emi))}</div>
        <div class="sim-emi-sub">per bulan · ${sim.tenor} bulan</div>

        <div class="sim-result-divider"></div>

        <div class="sim-result-row">
          <span>Pokok Pinjaman</span>
          <span>${formatIDRFull(Math.round(P))}</span>
        </div>
        <div class="sim-result-row">
          <span>Uang Muka</span>
          <span>${formatIDRFull(Math.round(dpAmount))}</span>
        </div>
        <div class="sim-result-row">
          <span>Total Pembayaran</span>
          <span>${formatIDRFull(Math.round(total))}</span>
        </div>
        <div class="sim-result-row red">
          <span>Total Bunga</span>
          <span>${formatIDRFull(Math.round(totalInt))}</span>
        </div>

        <div class="sim-disclaimer">
          ⚠️ Simulasi saja. Bunga final tergantung persetujuan provider.
        </div>
      </div>

      <!-- Amortisation table toggle -->
      <button class="sim-toggle-amort" id="sim-toggle-amort">
        Lihat Rincian Cicilan ▾
      </button>

      <div class="sim-amort-wrap hidden" id="sim-amort">
        ${renderAmortTable(P, r, sim.tenor, emi)}
      </div>

      <!-- CTA: open provider directly (native <a> so mobile never blocks) -->
      ${offer ? `
        <div style="padding:0 14px 14px;">
          <a class="btn-primary sim-cta-link" id="sim-to-provider"
             href="${esc(buildRedirectUrl(offer))}"
             target="_blank"
             rel="noopener noreferrer">
            Ajukan di ${esc(offer.providers?.name || 'Provider')} →
          </a>
        </div>
      ` : ''}

    </div>
  `

  attachSimListeners(el, offer, c)
}

// ============================================================
// Amortisation table HTML
// ============================================================
function renderAmortTable(P, r, n, emi) {
  const rows = buildAmortTable(P, r, n, emi)
  return `
    <div class="amort-scroll">
      <table class="amort-table">
        <thead>
          <tr>
            <th>Bln</th>
            <th>Cicilan</th>
            <th>Pokok</th>
            <th>Bunga</th>
            <th>Sisa</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((row, i) => `
            <tr class="${i % 2 === 0 ? 'even' : 'odd'}">
              <td>${row.month}</td>
              <td>${formatIDRFull(Math.round(row.emi))}</td>
              <td>${formatIDRFull(Math.round(row.principal))}</td>
              <td>${formatIDRFull(Math.round(row.interest))}</td>
              <td>${formatIDRFull(Math.round(row.balance))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

// ============================================================
// Event listeners + live recalculation
// ============================================================
function attachSimListeners(el, offer, c) {
  const sim = el._sim

  // Back
  el.querySelector('#sim-back')?.addEventListener('click', goBack)

  // Price input
  el.querySelector('#sim-price')?.addEventListener('input', e => {
    const v = parseFloat(e.target.value)
    if (!isNaN(v)) {
      sim.price = Math.min(c.maxPrice, Math.max(c.minPrice, v))
      recalc(el, offer, c)
    }
  })

  // Sync helper — updates all three DP controls from dpPct
  function syncDP() {
    const idr = Math.round(sim.price * sim.dpPct / 100)
    const slider   = el.querySelector('#sim-dp')
    const pctInput = el.querySelector('#sim-dp-pct')
    const idrInput = el.querySelector('#sim-dp-idr')
    if (slider   && document.activeElement !== slider)   slider.value   = sim.dpPct
    if (pctInput && document.activeElement !== pctInput) pctInput.value = sim.dpPct
    if (idrInput && document.activeElement !== idrInput) idrInput.value = idr
  }

  // Slider
  el.querySelector('#sim-dp')?.addEventListener('input', e => {
    sim.dpPct = Math.min(c.maxDP, Math.max(c.minDP, parseInt(e.target.value) || 0))
    syncDP(); recalc(el, offer, c)
  })

  // % number input
  el.querySelector('#sim-dp-pct')?.addEventListener('input', e => {
    const v = parseFloat(e.target.value)
    if (isNaN(v)) return
    sim.dpPct = Math.min(c.maxDP, Math.max(c.minDP, v))
    syncDP(); recalc(el, offer, c)
  })

  // IDR amount input
  el.querySelector('#sim-dp-idr')?.addEventListener('input', e => {
    const idr = parseFloat(e.target.value)
    if (isNaN(idr) || sim.price <= 0) return
    sim.dpPct = Math.min(c.maxDP, Math.max(c.minDP, Math.round(idr / sim.price * 100)))
    syncDP(); recalc(el, offer, c)
  })

  // Tenor chips
  el.querySelector('#tenor-chips')?.addEventListener('click', e => {
    const btn = e.target.closest('.chip-tenor')
    if (!btn) return
    sim.tenor = parseInt(btn.dataset.tenor)
    el.querySelectorAll('.chip-tenor').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.tenor) === sim.tenor)
    })
    recalc(el, offer, c)
  })

  // Rate input
  el.querySelector('#sim-rate')?.addEventListener('input', e => {
    const v = parseFloat(e.target.value)
    if (!isNaN(v)) {
      sim.rate = Math.min(c.maxRate, Math.max(c.minRate, v))
      recalc(el, offer, c)
    }
  })

  // Amort toggle
  el.querySelector('#sim-toggle-amort')?.addEventListener('click', () => {
    const wrap = el.querySelector('#sim-amort')
    const btn  = el.querySelector('#sim-toggle-amort')
    if (wrap.classList.toggle('hidden')) {
      btn.textContent = 'Lihat Rincian Cicilan ▾'
    } else {
      btn.textContent = 'Sembunyikan Rincian ▴'
    }
  })

  // CTA: log analytics when native <a> is tapped (non-blocking)
  el.querySelector('#sim-to-provider')?.addEventListener('click', () => {
    if (offer) logRedirectEvent(offer)
  })
}

// ============================================================
// Partial DOM update on input change (avoid full re-render)
// ============================================================
function recalc(el, offer, c) {
  const sim      = el._sim
  const dpAmount = sim.price * (sim.dpPct / 100)
  const P        = Math.max(0, sim.price - dpAmount)
  const r        = sim.rate / 100
  const emi      = calcEMI(P, r, sim.tenor)
  const total    = emi * sim.tenor
  const totalInt = total - P

  const result = el.querySelector('#sim-result')
  if (!result) return

  result.querySelector('.sim-emi').textContent       = formatIDRFull(Math.round(emi))
  result.querySelector('.sim-emi-sub').textContent   = `per bulan · ${sim.tenor} bulan`

  const rows = result.querySelectorAll('.sim-result-row')
  if (rows[0]) rows[0].querySelector('span:last-child').textContent = formatIDRFull(Math.round(P))
  if (rows[1]) rows[1].querySelector('span:last-child').textContent = formatIDRFull(Math.round(dpAmount))
  if (rows[2]) rows[2].querySelector('span:last-child').textContent = formatIDRFull(Math.round(total))
  if (rows[3]) rows[3].querySelector('span:last-child').textContent = formatIDRFull(Math.round(totalInt))

  // Sync DP inputs when price changes
  const dpIdr = el.querySelector('#sim-dp-idr')
  const dpPct = el.querySelector('#sim-dp-pct')
  const dpSlider = el.querySelector('#sim-dp')
  if (dpIdr    && document.activeElement !== dpIdr)    dpIdr.value    = Math.round(dpAmount)
  if (dpPct    && document.activeElement !== dpPct)    dpPct.value    = sim.dpPct
  if (dpSlider && document.activeElement !== dpSlider) dpSlider.value = sim.dpPct

  // Refresh amort table if visible
  const amortWrap = el.querySelector('#sim-amort')
  if (amortWrap && !amortWrap.classList.contains('hidden')) {
    amortWrap.innerHTML = renderAmortTable(P, r, sim.tenor, emi)
  }
}
