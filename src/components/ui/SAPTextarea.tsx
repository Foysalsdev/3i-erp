import React from 'react'

interface SAPTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
  required?: boolean
}

export const SAPTextarea = React.forwardRef<HTMLTextAreaElement, SAPTextareaProps>(
  function SAPTextarea({ label, error, hint, required, className = '', ...props }, ref) {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sap-sm text-sap-text font-medium">
            {label}
            {required && <span className="text-sap-error ml-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          rows={3}
          className={`
            w-full rounded-sap-sm border px-3 py-2
            text-sap-md text-sap-text bg-white resize-y
            focus:outline-none focus:shadow-sap-focus transition-all
            disabled:bg-sap-overlay disabled:text-sap-textDisabled
            placeholder:text-sap-textDisabled
            ${error ? 'border-sap-error' : 'border-sap-border focus:border-sap-blue'}
            ${className}
          `}
          {...props}
        />
        {error && <span className="text-sap-xs text-sap-error">{error}</span>}
        {hint && !error && <span className="text-sap-xs text-sap-textSecondary">{hint}</span>}
      </div>
    )
  }
)
