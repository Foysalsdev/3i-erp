import { useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  BarChart3, Box, Building2, ChevronDown, ChevronRight,
  ClipboardList, DollarSign, Gauge, LayoutGrid,
  Package, PackageCheck, PackageOpen, Settings,
  ShoppingCart, Truck, Users, Warehouse, X, Gift,
  FileText, CreditCard, Briefcase
} from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { useAuthStore } from '@/stores/authStore'
import { usePermission } from '@/hooks/usePermission'

// ─── Nav items definition ────────────────────────────────────────────────────
interface NavItem {
  label: string
  path?: string
  icon?: React.ReactNode
  children?: NavItem[]
  module?: string   // for permission check
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <Gauge size={15} /> },
  {
    label: 'Masters', icon: <LayoutGrid size={15} />,
    children: [
      { label: 'Clients',   path: '/masters/clients',    icon: <Building2 size={14} /> },
      { label: 'Items / SKU', path: '/masters/items',   icon: <Box size={14} /> },
      { label: 'Suppliers', path: '/masters/suppliers',  icon: <Briefcase size={14} /> },
      { label: 'Customers', path: '/masters/customers',  icon: <Users size={14} /> },
      { label: 'Warehouse', path: '/masters/warehouses', icon: <Warehouse size={14} /> },
    ]
  },
  {
    label: 'Inbound', icon: <PackageCheck size={15} />,
    children: [
      { label: 'Purchase Order', path: '/inbound/po',  icon: <ShoppingCart size={14} /> },
      { label: 'GRN',            path: '/inbound/grn', icon: <ClipboardList size={14} /> },
      { label: 'PRN (Return)',   path: '/inbound/prn', icon: <PackageOpen size={14} /> },
    ]
  },
  {
    label: 'Outbound', icon: <Truck size={15} />,
    children: [
      { label: 'Sales Order',     path: '/outbound/so',      icon: <ShoppingCart size={14} /> },
      { label: 'Delivery Challan', path: '/outbound/dc',     icon: <FileText size={14} /> },
      { label: 'Gate Pass',       path: '/outbound/gate-pass', icon: <ClipboardList size={14} /> },
      { label: 'SRN (Return)',    path: '/outbound/srn',     icon: <PackageOpen size={14} /> },
      { label: 'Invoice Cancel',  path: '/outbound/invoice-cancel', icon: <FileText size={14} /> },
    ]
  },
  {
    label: 'Stock', icon: <Package size={15} />,
    children: [
      { label: 'Stock Ledger',   path: '/stock/ledger',    icon: <BarChart3 size={14} /> },
      { label: 'Transfers',      path: '/stock/transfers', icon: <Package size={14} /> },
      { label: 'Adjustments',    path: '/stock/adjustments', icon: <ClipboardList size={14} /> },
      { label: 'Damaged Stock',  path: '/stock/damaged',   icon: <Box size={14} /> },
      { label: 'Cycle Count',    path: '/stock/cycle-count', icon: <ClipboardList size={14} /> },
    ]
  },
  {
    label: 'Finance', icon: <DollarSign size={15} />,
    children: [
      { label: 'Expenses',  path: '/finance/expenses',  icon: <CreditCard size={14} /> },
      { label: 'Budget',    path: '/finance/budget',    icon: <BarChart3 size={14} /> },
      { label: 'Invoices',  path: '/finance/invoices',  icon: <FileText size={14} /> },
      { label: 'Ledger',    path: '/finance/ledger',    icon: <ClipboardList size={14} /> },
    ]
  },
  {
    label: 'HR & Payroll', icon: <Users size={15} />,
    children: [
      { label: 'Employees',   path: '/hr/employees',   icon: <Users size={14} /> },
      { label: 'Attendance',  path: '/hr/attendance',  icon: <ClipboardList size={14} /> },
      { label: 'Leave',       path: '/hr/leave',       icon: <FileText size={14} /> },
      { label: 'Payroll',     path: '/hr/payroll',     icon: <CreditCard size={14} /> },
    ]
  },
  {
    label: 'Transport', icon: <Truck size={15} />,
    children: [
      { label: 'Transporters', path: '/transport/transporters', icon: <Truck size={14} /> },
      { label: 'Vehicles',     path: '/transport/vehicles',     icon: <Truck size={14} /> },
      { label: 'Drivers',      path: '/transport/drivers',      icon: <Users size={14} /> },
      { label: 'Trips',        path: '/transport/trips',        icon: <ClipboardList size={14} /> },
      { label: 'Bills',        path: '/transport/bills',        icon: <FileText size={14} /> },
    ]
  },
  {
    label: 'Promotional', icon: <Gift size={15} />,
    children: [
      { label: 'Promo Items',    path: '/promotional/items',        icon: <Gift size={14} /> },
      { label: 'Receipts',       path: '/promotional/receipts',     icon: <PackageCheck size={14} /> },
      { label: 'Distributions',  path: '/promotional/distributions', icon: <PackageOpen size={14} /> },
    ]
  },
  { label: 'Reports', path: '/reports', icon: <BarChart3 size={15} /> },
  {
    label: 'Admin', icon: <Settings size={15} />,
    children: [
      { label: 'Users',     path: '/admin/users',    icon: <Users size={14} /> },
      { label: 'Roles',     path: '/admin/roles',    icon: <Briefcase size={14} /> },
      { label: 'Settings',  path: '/admin/settings', icon: <Settings size={14} /> },
      { label: 'Audit Log', path: '/admin/audit-log', icon: <ClipboardList size={14} /> },
    ]
  },
]

