/**
 * admin/offers.js — Offers CRUD module
 * Export: initOffers(container, supabase)
 */

import {
  toast, confirm, skeletonRows, toggleHTML,
  categoryPill, categoryLabel, formatIDR, formatDate,
  isExpired, openPanel, closePanel, slugify
} from './components.js'

// ─── Sample data for demo/offline mode ───────────────────────
const DEMO_OFFERS = [
  {
    id: 'demo-1', emoji: '🏍️', title: 'Motor Honda Beat 2024', subtitle: 'Cicilan ringan tanpa uang muka',
    category: 'vehicle', category_label: 'Kendaraan', brand_label: 'Honda',
    provider_id: 'demo-p1', providers: { name: 'Bank BCA', slug: 'bank-bca' },
    badge: 'DP 0%', interest_rate: 3.5, monthly_from: 850000,
    min_loan: 5000000, max_loan: 30000000, min_tenure: 12, max_tenure: 36,
    checkout_url: '#', is_featured: true, valid_until: '2026-12-31', created_at: new Date().toISOString()
  },
  {
    id: 'demo-2', emoji: '📱', title: 'iPhone 16 Pro Max', subtitle: 'Cicilan 0% hingga 24 bulan',
    category: 'electronics', category_label: 'Elektronik', brand_label: 'Apple',
    provider_id: 'demo-p2', providers: { name: 'Bank Mandiri', slug: 'bank-mandiri' },
    badge: 'Disc 15%', interest_rate: 0, monthly_from: 1200000,
    min_loan: 10000000, max_loan: 25000000, min_tenure: 6, max_tenure: 24,
    checkout_url: '#', is_featured: false, valid_until: '2026-06-30', created_at: new Date().toISOString()
  },
]

const DEMO_PROVIDERS = [
  { id: 'demo-p1', name: 'Bank BCA' },
  { id: 'demo-p2', name: 'Bank Mandiri' },
  { id: 'demo-p3', name: 'Bank BRI' },
]

const CATEGORIES = [
  { value: 'vehicle',       label: 'Kendaraan' },
  { value: 'electronics',   label: 'Elektronik' },
  { value: 'appliance',     label: 'Peralatan Rumah' },
  { value: 'personal_loan', label: 'Pinjaman Pribadi' },
  { value: 'insurance',     label: 'Asuransi' },
]

const EMOJIS = ['🏍️','🛵','🚗','🚙','📱','💻','❄️','💰','🛡️','📦','🏠','🎁','🔧','⚡','🌟','🚐']

const BADGE_CHIPS = ['DP 0%', 'Disc 15%', 'LOW RATE', 'Cair 1 Hari', 'Bunga 0%', 'Cashback 10%']

// ─── State ───────────────────────────────────
let _offers = []
let _providers = []
let _supabase = null
let _container = null
let _search = ''
let _filterCat = ''
let _filterFeatured = ''
let _sortCol = 'title'
let _sortDir = 'asc'
let _editingId = null

