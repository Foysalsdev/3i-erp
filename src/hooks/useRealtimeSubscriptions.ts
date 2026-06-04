import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'
import type { AppNotification } from '@/types'

export function useRealtimeSubscriptions() {
  const { user } = useAuthStore()
  const { addNotification, setNotifications, showToast } = useAppStore()

  useEffect(() => {
    if (!user?.id) return

    // ─── Load existing unread notifications on mount ───────
    ;(async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, type, title, message, reference_doc_type, reference_doc_id, reference_doc_no, is_read, created_at')
        .or(`user_id.eq.${user.id},role_id.eq.${user.role?.id ?? '00000000-0000-0000-0000-000000000000'}`)
        .order('created_at', { ascending: false })
        .limit(50)

      if (data) {
        setNotifications(data as AppNotification[])
      }
    })()

    // ─── Subscribe to new notifications (Realtime) ─────────
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const notif = payload.new as AppNotification
          addNotification(notif)
          // Show toast for new notification
          showToast(notif.title, 'info')
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id, user?.role?.id])
}
