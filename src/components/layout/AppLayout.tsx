
import { Outlet } from 'react-router-dom'
import { SAPShell, OfflineBanner } from './SAPShell'
import { SAPSidebar, SAPMobileDrawer } from './SAPSidebar'
import { Breadcrumb } from './Breadcrumb'
import { SAPToastProvider } from '@/components/ui/SAPToast'

export function AppLayout() {
  return (
    <div className="flex h-screen bg-sap-bg overflow-hidden">
      {/* Desktop Sidebar */}
      <SAPSidebar />

      {/* Mobile Drawer */}
      <SAPMobileDrawer />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Offline Banner */}
        <OfflineBanner />

        {/* Shell Bar */}
        <SAPShell />

        {/* Breadcrumb */}
        <Breadcrumb />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Toast Notifications */}
      <SAPToastProvider />
    </div>
  )
}
