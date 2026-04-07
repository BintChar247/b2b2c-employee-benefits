/**
 * admin/providers.js — Providers CRUD module
 * Export: initProviders(container, supabase)
 */

import {
  toast, confirm, skeletonRows, toggleHTML,
  formatDate, openPanel, closePanel, slugify
} from './components.js'

// ─── Demo data ───────────────────────────────
const DEMO_PROVIDERS = [
  {
    id: 'demo-p1', name: 'Bank BCA', slug: 'bank-bca', color: '#0066AE',
    logo_url: '', website_url: 'https://bca.co.id', description: 'Bank Central Asia',
    is_active: true, created_at: new Date().toISOString(), offer_count: 3
  },
  {
    id: 'demo-p2', name: 'Bank Mandiri', slug: 'bank-mandiri', color: '#00529B',
    logo_url: '', website_url: 'https://bankmandiri.co.id', description: 'Bank Mandiri',
    is_active: true, created_at: new Date().toISOString(), offer_count: 2
  },
  {
    id: 'demo-p3', name: 'Bank BRI', slug: 'bank-bri', color: '#003399',
    logo_url: '', website_url: 'https://bri.co.id', description: 'Bank Rakyat Indonesia',
    is_active: false, created_at: new Date().toISOString(), offer_count: 1
  },
]

// ─── State ───────────────────────────────────
let _providers = []
let _supabase = null
let _container = null
let _editingId = null

// ─── Main init ───────────────────────────────
export async function initProviders(container, supabase) {
  _container = container
  _supabase = supabase

  _container.innerHTML = `
    <div class="section-header">
      <div class="section-title-row">
        <h2 class="section-title">Provider</h2>
        <button class="btn btn-primary" id="providers-add-btn">+ Tambah Provider</button>
      </div>
    </div>

    <div id="providers-grid" class="provider-grid">
      ${skeletonCards(4)}
    </div>

    <!-- Slide-in panel -->
    <aside class="slide-panel" id="provider-panel" aria-label="Form Provider">
      <div class="panel-header">
        <h2 class="panel-title" id="provider-panel-title">Tambah Provider</h2>
        <button class="panel-close" id="provider-panel-close" aria-label="Tutup">✕</button>
      </div>
      <div class="panel-body" id="provider-panel-body"></div>
    </aside>
  `

  _container.querySelector('#providers-add-btn').addEventListener('click', () => openProviderPanel(null))
  _container.querySelector('#provider-panel-close').addEventListener('click', () => closePanel('provider-panel'))

  await loadProviders()
}

function skeletonCards(count) {
  return Array.from({ length: count }, () => `
    <div class="provider-card skeleton-card">
      <div class="skeleton-line" style="width:60px;height:60px;border-radius:50%;margin-bottom:12px"></div>
      <div class="skeleton-line" style="width:70%"></div>
      <div class="skeleton-line" style="width:50%"></div>
      <div class="skeleton-line" style="width:40%"></div>
    </div>
  `).join('')
}

async function loadProviders() {
  if (!_supabase) {
    _providers = DEMO_PROVIDERS
    renderGrid()
    return
  }

  try {
    // Fetch providers with offer count via sub-select
    const { data, error } = await _supabase
      .from('providers')
      .select('*, offers(count)')
      .order('name')

    if (error) throw error

    _providers = (data || []).map(p => ({
      ...p,
      offer_count: p.offers?.[0]?.count ?? 0
    }))
    renderGrid()
  } catch (err) {
    console.error('Gagal memuat provider:', err)
    toast('Gagal memuat provider: ' + err.message, 'error')
    _providers = []
    renderGrid()
  }
}

