import { useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import type { TableColumn } from '@/types'

// Allow any object shape — modules define their own row types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRow = Record<string, any>

interface SAPTableProps<T extends AnyRow> {
  columns: TableColumn<T>[]
  data: T[]
  loading?: boolean
  emptyMessage?: string
  emptyAction?: React.ReactNode
  rowKey?: keyof T
  onRowClick?: (row: T) => void
  className?: string
}

type SortDir = 'asc' | 'desc' | null

export function SAPTable<T extends AnyRow>({
  columns,
  data,
  loading = false,
  emptyMessage = 'No records found',
  emptyAction,
  rowKey = 'id' as keyof T,
  onRowClick,
  className = '',
}: SAPTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>(null)

  function handleSort(key: string) {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc') }
    else if (sortDir === 'asc') setSortDir('desc')
    else { setSortKey(null); setSortDir(null) }
  }

  const sorted = [...data].sort((a, b) => {
    if (!sortKey || !sortDir) return 0
    const av = a[sortKey]; const bv = b[sortKey]
    if (av == null) return 1; if (bv == null) return -1
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true })
    return sortDir === 'asc' ? cmp : -cmp
  })

  return (
    <div className={`bg-white rounded-sap shadow-sap-card overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-max">
          <thead>
            <tr className="bg-sap-overlay border-b border-sap-border">
              {columns.map(col => (
                <th
                  key={String(col.key)}
                  style={col.width ? { width: col.width } : undefined}
                  className={`
                    px-4 py-3 text-left text-sap-sm font-semibold text-sap-textSecondary
                    whitespace-nowrap select-none
                    ${col.sortable ? 'cursor-pointer hover:bg-sap-surfaceHover' : ''}
                    ${col.sticky ? 'sticky right-0 bg-sap-overlay shadow-[-4px_0_8px_rgba(0,0,0,0.06)]' : ''}
                  `}
                  onClick={() => col.sortable && handleSort(String(col.key))}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable && (
                      <span className="text-sap-textDisabled">
                        {sortKey === String(col.key) && sortDir === 'asc'  && <ChevronUp size={12} />}
                        {sortKey === String(col.key) && sortDir === 'desc' && <ChevronDown size={12} />}
                        {(sortKey !== String(col.key) || !sortDir)         && <ChevronsUpDown size={12} />}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-sap-overlay">
                  {columns.map(col => (
                    <td key={String(col.key)} className="px-4 py-3">
                      <div className="h-4 bg-sap-overlay rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-sap-textSecondary">
                    <span className="text-4xl">📋</span>
                    <p className="text-sap-md">{emptyMessage}</p>
                    {emptyAction}
                  </div>
                </td>
              </tr>
            ) : (
              sorted.map((row, idx) => (
                <tr
                  key={String(row[rowKey] ?? idx)}
                  onClick={() => onRowClick?.(row)}
                  className={`
                    border-b border-sap-overlay last:border-0 transition-colors duration-100
                    ${onRowClick ? 'cursor-pointer hover:bg-sap-surfaceHover' : 'hover:bg-sap-surfaceHover'}
                  `}
                >
                  {columns.map(col => (
                    <td
                      key={String(col.key)}
                      className={`
                        px-4 py-3 text-sap-md text-sap-text
                        ${col.sticky ? 'sticky right-0 bg-white shadow-[-4px_0_8px_rgba(0,0,0,0.06)]' : ''}
                      `}
                    >
                      {col.render
                        ? col.render(row[String(col.key)], row)
                        : String(row[String(col.key)] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
