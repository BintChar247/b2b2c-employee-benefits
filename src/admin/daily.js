/**
 * admin/daily.js — Daily Prizes CRUD + wheel preview + analytics
 */

import { toast, confirm, openPanel, closePanel } from './components.js'

// ─── Demo data ────────────────────────────────────────────────
const DEMO_PRIZES = [
  { id: 'd1', emoji: '☕', label: 'Free Americano',          category: 'coffee',   partner_name: 'Kopi Kenangan', color_hex: '#6F4E37', weight: 20, voucher_prefix: 'MUFG-COFFEE', is_active: true },
  { id: 'd2', emoji: '🍱', label: 'Diskon Rp 15.000 GrabFood', category: 'meal',   partner_name: 'GrabFood',      color_hex: '#00B14F', weight: 20, voucher_prefix: 'MUFG-GRAB',   is_active: true },
  { id: 'd3', emoji: '🛵', label: 'Kredit Gojek Rp 10.000',  category: 'ride',     partner_name: 'Gojek',          color_hex: '#00AA5B', weight: 15, voucher_prefix: 'MUFG-RIDE',   is_active: true },
  { id: 'd4', emoji: '🛒', label: 'Diskon 10% Alfamart',      category: 'grocery',  partner_name: 'Alfamart',       color_hex: '#E60012', weight: 15, voucher_prefix: 'MUFG-ALFA',   is_active: true },
  { id: 'd5', emoji: '💸', label: 'Cashback Rp 5.000 GoPay',  category: 'cashback', partner_name: 'GoPay',           color_hex: '#0083CA', weight: 10, voucher_prefix: 'MUFG-PAY',    is_active: true },
  { id: 'd6', emoji: '🏥', label: 'Gratis Teleconsult',        category: 'wellness', partner_name: 'Halodoc',         color_hex: '#0FAB87', weight: 9,  voucher_prefix: 'MUFG-HALO',   is_active: true },
  { id: 'd7', emoji: '🎁', label: 'Diskon 5% Produk Portal',   category: 'bonus',    partner_name: 'Portal MUFG',    color_hex: '#8E44AD', weight: 10, voucher_prefix: 'MUFG-BONUS',  is_active: false },
  { id: 'd8', emoji: '⭐', label: 'Makan Siang s/d Rp 50.000', category: 'jackpot',  partner_name: 'Random Partner',  color_hex: '#F39C12', weight: 1,  voucher_prefix: 'MUFG-JACKPOT',is_active: true },
]

const CATEGORIES = [
  { value: 'coffee',   label: 'Kopi' },
  { value: 'meal',     label: 'Makan' },
  { value: 'ride',     label: 'Transportasi' },
  { value: 'grocery',  label: 'Belanja' },
  { value: 'cashback', label: 'Cashback' },
  { value: 'wellness', label: 'Kesehatan' },
  { value: 'bonus',    label: 'Bonus Portal' },
  { value: 'jackpot',  label: 'Jackpot' },
]

// ─── State ───────────────────────────────────────────────────
let _prizes = []
let _spins = []
let _supabase = null
let _container = null
let _editingId = null

// ─── Init ────────────────────────────────────────────────────
export async function initDaily(container, supabase) {
  _container = container
  _supabase = supabase
  renderShell()
  await loadData()
  renderPrizes()
  renderAnalytics()
}

