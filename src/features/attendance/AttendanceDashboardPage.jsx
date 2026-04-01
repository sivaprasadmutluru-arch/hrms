import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchAttendanceDashboard } from './attendanceSlice'
import PageHeader from '../../components/common/PageHeader'
import useAuth from '../../hooks/useAuth'

export default function AttendanceDashboardPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const companyId = user?.companyId
  const dashboard = useSelector(s => s.attendance.dashboard)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

  useEffect(() => {
    if (companyId) dispatch(fetchAttendanceDashboard({ companyId, date }))
  }, [dispatch, companyId, date])

  const stats = [
    { label: 'On Time', value: dashboard?.onTime ?? 0, color: 'text-green-600' },
    { label: 'Late', value: dashboard?.lateCount ?? 0, color: 'text-yellow-600' },
    { label: 'Absent', value: dashboard?.absentCount ?? 0, color: 'text-red-600' },
    { label: 'Total Employees', value: dashboard?.totalEmployees ?? 0, color: 'text-blue-600' },
  ]

  return (
    <div>
      <PageHeader title="Attendance Dashboard" subtitle="Daily attendance overview">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        />
      </PageHeader>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-lg border p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
