import { useState, useRef } from 'react'
import { Search, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/stores/appStore'

export interface ResolvedItem {
  id: string
  item_name: string
  sap_material_code: string | null
  sku: string
  unit_of_measure: string
  category: string | null
}

interface SAPMaterialInputProps {
  value?: string
  onResolve: (item: ResolvedItem) => void
  onClear?: () => void
  disabled?: boolean
  placeholder?: string
  label?: string
  required?: boolean
  error?: string
}

export function SAPMaterialInput({
  value = '',
  onResolve,
  onClear,
  disabled,
  placeholder = 'Enter SAP Material Code or SKU...',
  label = 'SAP Material Code',
  required,
  error,
}: SAPMaterialInputProps) {
  const [inputVal, setInputVal] = useState(value)
  const [status, setStatus]   = useState<'idle' | 'loading' | 'found' | 'not_found'>('idle')
  const [resolved, setResolved] = useState<ResolvedItem | null>(null)
  const { activeClient }        = useAppStore()
  const debounceRef             = useRef<ReturnType<typeof setTimeout> | null>(null)

  async function lookup(code: string) {
    if (!code.trim()) { setStatus('idle'); setResolved(null); return }

    setStatus('loading')
    const { data } = await supabase
      .from('items')
      .select('id, item_name, sap_material_code, sku, unit_of_measure, category')
      .eq('client_id', activeClient)
      .eq('status', 'Active')
      .or(`sap_material_code.eq.${code.trim()},sku.eq.${code.trim()}`)
      .single()

    if (data) {
      const item = data as ResolvedItem
      setStatus('found')
      setResolved(item)
      onResolve(item)
    } else {
      setStatus('not_found')
      setResolved(null)
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInputVal(val)
    setStatus('idle')
    setResolved(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length >= 3) {
      debounceRef.current = setTimeout(() => lookup(val), 400)
    }
  }

  function handleBlur() {
    if (inputVal.trim()) lookup(inputVal)
  }

  function handleClear() {
    setInputVal('')
    setStatus('idle')
    setResolved(null)
    onClear?.()
  }

  const borderColor =
    status === 'found'     ? 'border-sap-success focus:border-sap-success' :
    status === 'not_found' ? 'border-sap-error focus:border-sap-error' :
    error                  ? 'border-sap-error' :
                             'border-sap-border focus:border-sap-blue'

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sap-sm text-sap-text font-medium">
          {label}
          {required && <span className="text-sap-error ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sap-textSecondary pointer-events-none" />
        <input
          type="text"
          value={inputVal}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            w-full rounded-sap-sm border pl-8 pr-10 py-2
            text-sap-md text-sap-text bg-white
            focus:outline-none focus:shadow-sap-focus transition-all
            disabled:bg-sap-overlay disabled:cursor-not-allowed
            placeholder:text-sap-textDisabled
            ${borderColor}
          `}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {status === 'loading'   && <Loader2 size={14} className="text-sap-blue animate-spin" />}
          {status === 'found'     && <CheckCircle size={14} className="text-sap-success" />}
          {status === 'not_found' && <XCircle size={14} className="text-sap-error" />}
          {status === 'idle' && inputVal && (
            <button onClick={handleClear} className="text-sap-textSecondary hover:text-sap-text">
              ×
            </button>
          )}
        </div>
      </div>

      {/* Resolved item info */}
      {resolved && (
        <div className="flex items-center gap-2 px-2 py-1.5 bg-sap-successLight rounded-sap-sm border border-green-200">
          <CheckCircle size={12} className="text-sap-success flex-shrink-0" />
          <span className="text-sap-xs text-sap-success font-medium truncate">
            {resolved.item_name} — {resolved.unit_of_measure}
          </span>
        </div>
      )}
      {status === 'not_found' && (
        <span className="text-sap-xs text-sap-error">Material code not found in system.</span>
      )}
      {error && status !== 'not_found' && (
        <span className="text-sap-xs text-sap-error">{error}</span>
      )}
    </div>
  )
}
