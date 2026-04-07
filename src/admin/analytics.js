/**
 * admin/analytics.js — Analytics dashboard module (read-only)
 * Export: initAnalytics(container, supabase)
 */

import { toast, skeletonRows, formatDate, formatIDR } from './components.js'

// ─── Demo data ───────────────────────────────
function makeDemoEvents() {
  const offerTitles = ['Motor Honda Beat', 'iPhone 16 Pro', 'AC Sharp 1PK', 'KPR BCA', 'Pinjaman Multiguna']
  const providers = ['Bank BCA', 'Bank Mandiri', 'Bank BRI']
  const codes = ['EMP-A1B2C3', 'EMP-D4E5F6', 'EMP-G7H8I9', 'EMP-J1K2L3', 'EMP-M4N5O6']

  const events = []
  const now = Date.now()
  for (let i = 0; i < 60; i++) {
    const daysAgo = Math.floor(Math.random() * 30)
    const offerIdx = Math.floor(Math.random() * offerTitles.length)
    events.push({
      id: 'demo-ev-' + i,
      offer_id: 'demo-o' + offerIdx,
      employee_code: codes[Math.floor(Math.random() * codes.length)],
      redirected_at: new Date(now - daysAgo * 86400000 - Math.random() * 86400000).toISOString(),
      offers: {
        id: 'demo-o' + offerIdx,
        title: offerTitles[offerIdx],
        category: ['vehicle','electronics','appliance','personal_loan','insurance'][offerIdx % 5],
        providers: { name: providers[offerIdx % 3] }
      }
    })
  }
  return events.sort((a, b) => new Date(b.redirected_at) - new Date(a.redirected_at))
}

// ─── State ───────────────────────────────────
let _events = []
let _supabase = null
let _container = null
let _eventsPage = 0
const EVENTS_PAGE_SIZE = 20

// ─── Init ────────────────────────────────────
export async function initAnalytics(container, supabase) {
  _container = container
  _supabase = supabase
  _eventsPage = 0

  _container.innerHTML = `
    <div class="section-header">
      <div class="section-title-row">
        <h2 class="section-title">Analitik</h2>
        <button class="btn btn-secondary" id="export-csv-btn">↓ Export CSV</button>
      </div>
    </div>

    <!-- Summary Cards -->
    <div class="analytics-cards" id="analytics-cards">
      ${summaryCardSkeleton()}
    </div>

    <!-- Bar Chart -->
    <div class="analytics-chart-wrap">
      <h3 class="analytics-subtitle">Redirect per Hari (30 Hari Terakhir)</h3>
      <canvas id="redirects-chart" width="800" height="220"></canvas>
    </div>

    <!-- Leaderboard -->
    <div class="analytics-section">
      <h3 class="analytics-subtitle">Peringkat Penawaran</h3>
      <div class="table-wrap">
        <table class="data-table" id="leaderboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Judul Penawaran</th>
              <th>Provider</th>
              <th>Kategori</th>
              <th>Total Redirect</th>
              <th>Redirect Terakhir</th>
            </tr>
          </thead>
          <tbody id="leaderboard-tbody">
            ${skeletonRows(5, 6)}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Raw Events -->
    <div class="analytics-section">
      <h3 class="analytics-subtitle">Log Redirect Mentah</h3>
      <div class="table-wrap">
        <table class="data-table" id="events-table">
          <thead>
            <tr>
              <th>Penawaran</th>
              <th>Kode Karyawan</th>
              <th>Waktu Redirect</th>
            </tr>
          </thead>
          <tbody id="events-tbody">
            ${skeletonRows(5, 3)}
          </tbody>
        </table>
      </div>
      <div class="pagination-row" id="events-pagination"></div>
    </div>
  `

  _container.querySelector('#export-csv-btn').addEventListener('click', exportCSV)

  await loadData()
}

function summaryCardSkeleton() {
  return Array.from({ length: 4 }, () => `
    <div class="analytics-card">
      <div class="skeleton-line" style="width:50%;height:14px;margin-bottom:10px"></div>
      <div class="skeleton-line" style="width:35%;height:28px"></div>
    </div>
  `).join('')
}

async function loadData() {
  if (!_supabase) {
    _events = makeDemoEvents()
    render()
    return
  }

  try {
    const { data, error } = await _supabase
      .from('redirect_events')
      .select('*, offers(id, title, category, providers(name))')
      .order('redirected_at', { ascending: false })
      .limit(2000)

    if (error) throw error
    _events = data || []
    render()
  } catch (err) {
    console.error('Gagal memuat analitik:', err)
    toast('Gagal memuat data analitik: ' + err.message, 'error')
    _events = []
    render()
  }
}

