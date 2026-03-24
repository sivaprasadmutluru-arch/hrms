import { useState, useEffect } from 'react'
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline'

export default function SearchInput({ placeholder = 'Search...', onSearch, delay = 300, className = '' }) {
  const [value, setValue] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => onSearch?.(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay, onSearch])
  return (
    <div className={`relative ${className}`}>
      <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input value={value} onChange={e => setValue(e.target.value)} placeholder={placeholder}
        className="block w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
    </div>
  )
}
