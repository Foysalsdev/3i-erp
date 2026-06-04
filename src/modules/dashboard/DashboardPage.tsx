import React from 'react'
import {
  Package, ShoppingCart, Truck, DollarSign,
  TrendingUp, AlertTriangle, Clock, CheckCircle
} from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useAppStore } from '@/stores/appStore'

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  color: string
  bgColor: string
}

function KPICard({ title, value, subtitle, icon, color, bgColor }: KPICardProps) {
  return (
    <div className="bg-white rounded-sap shadow-sap-card p-5 flex items-start gap-4">
      <div className={`p-3 rounded-sap ${bgColor} flex-shrink-0`}>
        <div className={color}>{icon}</div>
      </div>
      <div className="min-w-0">
        <p className="text-sap-sm text-sap-textSecondary truncate">{title}</p>
        <p className="text-sap-h1 font-bold text-sap-text mt-0.5">{value}</p>
        {subtitle && (
          <p className="text-sap-xs text-sap-textSecondary mt-1">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

export function DashboardPage() {
  const { user } = useAuthStore()
  const { activeClient } = useAppStore()

  const clientLabel: Record<string, string> = {
    WH: 'Whirlpool Bangladesh',
    RB: 'Robi Axiata',
    GD: 'Godrej Bangladesh',
    '3I': '3i Internal',
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-sap-shell to-sap-sidebar rounded-sap-lg p-6 text-white">
        <h1 className="text-sap-h1 font-bold">
          Welcome back, {user?.full_name?.split(' ')[0] ?? 'User'} 👋
        </h1>
        <p className="text-white/70 mt-1 text-sap-md">
          Viewing: <strong className="text-white">{clientLabel[activeClient] ?? activeClient}</strong>
          {' · '}
          <span>{new Date().toLocaleDateString('en-BD', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Today's GRN"
          value="0"
          subtitle="Goods received today"
          icon={<Package size={22} />}
          color="text-sap-blue"
          bgColor="bg-sap-blueLight"
        />
        <KPICard
          title="Pending PO"
          value="0"
          subtitle="Awaiting delivery"
          icon={<ShoppingCart size={22} />}
          color="text-sap-warning"
          bgColor="bg-sap-warningLight"
        />
        <KPICard
          title="Open SO"
          value="0"
          subtitle="Sales orders active"
          icon={<Truck size={22} />}
          color="text-sap-success"
          bgColor="bg-sap-successLight"
        />
        <KPICard
          title="Pending Invoice"
          value="৳ 0"
          subtitle="Outstanding amount"
          icon={<DollarSign size={22} />}
          color="text-sap-error"
          bgColor="bg-sap-errorLight"
        />
      </div>

      {/* Alerts + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alerts */}
        <div className="bg-white rounded-sap shadow-sap-card">
          <div className="px-5 py-4 border-b border-sap-border flex items-center gap-2">
            <AlertTriangle size={16} className="text-sap-warning" />
            <h2 className="text-sap-md font-semibold text-sap-text">Alerts</h2>
          </div>
          <div className="px-5 py-8 text-center text-sap-textSecondary text-sap-sm">
            <CheckCircle size={32} className="mx-auto mb-2 text-sap-success opacity-50" />
            <p>No alerts at this time</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-sap shadow-sap-card">
          <div className="px-5 py-4 border-b border-sap-border flex items-center gap-2">
            <Clock size={16} className="text-sap-blue" />
            <h2 className="text-sap-md font-semibold text-sap-text">Recent Activity</h2>
          </div>
          <div className="px-5 py-8 text-center text-sap-textSecondary text-sap-sm">
            <TrendingUp size={32} className="mx-auto mb-2 text-sap-blue opacity-50" />
            <p>No recent transactions</p>
            <p className="text-sap-xs mt-1">Activity will appear here once modules are active</p>
          </div>
        </div>
      </div>

      {/* Phase Status */}
      <div className="bg-white rounded-sap shadow-sap-card p-5">
        <h2 className="text-sap-md font-semibold text-sap-text mb-4">🏗️ Build Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { phase: 'Phase 1: Foundation', status: '✅ Complete', color: 'text-sap-success' },
            { phase: 'Phase 2: Masters', status: '⏳ Next', color: 'text-sap-warning' },
            { phase: 'Phase 3: Warehouse Ops', status: '🔒 Pending', color: 'text-sap-textSecondary' },
            { phase: 'Phase 4: Stock Mgmt', status: '🔒 Pending', color: 'text-sap-textSecondary' },
            { phase: 'Phase 5: Finance & HR', status: '🔒 Pending', color: 'text-sap-textSecondary' },
            { phase: 'Phase 6: System & PDF', status: '🔒 Pending', color: 'text-sap-textSecondary' },
          ].map(item => (
            <div key={item.phase} className="p-3 bg-sap-bg rounded-sap">
              <p className="text-sap-sm font-medium text-sap-text">{item.phase}</p>
              <p className={`text-sap-xs mt-1 ${item.color}`}>{item.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
