import { useEffect, useCallback } from 'react'

/**
 * Refetch data when:
 * 1. Tab becomes visible again (user switches back)
 * 2. Network comes back online
 * 3. erp:refocus custom event fires
 *
 * Usage: useRefetchOnFocus(loadData)
 */
export function useRefetchOnFocus(refetch: () => void) {
  const stableRefetch = useCallback(refetch, [])

  useEffect(() => {
    const handleFocus   = () => stableRefetch()
    const handleRefocus = () => stableRefetch()

    window.addEventListener('erp:refocus', handleRefocus)
    window.addEventListener('focus',       handleFocus)

    return () => {
      window.removeEventListener('erp:refocus', handleRefocus)
      window.removeEventListener('focus',       handleFocus)
    }
  }, [stableRefetch])
}
