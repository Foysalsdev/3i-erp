import React, { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Package, ShoppingCart, Truck, ArrowLeftRight,
  BarChart2, Users, Settings, ChevronDown, ChevronRight,
  Warehouse, FileText, ArrowDownToLine, ArrowUpFromLine,
  RefreshCw, DollarSign, UserCheck, Bell, Search,
  Shield, Gift, Car, X
} from 'lucide-react'
import { useAppStore } from '@/stores/appStore'

interface NavItem {
  label: string
  path?: string
  icon: React.ReactNode
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    path: '/',
    icon: <LayoutDashboard size={18} />,
  },
  {
    label: 'Masters',
    icon: <Warehouse size={18} />,
    children: [
      { label: 'Clients',      path: '/masters/clients',     icon: <Users size={16} /> },
      { label: 'Items / SKU',  path: '/masters/items',       icon: <Package size={16} /> },
      { label: 'Suppliers',    path: '/masters/suppliers',   icon: <Truck size={16} /> },
      { label: 'Customers',    path: '/masters/customers',   icon: <UserCheck size={16} /> },
      { label: 'Warehouse',    path: '/masters/warehouses',  icon: <Warehouse size={16} /> },
    ],
  },
  {
    label: 'Inbound',
    icon: <ArrowDownToLine size={18} />,
    children: [
      { label: 'Purchase Order', path: '/inbound/po',  icon: <FileText size={16} /> },
      { label: 'GRN',            path: '/inbound/grn', icon: <Package size={16} /> },
      { label: 'PRN (Return)',   path: '/inbound/prn', icon: <RefreshCw size={16} /> },
    ],
  },
  {
    label: 'Outbound',
    icon: <ArrowUpFromLine size={18} />,
    children: [
      { label: 'Sales Order',       path: '/outbound/so',            icon: <ShoppingCart size={16} /> },
      { label: 'Delivery Challan',  path: '/outbound/dc',            icon: <Truck size={16} /> },
      { label: 'Gate Pass',         path: '/outbound/gate-pass',     icon: <Shield size={16} /> },
      { label: 'SRN (Return)',      path: '/outbound/srn',           icon: <RefreshCw size={16} /> },
      { label: 'Invoice Cancel',    path: '/outbound/invoice-cancel',icon: <FileText size={16} /> },
    ],
  },
  {
    label: 'Stock',
    icon: <Package size={18} />,
    children: [
      { label: 'Stock Ledger',    path: '/stock/ledger',     icon: <BarChart2 size={16} /> },
      { label: 'Exchange',        path: '/stock/exchange',   icon: <ArrowLeftRight size={16} /> },
      { label: 'Transfer',        path: '/stock/transfer',   icon: <Truck size={16} /> },
      { label: 'Adjustment',      path: '/stock/adjustment', icon: <RefreshCw size={16} /> },
      { label: 'Damaged Stock',   path: '/stock/damaged',    icon: <Package size={16} /> },
      { label: 'Cycle Count',     path: '/stock/cycle-count',icon: <Search size={16} /> },
    ],
  },
  {
    label: 'Finance',
    icon: <DollarSign size={18} />,
    children: [
      { label: 'Expenses',        path: '/finance/expenses', icon: <FileText size={16} /> },
      { label: 'Budget',          path: '/finance/budget',   icon: <BarChart2 size={16} /> },
      { label: 'Invoices',        path: '/finance/invoices', icon: <FileText size={16} /> },
      { label: 'Payments',        path: '/finance/payments', icon: <DollarSign size={16} /> },
      { label: 'Ledger',          path: '/finance/ledger',   icon: <BarChart2 size={16} /> },
    ],
  },
  {
    label: 'HR & Payroll',
    icon: <Users size={18} />,
    children: [
      { label: 'Employees',       path: '/hr/employees',   icon: <Users size={16} /> },
      { label: 'Attendance',      path: '/hr/attendance',  icon: <UserCheck size={16} /> },
      { label: 'Leave',           path: '/hr/leave',       icon: <FileText size={16} /> },
      { label: 'Payroll',         path: '/hr/payroll',     icon: <DollarSign size={16} /> },
      { label: 'Labour Log',      path: '/hr/labour',      icon: <Users size={16} /> },
      { label: 'Tasks',           path: '/hr/tasks',       icon: <Shield size={16} /> },
    ],
  },
  {
    label: 'Transport',
    icon: <Truck size={18} />,
    children: [
      { label: 'Transporters',    path: '/transport/masters',   icon: <Truck size={16} /> },
      { label: 'Vehicles',        path: '/transport/vehicles',  icon: <Car size={16} /> },
      { label: 'Drivers',         path: '/transport/drivers',   icon: <Users size={16} /> },
      { label: 'Requests & Trips',path: '/transport/trips',     icon: <ArrowLeftRight size={16} /> },
      { label: 'Bills / CN',      path: '/transport/bills',     icon: <FileText size={16} /> },
      { label: 'Contracts',       path: '/transport/contracts', icon: <FileText size={16} /> },
    ],
  },
  {
    label: 'Promotional',
    icon: <Gift size={18} />,
    children: [
      { label: 'Promo Items',     path: '/promo/items',        icon: <Gift size={16} /> },
      { label: 'Stock Receipt',   path: '/promo/receipt',      icon: <ArrowDownToLine size={16} /> },
      { label: 'Distribution',    path: '/promo/distribution', icon: <ArrowUpFromLine size={16} /> },
      { label: 'Stock Ledger',    path: '/promo/ledger',       icon: <BarChart2 size={16} /> },
    ],
  },
  {
    label: 'Reports',
    path: '/reports',
    icon: <BarChart2 size={18} />,
  },
  {
    label: 'Admin',
    icon: <Settings size={18} />,
    children: [
      { label: 'Users',           path: '/admin/users',         icon: <Users size={16} /> },
      { label: 'Roles',           path: '/admin/roles',         icon: <Shield size={16} /> },
      { label: 'Notifications',   path: '/admin/notifications', icon: <Bell size={16} /> },
      { label: 'Audit Log',       path: '/admin/audit-log',     icon: <FileText size={16} /> },
      { label: 'Settings',        path: '/admin/settings',      icon: <Settings size={16} /> },
    ],
  },
]

