import React from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'emphasized' | 'regular' | 'ghost' | 'negative' | 'transparent'
type ButtonSize = 'sm' | 'md' | 'lg'

interface SAPButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  tooltip?: string
}

export function SAPButton({
  variant = 'regular',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  tooltip,
  children,
  className = '',
  disabled,
  ...props
}: SAPButtonProps) {
  const baseClasses = `
    inline-flex items-center justify-center gap-2 font-medium
    transition-all duration-150 cursor-pointer select-none
    focus:outline-none focus:shadow-sap-focus
    disabled:opacity-50 disabled:cursor-not-allowed
    rounded-sap-sm border
  `

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sap-sm min-h-[28px]',
    md: 'px-4 py-2 text-sap-md min-h-[36px]',
    lg: 'px-6 py-2.5 text-sap-lg min-h-[44px]',
  }

  const variantClasses: Record<ButtonVariant, string> = {
    emphasized: `
      bg-sap-blue text-white border-sap-blue
      hover:bg-sap-blueDark hover:border-sap-blueDark
      active:bg-sap-blueDark
    `,
    regular: `
      bg-white text-sap-blue border-sap-blue
      hover:bg-sap-blueLight
      active:bg-sap-blueLight
    `,
    ghost: `
      bg-transparent text-sap-blue border-transparent
      hover:bg-sap-blueLight
    `,
    negative: `
      bg-sap-error text-white border-sap-error
      hover:bg-red-800 hover:border-red-800
    `,
    transparent: `
      bg-transparent text-sap-textSecondary border-transparent
      hover:bg-sap-overlay hover:text-sap-text
    `,
  }

  return (
    <button
      title={tooltip}
      disabled={disabled || loading}
      className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
      {...props}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {!loading && icon && iconPosition === 'left' && icon}
      {children}
      {!loading && icon && iconPosition === 'right' && icon}
    </button>
  )
}
