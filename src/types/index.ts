// ─── Auth & User ─────────────────────────────────────────────────────────────
export interface AppUser {
  id: string
  email: string
  full_name: string
  role: AppRole | null
  clients: string[]       // accessible client codes
  permissions: Record<string, ModulePermission>
  fieldPermissions: Record<string, Record<string, FieldPermission>>
}

export interface AppRole {
  id: string
  name: string
  description: string | null
  login_from: string | null
  login_to: string | null
}

export interface ModulePermission {
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
  can_approve: boolean
  can_post: boolean
  can_print: boolean
}

export interface FieldPermission {
  can_view: boolean
  can_edit: boolean
}

// ─── Client ───────────────────────────────────────────────────────────────────
export type ClientCode = 'WH' | 'RB' | 'GD' | '3I'

export interface Client {
  id: string
  client_code: ClientCode
  client_name: string
  sap_enabled: boolean
  status: string
}

// ─── Notification ─────────────────────────────────────────────────────────────
export interface AppNotification {
  id: string
  type: string
  title: string
  message: string
  reference_doc_type: string | null
  reference_doc_id: string | null
  reference_doc_no: string | null
  is_read: boolean
  created_at: string
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  type: ToastType
}

// ─── Document Status ──────────────────────────────────────────────────────────
export type DocStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'POSTED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'PENDING APPROVAL'
  | 'ARRANGED'
  | 'IN TRANSIT'

// ─── Table / List ─────────────────────────────────────────────────────────────
export interface TableColumn<T = Record<string, unknown>> {
  key: keyof T | string
  label: string
  sortable?: boolean
  sticky?: boolean
  width?: string
  render?: (value: unknown, row: T) => React.ReactNode
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
}

export interface FilterState {
  search: string
  client: string
  status: string
  dateFrom: string
  dateTo: string
  [key: string]: string
}

// ─── Form ─────────────────────────────────────────────────────────────────────
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}
