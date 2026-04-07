/**
 * auth.js — Login screen UI + Supabase employee code validation + session
 * Workflow: 02_employee_auth
 */

import { supabase, state, setSession, navigate, esc } from './app.js'
import { loadOffers } from './offers.js'

// ============================================================
// Demo data — used when Supabase is not configured
// ============================================================
const DEMO_CODES = {
  'EMP-001001': { name: 'Demo Karyawan 1',  company: 'PT Mitra Sejahtera' },
  'EMP-001002': { name: 'Demo Karyawan 2',  company: 'PT Mitra Sejahtera' },
  'EMP-TEST01': { name: 'Test User',        company: 'Demo Corp' },
}

// ============================================================
// Render login screen
// ============================================================
export function renderLogin(el) {
  if (el._rendered) return
  el._rendered = true

  el.innerHTML = `
    <div class="login-card">
      <div class="login-logo">
        <div class="login-logo-icon">🏦</div>
        <div class="login-logo-name">Benefits Portal</div>
        <div class="login-logo-tagline">Akses penawaran eksklusif karyawan</div>
      </div>

      <div class="login-form">
        <input
          type="text"
          id="login-input"
          class="input-field"
          placeholder="Masukkan Kode Karyawan"
          autocomplete="off"
          autocorrect="off"
          autocapitalize="characters"
          spellcheck="false"
          maxlength="20"
        />

        <div class="login-error" id="login-error" aria-live="polite"></div>

        <button class="btn-primary" id="login-btn" disabled>
          Akses Penawaran Saya →
        </button>
      </div>

      <div class="login-footer">
        Program eksklusif untuk karyawan mitra terdaftar.<br/>
        Hubungi HR Anda untuk mendapatkan kode akses.
      </div>
    </div>
  `

  initAuth(el)
}

// ============================================================
// Auth interactions
// ============================================================
export function initAuth(el) {
  const input  = el.querySelector('#login-input')
  const btn    = el.querySelector('#login-btn')
  const errEl  = el.querySelector('#login-error')

  // Enable CTA when input has >= 3 chars
  input.addEventListener('input', () => {
    const val = input.value.trim()
    input.classList.remove('error')
    errEl.textContent = ''
    btn.disabled = val.length < 3
  })

  // Auto-uppercase and trim
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !btn.disabled) btn.click()
  })

  // Submit
  btn.addEventListener('click', async () => {
    const code = input.value.trim().toUpperCase()
    if (code.length < 3) return

    setLoading(btn, true)
    errEl.textContent = ''
    input.classList.remove('error')

    try {
      const session = await validateCode(code)

      if (session) {
        setSession(session)
        navigate('main', { tab: 'beranda' })

        // Pre-load offers in background
        if (supabase) loadOffers()
      } else {
        input.classList.add('error')
        errEl.textContent = 'Kode tidak dikenali. Hubungi HR Anda.'
        input.focus()
      }
    } catch (_) {
      errEl.textContent = 'Layanan sementara tidak tersedia. Silakan coba lagi.'
    }

    setLoading(btn, false)
  })
}

// ============================================================
// Validate employee code against Supabase (or demo fallback)
// ============================================================
async function validateCode(code) {
  if (!supabase) {
    // Demo mode — validate against static list
    const demo = DEMO_CODES[code]
    if (demo) return { code, ...demo }
    return null
  }

  const { data, error } = await supabase
    .from('employee_codes')
    .select('code, name, company')
    .eq('code', code)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw error
  if (!data)  return null

  return { code: data.code, name: data.name, company: data.company }
}

// ============================================================
// Loading state helper
// ============================================================
function setLoading(btn, loading) {
  if (loading) {
    btn.disabled = true
    btn.innerHTML = '<div class="btn-spinner"></div>'
  } else {
    btn.disabled = false
    btn.innerHTML = 'Akses Penawaran Saya →'
  }
}
