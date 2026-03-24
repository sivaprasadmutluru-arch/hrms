import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null
  const pages = Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i)
  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <button onClick={() => onPageChange(page - 1)} disabled={page === 0}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
        <ChevronLeftIcon className="h-4 w-4" />
      </button>
      {pages.map(p => (
        <button key={p} onClick={() => onPageChange(p)}
          className={`w-8 h-8 rounded-lg text-sm font-medium ${p === page ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
          {p + 1}
        </button>
      ))}
      <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>
  )
}