function render() {
  renderSummaryCards()
  renderChart()
  renderLeaderboard()
  renderEventsTable()
}

// ─── Summary Cards ───────────────────────────
function renderSummaryCards() {
  const cardsEl = _container.querySelector('#analytics-cards')
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const total = _events.length
  const thisMonth = _events.filter(e => new Date(e.redirected_at) >= startOfMonth).length
  const thisWeek = _events.filter(e => new Date(e.redirected_at) >= startOfWeek).length

  // Find top offer
  const counts = {}
  _events.forEach(e => {
    const key = e.offers?.title || e.offer_id || 'Unknown'
    counts[key] = (counts[key] || 0) + 1
  })
  const topOffer = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]

  cardsEl.innerHTML = `
    <div class="analytics-card">
      <div class="card-label">Total Redirect</div>
      <div class="card-value">${total.toLocaleString('id-ID')}</div>
    </div>
    <div class="analytics-card">
      <div class="card-label">Bulan Ini</div>
      <div class="card-value">${thisMonth.toLocaleString('id-ID')}</div>
    </div>
    <div class="analytics-card">
      <div class="card-label">Minggu Ini</div>
      <div class="card-value">${thisWeek.toLocaleString('id-ID')}</div>
    </div>
    <div class="analytics-card">
      <div class="card-label">Penawaran Terpopuler</div>
      <div class="card-value card-value-sm">${topOffer ? topOffer[0] : '—'}</div>
      ${topOffer ? `<div class="card-sub">${topOffer[1]} redirect</div>` : ''}
    </div>
  `
}

// ─── Bar Chart (pure canvas) ─────────────────
function renderChart() {
  const canvas = _container.querySelector('#redirects-chart')
  if (!canvas) return
  const ctx = canvas.getContext('2d')

  // Build last-30-days buckets
  const now = new Date()
  const buckets = {}
  const labels = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    buckets[key] = 0
    labels.push(key)
  }

  _events.forEach(e => {
    const key = (e.redirected_at || '').slice(0, 10)
    if (key in buckets) buckets[key]++
  })

  const values = labels.map(l => buckets[l])
  const maxVal = Math.max(...values, 1)

  // Canvas dimensions
  const W = canvas.offsetWidth || 800
  const H = 220
  canvas.width = W
  canvas.height = H

  const PAD_LEFT = 40
  const PAD_RIGHT = 16
  const PAD_TOP = 16
  const PAD_BOTTOM = 36
  const chartW = W - PAD_LEFT - PAD_RIGHT
  const chartH = H - PAD_TOP - PAD_BOTTOM
  const barW = Math.max(2, chartW / labels.length - 2)

  ctx.clearRect(0, 0, W, H)

  // Grid lines
  const gridLines = 4
  ctx.strokeStyle = '#2a2a2e'
  ctx.lineWidth = 1
  ctx.font = '11px sans-serif'
  ctx.fillStyle = '#555'
  ctx.textAlign = 'right'

  for (let i = 0; i <= gridLines; i++) {
    const y = PAD_TOP + (chartH / gridLines) * i
    ctx.beginPath()
    ctx.moveTo(PAD_LEFT, y)
    ctx.lineTo(W - PAD_RIGHT, y)
    ctx.stroke()
    const val = Math.round(maxVal * (1 - i / gridLines))
    ctx.fillText(val, PAD_LEFT - 4, y + 4)
  }

  // Bars
  const BAR_COLOR = '#E60012'
  const BAR_COLOR_HOVER = '#ff3344'

  labels.forEach((label, i) => {
    const val = values[i]
    const barH = (val / maxVal) * chartH
    const x = PAD_LEFT + i * (chartW / labels.length) + 1
    const y = PAD_TOP + chartH - barH

    ctx.fillStyle = BAR_COLOR
    ctx.beginPath()
    ctx.roundRect ? ctx.roundRect(x, y, barW, barH, [2, 2, 0, 0]) : ctx.rect(x, y, barW, barH)
    ctx.fill()
  })

  // X-axis labels (every 5 days)
  ctx.fillStyle = '#666'
  ctx.textAlign = 'center'
  ctx.font = '10px sans-serif'
  labels.forEach((label, i) => {
    if (i % 5 === 0 || i === labels.length - 1) {
      const x = PAD_LEFT + i * (chartW / labels.length) + barW / 2
      const dateStr = label.slice(5) // MM-DD
      ctx.fillText(dateStr.replace('-', '/'), x, H - 8)
    }
  })

  // Axis line
  ctx.strokeStyle = '#333'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(PAD_LEFT, PAD_TOP)
  ctx.lineTo(PAD_LEFT, H - PAD_BOTTOM)
  ctx.lineTo(W - PAD_RIGHT, H - PAD_BOTTOM)
  ctx.stroke()
}

