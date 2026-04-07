/**
 * admin/employees.js — Employee Codes CRUD module
 * Export: initEmployees(container, supabase)
 */

import {
  toast, confirm, skeletonRows, toggleHTML,
  formatDate, openPanel, closePanel, generateCode
} from './components.js'

// ─── Demo data ───────────────────────────────
const DEMO_EMPLOYEES = [
  { id: 'demo-e1', code: 'EMP-A1B2C3', name: 'Budi Santoso', company: 'PT Maju Bersama', is_active: true, created_at: new Date().toISOString() },
  { id: 'demo-e2', code: 'EMP-D4E5F6', name: 'Siti Rahayu', company: 'PT Maju Bersama', is_active: true, created_at: new Date().toISOString() },
  { id: 'demo-e3', code: 'EMP-G7H8I9', name: 'Ahmad Fauzi', company: 'CV Karya Mandiri', is_active: false, created_at: new Date().toISOString() },
  { id: 'demo-e4', code: 'EMP-J1K2L3', name: 'Dewi Lestari', company: 'CV Karya Mandiri', is_active: true, created_at: new Date().toISOString() },
  { id: 'demo-e5', code: 'EMP-M4N5O6', name: 'Rudi Hermawan', company: 'PT Nusantara Jaya', is_active: true, created_at: new Date().toISOString() },
]

// ─── State ───────────────────────────────────
let _employees = []
let _supabase = null
let _container = null
let _editingId = null
let _search = ''
let _filterCompany = ''
let _filterActive = ''
let _page = 0
const PAGE_SIZE = 20

// ─── Init ────────────────────────────────────
export async function initEmployees(container, supabase) {
  _container = container
  _supabase = supabase

  const companies = await loadCompanies()

  _container.innerHTML = `
    <div class="section-header">
      <div class="section-title-row">
        <h2 class="section-title">Kode Karyawan</h2>
        <div class="header-btn-group">
          <button class="btn btn-secondary" id="emp-bulk-btn">Import CSV</button>
          <button class="btn btn-secondary" id="emp-gen-btn">Generate Kode</button>
          <button class="btn btn-primary" id="emp-add-btn">+ Tambah Karyawan</button>
        </div>
      </div>
      <div class="table-controls">
        <input class="form-input search-input" id="emp-search" placeholder="Cari kode, nama, perusahaan…" type="search">
        <select class="form-input select-input" id="emp-filter-company">
          <option value="">Semua Perusahaan</option>
          ${companies.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <select class="form-input select-input" id="emp-filter-active">
          <option value="">Semua Status</option>
          <option value="true">Aktif</option>
          <option value="false">Nonaktif</option>
        </select>
      </div>
    </div>

    <div class="table-wrap">
      <table class="data-table" id="emp-table">
        <thead>
          <tr>
            <th>Kode</th>
            <th>Nama</th>
            <th>Perusahaan</th>
            <th>Status</th>
            <th>Dibuat</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody id="emp-tbody">
          ${skeletonRows(5, 6)}
        </tbody>
      </table>
    </div>
    <div class="pagination-row" id="emp-pagination"></div>

    <!-- Add/Edit Panel -->
    <aside class="slide-panel" id="emp-panel" aria-label="Form Karyawan">
      <div class="panel-header">
        <h2 class="panel-title" id="emp-panel-title">Tambah Karyawan</h2>
        <button class="panel-close" id="emp-panel-close" aria-label="Tutup">✕</button>
      </div>
      <div class="panel-body" id="emp-panel-body"></div>
    </aside>

    <!-- Bulk Import Panel -->
    <aside class="slide-panel slide-panel-wide" id="emp-bulk-panel" aria-label="Import CSV Karyawan">
      <div class="panel-header">
        <h2 class="panel-title">Import CSV Karyawan</h2>
        <button class="panel-close" id="emp-bulk-panel-close" aria-label="Tutup">✕</button>
      </div>
      <div class="panel-body" id="emp-bulk-body"></div>
    </aside>

    <!-- Generator Panel -->
    <aside class="slide-panel" id="emp-gen-panel" aria-label="Generate Kode Karyawan">
      <div class="panel-header">
        <h2 class="panel-title">Generate Kode Karyawan</h2>
        <button class="panel-close" id="emp-gen-panel-close" aria-label="Tutup">✕</button>
      </div>
      <div class="panel-body" id="emp-gen-body"></div>
    </aside>
  `

  // Wire header controls
  _container.querySelector('#emp-add-btn').addEventListener('click', () => openEmpPanel(null))
  _container.querySelector('#emp-bulk-btn').addEventListener('click', openBulkImportPanel)
  _container.querySelector('#emp-gen-btn').addEventListener('click', openGeneratorPanel)
  _container.querySelector('#emp-panel-close').addEventListener('click', () => closePanel('emp-panel'))
  _container.querySelector('#emp-bulk-panel-close').addEventListener('click', () => closePanel('emp-bulk-panel'))
  _container.querySelector('#emp-gen-panel-close').addEventListener('click', () => closePanel('emp-gen-panel'))

  // Filters
  _container.querySelector('#emp-search').addEventListener('input', e => {
    _search = e.target.value; _page = 0; renderTable()
  })
  _container.querySelector('#emp-filter-company').addEventListener('change', e => {
    _filterCompany = e.target.value; _page = 0; renderTable()
  })
  _container.querySelector('#emp-filter-active').addEventListener('change', e => {
    _filterActive = e.target.value; _page = 0; renderTable()
  })

  await loadEmployees()
}

