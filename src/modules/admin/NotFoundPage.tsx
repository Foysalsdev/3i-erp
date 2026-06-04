
import { useNavigate, useLocation } from 'react-router-dom'
import { Construction, ArrowLeft } from 'lucide-react'
import { SAPButton } from '@/components/ui/SAPButton'

interface ComingSoonPageProps {
  moduleName?: string
}

export function ComingSoonPage({ moduleName }: ComingSoonPageProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const name = moduleName ?? location.pathname.split('/').filter(Boolean).pop() ?? 'This module'

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="p-5 bg-sap-warningLight rounded-full mb-6">
        <Construction size={40} className="text-sap-warning" />
      </div>
      <h1 className="text-sap-h1 font-bold text-sap-text capitalize mb-2">
        {name.replace(/-/g, ' ')}
      </h1>
      <p className="text-sap-textSecondary text-sap-md max-w-sm mb-6">
        This module will be built in the next phase. Foundation is complete — modules are coming!
      </p>
      <SAPButton
        variant="regular"
        icon={<ArrowLeft size={16} />}
        onClick={() => navigate('/')}
      >
        Back to Dashboard
      </SAPButton>
    </div>
  )
}

export function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <p className="text-8xl font-bold text-sap-overlay mb-4">404</p>
      <h1 className="text-sap-h1 font-bold text-sap-text mb-2">Page Not Found</h1>
      <p className="text-sap-textSecondary mb-6">The page you are looking for does not exist.</p>
      <SAPButton variant="emphasized" onClick={() => navigate('/')}>
        Go to Dashboard
      </SAPButton>
    </div>
  )
}
