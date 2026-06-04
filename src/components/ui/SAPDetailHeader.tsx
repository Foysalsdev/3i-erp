import React from 'react'
import { ArrowLeft, FileText, Edit } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SAPBadge } from './SAPBadge'
import { SAPButton } from './SAPButton'
import type { DocStatus } from '@/types'

interface SAPDetailHeaderProps {
  docNo: string
  docType?: string
  status: DocStatus | string
  date?: string
  subtitle?: string
  onEdit?: () => void
  onPDF?: () => void
  canEdit?: boolean
  canPrint?: boolean
  extraActions?: React.ReactNode
  backTo?: string
}

export function SAPDetailHeader({
  docNo,
  docType,
  status,
  date,
  subtitle,
  onEdit,
  onPDF,
  canEdit = true,
  canPrint = true,
  extraActions,
  backTo,
}: SAPDetailHeaderProps) {
  const navigate = useNavigate()

  return (
    <div className="bg-white border-b border-sap-border px-6 py-4 flex items-start justify-between gap-4">
      {/* Left: Back + Doc Info */}
      <div className="flex items-start gap-3 min-w-0">
        <button
          onClick={() => backTo ? navigate(backTo) : navigate(-1)}
          className="mt-1 p-1.5 rounded-sap-sm text-sap-textSecondary hover:text-sap-text hover:bg-sap-overlay transition-colors flex-shrink-0"
          aria-label="Go back"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {docType && (
              <span className="text-sap-sm text-sap-textSecondary">{docType}</span>
            )}
            <h1 className="text-sap-xl text-sap-text font-bold">{docNo}</h1>
            <SAPBadge status={status} />
          </div>
          {subtitle && (
            <p className="text-sap-sm text-sap-textSecondary mt-0.5 truncate">{subtitle}</p>
          )}
          {date && (
            <p className="text-sap-xs text-sap-textSecondary mt-0.5">{date}</p>
          )}
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {canEdit && onEdit && (
          <SAPButton
            variant="regular"
            size="sm"
            icon={<Edit size={14} />}
            onClick={onEdit}
          >
            <span className="hidden sm:inline">Edit</span>
          </SAPButton>
        )}
        {canPrint && onPDF && (
          <SAPButton
            variant="ghost"
            size="sm"
            icon={<FileText size={14} />}
            onClick={onPDF}
          >
            <span className="hidden sm:inline">PDF</span>
          </SAPButton>
        )}
        {extraActions && (
          <div className="flex items-center gap-2">
            {extraActions}
          </div>
        )}
      </div>
    </div>
  )
}