function renderShell() {
  _container.innerHTML = `
    <div class="section-header">
      <div class="section-title-row">
        <h2 class="section-title">Daily Prizes — Spin &amp; Save</h2>
        <button class="btn btn-primary" id="daily-add-btn">+ Tambah Prize</button>
      </div>
      <p style="color:var(--fg-muted);font-size:13px;margin-top:4px;">
        Kelola hadiah roda putar harian. Weight lebih tinggi = lebih sering keluar.
      </p>
    </div>

    <!-- Wheel preview -->
    <div class="daily-admin-preview-row">
      <div id="daily-wheel-preview" class="daily-admin-wheel-wrap"></div>
      <div id="daily-analytics-mini" class="daily-admin-analytics-mini"></div>
    </div>

    <!-- Prizes table -->
    <div id="daily-prizes-table"></div>

    <!-- Analytics section -->
    <div class="section-header" style="margin-top:24px;">
      <h2 class="section-title">Analitik Spin</h2>
    </div>
    <div id="daily-analytics-detail"></div>

    <!-- Add/Edit Panel -->
    <div id="panel-daily" class="panel hidden">
      <div class="panel-header">
        <h3 class="panel-title" id="daily-panel-title">Tambah Prize</h3>
        <button class="panel-close" id="daily-panel-close">✕</button>
      </div>
      <div class="panel-body" id="daily-panel-body"></div>
    </div>
  `

  _container.querySelector('#daily-add-btn')?.addEventListener('click', () => openPrizeForm(null))
  _container.querySelector('#daily-panel-close')?.addEventListener('click', closePrizePanel)
}

// ─── Data loading ─────────────────────────────────────────────
async function loadData() {
  if (!_supabase) {
    _prizes = [...DEMO_PRIZES]
    _spins = []
    return
  }
  try {
    const [prizesRes, spinsRes] = await Promise.all([
      _supabase.from('daily_prizes').select('*').order('weight', { ascending: false }),
      _supabase.from('daily_spins').select('prize_id, is_used, spun_at').order('spun_at', { ascending: false }).limit(1000),
    ])
    _prizes = prizesRes.data || DEMO_PRIZES
    _spins = spinsRes.data || []
  } catch (e) {
    console.warn('[daily-admin] loadData failed:', e)
    _prizes = [...DEMO_PRIZES]
    _spins = []
  }
}

// ─── Prize table ─────────────────────────────────────────────
function renderPrizes() {
  const tableEl = _container.querySelector('#daily-prizes-table')
  if (!tableEl) return

  const total = _prizes.filter(p => p.is_active).reduce((s, p) => s + (p.weight || 0), 0)

  tableEl.innerHTML = `
    <table class="data-table">
      <thead>
        <tr>
          <th>Prize</th>
          <th>Kategori</th>
          <th>Partner</th>
          <th>Weight</th>
          <th>Peluang</th>
          <th>Aktif</th>
          <th>Aksi</th>
        </tr>
      </thead>
      <tbody>
        ${_prizes.map(p => renderPrizeRow(p, total)).join('')}
      </tbody>
    </table>
  `

  tableEl.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]')
    if (!btn) return
    const { action, id } = btn.dataset
    if (action === 'edit')   openPrizeForm(_prizes.find(p => p.id === id))
    if (action === 'delete') deletePrize(id)
    if (action === 'toggle') toggleActive(id)
  })
}

function renderPrizeRow(p, totalWeight) {
  const pct = totalWeight > 0 ? ((p.weight / totalWeight) * 100).toFixed(1) : 0
  return `
    <tr class="${p.is_active ? '' : 'row-inactive'}">
      <td>
        <span style="font-size:18px;">${p.emoji}</span>
        <span style="margin-left:6px;font-weight:600;">${escHtml(p.label)}</span>
      </td>
      <td>${escHtml(CATEGORIES.find(c => c.value === p.category)?.label || p.category)}</td>
      <td>${escHtml(p.partner_name || '—')}</td>
      <td>
        <span style="font-weight:700;">${p.weight}</span>
        <div class="weight-bar-bg"><div class="weight-bar-fill" style="width:${Math.min(p.weight,100)}%"></div></div>
      </td>
      <td>${p.is_active ? `<strong>${pct}%</strong>` : '—'}</td>
      <td>
        <button class="toggle-btn ${p.is_active ? 'toggle-on' : 'toggle-off'}"
          data-action="toggle" data-id="${p.id}">
          ${p.is_active ? 'ON' : 'OFF'}
        </button>
      </td>
      <td class="action-cell">
        <button class="btn btn-sm" data-action="edit" data-id="${p.id}">Edit</button>
        <button class="btn btn-sm btn-danger" data-action="delete" data-id="${p.id}">Hapus</button>
      </td>
    </tr>
  `
}

