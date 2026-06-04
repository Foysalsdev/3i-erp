import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Search } from 'lucide-react'
import type { SelectOption } from '@/types'

interface SAPSelectProps {
  label?: string
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  error?: string
  clearable?: boolean
  className?: string
}

export function SAPSelect({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  required,
  disabled,
  error,
  clearable = true,
  className = '',
}: SAPSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const selected = options.find(o => o.value === value)
  const filtered = options.filter(o =>
    o.label.toLowerCase().includes(search.toLowerCase())
  )

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(opt: SelectOption) {
    if (opt.disabled) return
    onChange?.(opt.value)
    setOpen(false)
    setSearch('')
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange?.('')
  }

  return (
    <div className={`flex flex-col gap-1 relative ${className}`} ref={ref}>
      {label && (
        <label className="text-sap-sm text-sap-text font-medium">
          {label}
          {required && <span className="text-sap-error ml-1">*</span>}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`
          w-full flex items-center justify-between
          rounded-sap-sm border px-3 py-2
          text-sap-md bg-white
          transition-all duration-150
          focus:outline-none focus:shadow-sap-focus
          disabled:bg-sap-overlay disabled:cursor-not-allowed
          ${error ? 'border-sap-error' : open ? 'border-sap-blue' : 'border-sap-border'}
          ${open ? 'shadow-sap-focus' : ''}
        `}
      >
        <span className={selected ? 'text-sap-text' : 'text-sap-textDisabled'}>
          {selected?.label ?? placeholder}
        </span>
        <div className="flex items-center gap-1">
          {clearable && selected && (
            <X
              size={14}
              className="text-sap-textSecondary hover:text-sap-text"
              onClick={handleClear}
            />
          )}
          <ChevronDown
            size={16}
            className={`text-sap-textSecondary transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="
          absolute top-full left-0 right-0 z-50 mt-1
          bg-white border border-sap-border rounded-sap
          shadow-sap-panel overflow-hidden animate-slide-in-up
        ">
          {/* Search */}
          <div className="p-2 border-b border-sap-border">
            <div className="flex items-center gap-2 px-2 py-1 bg-sap-bg rounded-sap-sm">
              <Search size={14} className="text-sap-textSecondary flex-shrink-0" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Type to search..."
                className="flex-1 bg-transparent text-sap-md text-sap-text outline-none placeholder:text-sap-textDisabled"
              />
            </div>
          </div>

          {/* Options */}
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sap-sm text-sap-textSecondary">
                No options found
              </div>
            ) : (
              filtered.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => handleSelect(opt)}
                  className={`
                    w-full text-left px-3 py-2 text-sap-md
                    transition-colors duration-100
                    ${opt.value === value
                      ? 'bg-sap-blueLight text-sap-blue font-medium'
                      : 'text-sap-text hover:bg-sap-surfaceHover'
                    }
                    ${opt.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {opt.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {error && <span className="text-sap-xs text-sap-error">{error}</span>}
    </div>
  )
}
