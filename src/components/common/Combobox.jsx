import { useState } from 'react'
import { Combobox as HeadlessCombobox } from '@headlessui/react'
import { ChevronDownIcon, CheckIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

/**
 * Searchable single-select built on Headless UI Combobox.
 *
 * props:
 *   - options: [{ value, label, sublabel, searchText }]  (or array of strings)
 *   - value:   selected value
 *   - onChange: (value) => void
 *   - placeholder, emptyText, label, error, helperText, disabled
 */
export default function Combobox({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  emptyText = 'No matches found',
  label,
  error,
  helperText,
  disabled = false,
  className = '',
}) {
  const [query, setQuery] = useState('')

  const normalized = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  )

  const filtered =
    query.trim() === ''
      ? normalized
      : normalized.filter((o) => {
          const hay = `${o.label ?? ''} ${o.sublabel ?? ''} ${o.searchText ?? ''}`.toLowerCase()
          return hay.includes(query.toLowerCase())
        })

  const selected = normalized.find((o) => String(o.value) === String(value)) || null

  return (
    <div className={`w-full ${className}`}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <HeadlessCombobox value={value ?? ''} onChange={onChange} disabled={disabled}>
        <div className="relative">
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10" />
          <HeadlessCombobox.Input
            className={`block w-full rounded-lg border ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'} pl-9 pr-9 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500`}
            displayValue={() => selected?.label ?? ''}
            placeholder={selected ? '' : placeholder}
            onChange={(e) => setQuery(e.target.value)}
          />
          <HeadlessCombobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronDownIcon className="h-4 w-4 text-gray-400" aria-hidden="true" />
          </HeadlessCombobox.Button>
          <HeadlessCombobox.Options className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-gray-200 bg-white py-1 text-sm shadow-lg focus:outline-none">
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-gray-400">{emptyText}</div>
            )}
            {filtered.map((o) => (
              <HeadlessCombobox.Option
                key={o.value}
                value={o.value}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-9 pr-3 ${active ? 'bg-indigo-50 text-indigo-900' : 'text-gray-700'}`
                }
              >
                {({ selected: isSelected, active }) => (
                  <>
                    <span className={`block truncate ${isSelected ? 'font-semibold' : 'font-normal'}`}>{o.label}</span>
                    {o.sublabel && <span className="block truncate text-xs text-gray-400">{o.sublabel}</span>}
                    {isSelected && (
                      <span className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-indigo-600' : 'text-indigo-500'}`}>
                        <CheckIcon className="h-4 w-4" />
                      </span>
                    )}
                  </>
                )}
              </HeadlessCombobox.Option>
            ))}
          </HeadlessCombobox.Options>
        </div>
      </HeadlessCombobox>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {helperText && !error && <p className="mt-1 text-xs text-gray-500">{helperText}</p>}
    </div>
  )
}
