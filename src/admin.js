/**
 * admin.js — B2B2C Admin Portal Bootstrap
 * Orchestrates all modules: Offers, Providers, Employees, Analytics
 */

import { supabase, isConnected, usingServiceKey } from './admin/supabase.js'
import { initOffers, openAddOfferPanel } from './admin/offers.js'
import { initProviders } from './admin/providers.js'
import { initEmployees } from './admin/employees.js'
import { initAnalytics } from './admin/analytics.js'

// ─── Tab config ───────────────────────────────
const TABS = [
  { id: 'offers',    label: 'Penawaran',  icon: '🏷️',  init: initOffers },
  { id: 'providers', label: 'Provider',   icon: '🏦',  init: initProviders },
  { id: 'employees', label: 'Karyawan',   icon: '👥',  init: initEmployees },
  { id: 'analytics', label: 'Analitik',   icon: '📊',  init: initAnalytics },
]

// ─── State ───────────────────────────────────
let _activeTab = 'offers'
const _initializedTabs = new Set()

// ─── Boot ────────────────────────────────────
document.addEventListener('DOMContentLoaded', boot)

async function boot() {
  renderShell()
  await checkConnection()
  loadSidebarStats()
  switchTab('offers')
  wireKeyboard()
}

// ─── Shell HTML ──────────────────────────────
function renderShell() {
  const app = document.getElementById('admin-app')
  if (!app) return

  app.innerHTML = `
    <!-- HEADER -->
    <header class="admin-header" id="admin-header">
      <div class="header-brand">
        <span class="brand-logo" aria-hidden="true">⚙️</span>
        <span class="brand-name">B2B2C <strong>Admin</strong></span>
      </div>

      <nav class="header-tabs" role="tablist" id="admin-tabs">
        ${TABS.map(t => `
          <button
            class="tab-btn ${t.id === 'offers' ? 'active' : ''}"
            data-tab="${t.id}"
            role="tab"
            aria-selected="${t.id === 'offers'}"
            aria-controls="tab-panel-${t.id}"
          >
            <span class="tab-icon" aria-hidden="true">${t.icon}</span>
            <span class="tab-label">${t.label}</span>
          </button>
        `).join('')}
      </nav>

      <div class="header-status">
        <span class="conn-dot" id="conn-dot" title="Status koneksi"></span>
        <span class="conn-label" id="conn-label">Memeriksa…</span>
      </div>
    </header>

    <!-- BODY -->
    <div class="admin-body" id="admin-body">

      <!-- SIDEBAR -->
      <aside class="admin-sidebar" id="admin-sidebar">
        <div class="sidebar-stats" id="sidebar-stats">
          ${statSkeleton(4)}
        </div>

        <div class="sidebar-meta" id="sidebar-meta">
          <div class="meta-item">
            <span class="meta-label">Mode</span>
            <span class="meta-value" id="auth-mode-label">${usingServiceKey ? 'Service Key' : 'Anon Key'}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Koneksi</span>
            <span class="meta-value" id="conn-status-label">—</span>
          </div>
        </div>

        <div class="sidebar-hint">
          <p>Tekan <kbd>Ctrl+N</kbd> untuk tambah penawaran baru</p>
        </div>
      </aside>

      <!-- MAIN -->
      <main class="admin-main" id="admin-main" role="main">
        ${TABS.map(t => `
          <div
            class="tab-panel ${t.id === 'offers' ? 'active' : ''}"
            id="tab-panel-${t.id}"
            role="tabpanel"
            aria-labelledby="tab-btn-${t.id}"
          ></div>
        `).join('')}
      </main>

    </div><!-- /admin-body -->
  `

  // Wire tab buttons
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  })
}

function statSkeleton(count) {
  return Array.from({ length: count }, () => `
    <div class="stat-card">
      <div class="skeleton-line" style="width:55%;height:12px;margin-bottom:8px"></div>
      <div class="skeleton-line" style="width:35%;height:22px"></div>
    </div>
  `).join('')
}

