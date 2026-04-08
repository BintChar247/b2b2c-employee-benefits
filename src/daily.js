/**
 * daily.js — "Spin & Save" Daily Offer wheel component
 * B2B2C Employee Benefits Portal
 */

import { supabase, state, navigate, esc } from './app.js'

// ============================================================
// Demo prizes — used when Supabase is not configured
// ============================================================
const DEMO_PRIZES = [
  { id: 'd1', label: 'Free Americano',          emoji: '☕', partner_name: 'Kopi Kenangan', category: 'coffee',   color_hex: '#6F4E37', weight: 20, voucher_prefix: 'MUFG-COFFEE', description: 'Valid di outlet Kopi Kenangan.' },
  { id: 'd2', label: 'Diskon Rp 15.000 GrabFood', emoji: '🍱', partner_name: 'GrabFood',      category: 'meal',     color_hex: '#00B14F', weight: 20, voucher_prefix: 'MUFG-GRAB',   description: 'Min. order Rp 30.000.' },
  { id: 'd3', label: 'Kredit Gojek Rp 10.000',  emoji: '🛵', partner_name: 'Gojek',          category: 'ride',     color_hex: '#00AA5B', weight: 15, voucher_prefix: 'MUFG-RIDE',   description: 'Berlaku GoRide & GoCar.' },
  { id: 'd4', label: 'Diskon 10% Alfamart',      emoji: '🛒', partner_name: 'Alfamart',       category: 'grocery',  color_hex: '#E60012', weight: 15, voucher_prefix: 'MUFG-ALFA',   description: 'Max diskon Rp 20.000.' },
  { id: 'd5', label: 'Cashback Rp 5.000 GoPay',  emoji: '💸', partner_name: 'GoPay',           category: 'cashback', color_hex: '#0083CA', weight: 10, voucher_prefix: 'MUFG-PAY',    description: 'Min. transaksi Rp 25.000.' },
  { id: 'd6', label: 'Gratis Teleconsult',        emoji: '🏥', partner_name: 'Halodoc',         category: 'wellness', color_hex: '#0FAB87', weight: 9,  voucher_prefix: 'MUFG-HALO',   description: 'Konsultasi dokter 1x gratis.' },
  { id: 'd7', label: 'Diskon 5% Produk Portal',   emoji: '🎁', partner_name: 'Portal MUFG',    category: 'bonus',    color_hex: '#8E44AD', weight: 10, voucher_prefix: 'MUFG-BONUS',  description: 'Berlaku di semua produk portal.' },
  { id: 'd8', label: 'Makan Siang s/d Rp 50.000', emoji: '⭐', partner_name: 'Random Partner',  category: 'jackpot',  color_hex: '#F39C12', weight: 1,  voucher_prefix: 'MUFG-JACKPOT',description: 'Jackpot! 1x per bulan.' },
]

// ============================================================
// Utilities
// ============================================================
function pickPrize(prizes) {
  const total = prizes.reduce((s, p) => s + (p.weight || 1), 0)
  let rand = Math.random() * total
  for (const p of prizes) {
    rand -= (p.weight || 1)
    if (rand <= 0) return p
  }
  return prizes[prizes.length - 1]
}

function generateVoucherCode(prefix = 'MUFG') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const rand = Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  return `${prefix}-${rand}`
}

function getMidnightWIB() {
  const now = new Date()
  const wib = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  wib.setHours(23, 59, 59, 999)
  const offsetMs = 7 * 60 * 60 * 1000
  return new Date(wib.getTime() - offsetMs).toISOString()
}

function getTodayWIB() {
  return new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10)
}

function msUntilMidnightWIB() {
  const now = new Date()
  const midnight = new Date(getMidnightWIB())
  return Math.max(0, midnight - now)
}

