import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'

function getPageNumbers(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i)
  }
  const pages = []
  const addPage = (p) => pages.push(p)
  const addEllipsis = () => pages.push('...')

  addPage(0)
  if (page > 3) addEllipsis()
  const start = Math.max(1, page - 2)
  const end = Math.min(totalPages - 2, page + 2)
  for (let i = start; i <= end; i++) addPage(i)
  if (page < totalPages - 4) addEllipsis()
  addPage(totalPages - 1)

  return pages
}

export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null
  const items = getPageNumbers(page, totalPages)
  return (
    <div className="flex items-center justify-center gap-1 mt-4">
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 0}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </button>
      {items.map((p, i) =>
        p === '...' ? (
          <span key={`ellipsis-${i}`} className="w-8 h-8 flex items-center justify-center text-gray-400 text-sm">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`w-8 h-8 rounded-lg text-sm font-medium ${p === page ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
          >
            {p + 1}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages - 1}
        className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <ChevronRightIcon className="h-4 w-4" />
      </button>
    </div>
  )
}
