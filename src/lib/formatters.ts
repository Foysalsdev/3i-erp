import dayjs from 'dayjs'

export const formatCurrency = (n: number | null | undefined): string => {
  if (n == null) return '৳ 0.00'
  return '৳ ' + n.toLocaleString('en-BD', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export const formatQty = (n: number | null | undefined, unit = ''): string => {
  if (n == null) return `0 ${unit}`.trim()
  return `${n.toLocaleString('en-BD')} ${unit}`.trim()
}

export const formatDate = (d: string | null | undefined): string => {
  if (!d) return '—'
  return dayjs(d).format('DD/MM/YYYY')
}

export const formatDateTime = (d: string | null | undefined): string => {
  if (!d) return '—'
  return dayjs(d).format('DD/MM/YYYY HH:mm')
}

export const formatRelativeTime = (d: string | null | undefined): string => {
  if (!d) return '—'
  const diff = dayjs().diff(dayjs(d), 'minute')
  if (diff < 1) return 'Just now'
  if (diff < 60) return `${diff}m ago`
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`
  return formatDate(d)
}
