/**
 * admin/components.js — Shared UI primitives
 * Toast, Confirm Modal, Skeleton, Toggle, Category Pill, Currency, Panel helpers
 */

// ─────────────────────────────────────────────
// Toast
// ─────────────────────────────────────────────

const TOAST_ICONS = { success: '✓', error: '✗', warn: '⚠', info: 'ℹ' }

/**
 * toast(message, type, duration)
 * type: 'success' | 'error' | 'warn' | 'info'
 * duration: ms (0 = sticky until dismissed)
 */
export function toast(message, type = 'success', duration = 3000) {
  const container = document.getElementById('toast-container')
  if (!container) return

  const el = document.createElement('div')
  el.className = `toast toast-${type}`
  el.setAttribute('role', 'alert')
  el.innerHTML = `
    <span class="toast-icon">${TOAST_ICONS[type] ?? 'ℹ'}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" aria-label="Tutup">✕</button>
  `

  const dismiss = () => {
    el.style.opacity = '0'
    el.style.transform = 'translateX(16px)'
    el.style.transition = 'opacity 0.2s, transform 0.2s'
    setTimeout(() => el.remove(), 220)
  }

  el.querySelector('.toast-close').addEventListener('click', dismiss)
  container.appendChild(el)
  if (duration > 0) setTimeout(dismiss, duration)
}

// ─────────────────────────────────────────────
// Confirm Modal
// ─────────────────────────────────────────────

/**
 * confirm(title, body, onConfirm, danger)
 * Uses the pre-existing #modal-overlay / #modal-title / #modal-body / #modal-actions
 * elements in admin.html. Calls onConfirm() if the user confirms.
 */
export function confirm(title, body, onConfirm, danger = true) {
  const overlay  = document.getElementById('modal-overlay')
  const titleEl  = document.getElementById('modal-title')
  const bodyEl   = document.getElementById('modal-body')
  const actionsEl= document.getElementById('modal-actions')
  if (!overlay) return

  titleEl.textContent  = title || ''
  bodyEl.textContent   = body  || ''
  actionsEl.innerHTML  = ''

  const cancelBtn  = document.createElement('button')
  cancelBtn.className   = 'btn btn-secondary'
  cancelBtn.textContent = 'Batal'

  const confirmBtn = document.createElement('button')
  confirmBtn.className   = danger ? 'btn btn-danger' : 'btn btn-primary'
  confirmBtn.textContent = danger ? 'Ya, Hapus' : 'Konfirmasi'

  actionsEl.append(cancelBtn, confirmBtn)
  overlay.classList.remove('hidden')

  const close = (result) => {
    overlay.classList.add('hidden')
    if (result && onConfirm) onConfirm()
  }

  cancelBtn.addEventListener('click',  () => close(false))
  confirmBtn.addEventListener('click', () => close(true))
  overlay.addEventListener('click', e => { if (e.target === overlay) close(false) }, { once: true })
}

// ─────────────────────────────────────────────
// Skeleton rows
// ─────────────────────────────────────────────

export function skeletonRows(count = 5, cols = 6) {
  return Array.from({ length: count }, () => `
    <tr class="skeleton-row">
      ${Array.from({ length: cols }, (_, i) =>
        `<td><div class="skeleton-line" style="width:${55 + (i * 17) % 40}%"></div></td>`
      ).join('')}
    </tr>
  `).join('')
}

// ─────────────────────────────────────────────
// Toggle switch
// ─────────────────────────────────────────────

export function toggleHTML(id, checked) {
  return `
    <label class="toggle-wrap">
      <span class="toggle">
        <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
        <span class="toggle-track"></span>
      </span>
    </label>
  `
}

// ─────────────────────────────────────────────
// Category helpers
// ─────────────────────────────────────────────

const CATEGORY_META = {
  vehicle:       { css: 'pill-vehicle',      label: 'Kendaraan' },
  electronics:   { css: 'pill-electronics',  label: 'Elektronik' },
  appliance:     { css: 'pill-appliance',    label: 'Perabotan' },
  personal_loan: { css: 'pill-personal_loan',label: 'Pinjaman' },
  insurance:     { css: 'pill-insurance',    label: 'Asuransi' },
}

export function categoryPill(cat) {
  const meta = CATEGORY_META[cat]
  if (!meta) return `<span class="pill">${cat || '—'}</span>`
  return `<span class="pill ${meta.css}">${meta.label}</span>`
}

export function categoryLabel(cat) {
  return CATEGORY_META[cat]?.label || cat || ''
}

// ─────────────────────────────────────────────
// Currency & Date formatters
// ─────────────────────────────────────────────

export function formatIDR(n) {
  if (n == null || n === '') return '—'
  return 'Rp\u00a0' + Number(n).toLocaleString('id-ID')
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  } catch { return '—' }
}

export function isExpired(dateStr) {
  if (!dateStr) return false
  return new Date(dateStr) < new Date()
}

// ─────────────────────────────────────────────
// Slide-in Panel (by element ID)
// ─────────────────────────────────────────────

let _activePanelEscHandler = null

/**
 * openPanel(panelId) — show slide panel by element ID
 * Adds .open to the panel, removes .hidden from the shared overlay.
 */
export function openPanel(panelId) {
  const panel   = document.getElementById(panelId)
  const overlay = document.getElementById('panel-overlay')
  if (!panel) return

  // Close other open panels
  document.querySelectorAll('.slide-panel.open').forEach(p => {
    if (p.id !== panelId) p.classList.remove('open')
  })

  panel.classList.add('open')
  if (overlay) overlay.classList.remove('hidden')

  // Escape key
  if (_activePanelEscHandler) {
    document.removeEventListener('keydown', _activePanelEscHandler)
  }
  _activePanelEscHandler = (e) => {
    if (e.key === 'Escape') closePanel(panelId)
  }
  document.addEventListener('keydown', _activePanelEscHandler)

  if (overlay) overlay.onclick = () => closePanel(panelId)
}

/**
 * closePanel(panelId) — hide slide panel by element ID
 */
export function closePanel(panelId) {
  const panel   = document.getElementById(panelId)
  const overlay = document.getElementById('panel-overlay')
  if (panel) panel.classList.remove('open')

  const anyOpen = document.querySelectorAll('.slide-panel.open').length > 0
  if (!anyOpen && overlay) {
    overlay.classList.add('hidden')
    overlay.onclick = null
  }

  if (_activePanelEscHandler) {
    document.removeEventListener('keydown', _activePanelEscHandler)
    _activePanelEscHandler = null
  }
}

// ─────────────────────────────────────────────
// String helpers
// ─────────────────────────────────────────────

export function slugify(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

export function generateCode(prefix = 'EMP', length = 6) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return `${prefix}-${code}`
}
