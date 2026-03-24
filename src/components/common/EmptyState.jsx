import { InboxIcon } from '@heroicons/react/24/outline'

export default function EmptyState({ title = 'No data', description = 'Nothing to show here yet.', action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <InboxIcon className="h-12 w-12 text-gray-300 mb-4" />
      <h3 className="text-sm font-medium text-gray-900">{title}</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