// ─── Tab Switching ────────────────────────────
function switchTab(tabId) {
  _activeTab = tabId

  // Update button states
  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    const active = btn.dataset.tab === tabId
    btn.classList.toggle('active', active)
    btn.setAttribute('aria-selected', active)
  })

  // Show/hide panels
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.classList.toggle('active', panel.id === `tab-panel-${tabId}`)
  })

  // Initialize module if not yet done
  if (!_initializedTabs.has(tabId)) {
    _initializedTabs.add(tabId)
    const tabConfig = TABS.find(t => t.id === tabId)
    const panel = document.getElementById(`tab-panel-${tabId}`)
    if (tabConfig && panel) {
      try {
        tabConfig.init(panel, supabase)
      } catch (err) {
        console.error(`Gagal inisialisasi tab ${tabId}:`, err)
        panel.innerHTML = `<div class="error-state">Gagal memuat modul: ${err.message}</div>`
      }
    }
  }
}

// ─── Connection Check ─────────────────────────
async function checkConnection() {
  const dot = document.getElementById('conn-dot')
  const label = document.getElementById('conn-label')
  const statusLabel = document.getElementById('conn-status-label')

  if (!supabase) {
    setConnStatus(dot, label, statusLabel, 'demo', 'Mode Demo', 'Mode Demo (tidak terhubung)')
    return
  }

  try {
    const { error } = await supabase.from('providers').select('id').limit(1)
    if (error) throw error
    setConnStatus(dot, label, statusLabel, 'ok', 'Terhubung', 'Terhubung')
  } catch (err) {
    console.warn('Koneksi Supabase gagal:', err)
    setConnStatus(dot, label, statusLabel, 'error', 'Gagal Terhubung', 'Error: ' + err.message)
  }
}

function setConnStatus(dot, label, statusLabel, state, shortLabel, fullLabel) {
  if (dot) {
    dot.className = 'conn-dot'
    dot.classList.add('conn-' + state)
    dot.title = fullLabel
  }
  if (label) label.textContent = shortLabel
  if (statusLabel) statusLabel.textContent = fullLabel
}

// ─── Sidebar Stats ────────────────────────────
async function loadSidebarStats() {
  const statsEl = document.getElementById('sidebar-stats')
  if (!statsEl) return

  if (!supabase) {
    statsEl.innerHTML = renderStatCards([
      { label: 'Total Penawaran', value: '2', note: 'demo' },
      { label: 'Penawaran Aktif', value: '2', note: 'demo' },
      { label: 'Provider', value: '3', note: 'demo' },
      { label: 'Karyawan', value: '5', note: 'demo' },
    ])
    return
  }

  try {
    const [offersRes, providersRes, employeesRes] = await Promise.all([
      supabase.from('offers').select('id, valid_until', { count: 'exact' }),
      supabase.from('providers').select('id', { count: 'exact' }),
      supabase.from('employee_codes').select('id', { count: 'exact' }),
    ])

    const totalOffers = offersRes.count ?? 0
    const now = new Date().toISOString()
    const activeOffers = (offersRes.data || []).filter(o => !o.valid_until || o.valid_until > now).length
    const totalProviders = providersRes.count ?? 0
    const totalEmployees = employeesRes.count ?? 0

    statsEl.innerHTML = renderStatCards([
      { label: 'Total Penawaran', value: totalOffers },
      { label: 'Penawaran Aktif', value: activeOffers },
      { label: 'Provider', value: totalProviders },
      { label: 'Karyawan', value: totalEmployees },
    ])
  } catch (err) {
    console.warn('Gagal memuat statistik sidebar:', err)
    statsEl.innerHTML = renderStatCards([
      { label: 'Total Penawaran', value: '—' },
      { label: 'Penawaran Aktif', value: '—' },
      { label: 'Provider', value: '—' },
      { label: 'Karyawan', value: '—' },
    ])
  }
}

function renderStatCards(stats) {
  return stats.map(s => `
    <div class="stat-card">
      <div class="stat-label">${s.label}</div>
      <div class="stat-value">${s.value}</div>
      ${s.note ? `<div class="stat-note">${s.note}</div>` : ''}
    </div>
  `).join('')
}

// ─── Keyboard Shortcuts ───────────────────────
function wireKeyboard() {
  document.addEventListener('keydown', (e) => {
    const isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
    const mod = isMac ? e.metaKey : e.ctrlKey

    if (mod && e.key === 'n') {
      e.preventDefault()
      if (_activeTab === 'offers') {
        openAddOfferPanel()
      } else {
        // Switch to offers tab first, then open panel
        switchTab('offers')
        // Give it a frame to render
        requestAnimationFrame(() => {
          setTimeout(() => openAddOfferPanel(), 50)
        })
      }
    }
  })
}
