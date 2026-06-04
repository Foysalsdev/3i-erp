import { useAuthStore } from '@/stores/authStore'

/**
 * Check if current user has a specific permission on a module.
 * Super Admin always returns true.
 *
 * @example
 * const canCreate = usePermission('grn', 'can_create')
 * if (canCreate) return <Button>New GRN</Button>
 */
export function usePermission(
  module: string,
  action:
    | 'can_view'
    | 'can_create'
    | 'can_edit'
    | 'can_delete'
    | 'can_approve'
    | 'can_post'
    | 'can_print'
): boolean {
  const user = useAuthStore(state => state.user)

  if (!user) return false

  // Super Admin has all permissions
  if (user.role?.name === 'Super Admin') return true

  // Check module permission
  const modulePerm = user.permissions[module]
  if (!modulePerm) return false

  return modulePerm[action] === true
}
