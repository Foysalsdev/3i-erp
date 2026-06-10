import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { AppUser, AppRole, ModulePermission, FieldPermission } from '@/types'

interface RolePermRow {
  module: string; can_view: boolean; can_create: boolean; can_edit: boolean
  can_delete: boolean; can_approve: boolean; can_post: boolean; can_print: boolean
}
interface FieldPermRow {
  module: string; field_name: string; can_view: boolean; can_edit: boolean
}
interface ClientRow { client_id: string }
interface UserRoleRow {
  role_id: string
  roles: { id: string; name: string; description: string | null; login_from: string | null; login_to: string | null } | null
}

interface AuthState {
  user: AppUser | null
  isLoading: boolean
  isInitialized: boolean
  initialize: () => Promise<void>
  login: (email: string, password: string) => Promise<{ error?: string }>
  logout: () => Promise<void>
  setUser: (user: AppUser | null) => void
  _loadProfile: (userId: string) => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    set({ isLoading: true })
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) await get()._loadProfile(session.user.id)
    } catch (err) {
      console.error('[AuthStore] Initialize error:', err)
    } finally {
      set({ isLoading: false, isInitialized: true })
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        await get()._loadProfile(session.user.id)
      } else if (event === 'SIGNED_OUT') {
        set({ user: null })
      }
    })
  },

  _loadProfile: async (userId: string) => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      // Get role
      const { data: urRaw } = await supabase
        .from('user_roles')
        .select('role_id, roles(id, name, description, login_from, login_to)')
        .eq('user_id', userId)
        .single()

      const ur = urRaw as unknown as UserRoleRow | null
      const role = (ur?.roles ?? null) as AppRole | null
      const roleId = ur?.role_id ?? ''
      const isSuperAdmin = role?.name === 'Super Admin'

      // Accessible clients — ALWAYS from DB (even Super Admin)
      const { data: clientsRaw } = await supabase
        .from('role_clients')
        .select('client_id')
        .eq('role_id', roleId)
      const clientsData = (clientsRaw ?? []) as ClientRow[]
      const clientList = clientsData.map(c => c.client_id)

      // Module permissions — Super Admin gets all hardcoded
      let permissions: Record<string, ModulePermission> = {}
      if (isSuperAdmin) {
        permissions = buildSuperAdminPermissions()
      } else {
        const { data: permsRaw } = await supabase
          .from('role_permissions')
          .select('module, can_view, can_create, can_edit, can_delete, can_approve, can_post, can_print')
          .eq('role_id', roleId)
        const permsData = (permsRaw ?? []) as RolePermRow[]
        for (const p of permsData) {
          permissions[p.module] = {
            can_view: p.can_view, can_create: p.can_create, can_edit: p.can_edit,
            can_delete: p.can_delete, can_approve: p.can_approve, can_post: p.can_post,
            can_print: p.can_print,
          }
        }
      }

      // Field permissions
      const { data: fpRaw } = await supabase
        .from('role_field_permissions')
        .select('module, field_name, can_view, can_edit')
        .eq('role_id', roleId)
      const fpData = (fpRaw ?? []) as FieldPermRow[]
      const fieldPermissions: Record<string, Record<string, FieldPermission>> = {}
      for (const fp of fpData) {
        if (!fieldPermissions[fp.module]) fieldPermissions[fp.module] = {}
        fieldPermissions[fp.module][fp.field_name] = { can_view: fp.can_view, can_edit: fp.can_edit }
      }

      const fullName =
        (authUser?.user_metadata?.full_name as string | undefined) ??
        authUser?.email?.split('@')[0] ??
        'User'

      set({
        user: {
          id: userId,
          email: authUser?.email ?? '',
          full_name: fullName,
          role,
          clients: clientList,
          permissions,
          fieldPermissions,
        },
      })
    } catch (err) {
      console.error('[AuthStore] Load profile error:', err)
    }
  },

  login: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? { error: error.message } : {}
  },

  logout: async () => {
    await supabase.auth.signOut()
    set({ user: null })
  },

  setUser: (user) => set({ user }),
}))

function buildSuperAdminPermissions(): Record<string, ModulePermission> {
  const modules = [
    'dashboard','clients','items','suppliers','customers','warehouses',
    'po','grn','prn','so','dc','gate_pass','srn','invoice_cancel',
    'exchange','stock_ledger','stock_transfer','stock_adjustment',
    'damaged_stock','cycle_count','expense','budget','invoice','payment',
    'finance_ledger','employee','attendance','leave','payroll','labour_log',
    'task','notifications','audit_log','attachments','reports',
    'settings','users','roles','transport','promotional','masters',
  ]
  const full: ModulePermission = {
    can_view: true, can_create: true, can_edit: true, can_delete: true,
    can_approve: true, can_post: true, can_print: true,
  }
  return Object.fromEntries(modules.map(m => [m, { ...full }]))
}
