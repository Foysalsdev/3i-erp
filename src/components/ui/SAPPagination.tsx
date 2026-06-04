import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { SAPSelect } from './SAPSelect'

interface SAPPaginationProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

const PAGE_SIZE_OPTIONS = [
  { value: '25',  label: '25 rows' },
  { value: '50',  label: '50 rows' },
  { value: '100', label: '100 rows' },
]

export function SAPPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: SAPPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-sap-border bg-white rounded-b-sap">
      {/* Left: rows info */}
      <div className="flex items-center gap-3">
        <span className="text-sap-sm text-sap-textSecondary">
          {total === 0 ? 'No records' : `${from}–${to} of ${total}`}
        </span>
        <div className="w-28">
          <SAPSelect
            options={PAGE_SIZE_OPTIONS}
            value={String(pageSize)}
            onChange={v => { onPageSizeChange(Number(v)); onPageChange(1) }}
            clearable={false}
          />
        </div>
      </div>

      {/* Right: page navigation */}
      <div className="flex items-center gap-1">
        <PageBtn onClick={() => onPageChange(1)}        disabled={page === 1}          icon={<ChevronsLeft size={14} />}  label="First page" />
        <PageBtn onClick={() => onPageChange(page - 1)} disabled={page === 1}          icon={<ChevronLeft size={14} />}   label="Previous page" />
        <span className="px-3 py-1.5 text-sap-sm text-sap-text font-medium">
          {page} / {totalPages}
        </span>
        <PageBtn onClick={() => onPageChange(page + 1)} disabled={page === totalPages} icon={<ChevronRight size={14} />}  label="Next page" />
        <PageBtn onClick={() => onPageChange(totalPages)} disabled={page === totalPages} icon={<ChevronsRight size={14} />} label="Last page" />
      </div>
    </div>
  )
}

function PageBtn({
  onClick, disabled, icon, label,
}: {
  onClick: () => void
  disabled: boolean
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="
        p-1.5 rounded-sap-sm text-sap-textSecondary
        hover:bg-sap-overlay hover:text-sap-text
        disabled:opacity-40 disabled:cursor-not-allowed
        transition-colors
      "
    >
      {icon}
    </button>
  )
}