function formatCountdown(ms) {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`
}

// ============================================================
// Supabase helpers
// ============================================================
async function loadPrizes() {
  if (!supabase) return DEMO_PRIZES
  try {
    const { data, error } = await supabase
      .from('daily_prizes')
      .select('*')
      .eq('is_active', true)
      .order('weight', { ascending: false })
    if (error) throw error
    return data?.length ? data : DEMO_PRIZES
  } catch (e) {
    console.warn('[daily] Prize load failed, using demo:', e)
    return DEMO_PRIZES
  }
}

async function hasSpunToday(employeeCode) {
  if (!supabase) {
    const todayWIB = getTodayWIB()
    const cached = JSON.parse(localStorage.getItem(`spin_${todayWIB}_${employeeCode}`) || 'null')
    return cached
  }
  try {
    const todayWIB = getTodayWIB()
    const { data } = await supabase
      .from('daily_spins')
      .select('id, prize_id, voucher_code, expires_at, daily_prizes(*)')
      .eq('employee_code', employeeCode)
      .gte('spun_at', `${todayWIB}T00:00:00+07:00`)
      .limit(1)
    return data?.length ? data[0] : null
  } catch (e) {
    console.warn('[daily] hasSpunToday failed:', e)
    return null
  }
}

async function saveSpin(employeeCode, prize, voucherCode, streakDay) {
  const expiresAt = getMidnightWIB()
  if (!supabase) {
    const todayWIB = getTodayWIB()
    const record = {
      id: 'local-' + Date.now(),
      prize_id: prize.id,
      voucher_code: voucherCode,
      expires_at: expiresAt,
      streak_day: streakDay,
      daily_prizes: prize,
    }
    localStorage.setItem(`spin_${todayWIB}_${employeeCode}`, JSON.stringify(record))
    return record
  }
  try {
    const { data } = await supabase.from('daily_spins').insert({
      employee_code: employeeCode,
      prize_id: prize.id,
      voucher_code: voucherCode,
      expires_at: expiresAt,
      streak_day: streakDay,
    }).select('*, daily_prizes(*)').single()
    return data
  } catch (e) {
    console.warn('[daily] saveSpin failed:', e)
    return null
  }
}

async function loadStreak(employeeCode) {
  if (!supabase) {
    return JSON.parse(localStorage.getItem(`streak_${employeeCode}`) || '{"current_streak":0,"longest_streak":0,"bonus_unlocked":false}')
  }
  try {
    const { data } = await supabase
      .from('spin_streaks')
      .select('*')
      .eq('employee_code', employeeCode)
      .single()
    return data || { current_streak: 0, longest_streak: 0, bonus_unlocked: false }
  } catch {
    return { current_streak: 0, longest_streak: 0, bonus_unlocked: false }
  }
}

async function updateStreak(employeeCode, streak) {
  const todayWIB = getTodayWIB()
  const yesterdayWIB = new Date(Date.now() + 7 * 3600000 - 86400000).toISOString().slice(0, 10)
  const lastDate = streak.last_spin_date

  let newStreak = 1
  if (lastDate === yesterdayWIB) {
    newStreak = (streak.current_streak || 0) + 1
  } else if (lastDate === todayWIB) {
    newStreak = streak.current_streak || 1
  }

  const newLongest = Math.max(streak.longest_streak || 0, newStreak)
  const bonusUnlocked = newStreak >= 5

  const updated = {
    employee_code: employeeCode,
    current_streak: newStreak,
    longest_streak: newLongest,
    last_spin_date: todayWIB,
    bonus_unlocked: bonusUnlocked,
    updated_at: new Date().toISOString(),
  }

  if (!supabase) {
    localStorage.setItem(`streak_${employeeCode}`, JSON.stringify(updated))
  } else {
    try {
      await supabase.from('spin_streaks').upsert(updated)
    } catch (e) {
      console.warn('[daily] updateStreak failed:', e)
    }
  }
  return updated
}

// ============================================================
// Voucher wallet (Aktif tab)
// ============================================================
export async function loadMyVouchers(employeeCode) {
  if (!supabase) {
    const todayWIB = getTodayWIB()
    const cached = JSON.parse(localStorage.getItem(`spin_${todayWIB}_${employeeCode}`) || 'null')
    return cached ? [cached] : []
  }
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
    const { data } = await supabase
      .from('daily_spins')
      .select('*, daily_prizes(*)')
      .eq('employee_code', employeeCode)
      .gte('spun_at', sevenDaysAgo)
      .order('spun_at', { ascending: false })
      .limit(20)
    return data || []
  } catch (e) {
    console.warn('[daily] loadMyVouchers failed:', e)
    return []
  }
}

// ============================================================
// SVG Wheel builder
// ============================================================
function buildWheelSVG(prizes) {
  const n = prizes.length
  const cx = 150, cy = 150, r = 140, textR = 95
  const sliceAngle = (2 * Math.PI) / n

  let paths = ''
  for (let i = 0; i < n; i++) {
    const p = prizes[i]
    const startAngle = i * sliceAngle - Math.PI / 2
    const endAngle = startAngle + sliceAngle

    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)

    const midAngle = startAngle + sliceAngle / 2
    const tx = cx + textR * Math.cos(midAngle)
    const ty = cy + textR * Math.sin(midAngle)
    const deg = (midAngle * 180) / Math.PI + 90

    const color = p.color_hex || '#E60012'
    const darker = color + 'cc'

    paths += `
      <path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z"
            fill="${color}" stroke="#fff" stroke-width="2"/>
      <text transform="translate(${tx},${ty}) rotate(${deg})"
            text-anchor="middle" dominant-baseline="middle"
            font-size="22" style="user-select:none">${p.emoji}</text>
    `
  }

  return `
    <svg viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" id="wheel-svg">
      <defs>
        <filter id="wheel-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="4" flood-opacity="0.25"/>
        </filter>
      </defs>
      <g id="wheel-group" filter="url(#wheel-shadow)">
        ${paths}
        <!-- Center circle -->
        <circle cx="${cx}" cy="${cy}" r="28" fill="#fff" stroke="#ddd" stroke-width="2"/>
        <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle"
              font-size="18" style="user-select:none">🎯</text>
      </g>
    </svg>
  `
}

// ============================================================
// Wheel animation
// ============================================================
let _wheelRotation = 0

function spinWheel(targetIndex, totalSegments, onComplete) {
  const wheel = document.getElementById('wheel-group')
  if (!wheel) { onComplete(); return }

  const segmentAngle = 360 / totalSegments
  const targetAngle = 360 - (targetIndex * segmentAngle + segmentAngle / 2)
  const fullRotations = 5 * 360
  const finalAngle = _wheelRotation + fullRotations + ((targetAngle - _wheelRotation) % 360 + 360) % 360

  _wheelRotation = finalAngle % 360

  wheel.style.transformOrigin = '150px 150px'
  wheel.style.transition = 'transform 3s cubic-bezier(0.17, 0.67, 0.12, 0.99)'
  wheel.style.transform = `rotate(${finalAngle}deg)`

  setTimeout(onComplete, 3200)
}

// ============================================================
// Main render: Daily screen
// ============================================================
let _prizes = []
let _spinning = false
let _spinResult = null
let _streak = { current_streak: 0, longest_streak: 0, bonus_unlocked: false }
let _alreadySpun = null
let _countdownTimer = null
let _demoMode = false

export async function renderDaily(el) {
  if (_countdownTimer) { clearInterval(_countdownTimer); _countdownTimer = null }

  const session = state.session || {}
  const employeeCode = session.code || 'demo'
  _demoMode = !supabase

  el.innerHTML = `<div class="daily-loading"><div class="daily-spinner"></div><span>Memuat roda…</span></div>`
  el.classList.add('active')

  // Load in parallel
  const [prizes, alreadySpun, streak] = await Promise.all([
    loadPrizes(),
    hasSpunToday(employeeCode),
    loadStreak(employeeCode),
  ])

  _prizes = prizes
  _alreadySpun = alreadySpun
  _streak = streak
  _spinResult = alreadySpun ? { prize: alreadySpun.daily_prizes, voucher: alreadySpun.voucher_code, expiresAt: alreadySpun.expires_at } : null
  _spinning = false
  _wheelRotation = 0

  renderDailyContent(el, employeeCode)
}

function renderDailyContent(el, employeeCode) {
  const hasSpun = !!_spinResult
  const streak = _streak
  const streakDisplay = streak.current_streak || 0
  const demo = _demoMode ? `<div class="daily-demo-badge">[DEMO]</div>` : ''

  el.innerHTML = `
    <div class="status-bar">
      <span>9:41</span>
      <span class="status-icons">●●● ⚡</span>
    </div>

    <div class="daily-header">
      <button class="back-btn" id="daily-back-btn">‹</button>
      <span class="daily-header-title">🎡 Daily Spin</span>
      ${demo}
    </div>

    <div class="scroll-area pb-nav" id="daily-scroll">
      <div class="daily-wheel-wrap">
        <!-- Pointer -->
        <div class="daily-pointer">▼</div>
        <!-- Wheel SVG -->
        <div class="daily-wheel-container" id="daily-wheel-container">
          ${buildWheelSVG(_prizes)}
        </div>
      </div>

      ${hasSpun ? renderResultCard(_spinResult, streak) : renderSpinCTA(streak)}

      <!-- Streak bar -->
      <div class="daily-streak-bar" id="daily-streak-bar">
        ${renderStreakBar(streakDisplay)}
      </div>

      <!-- Prize legend -->
      <div class="daily-legend">
        ${_prizes.map(p => `
          <div class="daily-legend-item">
            <span style="background:${p.color_hex}" class="daily-legend-dot"></span>
            <span class="daily-legend-label">${p.emoji} ${esc(p.label)}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `

  attachDailyListeners(el, employeeCode)

  if (hasSpun && _spinResult?.expiresAt) {
    startCountdown(el, _spinResult.expiresAt)
  }
}

function renderSpinCTA(streak) {
  return `
    <div class="daily-cta-section">
      <button class="daily-spin-btn" id="daily-spin-btn">
        <span class="daily-spin-btn-text">🎯 PUTAR RODA!</span>
      </button>
      <div class="daily-spin-hint">Kamu punya <strong>1 putaran</strong> hari ini</div>
    </div>
  `
}

function renderResultCard(result, streak) {
  const prize = result.prize || {}
  const expiresAt = result.expiresAt
  const timeLeft = expiresAt ? formatCountdown(Math.max(0, new Date(expiresAt) - new Date())) : '--:--:--'
  const partnerUrl = (prize.partner_url || '').replace('{{code}}', result.voucher)

  return `
    <div class="daily-result-card" id="daily-result-card">
      <div class="daily-result-title">🎉 Selamat!</div>
      <div class="daily-result-prize-emoji">${prize.emoji || '🎁'}</div>
      <div class="daily-result-prize-label">${esc(prize.label || 'Hadiah')}</div>
      <div class="daily-result-prize-partner">${esc(prize.partner_name || '')}</div>
      <div class="daily-result-desc">${esc(prize.description || '')}</div>

      <div class="daily-voucher-row" id="daily-voucher-row" title="Tap untuk salin">
        <span class="daily-voucher-code" id="daily-voucher-code">${esc(result.voucher)}</span>
        <button class="daily-copy-btn" id="daily-copy-btn">📋 Salin</button>
      </div>

      <div class="daily-expiry" id="daily-expiry">⏰ Berlaku hingga <span id="daily-countdown">${timeLeft}</span></div>

      ${partnerUrl ? `
        <a href="${esc(partnerUrl)}" target="_blank" rel="noopener" class="daily-use-btn">
          Gunakan Sekarang →
        </a>
      ` : `
        <div class="daily-use-btn daily-use-btn-internal">
          Berlaku di Portal ini — masukkan kode saat checkout
        </div>
      `}
    </div>
  `
}

function renderStreakBar(current) {
  const max = 5
  const pct = Math.min(current, max)
  const bars = Array.from({ length: max }, (_, i) => `<div class="streak-pip ${i < pct ? 'filled' : ''}"></div>`).join('')
  const remaining = max - current

  return `
    <div class="daily-streak-title">
      Streak kamu: ${current > 0 ? `🔥${current}` : '0'} / ${max} hari
    </div>
    <div class="streak-pips">${bars}</div>
    ${current >= max
      ? `<div class="streak-bonus-msg">🏆 Bonus Prize terbuka! Kamu luar biasa.</div>`
      : `<div class="streak-hint">${remaining} lagi untuk Bonus Prize!</div>`
    }
  `
}

function startCountdown(el, expiresAt) {
  const update = () => {
    const ms = Math.max(0, new Date(expiresAt) - new Date())
    const cd = el.querySelector('#daily-countdown')
    if (cd) cd.textContent = formatCountdown(ms)
    if (ms <= 0 && _countdownTimer) {
      clearInterval(_countdownTimer)
      _countdownTimer = null
      const expiry = el.querySelector('#daily-expiry')
      if (expiry) expiry.textContent = '⏰ Sudah kedaluwarsa'
    }
  }
  update()
  _countdownTimer = setInterval(update, 1000)
}

function attachDailyListeners(el, employeeCode) {
  el.querySelector('#daily-back-btn')?.addEventListener('click', () => {
    if (_countdownTimer) { clearInterval(_countdownTimer); _countdownTimer = null }
    navigate('main', { tab: 'beranda' })
  })

  el.querySelector('#daily-spin-btn')?.addEventListener('click', async () => {
    if (_spinning || _spinResult) return
    _spinning = true

    const btn = el.querySelector('#daily-spin-btn')
    if (btn) { btn.disabled = true; btn.querySelector('.daily-spin-btn-text').textContent = '🌀 Berputar…' }

    const prize = pickPrize(_prizes)
    const prizeIndex = _prizes.findIndex(p => p.id === prize.id)
    const voucherCode = generateVoucherCode(prize.voucher_prefix || 'MUFG')

    spinWheel(prizeIndex, _prizes.length, async () => {
      // Update streak
      const newStreak = await updateStreak(employeeCode, _streak)
      _streak = newStreak

      // Save spin record
      const record = await saveSpin(employeeCode, prize, voucherCode, newStreak.current_streak)
      _spinResult = { prize, voucher: voucherCode, expiresAt: getMidnightWIB() }
      _alreadySpun = record
      _spinning = false

      // Animate result in
      const ctaSection = el.querySelector('.daily-cta-section')
      if (ctaSection) {
        ctaSection.style.transition = 'opacity 0.3s'
        ctaSection.style.opacity = '0'
        setTimeout(() => {
          ctaSection.outerHTML = renderResultCard(_spinResult, _streak)
          const scroll = el.querySelector('#daily-scroll')
          if (scroll) scroll.scrollTo({ top: 300, behavior: 'smooth' })
          startCountdown(el, _spinResult.expiresAt)
          attachResultListeners(el)
        }, 300)
      }

      // Update streak bar
      const streakBar = el.querySelector('#daily-streak-bar')
      if (streakBar) streakBar.innerHTML = renderStreakBar(_streak.current_streak || 0)

      // Jackpot confetti
      if (prize.category === 'jackpot') launchConfetti(el)
    })
  })

  attachResultListeners(el)
}

function attachResultListeners(el) {
  el.querySelector('#daily-copy-btn')?.addEventListener('click', () => {
    const code = el.querySelector('#daily-voucher-code')?.textContent || ''
    navigator.clipboard?.writeText(code).then(() => {
      const btn = el.querySelector('#daily-copy-btn')
      if (btn) { btn.textContent = '✓ Tersalin'; setTimeout(() => { btn.textContent = '📋 Salin' }, 2000) }
    }).catch(() => {
      const code_el = el.querySelector('#daily-voucher-code')
      if (code_el) {
        const range = document.createRange()
        range.selectNode(code_el)
        window.getSelection()?.removeAllRanges()
        window.getSelection()?.addRange(range)
      }
    })
  })
}

// ============================================================
// Confetti (jackpot only)
// ============================================================
function launchConfetti(el) {
  const colors = ['#E60012','#F39C12','#00B14F','#8E44AD','#0083CA']
  const container = document.createElement('div')
  container.className = 'confetti-container'
  el.appendChild(container)

  for (let i = 0; i < 60; i++) {
    const dot = document.createElement('div')
    dot.className = 'confetti-dot'
    dot.style.cssText = `
      left:${Math.random() * 100}%;
      background:${colors[Math.floor(Math.random() * colors.length)]};
      animation-delay:${Math.random() * 0.8}s;
      animation-duration:${1.2 + Math.random() * 1}s;
      width:${6 + Math.random() * 8}px;
      height:${6 + Math.random() * 8}px;
      border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
    `
    container.appendChild(dot)
  }
  setTimeout(() => container.remove(), 3000)
}

// ============================================================
// Beranda banner state helper (used by offers.js)
// ============================================================
export async function getDailySpinState(employeeCode) {
  const [alreadySpun, streak] = await Promise.all([
    hasSpunToday(employeeCode),
    loadStreak(employeeCode),
  ])
  return { alreadySpun, streak }
}
