import { useNavigate } from 'react-router-dom'
import { ShieldExclamationIcon } from '@heroicons/react/24/outline'

export default function ForbiddenPage() {
  const navigate = useNavigate()
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-20">
      <ShieldExclamationIcon className="h-16 w-16 text-red-400 mb-4" />
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h1>
      <p className="text-gray-500 mb-6">You don't have permission to view this page.</p>
      <button
        onClick={() => navigate('/dashboard')}
        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors"
      >
        Back to Dashboard
      </button>
    </div>
  )
}
