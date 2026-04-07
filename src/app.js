/**
 * app.js — Main application: state manager, router, tab navigation
 * B2B2C Employee Benefits Portal
 */

import { createClient } from '@supabase/supabase-js'
import { renderLogin, initAuth } from './auth.js'
import { renderBeranda, renderProduk, loadOffers } from './offers.js'
import { renderDetail } from './checkout.js'
import { renderSimulator } from './simulator.js'

// ============================================================
// Supabase client (singleton — shared across modules via state)
// ============================================================
const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  || ''
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null

// ============================================================
// Application State
// ============================================================
export const state = {
  session: null,          // { code, name, company }
  screen: 'login',       // 'login' | 'main' | 'detail' | 'simulator'
  activeTab: 'beranda',  // 'beranda' | 'produk' | 'aktif' | 'profil'
  offers: [],
  providers: {},          // { id: providerObj }
  selectedOffer: null,
  activeCategory: 'all', // category chip filter on Beranda
  activeBrand: 'all',    // brand chip filter on Produk
  offersLoaded: false,
  prevScreen: 'main',    // for back navigation from detail/simulator
}

// ============================================================
// Navigation helpers
// ============================================================

export function navigate(screen, opts = {}) {
  state.prevScreen = state.screen
  state.screen = screen

  if (opts.tab)   state.activeTab = opts.tab
  if (opts.offer) state.selectedOffer = opts.offer

  render()
}

export function goBack() {
  navigate(state.prevScreen)
}

// ============================================================
// App Shell HTML
// ============================================================
function renderShell() {
  return `
    <!-- LOGIN SCREEN -->
    <div id="screen-login" class="screen">
      <!-- rendered by auth.js -->
    </div>

    <!-- MAIN SCREEN (tabs) -->
    <div id="screen-main" class="screen">
      <!-- Tab content panels -->
      <div id="tab-beranda" class="screen" style="flex:1;flex-direction:column;overflow:hidden;"></div>
      <div id="tab-produk"  class="screen" style="flex:1;flex-direction:column;overflow:hidden;"></div>
      <div id="tab-aktif"   class="screen" style="flex:1;flex-direction:column;overflow:hidden;"></div>
      <div id="tab-profil"  class="screen" style="flex:1;flex-direction:column;overflow:hidden;"></div>

      <!-- Bottom Navigation -->
      <nav class="bottom-nav" id="bottom-nav">
        <button class="nav-tab" data-tab="beranda">
          <span class="nav-icon">🏠</span>
          <span>Beranda</span>
        </button>
        <button class="nav-tab" data-tab="produk">
          <span class="nav-icon">🛍️</span>
          <span>Produk</span>
        </button>
        <button class="nav-tab" data-tab="aktif">
          <span class="nav-icon">📋</span>
          <span>Aktif</span>
        </button>
        <button class="nav-tab" data-tab="profil">
          <span class="nav-icon">👤</span>
          <span>Profil</span>
        </button>
      </nav>
    </div>

    <!-- DETAIL SCREEN -->
    <div id="screen-detail" class="screen">
      <!-- rendered by checkout.js -->
    </div>

    <!-- SIMULATOR SCREEN -->
    <div id="screen-simulator" class="screen">
      <!-- rendered by simulator.js -->
    </div>
  `
}

// ============================================================
// Main render loop
// ============================================================
function render() {
  const app = document.getElementById('app')

  if (!app._shellReady) {
    app.innerHTML = renderShell()
    app._shellReady = true
    attachNavListeners()
  }

  // Show/hide top-level screens
  const screens = ['login', 'main', 'detail', 'simulator']
  for (const s of screens) {
    const el = document.getElementById(`screen-${s}`)
    if (el) el.classList.toggle('active', state.screen === s)
  }

  // ---- Login ----
  if (state.screen === 'login') {
    const loginEl = document.getElementById('screen-login')
    renderLogin(loginEl)
    return
  }

  // ---- Main (tabs) ----
  if (state.screen === 'main') {
    updateNavTabs()
    renderActiveTab()
    return
  }

  // ---- Detail ----
  if (state.screen === 'detail' && state.selectedOffer) {
    const el = document.getElementById('screen-detail')
    renderDetail(el, state.selectedOffer)
    return
  }

  // ---- Simulator ----
  if (state.screen === 'simulator') {
    const el = document.getElementById('screen-simulator')
    renderSimulator(el, state.selectedOffer)
    return
  }
}

function updateNavTabs() {
  const tabs = document.querySelectorAll('.nav-tab')
  tabs.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === state.activeTab)
  })

  // Show only active tab panel
  const tabIds = ['beranda', 'produk', 'aktif', 'profil']
  for (const id of tabIds) {
    const el = document.getElementById(`tab-${id}`)
    if (el) el.classList.toggle('active', id === state.activeTab)
  }
}