// ─── Main init ───────────────────────────────
export async function initOffers(container, supabase) {
  _container = container
  _supabase = supabase

  _container.innerHTML = `
    <div class="section-header">
      <div class="section-title-row">
        <h2 class="section-title">Penawaran</h2>
        <button class="btn btn-primary" id="offers-add-btn">+ Tambah Penawaran</button>
      </div>
      <div class="table-controls">
        <input class="form-input search-input" id="offers-search" placeholder="Cari judul, badge, brand…" type="search" />
        <select class="form-input select-input" id="offers-filter-cat">
          <option value="">Semua Kategori</option>
          ${CATEGORIES.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
        </select>
        <select class="form-input select-input" id="offers-filter-featured">
          <option value="">Semua</option>
          <option value="true">Unggulan</option>
          <option value="false">Reguler</option>
        </select>
      </div>
    </div>

    <div class="table-wrap">
      <table class="data-table" id="offers-table">
        <thead>
          <tr>
            <th class="th-emoji">Icon</th>
            <th class="sortable" data-col="title">Judul</th>
            <th class="sortable" data-col="category">Kategori</th>
            <th>Provider</th>
            <th>Badge</th>
            <th class="sortable" data-col="interest_rate">Rate</th>
            <th class="sortable" data-col="monthly_from">Cicilan/Bln</th>
            <th>Unggulan</th>
            <th class="sortable" data-col="valid_until">Berlaku Hingga</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody id="offers-tbody">
          ${skeletonRows(5, 11)}
        </tbody>
      </table>
    </div>
    <p class="table-count" id="offers-count"></p>

    <!-- Slide-in Panel -->
    <aside class="slide-panel" id="offer-panel" aria-label="Form Penawaran">
      <div class="panel-header">
        <h2 class="panel-title" id="offer-panel-title">Tambah Penawaran</h2>
        <button class="panel-close" id="offer-panel-close" aria-label="Tutup">✕</button>
      </div>
      <div class="panel-body" id="offer-panel-body"></div>
    </aside>
  `

  // Wire controls
  _container.querySelector('#offers-add-btn').addEventListener('click', () => openOfferPanel(null))
  _container.querySelector('#offers-search').addEventListener('input', e => { _search = e.target.value; renderRows() })
  _container.querySelector('#offers-filter-cat').addEventListener('change', e => { _filterCat = e.target.value; renderRows() })
  _container.querySelector('#offers-filter-featured').addEventListener('change', e => { _filterFeatured = e.target.value; renderRows() })
  _container.querySelector('#offer-panel-close').addEventListener('click', () => closePanel('offer-panel'))

  // Sortable headers
  _container.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col
      if (_sortCol === col) _sortDir = _sortDir === 'asc' ? 'desc' : 'asc'
      else { _sortCol = col; _sortDir = 'asc' }
      _container.querySelectorAll('.sortable').forEach(h => h.classList.remove('sort-asc','sort-desc'))
      th.classList.add(_sortDir === 'asc' ? 'sort-asc' : 'sort-desc')
      renderRows()
    })
  })

  await loadData()
}

async function loadData() {
  if (!_supabase) {
    _offers = DEMO_OFFERS
    _providers = DEMO_PROVIDERS
    renderRows()
    return
  }

  try {
    const [offRes, provRes] = await Promise.all([
      _supabase.from('offers').select('*, providers(id, name, slug)').order('created_at', { ascending: false }),
      _supabase.from('providers').select('id, name').order('name')
    ])
    if (offRes.error) throw offRes.error
    if (provRes.error) throw provRes.error
    _offers = offRes.data || []
    _providers = provRes.data || []
    renderRows()
  } catch (err) {
    console.error('Gagal memuat penawaran:', err)
    toast('Gagal memuat penawaran: ' + err.message, 'error')
    _offers = []
    renderRows()
  }
}

function filteredOffers() {
  let list = [..._offers]

  if (_search) {
    const q = _search.toLowerCase()
    list = list.filter(o =>
      (o.title || '').toLowerCase().includes(q) ||
      (o.badge || '').toLowerCase().includes(q) ||
      (o.brand_label || '').toLowerCase().includes(q) ||
      (o.providers?.name || '').toLowerCase().includes(q)
    )
  }
  if (_filterCat) list = list.filter(o => o.category === _filterCat)
  if (_filterFeatured !== '') list = list.filter(o => String(o.is_featured) === _filterFeatured)

  list.sort((a, b) => {
    let av = a[_sortCol] ?? ''
    let bv = b[_sortCol] ?? ''
    if (typeof av === 'string') av = av.toLowerCase()
    if (typeof bv === 'string') bv = bv.toLowerCase()
    if (av < bv) return _sortDir === 'asc' ? -1 : 1
    if (av > bv) return _sortDir === 'asc' ? 1 : -1
    return 0
  })

  return list
}

