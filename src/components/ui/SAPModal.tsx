import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { SAPButton } from './SAPButton'

interface SAPModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  closable?: boolean
}

const sizeClasses = {
  sm:  'max-w-sm',
  md:  'max-w-lg',
  lg:  'max-w-2xl',
  xl:  'max-w-4xl',
}

export function SAPModal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closable = true,
}: SAPModalProps) {
  // Close on Escape key
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape' && closable) onClose()
    }
    if (open) {
      document.addEventListener('keydown', handler)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, closable, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={closable ? onClose : undefined}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />

      {/* Modal */}
      <div
        className={`
          relative w-full ${sizeClasses[size]}
          bg-white
          md:rounded-sap-lg rounded-t-sap-xl
          shadow-sap-modal
          flex flex-col max-h-[90vh]
          animate-slide-in-up
        `}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-sap-border flex-shrink-0">
          <h2 className="text-sap-xl text-sap-text">{title}</h2>
          {closable && (
            <button
              onClick={onClose}
              className="p-1 rounded-sap-sm text-sap-textSecondary hover:text-sap-text hover:bg-sap-overlay transition-colors"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-sap-border flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Confirm Dialog ──────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <SAPModal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <SAPButton variant="ghost" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </SAPButton>
          <SAPButton
            variant={variant === 'danger' ? 'negative' : 'emphasized'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </SAPButton>
        </>
      }
    >
      <p className="text-sap-md text-sap-text">{message}</p>
    </SAPModal>
  )
}
