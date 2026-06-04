import React from 'react'

interface SAPInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  autoFill?: boolean  // auto-filled fields get distinct styling
}

export const SAPInput = React.forwardRef<HTMLInputElement, SAPInputProps>(
  function SAPInput(
    { label, error, hint, required, autoFill, className = '', ...props },
    ref
  ) {
    const inputClasses = `
      w-full rounded-sap-sm border px-3 py-2
      text-sap-md text-sap-text
      transition-all duration-150
      focus:outline-none focus:shadow-sap-focus
      disabled:bg-sap-overlay disabled:text-sap-textDisabled disabled:cursor-not-allowed
      placeholder:text-sap-textDisabled
      ${autoFill || props.readOnly
        ? 'bg-sap-overlay text-sap-textSecondary cursor-default'
        : 'bg-white'}
      ${error
        ? 'border-sap-error focus:border-sap-error'
        : 'border-sap-border focus:border-sap-blue'}
      ${className}
    `

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-sap-sm text-sap-text font-medium">
            {label}
            {required && (
              <span className="text-sap-error ml-1" aria-label="required">*</span>
            )}
          </label>
        )}
        <input ref={ref} className={inputClasses} {...props} />
        {error && (
          <span className="text-sap-xs text-sap-error">{error}</span>
        )}
        {hint && !error && (
          <span className="text-sap-xs text-sap-textSecondary">{hint}</span>
        )}
      </div>
    )
  }
)
