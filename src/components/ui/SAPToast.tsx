import { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { useAppStore } from '@/stores/appStore'
import { registerToast } from '@/lib/errorHandler'

const icons = {
  success: <CheckCircle size={16} className="text-sap-success" />,
  error:   <AlertCircle size={16} className="text-sap-error" />,
  warning: <AlertTriangle size={16} className="text-sap-warning" />,
  info:    <Info size={16} className="text-sap-blue" />,
}

const borderColors = {
  success: 'border-l-sap-success',
  error:   'border-l-sap-error',
  warning: 'border-l-sap-warning',
  info:    'border-l-sap-blue',
}

export function SAPToastProvider() {
  const { toasts, showToast, removeToast } = useAppStore()

  // Register global toast function
  useEffect(() => {
    registerToast(showToast)
  }, [showToast])

  if (toasts.length === 0) return null

  return (
    <div className="
      fixed bottom-4 right-4 z-[9999]
      flex flex-col gap-2
      max-w-sm w-full
      md:bottom-6 md:right-6
    ">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            flex items-start gap-3 p-4
            bg-white rounded-sap shadow-sap-panel
            border border-sap-border border-l-4
            ${borderColors[toast.type]}
            animate-slide-in-right
          `}
        >
          <div className="flex-shrink-0 mt-0.5">
            {icons[toast.type]}
          </div>
          <p className="flex-1 text-sap-sm text-sap-text leading-snug">
            {toast.message}
          </p>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 text-sap-textSecondary hover:text-sap-text transition-colors"
            aria-label="Close notification"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  )
}
