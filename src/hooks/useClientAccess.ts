import { useAuthStore } from '@/stores/authStore'

/**
 * Check if current user can access a specific client.
 *
 * @example
 * const canAccessWH = useClientAccess('WH')
 * const accessibleClients = useAccessibleClients()
 */
export function useClientAccess(clientCode: string): boolean {
  const user = useAuthStore(state => state.user)

  if (!user) return false
  if (user.role?.name === 'Super Admin') return true

  return user.clients.includes(clientCode)
}

/**
 * Returns all accessible client codes for the current user.
 */
export function useAccessibleClients(): string[] {
  const user = useAuthStore(state => state.user)

  if (!user) return []
  if (user.role?.name === 'Super Admin') return ['WH', 'RB', 'GD', '3I']

  return user.clients
}

/**
 * Check if user's login hours are valid (time-based access).
 */
export function useTimeAccess(): boolean {
  const user = useAuthStore(state => state.user)

  if (!user || !user.role) return true
  if (user.role.name === 'Super Admin') return true

  const { login_from, login_to } = user.role
  if (!login_from || !login_to) return true

  const now = new Date()
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`

  return currentTime >= login_from && currentTime <= login_to
}