function renderGrid() {
  const grid = _container.querySelector('#providers-grid')

  if (_providers.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">Belum ada provider. Tambahkan yang pertama!</div>`
    return
  }

  grid.innerHTML = _providers.map(p => `
    <div class="provider-card ${!p.is_active ? 'provider-inactive' : ''}" data-id="${p.id}">
      <div class="provider-card-top">
        <div class="provider-logo-wrap">
          ${p.logo_url
            ? `<img src="${p.logo_url}" alt="${p.name}" class="provider-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
            : ''}
          <div class="provider-logo-fallback" style="background:${p.color || '#333'};${p.logo_url ? 'display:none' : ''}">
            ${(p.name || 'P').charAt(0).toUpperCase()}
          </div>
        </div>
        <div class="provider-meta">
          <div class="provider-name">${p.name || '—'}</div>
          <div class="provider-slug">/${p.slug || ''}</div>
        </div>
      </div>

      <div class="provider-details">
        <div class="provider-detail-row">
          <span class="detail-label">Warna Brand</span>
          <span class="color-swatch" style="background:${p.color || '#888'}" title="${p.color || '—'}"></span>
          <span class="detail-value">${p.color || '—'}</span>
        </div>
        <div class="provider-detail-row">
          <span class="detail-label">Website</span>
          <a href="${p.website_url || '#'}" target="_blank" rel="noopener" class="provider-link">${p.website_url || '—'}</a>
        </div>
        <div class="provider-detail-row">
          <span class="detail-label">Penawaran</span>
          <span class="detail-value">${p.offer_count ?? 0} penawaran</span>
        </div>
        <div class="provider-detail-row">
          <span class="detail-label">Status</span>
          <span class="pill ${p.is_active ? 'pill-success' : 'pill-muted'}">${p.is_active ? 'Aktif' : 'Nonaktif'}</span>
        </div>
      </div>

      ${p.description ? `<p class="provider-desc">${p.description}</p>` : ''}

      <div class="provider-actions">
        <button class="btn btn-sm btn-secondary edit-prov-btn" data-id="${p.id}">Edit</button>
        <button class="btn btn-sm ${p.is_active ? 'btn-secondary' : 'btn-primary'} toggle-prov-btn" data-id="${p.id}" data-active="${p.is_active}">
          ${p.is_active ? 'Nonaktifkan' : 'Aktifkan'}
        </button>
        <button class="btn btn-sm btn-danger delete-prov-btn" data-id="${p.id}">Hapus</button>
      </div>
    </div>
  `).join('')

  // Wire actions
  grid.querySelectorAll('.edit-prov-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = _providers.find(x => x.id === btn.dataset.id)
      if (p) openProviderPanel(p)
    })
  })

  grid.querySelectorAll('.toggle-prov-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const newActive = btn.dataset.active !== 'true'
      await toggleProviderActive(btn.dataset.id, newActive)
    })
  })

  grid.querySelectorAll('.delete-prov-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = _providers.find(x => x.id === btn.dataset.id)
      if (!p) return
      confirm(
        'Hapus Provider',
        `Yakin ingin menghapus provider "${p.name}"? Semua penawaran terkait mungkin terpengaruh.`,
        async () => { await deleteProvider(p.id) },
        true
      )
    })
  })
}

async function toggleProviderActive(id, value) {
  const prov = _providers.find(p => p.id === id)
  if (!_supabase) {
    if (prov) prov.is_active = value
    renderGrid()
    toast(value ? 'Provider diaktifkan (demo)' : 'Provider dinonaktifkan (demo)', 'success')
    return
  }

  const { error } = await _supabase.from('providers').update({ is_active: value }).eq('id', id)
  if (error) {
    toast('Gagal memperbarui: ' + error.message, 'error')
  } else {
    if (prov) prov.is_active = value
    renderGrid()
    toast(value ? 'Provider diaktifkan' : 'Provider dinonaktifkan', 'success')
  }
}

async function deleteProvider(id) {
  if (!_supabase) {
    _providers = _providers.filter(p => p.id !== id)
    renderGrid()
    toast('Provider dihapus (demo)', 'success')
    return
  }

  const { error } = await _supabase.from('providers').delete().eq('id', id)
  if (error) {
    toast('Gagal menghapus: ' + error.message, 'error')
  } else {
    _providers = _providers.filter(p => p.id !== id)
    renderGrid()
    toast('Provider berhasil dihapus', 'success')
  }
}

// ─── Panel ───────────────────────────────────
function openProviderPanel(provider) {
  _editingId = provider?.id || null
  const panelTitle = _container.querySelector('#provider-panel-title')
  const panelBody = _container.querySelector('#provider-panel-body')

  panelTitle.textContent = provider ? 'Edit Provider' : 'Tambah Provider'

  panelBody.innerHTML = `
    <form id="provider-form" class="panel-form" autocomplete="off">

      <div class="form-group">
        <label class="form-label" for="fp-name">Nama Provider <span class="req">*</span></label>
        <input class="form-input" id="fp-name" type="text" required placeholder="Contoh: Bank BCA" value="${provider?.name || ''}">
      </div>

      <div class="form-group">
        <label class="form-label" for="fp-slug">Slug</label>
        <input class="form-input" id="fp-slug" type="text" placeholder="auto-generate dari nama" value="${provider?.slug || ''}">
        <p class="form-hint">Akan diisi otomatis. Hanya huruf kecil, angka, dan tanda hubung.</p>
      </div>

      <div class="form-group">
        <label class="form-label" for="fp-logo">URL Logo</label>
        <input class="form-input" id="fp-logo" type="url" placeholder="https://…/logo.png" value="${provider?.logo_url || ''}">
        <div id="logo-preview-wrap" style="margin-top:8px;${provider?.logo_url ? '' : 'display:none'}">
          <img id="fp-logo-preview" src="${provider?.logo_url || ''}" alt="Preview logo" style="height:48px;border-radius:6px;border:1px solid #333">
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="fp-website">URL Website</label>
        <input class="form-input" id="fp-website" type="url" placeholder="https://…" value="${provider?.website_url || ''}">
      </div>

      <div class="form-row">
        <div class="form-group flex-1">
          <label class="form-label" for="fp-color">Warna Brand</label>
          <div class="color-picker-row">
            <input type="color" id="fp-color-picker" value="${provider?.color || '#0066AE'}" class="color-picker-input">
            <input class="form-input" id="fp-color" type="text" placeholder="#0066AE" value="${provider?.color || '#0066AE'}" style="flex:1">
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="fp-description">Deskripsi</label>
        <textarea class="form-input" id="fp-description" rows="3" placeholder="Deskripsi singkat provider…">${provider?.description || ''}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">Status Aktif</label>
        ${toggleHTML('fp-active', provider?.is_active !== false)}
      </div>

      <div class="panel-footer">
        ${_editingId ? `<button type="button" class="btn btn-danger" id="prov-delete-btn">Hapus</button>` : '<span></span>'}
        <div class="footer-right">
          <button type="button" class="btn btn-secondary" id="prov-cancel-btn">Batal</button>
          <button type="submit" class="btn btn-primary" id="prov-save-btn">Simpan</button>
        </div>
      </div>

    </form>
  `

  // Auto-generate slug from name
  panelBody.querySelector('#fp-name').addEventListener('input', e => {
    if (!_editingId) {
      panelBody.querySelector('#fp-slug').value = slugify(e.target.value)
    }
  })

  // Logo preview
  panelBody.querySelector('#fp-logo').addEventListener('input', e => {
    const url = e.target.value.trim()
    const wrap = panelBody.querySelector('#logo-preview-wrap')
    const img = panelBody.querySelector('#fp-logo-preview')
    if (url) {
      img.src = url
      wrap.style.display = ''
    } else {
      wrap.style.display = 'none'
    }
  })

  // Color sync
  const colorPicker = panelBody.querySelector('#fp-color-picker')
  const colorText = panelBody.querySelector('#fp-color')
  colorPicker.addEventListener('input', () => { colorText.value = colorPicker.value })
  colorText.addEventListener('input', () => {
    const v = colorText.value.trim()
    if (/^#[0-9a-fA-F]{6}$/.test(v)) colorPicker.value = v
  })

  panelBody.querySelector('#prov-cancel-btn').addEventListener('click', () => closePanel('provider-panel'))

  if (_editingId) {
    panelBody.querySelector('#prov-delete-btn').addEventListener('click', () => {
      const name = panelBody.querySelector('#fp-name').value || 'provider ini'
      confirm('Hapus Provider', `Yakin ingin menghapus "${name}"?`, async () => {
        await deleteProvider(_editingId)
        closePanel('provider-panel')
      }, true)
    })
  }

  panelBody.querySelector('#provider-form').addEventListener('submit', async e => {
    e.preventDefault()
    await saveProvider()
  })

  openPanel('provider-panel')
}

async function saveProvider() {
  const panel = _container.querySelector('#provider-panel-body')
  const saveBtn = panel.querySelector('#prov-save-btn')

  const nameVal = panel.querySelector('#fp-name').value.trim()
  const slugVal = panel.querySelector('#fp-slug').value.trim() || slugify(nameVal)

  const payload = {
    name:        nameVal,
    slug:        slugVal,
    logo_url:    panel.querySelector('#fp-logo').value.trim() || null,
    website_url: panel.querySelector('#fp-website').value.trim() || null,
    color:       panel.querySelector('#fp-color').value.trim() || null,
    description: panel.querySelector('#fp-description').value.trim() || null,
    is_active:   panel.querySelector('#fp-active').checked,
  }

  if (!payload.name) { toast('Nama provider wajib diisi', 'error'); return }

  saveBtn.disabled = true
  saveBtn.textContent = 'Menyimpan…'

  if (!_supabase) {
    if (_editingId) {
      const idx = _providers.findIndex(p => p.id === _editingId)
      if (idx !== -1) _providers[idx] = { ..._providers[idx], ...payload }
    } else {
      _providers.push({ id: 'demo-' + Date.now(), ...payload, offer_count: 0, created_at: new Date().toISOString() })
    }
    toast(_editingId ? 'Provider diperbarui (demo)' : 'Provider ditambahkan (demo)', 'success')
    closePanel('provider-panel')
    renderGrid()
    saveBtn.disabled = false
    saveBtn.textContent = 'Simpan'
    return
  }

  try {
    let error
    if (_editingId) {
      ;({ error } = await _supabase.from('providers').update(payload).eq('id', _editingId))
    } else {
      ;({ error } = await _supabase.from('providers').insert(payload))
    }
    if (error) throw error
    toast(_editingId ? 'Provider berhasil diperbarui' : 'Provider berhasil ditambahkan', 'success')
    closePanel('provider-panel')
    await loadProviders()
  } catch (err) {
    toast('Gagal menyimpan: ' + err.message, 'error')
  } finally {
    saveBtn.disabled = false
    saveBtn.textContent = 'Simpan'
  }
}