function renderRows() {
  const tbody = _container.querySelector('#offers-tbody')
  const countEl = _container.querySelector('#offers-count')
  const list = filteredOffers()

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" class="empty-state">Tidak ada penawaran ditemukan</td></tr>`
    countEl.textContent = ''
    return
  }

  countEl.textContent = `${list.length} penawaran`

  tbody.innerHTML = list.map(o => {
    const expired = isExpired(o.valid_until)
    const statusPill = expired
      ? `<span class="pill pill-error">Kedaluwarsa</span>`
      : `<span class="pill pill-success">Aktif</span>`

    return `
      <tr data-id="${o.id}">
        <td class="td-emoji">${o.emoji || '📦'}</td>
        <td>
          <div class="cell-title">${o.title || '—'}</div>
          ${o.subtitle ? `<div class="cell-sub">${o.subtitle}</div>` : ''}
        </td>
        <td>${categoryPill(o.category)}</td>
        <td>${o.providers?.name || '—'}</td>
        <td>${o.badge ? `<span class="pill pill-badge">${o.badge}</span>` : '—'}</td>
        <td>${o.interest_rate !== null && o.interest_rate !== undefined ? o.interest_rate + '%' : '—'}</td>
        <td>${formatIDR(o.monthly_from)}</td>
        <td>
          <label class="toggle">
            <input type="checkbox" class="featured-toggle" data-id="${o.id}" ${o.is_featured ? 'checked' : ''}>
            <span class="toggle-track"></span>
          </label>
        </td>
        <td>${formatDate(o.valid_until)}</td>
        <td>${statusPill}</td>
        <td>
          <div class="action-btns">
            <button class="btn btn-sm btn-secondary edit-btn" data-id="${o.id}">Edit</button>
            <button class="btn btn-sm btn-danger delete-btn" data-id="${o.id}">Hapus</button>
          </div>
        </td>
      </tr>
    `
  }).join('')

  // Wire row actions
  tbody.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const offer = _offers.find(o => o.id === btn.dataset.id)
      if (offer) openOfferPanel(offer)
    })
  })

  tbody.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const offer = _offers.find(o => o.id === btn.dataset.id)
      if (!offer) return
      confirm(
        'Hapus Penawaran',
        `Yakin ingin menghapus "${offer.title}"? Tindakan ini tidak dapat dibatalkan.`,
        async () => { await deleteOffer(offer.id) },
        true
      )
    })
  })

  tbody.querySelectorAll('.featured-toggle').forEach(chk => {
    chk.addEventListener('change', async () => {
      await toggleFeatured(chk.dataset.id, chk.checked)
    })
  })
}

async function toggleFeatured(id, value) {
  const offer = _offers.find(o => o.id === id)
  if (offer) offer.is_featured = value

  if (!_supabase) {
    toast(value ? 'Ditandai sebagai unggulan' : 'Dibatalkan dari unggulan', 'success')
    return
  }

  const { error } = await _supabase.from('offers').update({ is_featured: value }).eq('id', id)
  if (error) {
    toast('Gagal memperbarui: ' + error.message, 'error')
    if (offer) offer.is_featured = !value
    renderRows()
  } else {
    toast(value ? 'Ditandai sebagai unggulan' : 'Dibatalkan dari unggulan', 'success')
  }
}

async function deleteOffer(id) {
  if (!_supabase) {
    _offers = _offers.filter(o => o.id !== id)
    renderRows()
    toast('Penawaran dihapus (demo)', 'success')
    return
  }

  const { error } = await _supabase.from('offers').delete().eq('id', id)
  if (error) {
    toast('Gagal menghapus: ' + error.message, 'error')
  } else {
    _offers = _offers.filter(o => o.id !== id)
    renderRows()
    toast('Penawaran berhasil dihapus', 'success')
  }
}