async function loadCompanies() {
  if (!_supabase) return [...new Set(DEMO_EMPLOYEES.map(e => e.company))]
  try {
    const { data } = await _supabase.from('employee_codes').select('company').order('company')
    return [...new Set((data || []).map(r => r.company).filter(Boolean))]
  } catch { return [] }
}

async function loadEmployees() {
  if (!_supabase) {
    _employees = DEMO_EMPLOYEES
    renderTable()
    return
  }

  try {
    const { data, error } = await _supabase
      .from('employee_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    _employees = data || []
    renderTable()
  } catch (err) {
    console.error('Gagal memuat karyawan:', err)
    toast('Gagal memuat data karyawan: ' + err.message, 'error')
    _employees = []
    renderTable()
  }
}

function filteredEmployees() {
  let list = [..._employees]
  if (_search) {
    const q = _search.toLowerCase()
    list = list.filter(e =>
      (e.code || '').toLowerCase().includes(q) ||
      (e.name || '').toLowerCase().includes(q) ||
      (e.company || '').toLowerCase().includes(q)
    )
  }
  if (_filterCompany) list = list.filter(e => e.company === _filterCompany)
  if (_filterActive !== '') list = list.filter(e => String(e.is_active) === _filterActive)
  return list
}

function renderTable() {
  const tbody = _container.querySelector('#emp-tbody')
  const paginationEl = _container.querySelector('#emp-pagination')
  const list = filteredEmployees()
  const total = list.length
  const totalPages = Math.ceil(total / PAGE_SIZE)
  const paginated = list.slice(_page * PAGE_SIZE, (_page + 1) * PAGE_SIZE)

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="empty-state">Tidak ada data karyawan ditemukan</td></tr>`
    paginationEl.innerHTML = ''
    return
  }

  tbody.innerHTML = paginated.map(e => `
    <tr data-id="${e.id}">
      <td><code class="code-mono">${e.code || '—'}</code></td>
      <td>${e.name || '—'}</td>
      <td>${e.company || '—'}</td>
      <td>
        <label class="toggle">
          <input type="checkbox" class="active-toggle" data-id="${e.id}" ${e.is_active ? 'checked' : ''}>
          <span class="toggle-track"></span>
        </label>
      </td>
      <td>${formatDate(e.created_at)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-secondary edit-emp-btn" data-id="${e.id}">Edit</button>
          <button class="btn btn-sm btn-danger delete-emp-btn" data-id="${e.id}">Hapus</button>
        </div>
      </td>
    </tr>
  `).join('')

  // Pagination
  if (totalPages > 1) {
    paginationEl.innerHTML = `
      <button class="btn btn-sm btn-secondary" id="pg-prev" ${_page === 0 ? 'disabled' : ''}>← Sebelumnya</button>
      <span class="page-info">Halaman ${_page + 1} / ${totalPages} (${total} karyawan)</span>
      <button class="btn btn-sm btn-secondary" id="pg-next" ${_page >= totalPages - 1 ? 'disabled' : ''}>Berikutnya →</button>
    `
    paginationEl.querySelector('#pg-prev').addEventListener('click', () => { _page--; renderTable() })
    paginationEl.querySelector('#pg-next').addEventListener('click', () => { _page++; renderTable() })
  } else {
    paginationEl.innerHTML = `<span class="page-info">${total} karyawan</span>`
  }

  // Wire actions
  tbody.querySelectorAll('.edit-emp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const emp = _employees.find(e => e.id === btn.dataset.id)
      if (emp) openEmpPanel(emp)
    })
  })

  tbody.querySelectorAll('.delete-emp-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const emp = _employees.find(e => e.id === btn.dataset.id)
      if (!emp) return
      confirm('Hapus Karyawan', `Yakin ingin menghapus kode "${emp.code}" (${emp.name})?`, async () => {
        await deleteEmployee(emp.id)
      }, true)
    })
  })

  tbody.querySelectorAll('.active-toggle').forEach(chk => {
    chk.addEventListener('change', async () => {
      await toggleActive(chk.dataset.id, chk.checked)
    })
  })
}

async function toggleActive(id, value) {
  const emp = _employees.find(e => e.id === id)
  if (!_supabase) {
    if (emp) emp.is_active = value
    toast(value ? 'Karyawan diaktifkan (demo)' : 'Karyawan dinonaktifkan (demo)', 'success')
    return
  }

  const { error } = await _supabase.from('employee_codes').update({ is_active: value }).eq('id', id)
  if (error) {
    toast('Gagal memperbarui status: ' + error.message, 'error')
    if (emp) emp.is_active = !value
    renderTable()
  } else {
    if (emp) emp.is_active = value
    toast(value ? 'Karyawan diaktifkan' : 'Karyawan dinonaktifkan', 'success')
  }
}

async function deleteEmployee(id) {
  if (!_supabase) {
    _employees = _employees.filter(e => e.id !== id)
    renderTable()
    toast('Karyawan dihapus (demo)', 'success')
    return
  }

  const { error } = await _supabase.from('employee_codes').delete().eq('id', id)
  if (error) {
    toast('Gagal menghapus: ' + error.message, 'error')
  } else {
    _employees = _employees.filter(e => e.id !== id)
    renderTable()
    toast('Karyawan berhasil dihapus', 'success')
  }
}

// ─── Add / Edit Panel ────────────────────────
function openEmpPanel(emp) {
  _editingId = emp?.id || null
  const companies = [...new Set(_employees.map(e => e.company).filter(Boolean))]
  const panelTitle = _container.querySelector('#emp-panel-title')
  const panelBody = _container.querySelector('#emp-panel-body')

  panelTitle.textContent = emp ? 'Edit Karyawan' : 'Tambah Karyawan'

  panelBody.innerHTML = `
    <form id="emp-form" class="panel-form" autocomplete="off">
      <datalist id="company-datalist">
        ${companies.map(c => `<option value="${c}">`).join('')}
      </datalist>

      <div class="form-group">
        <label class="form-label" for="fe-code">Kode Karyawan <span class="req">*</span></label>
        <div class="input-with-btn">
          <input class="form-input form-input-mono" id="fe-code" type="text" required
            placeholder="EMP-XXXXXX" value="${emp?.code || ''}">
          <button type="button" class="btn btn-secondary" id="gen-code-btn">Auto</button>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label" for="fe-name">Nama Karyawan <span class="req">*</span></label>
        <input class="form-input" id="fe-name" type="text" required placeholder="Nama lengkap" value="${emp?.name || ''}">
      </div>

      <div class="form-group">
        <label class="form-label" for="fe-company">Perusahaan <span class="req">*</span></label>
        <input class="form-input" id="fe-company" type="text" required list="company-datalist"
          placeholder="Nama perusahaan" value="${emp?.company || ''}">
      </div>

      <div class="form-group">
        <label class="form-label">Status Aktif</label>
        ${toggleHTML('fe-active', emp?.is_active !== false)}
      </div>

      <div class="panel-footer">
        ${_editingId ? `<button type="button" class="btn btn-danger" id="emp-delete-btn">Hapus</button>` : '<span></span>'}
        <div class="footer-right">
          <button type="button" class="btn btn-secondary" id="emp-cancel-btn">Batal</button>
          <button type="submit" class="btn btn-primary" id="emp-save-btn">Simpan</button>
        </div>
      </div>
    </form>
  `

  panelBody.querySelector('#gen-code-btn').addEventListener('click', () => {
    const company = panelBody.querySelector('#fe-company').value.trim()
    const prefix = company
      ? company.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'EMP'
      : 'EMP'
    panelBody.querySelector('#fe-code').value = generateCode(prefix, 6)
  })

  panelBody.querySelector('#emp-cancel-btn').addEventListener('click', () => closePanel('emp-panel'))

  if (_editingId) {
    panelBody.querySelector('#emp-delete-btn').addEventListener('click', () => {
      const code = panelBody.querySelector('#fe-code').value
      confirm('Hapus Karyawan', `Yakin ingin menghapus kode "${code}"?`, async () => {
        await deleteEmployee(_editingId)
        closePanel('emp-panel')
      }, true)
    })
  }

  panelBody.querySelector('#emp-form').addEventListener('submit', async e => {
    e.preventDefault()
    await saveEmployee()
  })

  openPanel('emp-panel')
}

async function saveEmployee() {
  const panel = _container.querySelector('#emp-panel-body')
  const saveBtn = panel.querySelector('#emp-save-btn')

  const payload = {
    code:      panel.querySelector('#fe-code').value.trim().toUpperCase(),
    name:      panel.querySelector('#fe-name').value.trim(),
    company:   panel.querySelector('#fe-company').value.trim(),
    is_active: panel.querySelector('#fe-active').checked,
  }

  if (!payload.code) { toast('Kode karyawan wajib diisi', 'error'); return }
  if (!payload.name) { toast('Nama karyawan wajib diisi', 'error'); return }
  if (!payload.company) { toast('Nama perusahaan wajib diisi', 'error'); return }

  saveBtn.disabled = true
  saveBtn.textContent = 'Menyimpan…'

  if (!_supabase) {
    if (_editingId) {
      const idx = _employees.findIndex(e => e.id === _editingId)
      if (idx !== -1) _employees[idx] = { ..._employees[idx], ...payload }
    } else {
      _employees.unshift({ id: 'demo-' + Date.now(), ...payload, created_at: new Date().toISOString() })
    }
    toast(_editingId ? 'Karyawan diperbarui (demo)' : 'Karyawan ditambahkan (demo)', 'success')
    closePanel('emp-panel')
    renderTable()
    saveBtn.disabled = false
    saveBtn.textContent = 'Simpan'
    return
  }

  try {
    let error
    if (_editingId) {
      ;({ error } = await _supabase.from('employee_codes').update(payload).eq('id', _editingId))
    } else {
      ;({ error } = await _supabase.from('employee_codes').insert(payload))
    }
    if (error) throw error
    toast(_editingId ? 'Karyawan berhasil diperbarui' : 'Karyawan berhasil ditambahkan', 'success')
    closePanel('emp-panel')
    await loadEmployees()
  } catch (err) {
    toast('Gagal menyimpan: ' + err.message, 'error')
  } finally {
    saveBtn.disabled = false
    saveBtn.textContent = 'Simpan'
  }
}

// ─── Bulk Import Panel ───────────────────────
function openBulkImportPanel() {
  const panelBody = _container.querySelector('#emp-bulk-body')

  panelBody.innerHTML = `
    <div class="panel-form">
      <p class="form-hint" style="margin-bottom:12px">
        Tempel data CSV dengan format: <code>kode,nama,perusahaan</code><br>
        Satu baris per karyawan. Baris pertama diabaikan jika berisi header.
      </p>

      <div class="form-group">
        <label class="form-label" for="csv-input">Data CSV</label>
        <textarea class="form-input form-input-mono" id="csv-input" rows="10"
          placeholder="kode,nama,perusahaan&#10;EMP-A1B2C3,Budi Santoso,PT Maju Bersama&#10;EMP-D4E5F6,Siti Rahayu,CV Karya Mandiri"></textarea>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:16px">
        <button class="btn btn-secondary" id="csv-parse-btn">Preview</button>
        <button class="btn btn-primary" id="csv-import-btn" disabled>Import Semua</button>
        <span id="csv-status" style="align-self:center;font-size:13px;color:#aaa"></span>
      </div>

      <div id="csv-preview-wrap" style="display:none">
        <h4 style="margin-bottom:8px;font-size:13px;color:#aaa">PREVIEW IMPORT</h4>
        <div class="table-wrap" style="max-height:300px;overflow-y:auto">
          <table class="data-table" id="csv-preview-table">
            <thead>
              <tr><th>Kode</th><th>Nama</th><th>Perusahaan</th><th>Status</th></tr>
            </thead>
            <tbody id="csv-preview-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>
  `

  let parsedRows = []

  panelBody.querySelector('#csv-parse-btn').addEventListener('click', () => {
    const raw = panelBody.querySelector('#csv-input').value.trim()
    if (!raw) { toast('Masukkan data CSV terlebih dahulu', 'warn'); return }

    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)
    parsedRows = []
    const errors = []

    lines.forEach((line, idx) => {
      const parts = line.split(',').map(p => p.trim())
      if (parts.length < 3) {
        // Skip header-like lines
        if (idx === 0 && parts[0].toLowerCase() === 'kode') return
        errors.push(`Baris ${idx + 1}: format tidak valid`)
        return
      }
      parsedRows.push({
        code: parts[0].toUpperCase(),
        name: parts[1],
        company: parts[2],
        is_active: true
      })
    })

    const tbody = panelBody.querySelector('#csv-preview-tbody')
    const wrap = panelBody.querySelector('#csv-preview-wrap')
    const statusEl = panelBody.querySelector('#csv-status')
    const importBtn = panelBody.querySelector('#csv-import-btn')

    tbody.innerHTML = parsedRows.map(r => `
      <tr>
        <td><code class="code-mono">${r.code}</code></td>
        <td>${r.name}</td>
        <td>${r.company}</td>
        <td><span class="pill pill-success">Akan diimport</span></td>
      </tr>
    `).join('')

    wrap.style.display = ''
    statusEl.textContent = `${parsedRows.length} baris valid${errors.length ? ', ' + errors.length + ' baris diabaikan' : ''}`
    importBtn.disabled = parsedRows.length === 0
  })

  panelBody.querySelector('#csv-import-btn').addEventListener('click', async () => {
    if (parsedRows.length === 0) return
    await bulkInsert(parsedRows)
    closePanel('emp-bulk-panel')
  })

  openPanel('emp-bulk-panel')
}

async function bulkInsert(rows) {
  if (!_supabase) {
    rows.forEach(r => {
      _employees.unshift({ id: 'demo-' + Date.now() + Math.random(), ...r, created_at: new Date().toISOString() })
    })
    renderTable()
    toast(`${rows.length} karyawan berhasil diimport (demo)`, 'success')
    return
  }

  try {
    const { error } = await _supabase.from('employee_codes').insert(rows)
    if (error) throw error
    toast(`${rows.length} karyawan berhasil diimport`, 'success')
    await loadEmployees()
  } catch (err) {
    toast('Gagal import: ' + err.message, 'error')
  }
}

// ─── Code Generator Panel ────────────────────
function openGeneratorPanel() {
  const panelBody = _container.querySelector('#emp-gen-body')

  panelBody.innerHTML = `
    <div class="panel-form">
      <p class="form-hint" style="margin-bottom:12px">
        Buat kode karyawan unik secara otomatis berdasarkan nama perusahaan dan jumlah kode.
      </p>

      <div class="form-row">
        <div class="form-group flex-1">
          <label class="form-label" for="gen-company">Perusahaan</label>
          <input class="form-input" id="gen-company" type="text" placeholder="PT Maju Bersama">
        </div>
        <div class="form-group" style="width:120px">
          <label class="form-label" for="gen-count">Jumlah</label>
          <input class="form-input" id="gen-count" type="number" min="1" max="200" value="10">
        </div>
        <div class="form-group" style="align-self:flex-end;padding-bottom:4px">
          <button class="btn btn-secondary" id="gen-preview-btn">Preview</button>
        </div>
      </div>

      <div id="gen-preview-wrap" style="display:none;margin-bottom:16px">
        <h4 style="margin-bottom:8px;font-size:13px;color:#aaa">KODE YANG AKAN DIBUAT</h4>
        <div class="table-wrap" style="max-height:300px;overflow-y:auto">
          <table class="data-table" id="gen-preview-table">
            <thead>
              <tr><th>#</th><th>Kode</th><th>Perusahaan</th></tr>
            </thead>
            <tbody id="gen-preview-tbody"></tbody>
          </table>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;align-items:center">
          <button class="btn btn-primary" id="gen-insert-btn">Buat & Simpan</button>
          <span id="gen-status" style="font-size:13px;color:#aaa"></span>
        </div>
      </div>
    </div>
  `

  let generatedRows = []

  panelBody.querySelector('#gen-preview-btn').addEventListener('click', () => {
    const company = panelBody.querySelector('#gen-company').value.trim()
    const count = parseInt(panelBody.querySelector('#gen-count').value) || 10

    const prefix = company
      ? company.replace(/[^a-zA-Z]/g, '').slice(0, 3).toUpperCase() || 'EMP'
      : 'EMP'

    generatedRows = Array.from({ length: count }, (_, i) => ({
      code: generateCode(prefix, 6),
      name: '',
      company: company || '',
      is_active: true
    }))

    const tbody = panelBody.querySelector('#gen-preview-tbody')
    tbody.innerHTML = generatedRows.map((r, i) => `
      <tr>
        <td style="color:#666">${i + 1}</td>
        <td><code class="code-mono">${r.code}</code></td>
        <td>${r.company || '—'}</td>
      </tr>
    `).join('')

    panelBody.querySelector('#gen-preview-wrap').style.display = ''
    panelBody.querySelector('#gen-status').textContent = `${count} kode siap dibuat`
  })

  panelBody.querySelector('#gen-preview-wrap').addEventListener('click', async (e) => {
    if (e.target.id !== 'gen-insert-btn') return
    if (generatedRows.length === 0) return
    const insertBtn = e.target
    insertBtn.disabled = true
    insertBtn.textContent = 'Menyimpan…'
    await bulkInsert(generatedRows)
    insertBtn.disabled = false
    insertBtn.textContent = 'Buat & Simpan'
    closePanel('emp-gen-panel')
  })

  openPanel('emp-gen-panel')
}