// ─── Wheel preview ────────────────────────────────────────────
function renderWheelPreview() {
  const previewEl = _container.querySelector('#daily-wheel-preview')
  if (!previewEl) return

  const active = _prizes.filter(p => p.is_active)
  if (!active.length) { previewEl.innerHTML = '<p style="color:var(--fg-muted);padding:12px;">Tidak ada prize aktif</p>'; return }

  const n = active.length
  const cx = 100, cy = 100, r = 90, textR = 62
  const sliceAngle = (2 * Math.PI) / n
  let paths = ''

  for (let i = 0; i < n; i++) {
    const p = active[i]
    const sa = i * sliceAngle - Math.PI / 2
    const ea = sa + sliceAngle
    const x1 = cx + r * Math.cos(sa), y1 = cy + r * Math.sin(sa)
    const x2 = cx + r * Math.cos(ea), y2 = cy + r * Math.sin(ea)
    const mid = sa + sliceAngle / 2
    const tx = cx + textR * Math.cos(mid), ty = cy + textR * Math.sin(mid)
    const deg = (mid * 180 / Math.PI) + 90
    paths += `
      <path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z" fill="${p.color_hex}" stroke="#fff" stroke-width="1.5"/>
      <text transform="translate(${tx},${ty}) rotate(${deg})" text-anchor="middle" dominant-baseline="middle" font-size="16" style="user-select:none">${p.emoji}</text>
    `
  }

  previewEl.innerHTML = `
    <div style="font-size:12px;font-weight:700;color:var(--fg-muted);margin-bottom:8px;">Preview Roda</div>
    <svg viewBox="0 0 200 200" style="width:180px;height:180px;border-radius:50%;filter:drop-shadow(0 2px 8px rgba(0,0,0,0.15))">
      ${paths}
      <circle cx="${cx}" cy="${cy}" r="16" fill="#fff" stroke="#ddd" stroke-width="1.5"/>
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="12">🎯</text>
    </svg>
  `
}

// ─── Analytics ───────────────────────────────────────────────
function renderAnalytics() {
  renderWheelPreview()

  const now = new Date()
  const thisWeek  = new Date(now - 7  * 86400000)
  const thisMonth = new Date(now - 30 * 86400000)

  const spinsWeek  = _spins.filter(s => new Date(s.spun_at) > thisWeek).length
  const spinsMonth = _spins.filter(s => new Date(s.spun_at) > thisMonth).length
  const usedTotal  = _spins.filter(s => s.is_used).length
  const redeemRate = _spins.length ? ((usedTotal / _spins.length) * 100).toFixed(1) : 0

  const miniEl = _container.querySelector('#daily-analytics-mini')
  if (miniEl) {
    miniEl.innerHTML = `
      <div class="stat-card"><div class="stat-val">${spinsWeek}</div><div class="stat-lbl">Spin minggu ini</div></div>
      <div class="stat-card"><div class="stat-val">${spinsMonth}</div><div class="stat-lbl">Spin bulan ini</div></div>
      <div class="stat-card"><div class="stat-val">${redeemRate}%</div><div class="stat-lbl">Redemption rate</div></div>
    `
  }

  // Prize distribution chart
  const prizeCount = {}
  _spins.forEach(s => { prizeCount[s.prize_id] = (prizeCount[s.prize_id] || 0) + 1 })
  const detailEl = _container.querySelector('#daily-analytics-detail')
  if (detailEl) {
    if (!_spins.length) {
      detailEl.innerHTML = `<p style="color:var(--fg-muted);font-size:13px;padding:8px 0;">Belum ada data spin.</p>`
      return
    }
    const rows = _prizes.map(p => {
      const count = prizeCount[p.id] || 0
      const pct = _spins.length ? Math.round((count / _spins.length) * 100) : 0
      return { p, count, pct }
    }).sort((a, b) => b.count - a.count)

    detailEl.innerHTML = `
      <div class="prize-dist-table">
        ${rows.map(({ p, count, pct }) => `
          <div class="prize-dist-row">
            <span class="prize-dist-emoji">${p.emoji}</span>
            <span class="prize-dist-label">${escHtml(p.label)}</span>
            <div class="prize-dist-bar-wrap">
              <div class="prize-dist-bar" style="width:${pct}%;background:${p.color_hex}"></div>
            </div>
            <span class="prize-dist-count">${count}x (${pct}%)</span>
          </div>
        `).join('')}
      </div>
    `
  }
}

