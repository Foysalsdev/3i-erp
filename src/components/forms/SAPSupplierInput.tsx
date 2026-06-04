import { useState, useRef } from 'react'
import { Search, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { db } from '@/lib/db'
import { useAppStore } from '@/stores/appStore'

export interface ResolvedSupplier {
  id: string
  supplier_name: string
  supplier_code: string
  phone: string | null
  address: string | null
  payment_terms: string | null
}

interface SAPSupplierInputProps {
  value?: string
  onResolve: (supplier: ResolvedSupplier) => void
  disabled?: boolean
  label?: string
  required?: boolean
  error?: string
}

export function SAPSupplierInput({
  value = '',
  onResolve,
  disabled,
  label = 'Supplier Code',
  required,
  error,
}: SAPSupplierInputProps) {
  const [inputVal, setInputVal] = useState(value)
  const [status, setStatus]     = useState<'idle'|'loading'|'found'|'not_found'>('idle')
  const [resolved, setResolved] = useState<ResolvedSupplier|null>(null)
  const { activeClient }        = useAppStore()
  const debounceRef             = useRef<ReturnType<typeof setTimeout>|null>(null)

  async function lookup(code: string) {
    if (!code.trim()) { setStatus('idle'); setResolved(null); return }
    setStatus('loading')
    const { data } = await db('suppliers')
      .select('id,supplier_name,supplier_code,phone,address,payment_terms')
      .eq('client_id', activeClient)
      .eq('status', 'Active')
      .eq('supplier_code', code.trim())
      .maybeSingle()
    if (data) { setStatus('found'); setResolved(data); onResolve(data) }
    else       { setStatus('not_found'); setResolved(null) }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInputVal(val); setStatus('idle'); setResolved(null)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (val.trim().length >= 2) debounceRef.current = setTimeout(() => lookup(val), 400)
  }

  const borderColor =
    status === 'found'     ? 'border-sap-success' :
    status === 'not_found' ? 'border-sap-error'   :
    error                  ? 'border-sap-error'   : 'border-sap-border focus:border-sap-blue'

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-sap-sm text-sap-text font-medium">
          {label}{required && <span className="text-sap-error ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-sap-textSecondary pointer-events-none"/>
        <input type="text" value={inputVal} onChange={handleChange}
          onBlur={() => { if (inputVal.trim()) lookup(inputVal) }}
          disabled={disabled} placeholder="Enter Supplier Code..."
          className={`w-full rounded-sap-sm border pl-8 pr-8 py-2 text-sap-md text-sap-text bg-white focus:outline-none focus:shadow-sap-focus transition-all disabled:bg-sap-overlay disabled:cursor-not-allowed placeholder:text-sap-textDisabled ${borderColor}`}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {status === 'loading'   && <Loader2 size={14} className="text-sap-blue animate-spin"/>}
          {status === 'found'     && <CheckCircle size={14} className="text-sap-success"/>}
          {status === 'not_found' && <XCircle size={14} className="text-sap-error"/>}
        </div>
      </div>
      {resolved     && <div className="px-2 py-1.5 bg-sap-successLight rounded-sap-sm border border-green-200"><span className="text-sap-xs text-sap-success font-medium">{resolved.supplier_name}</span></div>}
      {status === 'not_found' && <span className="text-sap-xs text-sap-error">Supplier not found.</span>}
      {error && status !== 'not_found' && <span className="text-sap-xs text-sap-error">{error}</span>}
    </div>
  )
}