// ─── Sidebar nav item ────────────────────────────────────────────────────────
function SidebarNavItem({ item, depth = 0 }: { item: NavItem; depth?: number }) {
  const location = useLocation()
  const isChildActive = item.children?.some(
    c => c.path && location.pathname.startsWith(c.path)
  ) ?? false
  const [open, setOpen] = useState(isChildActive)

  useEffect(() => {
    if (isChildActive) setOpen(true)
  }, [location.pathname])

  if (item.children?.length) {
    return (
      <div>
        <button
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors text-[#475569] hover:bg-[#E2E8F0] hover:text-[#1E293B] font-medium"
        >
          <div className="flex items-center gap-2.5">
            {item.icon && <span className="text-[#94A3B8] shrink-0">{item.icon}</span>}
            <span>{item.label}</span>
          </div>
          {open
            ? <ChevronDown size={13} className="text-[#CBD5E1] shrink-0" />
            : <ChevronRight size={13} className="text-[#CBD5E1] shrink-0" />}
        </button>
        {open && (
          <div className="mt-0.5">
            {item.children.map(child => (
              <SidebarNavItem key={child.label} item={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <NavLink
      to={item.path ?? '#'}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors ${
          depth > 0 ? 'pl-8' : ''
        } ${
          isActive
            ? 'bg-[#EFF6FF] text-[#1D4ED8] font-medium'
            : 'text-[#475569] hover:bg-[#E2E8F0] hover:text-[#1E293B]'
        }`
      }
    >
      {item.icon && <span className="shrink-0">{item.icon}</span>}
      <span className="truncate">{item.label}</span>
    </NavLink>
  )
}

// ─── Sidebar inner content ───────────────────────────────────────────────────
function SidebarContent({ onClose }: { onClose?: () => void }) {
  return (
    <nav className="flex flex-col h-full" style={{ background: '#F8FAFC' }}>
      {/* Mobile close */}
      {onClose && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]">
          <span className="text-sm font-semibold text-[#1E293B]">Menu</span>
          <button onClick={onClose} className="p-1 hover:bg-[#E2E8F0] rounded">
            <X size={16} className="text-[#94A3B8]" />
          </button>
        </div>
      )}

      {/* Nav */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
        {NAV_ITEMS.map(item => (
          <SidebarNavItem key={item.label} item={item} />
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-[#E2E8F0] text-[10px] text-[#CBD5E1]">
        3i Logistics ERP • v2.0
      </div>
    </nav>
  )
}

// ─── Desktop Sidebar ─────────────────────────────────────────────────────────
export function SAPSidebar() {
  const { sidebarCollapsed } = useAppStore()

  return (
    <aside
      className="hidden md:block shrink-0 overflow-hidden transition-all duration-200 ease-in-out"
      style={{
        width: sidebarCollapsed ? '0px' : '240px',
        borderRight: '1px solid #E2E8F0',
      }}
    >
      {!sidebarCollapsed && <SidebarContent />}
    </aside>
  )
}

// ─── Mobile Drawer ───────────────────────────────────────────────────────────
export function SAPMobileDrawer() {
  const { mobileDrawerOpen, setMobileDrawerOpen } = useAppStore()

  if (!mobileDrawerOpen) return null

  return (
    <div className="md:hidden fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={() => setMobileDrawerOpen(false)}
      />
      {/* Drawer */}
      <div className="relative w-64 h-full shadow-xl" style={{ background: '#F8FAFC' }}>
        <SidebarContent onClose={() => setMobileDrawerOpen(false)} />
      </div>
    </div>
  )
}
