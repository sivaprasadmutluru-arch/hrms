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

export const formatCurrency = (amount, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount ?? 0)

export const capitalize = (str) =>
  str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : ''

export const formatStatus = (status) =>
  status ? status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase()) : '—'
