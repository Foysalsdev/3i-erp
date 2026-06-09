import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import { AppLayout } from './components/layout/AppLayout'
import { SAPToastProvider } from './components/ui/SAPToast'
import { LoginPage } from './modules/admin/LoginPage'
import { DashboardPage } from './modules/dashboard/DashboardPage'
import { ComingSoonPage, NotFoundPage } from './modules/admin/NotFoundPage'
import { useRealtimeSubscriptions } from './hooks/useRealtimeSubscriptions'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { Loader2 } from 'lucide-react'

// ─── Lazy load master modules ─────────────────────────────
const ClientsPage    = lazy(() => import('./modules/masters/clients/ClientsPage').then(m => ({ default: m.ClientsPage })))
const ItemsPage      = lazy(() => import('./modules/masters/items/ItemsPage').then(m => ({ default: m.ItemsPage })))
const SuppliersPage  = lazy(() => import('./modules/masters/suppliers/SuppliersPage').then(m => ({ default: m.SuppliersPage })))
const CustomersPage  = lazy(() => import('./modules/masters/customers/CustomersPage').then(m => ({ default: m.CustomersPage })))
const WarehousesPage = lazy(() => import('./modules/masters/warehouses/WarehousesPage').then(m => ({ default: m.WarehousesPage })))

function AppInner() {
  useRealtimeSubscriptions()
  useKeyboardShortcuts()
  return null
}

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-48">
      <Loader2 size={24} className="text-sap-blue animate-spin" />
    </div>
  )
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isInitialized, isLoading } = useAuthStore()

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-sap-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-sap-blue rounded-sap flex items-center justify-center">
            <span className="text-white font-bold text-xl">3i</span>
          </div>
          <Loader2 size={24} className="text-sap-blue animate-spin" />
          <p className="text-sap-textSecondary text-sap-sm">Loading 3i Logistics ERP...</p>
        </div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { initialize } = useAuthStore()

  useEffect(() => { initialize() }, [initialize])

  return (
    <>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected */}
        <Route
          path="/"
          element={
            <RequireAuth>
              <AppInner />
              <AppLayout />
            </RequireAuth>
          }
        >
          {/* Dashboard — both / and /dashboard work */}
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />

          {/* ── Masters ── */}
          <Route path="masters/clients"    element={<Suspense fallback={<PageLoader />}><ClientsPage /></Suspense>} />
          <Route path="masters/items"      element={<Suspense fallback={<PageLoader />}><ItemsPage /></Suspense>} />
          <Route path="masters/suppliers"  element={<Suspense fallback={<PageLoader />}><SuppliersPage /></Suspense>} />
          <Route path="masters/customers"  element={<Suspense fallback={<PageLoader />}><CustomersPage /></Suspense>} />
          <Route path="masters/warehouses" element={<Suspense fallback={<PageLoader />}><WarehousesPage /></Suspense>} />

          {/* ── Inbound ── */}
          <Route path="inbound/po"  element={<ComingSoonPage moduleName="Purchase Order" />} />
          <Route path="inbound/grn" element={<ComingSoonPage moduleName="GRN" />} />
          <Route path="inbound/prn" element={<ComingSoonPage moduleName="PRN" />} />

          {/* ── Outbound ── */}
          <Route path="outbound/so"             element={<ComingSoonPage moduleName="Sales Order" />} />
          <Route path="outbound/dc"             element={<ComingSoonPage moduleName="Delivery Challan" />} />
          <Route path="outbound/gate-pass"      element={<ComingSoonPage moduleName="Gate Pass" />} />
          <Route path="outbound/srn"            element={<ComingSoonPage moduleName="SRN" />} />
          <Route path="outbound/invoice-cancel" element={<ComingSoonPage moduleName="Invoice Cancel" />} />

          {/* ── Stock ── */}
          <Route path="stock/ledger"      element={<ComingSoonPage moduleName="Stock Ledger" />} />
          <Route path="stock/transfers"   element={<ComingSoonPage moduleName="Stock Transfer" />} />
          <Route path="stock/adjustments" element={<ComingSoonPage moduleName="Stock Adjustment" />} />
          <Route path="stock/damaged"     element={<ComingSoonPage moduleName="Damaged Stock" />} />
          <Route path="stock/cycle-count" element={<ComingSoonPage moduleName="Cycle Count" />} />

          {/* ── Finance ── */}
          <Route path="finance/expenses" element={<ComingSoonPage moduleName="Expense Entry" />} />
          <Route path="finance/budget"   element={<ComingSoonPage moduleName="Budget Management" />} />
          <Route path="finance/invoices" element={<ComingSoonPage moduleName="Client Invoice" />} />
          <Route path="finance/payments" element={<ComingSoonPage moduleName="Payment Recording" />} />
          <Route path="finance/ledger"   element={<ComingSoonPage moduleName="Finance Ledger" />} />

          {/* ── HR ── */}
          <Route path="hr/employees"  element={<ComingSoonPage moduleName="Employee Master" />} />
          <Route path="hr/attendance" element={<ComingSoonPage moduleName="Attendance" />} />
          <Route path="hr/leave"      element={<ComingSoonPage moduleName="Leave Management" />} />
          <Route path="hr/payroll"    element={<ComingSoonPage moduleName="Payroll" />} />
          <Route path="hr/labour"     element={<ComingSoonPage moduleName="Labour Log" />} />
          <Route path="hr/tasks"      element={<ComingSoonPage moduleName="Task / Checklist" />} />

          {/* ── Transport ── */}
          <Route path="transport/transporters" element={<ComingSoonPage moduleName="Transporter Master" />} />
          <Route path="transport/vehicles"     element={<ComingSoonPage moduleName="Vehicle Master" />} />
          <Route path="transport/drivers"      element={<ComingSoonPage moduleName="Driver Master" />} />
          <Route path="transport/trips"        element={<ComingSoonPage moduleName="Transport Requests & Trips" />} />
          <Route path="transport/bills"        element={<ComingSoonPage moduleName="Transporter Bills / CN" />} />
          <Route path="transport/contracts"    element={<ComingSoonPage moduleName="Monthly Contracts" />} />

          {/* ── Promotional ── */}
          <Route path="promotional/items"         element={<ComingSoonPage moduleName="Promo Item Master" />} />
          <Route path="promotional/receipts"      element={<ComingSoonPage moduleName="Promo Stock Receipt" />} />
          <Route path="promotional/distributions" element={<ComingSoonPage moduleName="Promo Distribution" />} />

          {/* ── Reports & Admin ── */}
          <Route path="reports"               element={<ComingSoonPage moduleName="Reports" />} />
          <Route path="admin/users"           element={<ComingSoonPage moduleName="User Management" />} />
          <Route path="admin/roles"           element={<ComingSoonPage moduleName="Role Builder" />} />
          <Route path="admin/notifications"   element={<ComingSoonPage moduleName="Notifications" />} />
          <Route path="admin/audit-log"       element={<ComingSoonPage moduleName="Audit Log" />} />
          <Route path="admin/settings"        element={<ComingSoonPage moduleName="Settings" />} />

          <Route path="*" element={<NotFoundPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      <SAPToastProvider />
    </>
  )
}
