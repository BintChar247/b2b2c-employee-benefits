/**
 * admin.js — B2B2C Admin Portal Bootstrap
 * Renders the full layout into #admin-app, then lazy-inits section modules.
 */

import { supabase, usingServiceKey } from './admin/supabase.js'
import { initOffers, openAddOfferPanel } from './admin/offers.js'
import { initProviders }                 from './admin/providers.js'
import { initEmployees }                 from './admin/employees.js'
import { initAnalytics }                 from './admin/analytics.js'
import { initDaily }                     from './admin/daily.js'

// ─── Tab config ───────────────────────────────
const TABS = [
  { id: 'offers',    icon: '🏷️',  label: 'Penawaran',     init: initOffers },
  { id: 'providers', icon: '🏦',  label: 'Provider',       init: initProviders },
  { id: 'employees', icon: '👥',  label: 'Karyawan',       init: initEmployees },
  { id: 'analytics', icon: '📊',  label: 'Analitik',       init: initAnalytics },
  { id: 'daily',     icon: '🎡',  label: 'Daily Prizes',   init: initDaily },
]

let _activeTab = 'offers'
const _initialized = new Set()

// ─── Boot ────────────────────────────────────
document.addEventListener('DOMContentLoaded', boot)

async function boot() {
  renderShell()
  wireTabButtons()
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
        <span class="brand-logo">⚙️</span>
        <span class="brand-name">B2B2C <strong>Admin</strong></span>
      </div>

      <nav class="header-tabs" id="admin-tabs" role="tablist">
        ${TABS.map(t => `
          <button class="tab-btn${t.id === 'offers' ? ' active' : ''}"
            data-tab="${t.id}" role="tab"
            aria-selected="${t.id === 'offers'}"
            title="${t.label}">
            <span aria-hidden="true">${t.icon}</span> ${t.label}
          </button>
        `).join('')}
      </nav>

      <div class="header-status">
        <span class="conn-dot conn-checking" id="conn-indicator"></span>
        <span class="conn-label" id="conn-label">Connecting…</span>
      </div>
    </header>

    <!-- BODY -->
    <div class="admin-body" id="admin-body">

      <!-- SIDEBAR -->
      <aside class="admin-sidebar" id="admin-sidebar">
        <div class="sidebar-stats" id="sidebar-stats">
          ${skeletonStats(4)}
        </div>
        <div class="sidebar-actions">
          <button class="btn btn-primary sidebar-add-btn" id="sidebar-add-btn">+ Add New</button>
        </div>
        <div class="sidebar-hint">
          <p><kbd>Ctrl+N</kbd> — New offer</p>
          <p><kbd>Esc</kbd> — Close panel</p>
        </div>
        <div class="sidebar-mode" id="sidebar-mode">
          ${usingServiceKey ? '<span class="mode-badge mode-service">Service Key</span>' : '<span class="mode-badge mode-anon">Anon Key</span>'}
        </div>
      </aside>

      <!-- MAIN -->
      <main class="admin-main" id="admin-main" role="main">
        ${TABS.map(t => `
          <div class="tab-panel" id="tab-panel-${t.id}"
            role="tabpanel" aria-labelledby="tab-btn-${t.id}"></div>
        `).join('')}
      </main>

    </div>
  `
}

function skeletonStats(count) {
  return Array.from({ length: count }, () => `
    <div class="stat-item">
      <div class="skeleton-line" style="width:55%;height:12px;margin-bottom:6px"></div>
      <div class="skeleton-line" style="width:30%;height:20px"></div>
    </div>
  `).join('')
}

// ─── Tab Switching ────────────────────────────
function wireTabButtons() {
  // Tab nav buttons (created by renderShell)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn[data-tab]')
    if (btn) switchTab(btn.dataset.tab)

    const addBtn = e.target.closest('#sidebar-add-btn')
    if (addBtn) {
      if (_activeTab !== 'offers') switchTab('offers')
      requestAnimationFrame(() => setTimeout(() => openAddOfferPanel(), 30))
    }
  })
}

function switchTab(tabId) {
  _activeTab = tabId

  document.querySelectorAll('.tab-btn[data-tab]').forEach(btn => {
    const active = btn.dataset.tab === tabId
    btn.classList.toggle('active', active)
    btn.setAttribute('aria-selected', active)
  })

  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.style.display = panel.id === `tab-panel-${tabId}` ? '' : 'none'
  })

  if (!_initialized.has(tabId)) {
    _initialized.add(tabId)
    const cfg   = TABS.find(t => t.id === tabId)
    const panel = document.getElementById(`tab-panel-${tabId}`)
    if (cfg && panel) {
      try {
        cfg.init(panel, supabase)
      } catch (err) {
        console.error(`Failed to init tab "${tabId}":`, err)
        panel.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">⚠️</div>
            <div class="empty-state-text">Failed to load: ${err.message}</div>
          </div>`
      }
    }
  }
}

// ─── Connection Check ─────────────────────────
async function checkConnection() {
  const dot   = document.getElementById('conn-indicator')
  const label = document.getElementById('conn-label')

  if (!supabase) {
    setConn(dot, label, 'warn', 'Demo mode (no DB)')
    return
  }

  try {
    const { error } = await supabase.from('providers').select('id').limit(1)
    if (error) throw error
    setConn(dot, label, 'ok', usingServiceKey ? 'Connected (service key)' : 'Connected (anon key)')
  } catch (err) {
    console.warn('Supabase connection failed:', err.message)
    setConn(dot, label, 'error', 'Connection failed')
  }
}

function setConn(dot, label, state, text) {
  if (dot) { dot.className = `conn-dot conn-${state}`; dot.title = text }
  if (label) label.textContent = text
}

// ─── Sidebar Stats ────────────────────────────
async function loadSidebarStats() {
  const el = document.getElementById('sidebar-stats')
  if (!el) return

  const empty = [
    { label: 'Offers',    value: '—' },
    { label: 'Active',    value: '—' },
    { label: 'Providers', value: '—' },
    { label: 'Employees', value: '—' },
  ]

  if (!supabase) { el.innerHTML = buildStats(empty); return }

  try {
    const [offRes, provRes, empRes] = await Promise.all([
      supabase.from('offers').select('id, valid_until'),
      supabase.from('providers').select('id', { count: 'exact', head: true }),
      supabase.from('employee_codes').select('id', { count: 'exact', head: true }),
    ])

    const offers    = offRes.data || []
    const now       = new Date().toISOString()
    const active    = offers.filter(o => !o.valid_until || o.valid_until > now).length

    el.innerHTML = buildStats([
      { label: 'Offers',    value: offers.length },
      { label: 'Active',    value: active },
      { label: 'Providers', value: provRes.count ?? 0 },
      { label: 'Employees', value: empRes.count  ?? 0 },
    ])
  } catch (err) {
    console.warn('Sidebar stats failed:', err.message)
    el.innerHTML = buildStats(empty)
  }
}

function buildStats(items) {
  return items.map(s => `
    <div class="stat-item">
      <span class="stat-label">${s.label}</span>
      <span class="stat-value">${s.value}</span>
    </div>
  `).join('')
}

// ─── Keyboard Shortcuts ───────────────────────
function wireKeyboard() {
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey

    if (mod && e.key === 'n') {
      e.preventDefault()
      if (_activeTab !== 'offers') switchTab('offers')
      requestAnimationFrame(() => setTimeout(() => openAddOfferPanel(), 40))
    }
  })
}