// ─── Panel / Form ────────────────────────────
function openOfferPanel(offer) {
  _editingId = offer?.id || null
  const panelTitle = _container.querySelector('#offer-panel-title')
  const panelBody = _container.querySelector('#offer-panel-body')

  panelTitle.textContent = offer ? 'Edit Penawaran' : 'Tambah Penawaran'

  const selectedEmoji = offer?.emoji || '🏍️'
  const selectedCat = offer?.category || ''

  panelBody.innerHTML = `
    <form id="offer-form" class="panel-form" autocomplete="off">

      <div class="form-group">
        <label class="form-label">Emoji / Icon</label>
        <div class="emoji-grid" id="emoji-grid">
          ${EMOJIS.map(e => `
            <button type="button" class="emoji-btn ${e === selectedEmoji ? 'selected' : ''}" data-emoji="${e}">${e}</button>
          `).join('')}
        </div>
        <div class="emoji-custom-row">
          <input class="form-input" id="emoji-custom" placeholder="Atau ketik emoji sendiri…" style="width:200px">
          <span id="emoji-preview" style="font-size:24px;margin-left:8px">${selectedEmoji}</span>
        </div>
        <input type="hidden" id="f-emoji" value="${selectedEmoji}">
      </div>

      <div class="form-row">
        <div class="form-group flex-1">
          <label class="form-label" for="f-title">Judul <span class="req">*</span></label>
          <input class="form-input" id="f-title" type="text" required placeholder="Contoh: Motor Honda Beat 2024" value="${offer?.title || ''}">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="f-subtitle">Subjudul</label>
        <textarea class="form-input" id="f-subtitle" rows="2" placeholder="Deskripsi singkat penawaran…">${offer?.subtitle || ''}</textarea>
      </div>

      <div class="form-row">
        <div class="form-group flex-1">
          <label class="form-label" for="f-category">Kategori <span class="req">*</span></label>
          <select class="form-input" id="f-category" required>
            <option value="">— Pilih Kategori —</option>
            ${CATEGORIES.map(c => `<option value="${c.value}" ${selectedCat === c.value ? 'selected' : ''}>${c.label}</option>`).join('')}
          </select>
        </div>
        <div class="form-group flex-1">
          <label class="form-label" for="f-category-label">Label Kategori</label>
          <input class="form-input" id="f-category-label" type="text" placeholder="Auto-isi dari kategori" value="${offer?.category_label || ''}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group flex-1">
          <label class="form-label" for="f-brand-label">Label Brand</label>
          <input class="form-input" id="f-brand-label" type="text" placeholder="Contoh: Honda, Apple" value="${offer?.brand_label || ''}">
        </div>
        <div class="form-group flex-1">
          <label class="form-label" for="f-provider">Provider <span class="req">*</span></label>
          <select class="form-input" id="f-provider" required>
            <option value="">— Pilih Provider —</option>
            ${_providers.map(p => `<option value="${p.id}" ${offer?.provider_id === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group flex-1">
          <label class="form-label" for="f-rate">Bunga / Rate (%)</label>
          <input class="form-input" id="f-rate" type="number" min="0" step="0.1" placeholder="0.0" value="${offer?.interest_rate ?? ''}">
        </div>
        <div class="form-group flex-1">
          <label class="form-label" for="f-tenure-min">Tenor Min (bln)</label>
          <input class="form-input" id="f-tenure-min" type="number" min="1" placeholder="6" value="${offer?.min_tenure ?? ''}">
        </div>
        <div class="form-group flex-1">
          <label class="form-label" for="f-tenure-max">Tenor Maks (bln)</label>
          <input class="form-input" id="f-tenure-max" type="number" min="1" placeholder="60" value="${offer?.max_tenure ?? ''}">
        </div>
      </div>

      <div class="form-row">
        <div class="form-group flex-1">
          <label class="form-label" for="f-loan-min">Pinjaman Min (Rp)</label>
          <input class="form-input" id="f-loan-min" type="number" min="0" placeholder="5000000" value="${offer?.min_loan ?? ''}">
        </div>
        <div class="form-group flex-1">
          <label class="form-label" for="f-loan-max">Pinjaman Maks (Rp)</label>
          <input class="form-input" id="f-loan-max" type="number" min="0" placeholder="100000000" value="${offer?.max_loan ?? ''}">
        </div>
        <div class="form-group flex-1">
          <label class="form-label" for="f-dp">Uang Muka (%)</label>
          <input class="form-input" id="f-dp" type="number" min="0" max="100" step="0.5" placeholder="10" value="${offer?.down_payment_pct ?? ''}">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="f-badge">Badge</label>
        <div class="chip-row">
          ${BADGE_CHIPS.map(c => `<button type="button" class="chip" data-badge="${c}">${c}</button>`).join('')}
        </div>
        <input class="form-input" id="f-badge" type="text" placeholder="Contoh: DP 0%" value="${offer?.badge || ''}">
      </div>

      <div class="form-row">
        <div class="form-group flex-1">
          <label class="form-label" for="f-monthly">Cicilan/Bulan Dari (Rp)</label>
          <input class="form-input" id="f-monthly" type="number" min="0" placeholder="850000" value="${offer?.monthly_from ?? ''}">
        </div>
        <div class="form-group" style="align-self:flex-end;padding-bottom:4px">
          <button type="button" class="btn btn-secondary" id="calc-monthly-btn">Hitung</button>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group flex-1">
          <label class="form-label" for="f-valid-until">Berlaku Hingga</label>
          <input class="form-input" id="f-valid-until" type="date" value="${offer?.valid_until?.slice(0,10) || ''}">
        </div>
        <div class="form-group flex-1">
          <label class="form-label">Unggulan</label>
          ${toggleHTML('f-featured', offer?.is_featured || false)}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="f-checkout-url">URL Checkout</label>
        <input class="form-input" id="f-checkout-url" type="url" placeholder="https://…" value="${offer?.checkout_url || ''}">
      </div>

      <div class="panel-footer">
        ${_editingId ? `<button type="button" class="btn btn-danger" id="offer-delete-btn">Hapus</button>` : '<span></span>'}
        <div class="footer-right">
          <button type="button" class="btn btn-secondary" id="offer-cancel-btn">Batal</button>
          <button type="submit" class="btn btn-primary" id="offer-save-btn">Simpan</button>
        </div>
      </div>

    </form>
  `

  // Emoji picker logic
  const emojiGrid = panelBody.querySelector('#emoji-grid')
  const emojiHidden = panelBody.querySelector('#f-emoji')
  const emojiPreview = panelBody.querySelector('#emoji-preview')
  const emojiCustom = panelBody.querySelector('#emoji-custom')

  emojiGrid.addEventListener('click', e => {
    const btn = e.target.closest('.emoji-btn')
    if (!btn) return
    emojiGrid.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'))
    btn.classList.add('selected')
    emojiHidden.value = btn.dataset.emoji
    emojiPreview.textContent = btn.dataset.emoji
    emojiCustom.value = ''
  })

  emojiCustom.addEventListener('input', () => {
    const val = emojiCustom.value.trim()
    if (val) {
      emojiGrid.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'))
      emojiHidden.value = val
      emojiPreview.textContent = val
    }
  })

  // Category auto-fill label
  panelBody.querySelector('#f-category').addEventListener('change', e => {
    const label = categoryLabel(e.target.value)
    panelBody.querySelector('#f-category-label').value = label
  })

  // Badge chips
  panelBody.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      panelBody.querySelector('#f-badge').value = chip.dataset.badge
    })
  })

  // Monthly calc
  panelBody.querySelector('#calc-monthly-btn').addEventListener('click', () => {
    const loan = parseFloat(panelBody.querySelector('#f-loan-min').value) || 0
    const rate = parseFloat(panelBody.querySelector('#f-rate').value) || 0
    const tenure = parseFloat(panelBody.querySelector('#f-tenure-min').value) || 12
    if (loan && tenure) {
      const monthly = rate > 0
        ? (loan * (rate/100/12)) / (1 - Math.pow(1 + rate/100/12, -tenure))
        : loan / tenure
      panelBody.querySelector('#f-monthly').value = Math.round(monthly)
    }
  })

  // Chip chips
  panelBody.querySelector('#offer-cancel-btn').addEventListener('click', () => closePanel('offer-panel'))

  if (_editingId) {
    panelBody.querySelector('#offer-delete-btn').addEventListener('click', () => {
      const offerName = panelBody.querySelector('#f-title').value || 'penawaran ini'
      confirm('Hapus Penawaran', `Yakin ingin menghapus "${offerName}"?`, async () => {
        await deleteOffer(_editingId)
        closePanel('offer-panel')
      }, true)
    })
  }

  panelBody.querySelector('#offer-form').addEventListener('submit', async e => {
    e.preventDefault()
    await saveOffer()
  })

  openPanel('offer-panel')
}

async function saveOffer() {
  const panel = _container.querySelector('#offer-panel-body')
  const saveBtn = panel.querySelector('#offer-save-btn')

  const payload = {
    emoji:          panel.querySelector('#f-emoji').value || '📦',
    title:          panel.querySelector('#f-title').value.trim(),
    subtitle:       panel.querySelector('#f-subtitle').value.trim(),
    category:       panel.querySelector('#f-category').value,
    category_label: panel.querySelector('#f-category-label').value.trim(),
    brand_label:    panel.querySelector('#f-brand-label').value.trim(),
    provider_id:    panel.querySelector('#f-provider').value || null,
    interest_rate:  parseFloat(panel.querySelector('#f-rate').value) || null,
    min_tenure:     parseInt(panel.querySelector('#f-tenure-min').value) || null,
    max_tenure:     parseInt(panel.querySelector('#f-tenure-max').value) || null,
    min_loan:       parseFloat(panel.querySelector('#f-loan-min').value) || null,
    max_loan:       parseFloat(panel.querySelector('#f-loan-max').value) || null,
    down_payment_pct: parseFloat(panel.querySelector('#f-dp').value) || null,
    badge:          panel.querySelector('#f-badge').value.trim(),
    monthly_from:   parseFloat(panel.querySelector('#f-monthly').value) || null,
    valid_until:    panel.querySelector('#f-valid-until').value || null,
    is_featured:    panel.querySelector('#f-featured').checked,
    checkout_url:   panel.querySelector('#f-checkout-url').value.trim() || null,
  }

  if (!payload.title) { toast('Judul penawaran wajib diisi', 'error'); return }
  if (!payload.category) { toast('Kategori wajib dipilih', 'error'); return }

  saveBtn.disabled = true
  saveBtn.textContent = 'Menyimpan…'

  if (!_supabase) {
    // Demo mode
    if (_editingId) {
      const idx = _offers.findIndex(o => o.id === _editingId)
      if (idx !== -1) {
        _offers[idx] = { ..._offers[idx], ...payload }
      }
    } else {
      const provider = _providers.find(p => p.id === payload.provider_id)
      _offers.unshift({ id: 'demo-' + Date.now(), ...payload, providers: provider || null, created_at: new Date().toISOString() })
    }
    toast(_editingId ? 'Penawaran diperbarui (demo)' : 'Penawaran ditambahkan (demo)', 'success')
    closePanel('offer-panel')
    renderRows()
    saveBtn.disabled = false
    saveBtn.textContent = 'Simpan'
    return
  }

  try {
    let error
    if (_editingId) {
      ;({ error } = await _supabase.from('offers').update(payload).eq('id', _editingId))
    } else {
      ;({ error } = await _supabase.from('offers').insert(payload))
    }
    if (error) throw error
    toast(_editingId ? 'Penawaran berhasil diperbarui' : 'Penawaran berhasil ditambahkan', 'success')
    closePanel('offer-panel')
    await loadData()
  } catch (err) {
    toast('Gagal menyimpan: ' + err.message, 'error')
  } finally {
    saveBtn.disabled = false
    saveBtn.textContent = 'Simpan'
  }
}

/** Called externally (e.g. keyboard shortcut) to open the add panel */
export function openAddOfferPanel() {
  openOfferPanel(null)
}
