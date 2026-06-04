
import type { DocStatus } from '@/types'

interface SAPBadgeProps {
  status: DocStatus | string
  className?: string
}

const statusStyles: Record<string, string> = {
  DRAFT:              'bg-gray-100 text-gray-600',
  SUBMITTED:          'bg-orange-50 text-orange-700 border border-orange-200',
  'PENDING APPROVAL': 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  APPROVED:           'bg-blue-50 text-blue-700 border border-blue-200',
  ARRANGED:           'bg-purple-50 text-purple-700 border border-purple-200',
  'IN TRANSIT':       'bg-cyan-50 text-cyan-700 border border-cyan-200',
  PROCESSING:         'bg-indigo-50 text-indigo-700 border border-indigo-200',
  POSTED:             'bg-green-50 text-green-700 border border-green-200',
  DISPATCHED:         'bg-green-50 text-green-700 border border-green-200',
  DELIVERED:          'bg-green-100 text-green-800',
  CLOSED:             'bg-green-100 text-green-800',
  PAID:               'bg-green-100 text-green-800',
  CANCELLED:          'bg-red-50 text-red-700 border border-red-200',
  QUARANTINE:         'bg-purple-50 text-purple-700 border border-purple-200',
  OVERDUE:            'bg-red-50 text-red-700 border border-red-200 animate-pulse',
  REJECTED:           'bg-red-100 text-red-800',
  ACTIVE:             'bg-green-50 text-green-700',
  INACTIVE:           'bg-gray-100 text-gray-500',
  Unpaid:             'bg-red-50 text-red-700 border border-red-200',
  Partial:            'bg-orange-50 text-orange-700 border border-orange-200',
  Paid:               'bg-green-50 text-green-700',
}

export function SAPBadge({ status, className = '' }: SAPBadgeProps) {
  const style = statusStyles[status] ?? 'bg-gray-100 text-gray-600'

  return (
    <span className={`
      inline-flex items-center px-2 py-0.5
      text-sap-xs font-medium rounded-sap-sm
      ${style} ${className}
    `}>
      {status}
    </span>
  )
}
