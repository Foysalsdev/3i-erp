import { useState } from 'react'
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react'
import { SAPButton } from './SAPButton'
import { SAPSelect } from './SAPSelect'
import type { SelectOption } from '@/types'

interface FilterField {
  key: string
  label: string
  type: 'text' | 'select' | 'date'
  options?: SelectOption[]
  placeholder?: string
}

interface SAPFilterBarProps {
  fields: FilterField[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onSearch: () => void
  onClear: () => void
  loading?: boolean
  extraActions?: React.ReactNode
}

export function SAPFilterBar({
  fields,
  values,
  onChange,
  onSearch,
  onClear,
  loading = false,
  extraActions,
}: SAPFilterBarProps) {
  const [collapsed, setCollapsed] = useState(false)

  const hasValues = Object.values(values).some(v => v !== '')

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') onSearch()
  }

  return (
    <div className="bg-white border border-sap-border rounded-sap shadow-sap-card mb-4">
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-sap-overlay">
        <div className="flex items-center gap-2">
          <Search size={15} className="text-sap-textSecondary" />
          <span className="text-sap-sm font-medium text-sap-text">Filter</span>
          {hasValues && (
            <span className="w-2 h-2 bg-sap-blue rounded-full" title="Active filters" />
          )}
        </div>
        <button
          onClick={() => setCollapsed(c => !c)}
          className="text-sap-textSecondary hover:text-sap-text transition-colors p-1 rounded-sap-sm hover:bg-sap-overlay md:hidden"
        >
          {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
        </button>
      </div>

      {/* Filter fields */}
      <div className={`${collapsed ? 'hidden' : 'flex'} md:flex flex-wrap gap-3 p-4 items-end`}>
        {fields.map(field => (
          <div key={field.key} className="flex flex-col gap-1 min-w-[160px] flex-1">
            <label className="text-sap-xs text-sap-textSecondary font-medium">
              {field.label}
            </label>
            {field.type === 'select' ? (
              <SAPSelect
                options={field.options ?? []}
                value={values[field.key] ?? ''}
                onChange={v => onChange(field.key, v)}
                placeholder={field.placeholder ?? `All ${field.label}`}
                clearable
              />
            ) : (
              <div className="relative">
                <input
                  type={field.type === 'date' ? 'date' : 'text'}
                  value={values[field.key] ?? ''}
                  onChange={e => onChange(field.key, e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={field.placeholder ?? `Search ${field.label}...`}
                  className="
                    w-full rounded-sap-sm border border-sap-border px-3 py-2
                    text-sap-md text-sap-text bg-white
                    focus:outline-none focus:border-sap-blue focus:shadow-sap-focus
                    placeholder:text-sap-textDisabled transition-all
                  "
                />
                {values[field.key] && (
                  <button
                    onClick={() => onChange(field.key, '')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-sap-textSecondary hover:text-sap-text"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Action buttons */}
        <div className="flex items-end gap-2 flex-shrink-0 pb-0">
          <SAPButton
            variant="emphasized"
            size="md"
            onClick={onSearch}
            loading={loading}
            icon={<Search size={14} />}
          >
            Search
          </SAPButton>
          {hasValues && (
            <SAPButton variant="ghost" size="md" onClick={onClear} icon={<X size={14} />}>
              Clear
            </SAPButton>
          )}
          {extraActions}
        </div>
      </div>
    </div>
  )
}
