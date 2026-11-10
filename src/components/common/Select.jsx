import { forwardRef, useId } from 'react'
const Select = forwardRef(function Select({ label, error, options = [], placeholder, className = '', ...props }, ref) {
  const errorText = typeof error === 'string' && /^required[.!]?$/i.test(error.trim())
    ? (typeof label === 'string' ? `${label} is required.` : 'Complete this required field.')
    : error
  const generatedId = useId()
  const id = props.id || generatedId
  const describedBy = [props['aria-describedby'], error ? `${id}-error` : null].filter(Boolean).join(' ') || undefined
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <select ref={ref} className={`glass-input block w-full rounded-lg border ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'} px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:border-transparent bg-white disabled:bg-gray-50 ${className}`} {...props} id={id} aria-invalid={error ? true : props['aria-invalid']} aria-describedby={describedBy}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt.value ?? opt} value={opt.value ?? opt}>{opt.label ?? opt}</option>
        ))}
      </select>
      {error && <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-600">{errorText}</p>}
    </div>
  )
})
export default Select