// ─── Leaderboard ─────────────────────────────
function renderLeaderboard() {
  const tbody = _container.querySelector('#leaderboard-tbody')

  // Aggregate by offer
  const offerMap = {}
  _events.forEach(e => {
    const id = e.offer_id || 'unknown'
    if (!offerMap[id]) {
      offerMap[id] = {
        title: e.offers?.title || '—',
        provider: e.offers?.providers?.name || '—',
        category: e.offers?.category || '—',
        count: 0,
        lastRedirect: null
      }
    }
    offerMap[id].count++
    const ts = e.redirected_at
    if (!offerMap[id].lastRedirect || ts > offerMap[id].lastRedirect) {
      offerMap[id].lastRedirect = ts
    }
  })

  const ranked = Object.values(offerMap).sort((a, b) => b.count - a.count)

  if (ranked.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Belum ada data redirect</td></tr>`
    return
  }

  tbody.innerHTML = ranked.map((r, i) => `
    <tr>
      <td style="color:#666;font-weight:600">${i + 1}</td>
      <td>${r.title}</td>
      <td>${r.provider}</td>
      <td>${r.category}</td>
      <td><strong>${r.count.toLocaleString('id-ID')}</strong></td>
      <td>${formatDate(r.lastRedirect)}</td>
    </tr>
  `).join('')
}

// ─── Raw Events Table ─────────────────────────
function renderEventsTable() {
  const tbody = _container.querySelector('#events-tbody')
  const paginationEl = _container.querySelector('#events-pagination')

  const total = _events.length
  const totalPages = Math.ceil(total / EVENTS_PAGE_SIZE)
  const paginated = _events.slice(_eventsPage * EVENTS_PAGE_SIZE, (_eventsPage + 1) * EVENTS_PAGE_SIZE)

  if (total === 0) {
    tbody.innerHTML = `<tr><td colspan="3" class="empty-state">Belum ada log redirect</td></tr>`
    paginationEl.innerHTML = ''
    return
  }

  tbody.innerHTML = paginated.map(e => `
    <tr>
      <td>${e.offers?.title || e.offer_id || '—'}</td>
      <td><code class="code-mono">${e.employee_code || '—'}</code></td>
      <td>${formatEventTime(e.redirected_at)}</td>
    </tr>
  `).join('')

  // Pagination
  if (totalPages > 1) {
    paginationEl.innerHTML = `
      <button class="btn btn-sm btn-secondary" id="ev-prev" ${_eventsPage === 0 ? 'disabled' : ''}>← Sebelumnya</button>
      <span class="page-info">Halaman ${_eventsPage + 1} / ${totalPages} (${total} event)</span>
      <button class="btn btn-sm btn-secondary" id="ev-next" ${_eventsPage >= totalPages - 1 ? 'disabled' : ''}>Berikutnya →</button>
    `
    paginationEl.querySelector('#ev-prev').addEventListener('click', () => { _eventsPage--; renderEventsTable() })
    paginationEl.querySelector('#ev-next').addEventListener('click', () => { _eventsPage++; renderEventsTable() })
  } else {
    paginationEl.innerHTML = `<span class="page-info">${total} event</span>`
  }
}

function formatEventTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// ─── Export CSV ───────────────────────────────
function exportCSV() {
  if (_events.length === 0) {
    toast('Tidak ada data untuk diekspor', 'warn')
    return
  }

  const headers = ['offer_id', 'offer_title', 'provider', 'category', 'employee_code', 'redirected_at']
  const rows = _events.map(e => [
    e.offer_id || '',
    (e.offers?.title || '').replace(/,/g, ';'),
    (e.offers?.providers?.name || '').replace(/,/g, ';'),
    e.offers?.category || '',
    e.employee_code || '',
    e.redirected_at || ''
  ])

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `redirect-events-${new Date().toISOString().slice(0,10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  toast(`${_events.length} baris diekspor ke CSV`, 'success')
}
