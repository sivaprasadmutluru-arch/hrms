import { useEffect, useState } from 'react'
import api from '../../../services/api'
import Spinner from '../../../components/common/Spinner'
import { formatDate } from '../../../utils/formatters'
import { API_BASE_URL } from '../../../config/constants'

export default function DocumentsTab({ employeeId }) {
  const [docs, setDocs]       = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!employeeId) return
    api.get('/documents', { params: { employeeId } })
      .then(res => setDocs(Array.isArray(res.data) ? res.data : res.data?.content ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [employeeId])

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>
  if (!docs.length) return <p className="text-sm text-gray-400 py-6">No documents uploaded.</p>

  return (
    <div className="space-y-2">
      {docs.map(doc => (
        <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
          <div>
            <p className="text-sm font-medium text-gray-800">{doc.title || doc.fileName || 'Document'}</p>
            {doc.createdAt && (
              <p className="text-xs text-gray-400 mt-0.5">{formatDate(doc.createdAt)}</p>
            )}
          </div>
          {doc.filePath && (
            <a
              href={`${API_BASE_URL}${doc.filePath}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-600 hover:underline"
            >
              View
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
