import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppNotification, Toast, ToastType } from '@/types'

interface AppState {
  // Active client filter
  activeClient: string
  setActiveClient: (client: string) => void

  // Notifications
  notifications: AppNotification[]
  unreadCount: number
  addNotification: (n: AppNotification) => void
  markAllRead: () => void
  markRead: (id: string) => void
  setNotifications: (notifications: AppNotification[]) => void

  // Toasts
  toasts: Toast[]
  showToast: (message: string, type?: ToastType) => void
  removeToast: (id: string) => void

  // Sidebar
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void

  // Mobile drawer
  mobileDrawerOpen: boolean
  setMobileDrawerOpen: (v: boolean) => void

  // Theme
  theme: 'light' | 'dark' | 'system'
  setTheme: (t: 'light' | 'dark' | 'system') => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ─── Client ───────────────────────────────────────────────────────────
      activeClient: 'WH',
      setActiveClient: (client) => set({ activeClient: client }),

      // ─── Notifications ────────────────────────────────────────────────────
      notifications: [],
      unreadCount: 0,

      setNotifications: (notifications) => set({
        notifications,
        unreadCount: notifications.filter(n => !n.is_read).length,
      }),

      addNotification: (n) => set(state => ({
        notifications: [n, ...state.notifications].slice(0, 100),
        unreadCount: state.unreadCount + (n.is_read ? 0 : 1),
      })),

      markRead: (id) => set(state => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      })),

      markAllRead: () => set(state => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0,
      })),

      // ─── Toasts ───────────────────────────────────────────────────────────
      toasts: [],

      showToast: (message, type = 'info') => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`
        set(state => ({
          toasts: [...state.toasts, { id, message, type }],
        }))
        // Auto-dismiss after 4 seconds
        setTimeout(() => {
          get().removeToast(id)
        }, 4000)
      },

      removeToast: (id) => set(state => ({
        toasts: state.toasts.filter(t => t.id !== id),
      })),

      // ─── Sidebar ──────────────────────────────────────────────────────────
      sidebarCollapsed: false,
      toggleSidebar: () => set(state => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      // ─── Mobile Drawer ────────────────────────────────────────────────────
      mobileDrawerOpen: false,
      setMobileDrawerOpen: (v) => set({ mobileDrawerOpen: v }),

      // ─── Theme ────────────────────────────────────────────────────────────
      theme: 'light',
      setTheme: (t) => {
        set({ theme: t })
        if (t === 'dark') document.documentElement.classList.add('dark')
        else document.documentElement.classList.remove('dark')
      },
    }),
    {
      name: '3i-erp-app-state',
      partialize: (state) => ({
        activeClient: state.activeClient,
        sidebarCollapsed: state.sidebarCollapsed,
        theme: state.theme,
      }),
    }
  )
)
