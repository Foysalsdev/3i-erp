import { useState, useRef, useEffect } from 'react'
import { Menu, Bell, User, LogOut, ChevronDown, Wifi, WifiOff, Sun, Moon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { SAPBadge } from '@/components/ui/SAPBadge'
import { formatRelativeTime } from '@/lib/formatters'

const CLIENT_OPTIONS = [
  { value: 'WH', label: 'Whirlpool' },
  { value: 'RB', label: 'Robi' },
  { value: 'GD', label: 'Godrej' },
  { value: '3I', label: '3i (Internal)' },
]

export function SAPShell() {
  const { user, logout } = useAuthStore()
  const { toggleSidebar, setMobileDrawerOpen, activeClient, setActiveClient,
          notifications, unreadCount, markAllRead, markRead, theme, setTheme } = useAppStore()
  const isOnline = useOnlineStatus()
  const navigate = useNavigate()

  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const [notifPanelOpen, setNotifPanelOpen] = useState(false)
  const [clientMenuOpen, setClientMenuOpen] = useState(false)

  const userMenuRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  // Close menus on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  const currentClient = CLIENT_OPTIONS.find(c => c.value === activeClient)
  const accessibleClients = CLIENT_OPTIONS.filter(c => user?.clients.includes(c.value))

  return (
    <header className="
      h-12 bg-sap-shell flex items-center justify-between
      px-4 flex-shrink-0 z-40 sticky top-0
      shadow-[0_2px_8px_rgba(0,0,0,0.3)]
    ">
      {/* Left: Hamburger + Logo */}
      <div className="flex items-center gap-3">
        {/* Desktop: toggle collapse | Mobile: open drawer */}
        <button
          onClick={() => {
            if (window.innerWidth < 768) setMobileDrawerOpen(true)
            else toggleSidebar()
          }}
          className="p-1.5 rounded-sap-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-sap-blue rounded-sap flex items-center justify-center">
            <span className="text-white font-bold text-sap-sm">3i</span>
          </div>
          <span className="text-white font-semibold text-sap-md hidden sm:block">
            3i Logistics ERP
          </span>
        </div>
      </div>

      {/* Right: Client + Online + Notif + User */}
      <div className="flex items-center gap-1">
        {/* Online status */}
        <div className={`hidden sm:flex items-center gap-1 px-2 py-1 rounded-sap-sm text-sap-xs ${
          isOnline ? 'text-green-400' : 'text-red-400'
        }`}>
          {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
          <span className="hidden lg:inline">{isOnline ? 'Online' : 'Offline'}</span>
        </div>

        {/* Client Switcher */}
        <div className="relative" ref={undefined}>
          <button
            onClick={() => setClientMenuOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sap-sm text-white/80 hover:text-white hover:bg-white/10 text-sap-sm transition-colors"
          >
            <span className="hidden sm:inline">{currentClient?.label ?? activeClient}</span>
            <span className="sm:hidden">{activeClient}</span>
            <ChevronDown size={14} />
          </button>
          {clientMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-sap shadow-sap-panel border border-sap-border z-50">
              {accessibleClients.map(c => (
                <button
                  key={c.value}
                  onClick={() => { setActiveClient(c.value); setClientMenuOpen(false) }}
                  className={`
                    w-full text-left px-3 py-2.5 text-sap-sm transition-colors
                    ${c.value === activeClient
                      ? 'bg-sap-blueLight text-sap-blue font-medium'
                      : 'text-sap-text hover:bg-sap-surfaceHover'
                    }
                  `}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifPanelOpen(o => !o)}
            className="relative p-2 rounded-sap-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            aria-label={`Notifications (${unreadCount} unread)`}
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-sap-error text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Panel */}
          {notifPanelOpen && (
            <div className="absolute right-0 top-full mt-1 w-80 bg-white rounded-sap shadow-sap-modal border border-sap-border z-50 animate-slide-in-up">
              <div className="flex items-center justify-between px-4 py-3 border-b border-sap-border">
                <span className="text-sap-md font-semibold text-sap-text">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-sap-xs text-sap-blue hover:underline"
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sap-textSecondary text-sap-sm">
                    No notifications yet
                  </div>
                ) : (
                  notifications.slice(0, 20).map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => markRead(notif.id)}
                      className={`
                        px-4 py-3 border-b border-sap-overlay last:border-0 cursor-pointer
                        hover:bg-sap-surfaceHover transition-colors
                        ${!notif.is_read ? 'bg-sap-infoLight' : ''}
                      `}
                    >
                      <div className="flex items-start gap-2">
                        {!notif.is_read && (
                          <div className="w-2 h-2 bg-sap-blue rounded-full mt-1.5 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sap-sm font-medium text-sap-text truncate">{notif.title}</p>
                          <p className="text-sap-xs text-sap-textSecondary mt-0.5 line-clamp-2">{notif.message}</p>
                          <p className="text-sap-xs text-sap-textDisabled mt-1">{formatRelativeTime(notif.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(o => !o)}
            className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-sap-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <div className="w-7 h-7 bg-sap-sidebarActive rounded-full flex items-center justify-center">
              <User size={14} className="text-white" />
            </div>
            <span className="text-sap-sm hidden md:block max-w-[100px] truncate">
              {user?.full_name ?? 'User'}
            </span>
            <ChevronDown size={14} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-sap shadow-sap-modal border border-sap-border z-50 animate-slide-in-up">
              <div className="px-4 py-3 border-b border-sap-border">
                <p className="text-sap-sm font-semibold text-sap-text truncate">{user?.full_name}</p>
                <p className="text-sap-xs text-sap-textSecondary truncate">{user?.email}</p>
                {user?.role && (
                  <span className="mt-1 inline-block">
                    <SAPBadge status={user.role.name} />
                  </span>
                )}
              </div>

              {/* Theme Toggle */}
              <div className="px-4 py-2 border-b border-sap-overlay">
                <div className="flex items-center justify-between">
                  <span className="text-sap-sm text-sap-textSecondary">Theme</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setTheme('light')}
                      className={`p-1 rounded ${theme === 'light' ? 'text-sap-blue bg-sap-blueLight' : 'text-sap-textSecondary hover:text-sap-text'}`}
                    >
                      <Sun size={14} />
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`p-1 rounded ${theme === 'dark' ? 'text-sap-blue bg-sap-blueLight' : 'text-sap-textSecondary hover:text-sap-text'}`}
                    >
                      <Moon size={14} />
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-3 text-sap-sm text-sap-error hover:bg-sap-errorLight transition-colors"
              >
                <LogOut size={16} />
                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

// ─── Offline Banner ───────────────────────────────────────────────────────────
export function OfflineBanner() {
  const isOnline = useOnlineStatus()
  if (isOnline) return null
  return (
    <div className="bg-sap-warning text-white text-center py-2 text-sap-sm font-medium z-50">
      ⚠️ No Internet Connection — View Only Mode. Changes will not be saved.
    </div>
  )
}
