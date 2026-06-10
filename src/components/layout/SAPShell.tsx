import { useState } from 'react'
import { Bell, ChevronDown, LogOut, Menu, Search, Settings, User, WifiOff } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'

// ─── Offline Banner ───────────────────────────────────────────────────────────
export function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)
  useState(() => {
    const on  = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  })
  if (online) return null
  return (
    <div className="bg-amber-500 text-white text-center py-1.5 text-xs font-medium flex items-center justify-center gap-2 shrink-0">
      <WifiOff size={13} />
      No internet connection — view only mode
    </div>
  )
}

// ─── Shell Bar ────────────────────────────────────────────────────────────────
export function SAPShell() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const {
    unreadCount, notifications, markAllRead,
    activeClient, setActiveClient,
    toggleSidebar, setMobileDrawerOpen,
  } = useAppStore()

  const [notifOpen, setNotifOpen] = useState(false)
  const [userOpen,  setUserOpen]  = useState(false)

  const firstName = user?.full_name?.split(' ')[0] ?? 'User'
  const initials  = user?.full_name
    ?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? 'U'
  const clients = user?.clients ?? []

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <header
      className="flex items-center justify-between px-3 shrink-0 z-40"
      style={{ background: '#1B2A3B', height: '48px', boxShadow: '0 1px 4px 0 rgb(0 0 0 / .22)' }}
    >
      {/* ── Left ── */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="md:hidden p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors"
        >
          <Menu size={18} />
        </button>
        <button
          onClick={toggleSidebar}
          className="hidden md:flex p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors"
        >
          <Menu size={18} />
        </button>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <div className="w-7 h-7 rounded-md bg-[#2563EB] flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold leading-none">3i</span>
          </div>
          <span className="text-white font-semibold text-sm hidden sm:inline tracking-wide">
            3i Logistics ERP
          </span>
        </button>
      </div>

      {/* ── Centre: Search ── */}
      <div className="hidden md:flex items-center bg-white/10 hover:bg-white/15 focus-within:bg-white/20 rounded-md px-3 gap-2 h-8 w-72 transition-colors">
        <Search size={13} className="text-white/50 shrink-0" />
        <input
          placeholder="Search docs, SAP codes..."
          className="bg-transparent text-white text-xs placeholder-white/40 outline-none w-full"
        />
      </div>

      {/* ── Right ── */}
      <div className="flex items-center gap-0.5">

        {/* Client switcher — only show if user has clients */}
        {clients.length > 0 && (
          <select
            value={activeClient}
            onChange={e => setActiveClient(e.target.value)}
            className="bg-white/10 border border-white/20 text-white text-xs rounded px-2 py-1 mr-2 cursor-pointer hover:bg-white/15 outline-none"
          >
            {clients.map(c => (
              <option key={c} value={c} className="text-gray-900 bg-white">{c}</option>
            ))}
          </select>
        )}

        {/* Notification bell */}
        <div className="relative">
          <button
            onClick={() => { setNotifOpen(v => !v); setUserOpen(false) }}
            className="p-1.5 rounded hover:bg-white/10 text-white/80 hover:text-white transition-colors relative"
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-0.5">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {notifOpen && (
            <div className="absolute right-0 top-11 w-80 bg-white rounded-lg border border-[#E2E8F0] shadow-xl z-50"
                 style={{ animation: 'fadeIn .15s ease-out' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]">
                <span className="text-sm font-semibold text-[#1E293B]">Notifications</span>
                {unreadCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-[#2563EB] hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-[#94A3B8]">
                    No notifications
                  </div>
                ) : notifications.slice(0, 10).map(n => (
                  <div key={n.id}
                       className={`px-4 py-3 border-b border-[#F1F5F9] last:border-0 ${!n.is_read ? 'bg-[#EFF6FF]' : ''}`}>
                    <p className="text-xs font-medium text-[#1E293B]">{n.title}</p>
                    <p className="text-xs text-[#64748B] mt-0.5 line-clamp-2">{n.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => { setUserOpen(v => !v); setNotifOpen(false) }}
            className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-white/10 transition-colors ml-1"
          >
            <div className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-xs font-semibold shrink-0">
              {initials}
            </div>
            <span className="text-white/90 text-xs hidden md:block max-w-24 truncate">{firstName}</span>
            <ChevronDown size={12} className="text-white/60 hidden md:block" />
          </button>
          {userOpen && (
            <div className="absolute right-0 top-11 w-48 bg-white rounded-lg border border-[#E2E8F0] shadow-xl z-50"
                 style={{ animation: 'fadeIn .15s ease-out' }}>
              <div className="px-4 py-3 border-b border-[#E2E8F0]">
                <p className="text-sm font-semibold text-[#1E293B] truncate">{user?.full_name}</p>
                <p className="text-xs text-[#94A3B8] truncate">{user?.role?.name ?? 'Admin'}</p>
              </div>
              <button
                onClick={() => { navigate('/admin/settings'); setUserOpen(false) }}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[#374151] hover:bg-[#F8FAFC] transition-colors"
              >
                <Settings size={14} className="text-[#94A3B8]" /> Settings
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors border-t border-[#E2E8F0]"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`@keyframes fadeIn { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }`}</style>
    </header>
  )
}