// ─── Prize CRUD ──────────────────────────────────────────────
function openPrizeForm(prize) {
  _editingId = prize?.id || null
  const panel = _container.querySelector('#panel-daily')
  const title = _container.querySelector('#daily-panel-title')
  const body  = _container.querySelector('#daily-panel-body')
  if (!panel || !body) return

  title.textContent = prize ? 'Edit Prize' : 'Tambah Prize'
  body.innerHTML = `
    <form id="prize-form" autocomplete="off">
      <div class="form-row">
        <label class="form-label">Label *</label>
        <input class="form-input" name="label" required value="${escHtml(prize?.label || '')}" placeholder="Free Americano"/>
      </div>
      <div class="form-row">
        <label class="form-label">Deskripsi</label>
        <textarea class="form-input" name="description" rows="2" placeholder="Valid di outlet...">${escHtml(prize?.description || '')}</textarea>
      </div>
      <div class="form-row-2col">
        <div class="form-row">
          <label class="form-label">Emoji *</label>
          <input class="form-input" name="emoji" required value="${escHtml(prize?.emoji || '')}" placeholder="☕" style="font-size:20px;text-align:center;"/>
        </div>
        <div class="form-row">
          <label class="form-label">Kategori *</label>
          <select class="form-input" name="category" required>
            ${CATEGORIES.map(c => `<option value="${c.value}" ${prize?.category === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row-2col">
        <div class="form-row">
          <label class="form-label">Partner</label>
          <input class="form-input" name="partner_name" value="${escHtml(prize?.partner_name || '')}" placeholder="Kopi Kenangan"/>
        </div>
        <div class="form-row">
          <label class="form-label">Warna Segmen</label>
          <div style="display:flex;align-items:center;gap:8px;">
            <input type="color" name="color_hex" value="${prize?.color_hex || '#E60012'}" style="width:40px;height:36px;border:none;border-radius:6px;cursor:pointer;"/>
            <span id="color-preview" style="font-size:11px;color:var(--fg-muted);">${prize?.color_hex || '#E60012'}</span>
          </div>
        </div>
      </div>
      <div class="form-row">
        <label class="form-label">Partner URL (gunakan {{code}} untuk kode voucher)</label>
        <input class="form-input" name="partner_url" value="${escHtml(prize?.partner_url || '')}" placeholder="https://partner.com/redeem?code={{code}}"/>
      </div>
      <div class="form-row-2col">
        <div class="form-row">
          <label class="form-label">Weight (1–100) *</label>
          <input class="form-input" name="weight" type="number" min="1" max="100" required value="${prize?.weight || 10}"/>
        </div>
        <div class="form-row">
          <label class="form-label">Voucher Prefix</label>
          <input class="form-input" name="voucher_prefix" value="${escHtml(prize?.voucher_prefix || 'MUFG')}" placeholder="MUFG-COFFEE"/>
        </div>
      </div>
      <div class="form-row">
        <label class="form-label toggle-label">
          <span>Aktif</span>
          <label class="switch">
            <input type="checkbox" name="is_active" ${prize?.is_active !== false ? 'checked' : ''}/>
            <span class="slider"></span>
          </label>
        </label>
      </div>
      <div class="form-actions">
        <button type="button" class="btn" id="cancel-prize-btn">Batal</button>
        <button type="submit" class="btn btn-primary">${prize ? 'Simpan' : 'Tambah'}</button>
      </div>
    </form>
  `

  // Color preview
  body.querySelector('[name="color_hex"]')?.addEventListener('input', e => {
    const preview = body.querySelector('#color-preview')
    if (preview) preview.textContent = e.target.value
  })

  body.querySelector('#cancel-prize-btn')?.addEventListener('click', closePrizePanel)

  body.querySelector('#prize-form')?.addEventListener('submit', async e => {
    e.preventDefault()
    const fd = new FormData(e.target)
    const data = {
      label:          fd.get('label')?.trim(),
      description:    fd.get('description')?.trim() || null,
      emoji:          fd.get('emoji')?.trim(),
      category:       fd.get('category'),
      partner_name:   fd.get('partner_name')?.trim() || null,
      partner_url:    fd.get('partner_url')?.trim() || null,
      color_hex:      fd.get('color_hex'),
      weight:         parseInt(fd.get('weight'), 10) || 10,
      voucher_prefix: fd.get('voucher_prefix')?.trim() || 'MUFG',
      is_active:      fd.get('is_active') === 'on',
    }
    await savePrize(data)
  })

  panel.classList.remove('hidden')
  openPanel('panel-daily')
}

function closePrizePanel() {
  const panel = _container.querySelector('#panel-daily')
  if (panel) panel.classList.add('hidden')
  closePanel()
}

async function savePrize(data) {
  if (!_supabase) {
    if (_editingId) {
      const idx = _prizes.findIndex(p => p.id === _editingId)
      if (idx > -1) _prizes[idx] = { ..._prizes[idx], ...data }
    } else {
      _prizes.push({ id: 'demo-' + Date.now(), ...data })
    }
    toast('Prize disimpan (demo mode)', 'success')
    closePrizePanel()
    renderPrizes()
    renderAnalytics()
    return
  }
  try {
    if (_editingId) {
      const { error } = await _supabase.from('daily_prizes').update(data).eq('id', _editingId)
      if (error) throw error
    } else {
      const { error } = await _supabase.from('daily_prizes').insert(data)
      if (error) throw error
    }
    toast('Prize disimpan', 'success')
    closePrizePanel()
    await loadData()
    renderPrizes()
    renderAnalytics()
  } catch (e) {
    toast(`Gagal menyimpan: ${e.message}`, 'error')
  }
}

async function deletePrize(id) {
  confirm('Hapus Prize', 'Prize ini akan dihapus permanen.', async () => {
    if (!_supabase) {
      _prizes = _prizes.filter(p => p.id !== id)
      toast('Dihapus (demo mode)', 'success')
      renderPrizes()
      renderAnalytics()
      return
    }
    try {
      const { error } = await _supabase.from('daily_prizes').delete().eq('id', id)
      if (error) throw error
      toast('Prize dihapus', 'success')
      await loadData()
      renderPrizes()
      renderAnalytics()
    } catch (e) {
      toast(`Gagal menghapus: ${e.message}`, 'error')
    }
  })
}

async function toggleActive(id) {
  const prize = _prizes.find(p => p.id === id)
  if (!prize) return
  const newVal = !prize.is_active
  if (!_supabase) {
    prize.is_active = newVal
    renderPrizes()
    renderAnalytics()
    return
  }
  try {
    const { error } = await _supabase.from('daily_prizes').update({ is_active: newVal }).eq('id', id)
    if (error) throw error
    prize.is_active = newVal
    renderPrizes()
    renderAnalytics()
  } catch (e) {
    toast(`Gagal update: ${e.message}`, 'error')
  }
}

// ─── HTML escape helper ──────────────────────────────────────
function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
