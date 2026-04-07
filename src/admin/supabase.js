/**
 * admin/supabase.js — Admin Supabase client
 * Uses VITE_SUPABASE_SERVICE_KEY (bypasses RLS), falls back to VITE_SUPABASE_ANON_KEY.
 *
 * SECURITY: The service key is embedded in the built JS bundle.
 * Restrict access to /admin.html at the hosting layer (IP allowlist, basic auth, etc.)
 * Never commit .env to git.
 */

import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL || ''
const key = import.meta.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = (url && key)
  ? createClient(url, key, { auth: { persistSession: false } })
  : null

export const isConnected = !!supabase
export const usingServiceKey = !!(url && import.meta.env.VITE_SUPABASE_SERVICE_KEY)
