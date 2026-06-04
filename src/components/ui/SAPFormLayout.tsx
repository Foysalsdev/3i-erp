import React from 'react'

interface SAPFormLayoutProps {
  children: React.ReactNode
  cols?: 1 | 2 | 3 | 4
  className?: string
}

interface SAPFormSectionProps {
  title?: string
  children: React.ReactNode
  cols?: 1 | 2 | 3 | 4
  className?: string
}

interface SAPFormRowProps {
  children: React.ReactNode
  span?: 1 | 2 | 3 | 4
}

const colClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 md:grid-cols-2',
  3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
}

const spanClasses = {
  1: 'col-span-1',
  2: 'col-span-1 md:col-span-2',
  3: 'col-span-1 md:col-span-2 lg:col-span-3',
  4: 'col-span-1 md:col-span-2 lg:col-span-4',
}

export function SAPFormLayout({ children, cols = 2, className = '' }: SAPFormLayoutProps) {
  return (
    <div className={`grid ${colClasses[cols]} gap-4 ${className}`}>
      {children}
    </div>
  )
}

export function SAPFormSection({ title, children, cols = 2, className = '' }: SAPFormSectionProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      {title && (
        <div className="flex items-center gap-3">
          <h3 className="text-sap-lg font-semibold text-sap-text">{title}</h3>
          <div className="flex-1 h-px bg-sap-overlay" />
        </div>
      )}
      <div className={`grid ${colClasses[cols]} gap-4`}>
        {children}
      </div>
    </div>
  )
}

export function SAPFormRow({ children, span = 1 }: SAPFormRowProps) {
  return (
    <div className={spanClasses[span]}>
      {children}
    </div>
  )
}
