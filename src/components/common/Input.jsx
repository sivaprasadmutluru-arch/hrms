import { forwardRef, useId } from 'react'
const Input = forwardRef(function Input({ label, error, helperText, className = '', ...props }, ref) {
  const errorText = typeof error === 'string' && /^required[.!]?$/i.test(error.trim())
    ? (typeof label === 'string' ? `${label} is required.` : 'Complete this required field.')
    : error
  const generatedId = useId()
  const id = props.id || generatedId
  const describedBy = [props['aria-describedby'], error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <input ref={ref} className={`glass-input block w-full rounded-lg border ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'} px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500 ${className}`} {...props} id={id} aria-invalid={error ? true : props['aria-invalid']} aria-describedby={describedBy} />
      {error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600">{errorText}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-gray-500">{helperText}</p>}
    </div>
  )
})
export default Input
