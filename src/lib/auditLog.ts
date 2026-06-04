import { supabase } from './supabase'

type AuditAction = 'CREATE'|'UPDATE'|'DELETE'|'POST'|'APPROVE'|'CANCEL'|'STATUS_CHANGE'|'LOGIN'|'LOGOUT'

const LOGGABLE_ACTIONS: AuditAction[] = ['POST','APPROVE','DELETE','CANCEL','STATUS_CHANGE','LOGIN','LOGOUT']

interface AuditInsert {
  user_id: string; user_name: string; user_role: string; action: string; module: string
  record_id: string; record_no: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  changed_fields: string[]
}

export async function auditLog(
  action: AuditAction, module: string, recordId: string, recordNo: string,
  oldValues?: Record<string, unknown>, newValues?: Record<string, unknown>
): Promise<void> {
  if (!LOGGABLE_ACTIONS.includes(action)) return
  try {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    const changedFields = oldValues && newValues
      ? Object.keys(newValues).filter(k => oldValues[k] !== newValues[k])
      : newValues ? Object.keys(newValues) : []

    const payload: AuditInsert = {
      user_id:        authUser.id,
      user_name:      (authUser.user_metadata?.full_name as string | undefined) ?? authUser.email ?? 'Unknown',
      user_role:      'Unknown',
      action, module,
      record_id:      recordId,
      record_no:      recordNo,
      old_values:     oldValues ?? null,
      new_values:     newValues ?? null,
      changed_fields: changedFields,
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await supabase.from('audit_logs').insert(payload as any)
  } catch (err) {
    console.error('[AuditLog] Failed:', err)
  }
}
