import type { PostgrestError } from '@supabase/supabase-js'

type ToastType = 'success' | 'error' | 'warning' | 'info'
let _showToast: ((msg: string, type: ToastType) => void) | null = null

export function registerToast(fn: (msg: string, type: ToastType) => void) {
  _showToast = fn
}

export function showToast(message: string, type: ToastType = 'info') {
  if (_showToast) _showToast(message, type)
  else console.log(`[${type.toUpperCase()}]`, message)
}

export function handleSupabaseError(error: unknown, context = 'Operation') {
  if (!error) return
  const pgError = error as PostgrestError & { details?: string; code?: string }
  if (pgError.code === '23505') {
    const m = (pgError.details ?? pgError.message ?? '').match(/Key \((.+?)\)/)
    showToast(`Duplicate value: ${m ? m[1] : 'field'} already exists.`, 'error'); return
  }
  if (pgError.code === '23503') { showToast('Cannot complete: referenced record not found.', 'error'); return }
  if (pgError.code === '23502') { showToast('Required field is missing.', 'error'); return }
  if (pgError.code === '23514') { showToast(`Invalid value: ${pgError.message ?? 'Validation failed.'}`, 'error'); return }
  if (pgError.code === '42501') { showToast('Access denied. You do not have permission.', 'error'); return }
  if (pgError.code === 'PGRST301') { showToast('Session expired. Please log in again.', 'warning'); return }
  const msg = (error as Error).message ?? ''
  if (msg.includes('fetch') || msg.includes('network')) {
    showToast('Connection error. Check your internet.', 'error'); return
  }
  console.error(`[${context}]`, error)
  showToast(`Something went wrong. (${context})`, 'error')
}

// Only for truly async functions (not Supabase builders directly)
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2,
  delayMs = 1000
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try { return await fn() }
    catch (err) {
      lastError = err
      if (attempt < maxRetries) await new Promise(r => setTimeout(r, delayMs * (attempt + 1)))
    }
  }
  throw lastError
}
