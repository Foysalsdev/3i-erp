import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'

const routeLabels: Record<string, string> = {
  masters: 'Masters',
  clients: 'Clients',
  items: 'Items / SKU',
  suppliers: 'Suppliers',
  customers: 'Customers',
  warehouses: 'Warehouse',
  inbound: 'Inbound',
  po: 'Purchase Order',
  grn: 'GRN',
  prn: 'PRN',
  outbound: 'Outbound',
  so: 'Sales Order',
  dc: 'Delivery Challan',
  'gate-pass': 'Gate Pass',
  srn: 'SRN',
  'invoice-cancel': 'Invoice Cancel',
  stock: 'Stock',
  ledger: 'Stock Ledger',
  exchange: 'Exchange',
  transfer: 'Transfer',
  adjustment: 'Adjustment',
  damaged: 'Damaged Stock',
  'cycle-count': 'Cycle Count',
  finance: 'Finance',
  expenses: 'Expenses',
  budget: 'Budget',
  invoices: 'Invoices',
  payments: 'Payments',
  hr: 'HR & Payroll',
  employees: 'Employees',
  attendance: 'Attendance',
  leave: 'Leave',
  payroll: 'Payroll',
  labour: 'Labour Log',
  tasks: 'Tasks',
  transport: 'Transport',
  vehicles: 'Vehicles',
  drivers: 'Drivers',
  trips: 'Requests & Trips',
  bills: 'Bills / CN',
  contracts: 'Contracts',
  promo: 'Promotional',
  receipt: 'Stock Receipt',
  distribution: 'Distribution',
  reports: 'Reports',
  admin: 'Admin',
  users: 'Users',
  roles: 'Roles',
  notifications: 'Notifications',
  'audit-log': 'Audit Log',
  settings: 'Settings',
  new: 'New',
  edit: 'Edit',
}

export function Breadcrumb() {
  const location = useLocation()
  const segments = location.pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  const crumbs = segments.map((seg, idx) => ({
    label: routeLabels[seg] ?? seg,
    path: '/' + segments.slice(0, idx + 1).join('/'),
    isLast: idx === segments.length - 1,
  }))

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 px-6 py-2 bg-white border-b border-sap-border text-sap-sm"
    >
      <Link
        to="/"
        className="text-sap-textSecondary hover:text-sap-blue transition-colors flex-shrink-0"
        aria-label="Home"
      >
        <Home size={13} />
      </Link>
      {crumbs.map(crumb => (
        <React.Fragment key={crumb.path}>
          <ChevronRight size={12} className="text-sap-textDisabled flex-shrink-0" />
          {crumb.isLast ? (
            <span className="text-sap-text font-medium truncate">{crumb.label}</span>
          ) : (
            <Link
              to={crumb.path}
              className="text-sap-textSecondary hover:text-sap-blue transition-colors truncate"
            >
              {crumb.label}
            </Link>
          )}
        </React.Fragment>
      ))}
    </nav>
  )
}