function renderActiveTab() {
  const tab = state.activeTab

  if (tab === 'beranda') {
    renderBeranda(document.getElementById('tab-beranda'))
  } else if (tab === 'produk') {
    renderProduk(document.getElementById('tab-produk'))
  } else if (tab === 'aktif') {
    renderAktif(document.getElementById('tab-aktif'))
  } else if (tab === 'profil') {
    renderProfil(document.getElementById('tab-profil'))
  }
}

function attachNavListeners() {
  document.getElementById('bottom-nav')?.addEventListener('click', e => {
    const btn = e.target.closest('.nav-tab')
    if (!btn) return
    const tab = btn.dataset.tab
    if (tab && tab !== state.activeTab) {
      state.activeTab = tab
      updateNavTabs()
      renderActiveTab()
    }
  })
}

// ============================================================
// Aktif tab — Phase 2 placeholder
// ============================================================
function renderAktif(el) {
  if (el._rendered) return
  el._rendered = true
  el.innerHTML = `
    <div class="status-bar">
      <span>9:41</span>
      <span class="status-icons">●●● ⚡</span>
    </div>
    <div class="scroll-area">
      <div class="empty-state" style="padding-top:60px;">
        <div class="empty-state-icon">📋</div>
        <div class="empty-state-title">Belum ada produk aktif</div>
        <div class="empty-state-sub">Setelah kamu mengajukan produk di platform provider, riwayat akan muncul di sini.</div>
        <button class="btn-primary" style="width:auto;padding:12px 24px;margin-top:12px;" id="btn-to-produk">
          Lihat Penawaran →
        </button>
      </div>
    </div>
  `
  el.querySelector('#btn-to-produk')?.addEventListener('click', () => {
    state.activeTab = 'produk'
    updateNavTabs()
    renderActiveTab()
  })
}

// ============================================================
// Profil tab
// ============================================================
function renderProfil(el) {
  const session = state.session || {}
  const initials = (session.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  el.innerHTML = `
    <div class="status-bar">
      <span>9:41</span>
      <span class="status-icons">●●● ⚡</span>
    </div>
    <div class="scroll-area pb-nav">
      <div class="profil-header">
        <div class="profil-avatar">${initials}</div>
        <div class="profil-name">${esc(session.name || '—')}</div>
        <div class="profil-company">${esc(session.company || '—')}</div>
      </div>

      <div class="profil-section mt-12">
        <div class="profil-row">
          <span class="profil-row-label">Kode Karyawan</span>
          <span class="profil-row-value mono">${esc(session.code || '—')}</span>
        </div>
        <div class="profil-row">
          <span class="profil-row-label">Perusahaan</span>
          <span class="profil-row-value">${esc(session.company || '—')}</span>
        </div>
        <div class="profil-row">
          <span class="profil-row-label">Status</span>
          <span class="profil-row-value" style="color:var(--green)">✓ Aktif</span>
        </div>
      </div>

      <div class="profil-section mt-8">
        <div class="profil-row">
          <span class="profil-row-label">Versi Aplikasi</span>
          <span class="profil-row-value">1.0.0</span>
        </div>
        <div class="profil-row">
          <span class="profil-row-label">Provider</span>
          <span class="profil-row-value">Adira · Home Credit · Zurich</span>
        </div>
      </div>

      <button class="btn-keluar" id="btn-keluar">Keluar</button>

      <div style="text-align:center;padding:8px 14px 4px;font-size:9px;color:var(--muted);">
        Program eksklusif untuk karyawan mitra terdaftar
      </div>
    </div>
  `

  el.querySelector('#btn-keluar')?.addEventListener('click', logout)
}

// ============================================================
// Auth helpers
// ============================================================
export function setSession(sessionData) {
  state.session = sessionData
  sessionStorage.setItem('emp_session', JSON.stringify(sessionData))
}

export function logout() {
  sessionStorage.removeItem('emp_session')
  sessionStorage.removeItem('offers_cache')
  state.session = null
  state.offers = []
  state.providers = {}
  state.offersLoaded = false
  state.screen = 'login'
  state.activeTab = 'beranda'
  // Reset shell so login re-renders cleanly
  const app = document.getElementById('app')
  if (app) {
    app._shellReady = false
    app.innerHTML = ''
  }
  render()
}

// ============================================================
// Utility: HTML escape
// ============================================================
export function esc(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ============================================================
// Bootstrap
// ============================================================
async function boot() {
  // Remove splash
  document.getElementById('loading-splash')?.remove()

  // Check for existing session
  try {
    const raw = sessionStorage.getItem('emp_session')
    if (raw) {
      state.session = JSON.parse(raw)
      state.screen = 'main'
    }
  } catch (_) { /* ignore */ }

  // Warn if Supabase not configured (demo mode)
  if (!supabase) {
    console.warn('[B2B2C] Supabase not configured — running in demo mode')
  }

  render()

  // Pre-load offers in background after login
  if (state.session && supabase) {
    loadOffers()
  }
}

boot()
