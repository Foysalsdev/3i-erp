import { useAuthStore } from '@/stores/authStore'
import type { FieldPermission } from '@/types'

/**
 * Check field-level permissions for a specific module field.
 * Super Admin can always view and edit all fields.
 *
 * @example
 * const { can_view, can_edit } = useFieldPermission('grn', 'unit_price')
 * if (!can_view) return null
 * return <SAPInput readOnly={!can_edit} />
 */
export function useFieldPermission(
  module: string,
  fieldName: string
): FieldPermission {
  const user = useAuthStore(state => state.user)

  // Default: allow (fail-open for undefined fields)
  const defaultPerm: FieldPermission = { can_view: true, can_edit: true }

  if (!user) return { can_view: false, can_edit: false }

  // Super Admin: full access
  if (user.role?.name === 'Super Admin') return defaultPerm

  // Check field permission
  const modulePerm = user.fieldPermissions[module]
  if (!modulePerm) return defaultPerm

  const fieldPerm = modulePerm[fieldName]
  if (!fieldPerm) return defaultPerm

  return fieldPerm
}