interface SidebarContentProps {
  collapsed: boolean
  onClose?: () => void
}

function SidebarContent({ collapsed, onClose }: SidebarContentProps) {
  const location = useLocation()
  const [openGroups, setOpenGroups] = useState<string[]>(['Inbound', 'Outbound'])

  function toggleGroup(label: string) {
    setOpenGroups(prev =>
      prev.includes(label) ? prev.filter(g => g !== label) : [...prev, label]
    )
  }

  function isGroupActive(item: NavItem): boolean {
    return item.children?.some(c => c.path && location.pathname.startsWith(c.path)) ?? false
  }

  return (
    <div className="flex flex-col h-full">
      {/* Mobile close button */}
      {onClose && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 md:hidden">
          <span className="text-white font-semibold text-sap-md">Menu</span>
          <button onClick={onClose} className="text-white/70 hover:text-white">
            <X size={20} />
          </button>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
        {navItems.map(item => {
          if (!item.children) {
            // Single item
            return (
              <NavLink
                key={item.label}
                to={item.path!}
                onClick={onClose}
                className={({ isActive }) => `
                  flex items-center gap-3 px-3 py-2.5 rounded-sap text-sap-sm
                  transition-colors duration-100 group
                  ${isActive
                    ? 'bg-sap-blue text-white font-medium'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            )
          }

          // Group with children
          const isOpen = openGroups.includes(item.label)
          const isActive = isGroupActive(item)

          return (
            <div key={item.label}>
              <button
                onClick={() => !collapsed && toggleGroup(item.label)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-sap text-sap-sm
                  transition-colors duration-100
                  ${isActive ? 'text-white font-medium' : 'text-white/80 hover:bg-white/10 hover:text-white'}
                  ${collapsed ? 'justify-center' : 'justify-between'}
                `}
              >
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0">{item.icon}</span>
                  {!collapsed && <span>{item.label}</span>}
                </div>
                {!collapsed && (
                  <span className="text-white/50">
                    {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                )}
              </button>

              {/* Children */}
              {!collapsed && isOpen && (
                <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                  {item.children.map(child => (
                    <NavLink
                      key={child.label}
                      to={child.path!}
                      onClick={onClose}
                      className={({ isActive }) => `
                        flex items-center gap-2.5 px-2 py-2 rounded-sap text-sap-sm
                        transition-colors duration-100
                        ${isActive
                          ? 'bg-sap-blueLight text-sap-blue font-medium'
                          : 'text-white/70 hover:bg-white/10 hover:text-white'
                        }
                      `}
                    >
                      <span className="flex-shrink-0 opacity-80">{child.icon}</span>
                      <span>{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>
    </div>
  )
}

// ─── Desktop Sidebar ─────────────────────────────────────────────────────────
export function SAPSidebar() {
  const { sidebarCollapsed } = useAppStore()

  return (
    <aside
      className={`
        hidden md:flex flex-col
        bg-sap-sidebar sidebar-transition
        h-screen sticky top-0 flex-shrink-0
        ${sidebarCollapsed ? 'w-14' : 'w-60'}
        border-r border-white/5
      `}
    >
      <SidebarContent collapsed={sidebarCollapsed} />
    </aside>
  )
}

// ─── Mobile Drawer ────────────────────────────────────────────────────────────
export function SAPMobileDrawer() {
  const { mobileDrawerOpen, setMobileDrawerOpen } = useAppStore()

  if (!mobileDrawerOpen) return null

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setMobileDrawerOpen(false)}
      />
      {/* Drawer */}
      <aside className="absolute left-0 top-0 bottom-0 w-72 bg-sap-sidebar flex flex-col animate-slide-in-up">
        <SidebarContent
          collapsed={false}
          onClose={() => setMobileDrawerOpen(false)}
        />
      </aside>
    </div>
  )
}
