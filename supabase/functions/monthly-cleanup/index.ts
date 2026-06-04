import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // 1. Delete read notifications older than 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { count: notifDeleted } = await supabase
    .from('notifications')
    .delete({ count: 'exact' })
    .lt('created_at', thirtyDaysAgo.toISOString())
    .eq('is_read', true)

  // 2. Archive audit logs older than 3 months (non-critical)
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

  const { count: auditDeleted } = await supabase
    .from('audit_logs')
    .delete({ count: 'exact' })
    .lt('created_at', threeMonthsAgo.toISOString())
    .not('action', 'in', '("DELETE","POST","APPROVE","CANCEL")')

  // 3. Clean old user input history (unused for 6 months with count=1)
  const sixMonthsAgo = new Date()
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

  const { count: historyDeleted } = await supabase
    .from('user_input_history')
    .delete({ count: 'exact' })
    .lt('last_used', sixMonthsAgo.toISOString())
    .eq('used_count', 1)

  // 4. Get current DB size
  const { data: sizeData } = await supabase.rpc('get_db_size')

  return new Response(
    JSON.stringify({
      success: true,
      notifications_deleted: notifDeleted ?? 0,
      audit_logs_deleted: auditDeleted ?? 0,
      history_deleted: historyDeleted ?? 0,
      db_size: sizeData,
    }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
