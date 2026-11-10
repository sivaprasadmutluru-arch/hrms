// Keep error payloads serializable so Redux can preserve field-level validation.
const readable = value => typeof value === 'string' && value.trim() ? value.trim() : null
export function apiErrorDetails(error, fallback = 'Unable to complete the request. Please try again.') {
  const data = error?.response ? error.response.data : (error?.isAxiosError ? null : error)
  const status = error?.response?.status ?? data?.status
  let fields = data?.errors && typeof data.errors === 'object' && !Array.isArray(data.errors)
    ? Object.fromEntries(Object.entries(data.errors).filter(([, value]) => readable(value)).map(([key, value]) => [key, value.trim()])) : {}
  let message = readable(data?.message) || (typeof error === 'string' ? readable(error) : null)
  if (status >= 500) fields = {}
  if (status >= 500) message = status === 503
    ? 'The service is temporarily unavailable. Check whether your changes were saved before trying again.'
    : 'Something went wrong on the server. Please try again later or contact support.'
  else if (Object.keys(fields).length) message = [...new Set(Object.values(fields))].slice(0, 3).join(' ')
  else if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') message = 'The request timed out. Check whether your changes were saved before trying again.'
  else if (error?.code === 'ERR_NETWORK' || (error?.isAxiosError && !error.response)) message = 'Unable to connect to the server. Check your connection and try again.'
  if (!message) message = ({400:'Some values are invalid. Review the form and try again.',401:'Your session has expired. Please sign in again.',403:'You do not have permission to perform this action.',404:'This record is no longer available. Refresh the page.',409:'This record conflicts with existing data. Refresh and check your entries.',413:'The uploaded file is too large. Choose a smaller file.',429:'Too many requests. Please wait a moment and try again.'})[status] || fallback
  return { message, errors: fields }
}
export function applyFormErrors(error, setError) {
  const details = apiErrorDetails(error)
  let first = true
  for (const [field, message] of Object.entries(details.errors)) {
    if (field === '_global') continue
    setError(field, { type: 'server', message }, { shouldFocus: first })
    first = false
  }
  return details.message
}
