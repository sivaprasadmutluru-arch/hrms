function Shimmer({ className = '' }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
}

// Single generic skeleton block
export default function Skeleton({ className = 'h-4 w-full' }) {
  return <Shimmer className={className} />
}

// Table skeleton — matches DataTable layout
export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-100">
      <table className="min-w-full divide-y divide-gray-100">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: cols }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Shimmer className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 bg-white">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: cols }).map((_, c) => (
                <td key={c} className="px-4 py-3">
                  <Shimmer className={`h-4 ${c === 0 ? 'w-32' : c === cols - 1 ? 'w-16' : 'w-24'}`} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Card skeleton — for employee / asset card grids
export function CardSkeleton({ count = 8 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-4 border border-gray-100 space-y-3">
          <div className="flex items-center gap-3">
            <Shimmer className="h-12 w-12 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Shimmer className="h-4 w-24" />
              <Shimmer className="h-3 w-16" />
            </div>
          </div>
          <Shimmer className="h-3 w-full" />
          <Shimmer className="h-3 w-3/4" />
          <div className="flex gap-2 pt-1">
            <Shimmer className="h-6 w-16 rounded-full" />
            <Shimmer className="h-6 w-12 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Stats skeleton — for dashboard metric cards
export function StatsSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-5 border border-gray-100 space-y-3">
          <div className="flex justify-between items-start">
            <Shimmer className="h-10 w-10 rounded-lg" />
            <Shimmer className="h-5 w-12 rounded-full" />
          </div>
          <Shimmer className="h-7 w-20" />
          <Shimmer className="h-3 w-28" />
        </div>
      ))}
    </div>
  )
}

// Calendar skeleton — for attendance calendar page
export function CalendarSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Shimmer className="h-8 w-8 rounded-lg" />
        <Shimmer className="h-6 w-40" />
        <Shimmer className="h-8 w-8 rounded-lg" />
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <Shimmer key={`h-${i}`} className="h-6 w-full" />
        ))}
        {Array.from({ length: 35 }).map((_, i) => (
          <Shimmer key={`d-${i}`} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  )
}

// Form skeleton — for settings / create forms
export function FormSkeleton({ rows = 6 }) {
  return (
    <div className="space-y-5 max-w-2xl">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Shimmer className="h-3 w-24" />
          <Shimmer className="h-10 w-full rounded-lg" />
        </div>
      ))}
      <Shimmer className="h-10 w-28 rounded-lg mt-2" />
    </div>
  )
}

// Detail skeleton — for employee / asset detail pages
export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-5">
        <Shimmer className="h-20 w-20 rounded-full flex-shrink-0" />
        <div className="space-y-2">
          <Shimmer className="h-6 w-44" />
          <Shimmer className="h-4 w-28" />
          <Shimmer className="h-5 w-20 rounded-full" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Shimmer className="h-3 w-20" />
            <Shimmer className="h-5 w-36" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Page skeleton — shown during lazy route loading (Suspense fallback)
export function PageSkeleton() {
  return (
    <div className="space-y-6 p-1">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Shimmer className="h-7 w-44" />
          <Shimmer className="h-4 w-64" />
        </div>
        <Shimmer className="h-10 w-28 rounded-lg" />
      </div>
      <StatsSkeleton count={4} />
      <TableSkeleton rows={6} cols={5} />
    </div>
  )
}
