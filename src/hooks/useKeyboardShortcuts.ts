import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// Module quick-jump: press 'g' then key
const MODULE_JUMPS: Record<string, string> = {
  d: '/',
  g: '/inbound/grn',
  p: '/inbound/po',
  s: '/outbound/so',
  c: '/outbound/dc',
  e: '/finance/expenses',
  i: '/finance/invoices',
  t: '/transport/trips',
  r: '/reports',
  u: '/admin/users',
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate()
  const pendingG  = useRef(false)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const tag     = (e.target as HTMLElement).tagName
      const inInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)

      // ─── Escape: dispatch close event ───────────────────
      if (e.key === 'Escape') {
        window.dispatchEvent(new Event('erp:escape'))
        return
      }

      // ─── F5: soft refresh ───────────────────────────────
      if (e.key === 'F5') {
        e.preventDefault()
        window.dispatchEvent(new Event('erp:refresh'))
        return
      }

      // Skip shortcuts when typing in inputs
      if (inInput) return

      // ─── Alt+H: Dashboard ───────────────────────────────
      if (e.altKey && e.key === 'h') {
        e.preventDefault()
        navigate('/')
        return
      }

      // ─── Alt+B: Go back ─────────────────────────────────
      if (e.altKey && e.key === 'b') {
        e.preventDefault()
        navigate(-1)
        return
      }

      // ─── Alt+?: Shortcut help ────────────────────────────
      if (e.altKey && e.key === '?') {
        e.preventDefault()
        window.dispatchEvent(new Event('erp:shortcuts'))
        return
      }

      // ─── 'g' then letter: Module quick-jump ─────────────
      if (e.key === 'g' && !e.altKey && !e.ctrlKey) {
        pendingG.current = true
        // Reset after 1.5s if no follow-up
        if (timerRef.current) clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => { pendingG.current = false }, 1500)
        return
      }

      if (pendingG.current && !e.altKey && !e.ctrlKey) {
        pendingG.current = false
        if (timerRef.current) clearTimeout(timerRef.current)
        const target = MODULE_JUMPS[e.key]
        if (target) {
          e.preventDefault()
          navigate(target)
        }
      }
    }

    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [navigate])
}
