import { useEffect, useState, useRef } from 'react'
import {
  Package, ShoppingCart, Truck,
  Users, BarChart3, CheckCircle2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'
import { useRefetchOnFocus } from '@/hooks/useRefetchOnFocus'

interface KPICard {
  title: string
  value: string | number
  subtitle: string
  icon: React.ReactNode
  borderColor: string
}

function KPIWidget({ title, value, subtitle, icon, borderColor }: KPICard) {
  return (
    <div
      className="bg-white rounded-lg border border-[#E2E8F0] p-5 flex items-start gap-4"
      style={{ borderTop: `4px solid ${borderColor}` }}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94A3B8] mb-1">
          {title}
        </p>
        <p className="text-2xl font-bold text-[#1E293B]">{value}</p>
        <p className="text-[12px] text-[#64748B] mt-1 truncate">{subtitle}</p>
      </div>
      <div className="shrink-0 w-10 h-10 rounded-lg bg-[#F1F5F9] flex items-center justify-center text-[#64748B]">
        {icon}
      </div>
    </div>
  )
}

function StatRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#F1F5F9] last:border-0">
      <span className="text-sm text-[#475569]">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const { activeClient } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalClients: 0, totalItems: 0,
    totalSuppliers: 0, totalCustomers: 0, totalWarehouses: 0,
  })
  const activeClientRef = useRef(activeClient)
  activeClientRef.current = activeClient

  async function loadStats() {
    setLoading(true)
    try {
      const client = activeClientRef.current
      const [clients, items, suppliers, customers, warehouses] = await Promise.all([
        supabase.from('clients').select('client_code', { count: 'exact', head: true }),
        supabase.from('items').select('id', { count: 'exact', head: true }).eq('client_id', client),
        supabase.from('suppliers').select('id', { count: 'exact', head: true }),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('client_id', client),
        supabase.from('warehouses').select('id', { count: 'exact', head: true }),
      ])
      setStats({
        totalClients:    clients.count    ?? 0,
        totalItems:      items.count      ?? 0,
        totalSuppliers:  suppliers.count  ?? 0,
        totalCustomers:  customers.count  ?? 0,
        totalWarehouses: warehouses.count ?? 0,
      })
    } catch (err) {
      console.error('Dashboard load error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadStats() }, [activeClient])

  // Reload when tab becomes visible or network restores
  useRefetchOnFocus(loadStats)

  const kpis: KPICard[] = [
    { title: 'Active Clients', value: loading ? '—' : stats.totalClients,
      subtitle: 'Configured clients', icon: <Users size={18} />, borderColor: '#3B82F6' },
    { title: 'Items / SKU', value: loading ? '—' : stats.totalItems,
      subtitle: `Client: ${activeClient}`, icon: <Package size={18} />, borderColor: '#10B981' },
    { title: 'Suppliers', value: loading ? '—' : stats.totalSuppliers,
      subtitle: 'All clients', icon: <ShoppingCart size={18} />, borderColor: '#F59E0B' },
    { title: 'Customers', value: loading ? '—' : stats.totalCustomers,
      subtitle: `Client: ${activeClient}`, icon: <Truck size={18} />, borderColor: '#8B5CF6' },
  ]

  const buildPhases = [
    { phase: 'Phase 1 — Foundation',        status: '✅ Complete',     color: 'text-emerald-600' },
    { phase: 'Phase 2 — Master Data',       status: '🔄 In Progress',  color: 'text-blue-600'   },
    { phase: 'Phase 3 — Warehouse Ops',     status: '⏳ Pending',      color: 'text-amber-600'  },
    { phase: 'Phase 4 — Stock & Finance',   status: '⏳ Pending',      color: 'text-amber-600'  },
    { phase: 'Phase 5 — Transport & Promo', status: '⏳ Pending',      color: 'text-amber-600'  },
    { phase: 'Phase 6 — Reports & PWA',     status: '⏳ Pending',      color: 'text-amber-600'  },
  ]

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-[#1E293B]">
            Good morning, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            {new Date().toLocaleDateString('en-BD', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-xs font-medium border border-emerald-200">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          System Online
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading
          ? [1,2,3,4].map(i => (
              <div key={i} className="bg-white rounded-lg border border-[#E2E8F0] p-5 h-28 skeleton" />
            ))
          : kpis.map(kpi => <KPIWidget key={kpi.title} {...kpi} />)
        }
      </div>

      {/* Bottom 2-col */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-[#2563EB]" />
            <h2 className="text-sm font-semibold text-[#1E293B]">Build Progress</h2>
          </div>
          {buildPhases.map(p => (
            <StatRow key={p.phase} label={p.phase} value={p.status} color={p.color} />
          ))}
        </div>

        <div className="bg-white rounded-lg border border-[#E2E8F0] p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 size={16} className="text-[#2563EB]" />
            <h2 className="text-sm font-semibold text-[#1E293B]">System Status</h2>
          </div>
          <StatRow label="Active Client" value={activeClient}                      color="text-[#1E293B]"    />
          <StatRow label="Logged in as"  value={user?.full_name ?? '—'}            color="text-[#1E293B]"    />
          <StatRow label="Role"          value={user?.role?.name ?? '—'}           color="text-blue-600"    />
          <StatRow label="Supabase"      value="Connected ✅"                       color="text-emerald-600" />
          <StatRow label="Warehouses"    value={`${stats.totalWarehouses} configured`} color="text-[#1E293B]" />
          <StatRow label="ERP Version"   value="v3.0.0"                             color="text-[#64748B]"   />
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg p-4">
        <p className="text-sm font-semibold text-[#1D4ED8] mb-2">📋 Next Steps</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-[#1D4ED8]">
          <span>→ Add Clients</span>
          <span>→ Add Items / SKU</span>
          <span>→ Add Suppliers</span>
          <span>→ Add Warehouse</span>
        </div>
      </div>
    </div>
  )
}
