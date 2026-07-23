import { format, parseISO } from 'date-fns'

export const formatDate = (date) => {
  if (!date) return '—'
  try { return format(typeof date === 'string' ? parseISO(date) : date, 'MMM d, yyyy') }
  catch { return date }
}

export const formatDateTime = (date) => {
  if (!date) return '—'
  try { return format(typeof date === 'string' ? parseISO(date) : date, 'MMM d, yyyy h:mm a') }
  catch { return date }
}

export const formatAttendanceTime = (time, utc) => {
  if (utc) {
    try {
      return new Date(utc).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true, timeZone: 'Asia/Dubai',
      })
    } catch { /* fall back to the local-time value */ }
  }
  if (!time) return '—'
  const match = String(time).match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/)
  if (!match) return String(time)
  const hour = Number(match[1])
  const displayHour = hour % 12 || 12
  const suffix = hour >= 12 ? 'PM' : 'AM'
  return `${String(displayHour).padStart(2, '0')}:${match[2]}:${match[3] || '00'} ${suffix}`
}

export const formatCurrency = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount ?? 0)

export const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : ''

export const formatStatus = (status) =>
  status ? status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : '—'
