import { useEffect, useState } from 'react'
import api from '../../../services/api'
import Spinner from '../../../components/common/Spinner'

export default function BonusPointsTab({ employeeId, companyId }) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!employeeId) return
    const cfg = companyId ? { headers: { 'X-Company-Id': companyId } } : {}
    api.get(`/employees/${employeeId}/bonus-points`, cfg)
      .then(res => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [employeeId, companyId])

  if (loading) return <div className="flex justify-center py-10"><Spinner /></div>
  if (!data)   return <p className="text-sm text-gray-400 py-6">No bonus points data available.</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-6 p-4 bg-indigo-50 rounded-xl">
        <div className="text-center">
          <p className="text-3xl font-bold text-indigo-600">{data.points ?? 0}</p>
          <p className="text-xs text-gray-500 mt-1">Available Points</p>
        </div>
        {data.redeemingPoints != null && (
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-600">{data.redeemingPoints}</p>
            <p className="text-xs text-gray-500 mt-1">Redeemed Points</p>
          </div>
        )}
      </div>

      {data.reason && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Reason</p>
          <p className="text-sm text-gray-700">{data.reason}</p>
        </div>
      )}

      {data.encashmentCondition && (
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Encashment Condition</p>
          <p className="text-sm text-gray-700">{data.encashmentCondition}</p>
        </div>
      )}
    </div>
  )
}
