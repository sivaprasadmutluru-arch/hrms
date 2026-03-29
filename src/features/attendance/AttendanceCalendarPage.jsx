import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchCalendar, selectCalendarDays, selectCalendarLoading } from './attendanceSlice'
import PageHeader from '../../components/common/PageHeader'
import Badge from '../../components/common/Badge'

const STATUS_META = {
  approved:        { label: 'Approved',        variant: 'info',    dot: 'bg-blue-500' },
  requested:       { label: 'Requested',        variant: 'warning', dot: 'bg-orange-400' },
  on_time:         { label: 'On Time',          variant: 'success', dot: 'bg-green-500' },
  not_regularized: { label: 'Not Regularized',  variant: 'danger',  dot: 'bg-red-500' },
  rejected:        { label: 'Rejected',         variant: 'danger',  dot: 'bg-red-500' },
  no_record:       { label: 'No Record',        variant: 'default', dot: 'bg-gray-400' },
}

const ROW_CLASS = {
  blue:   'border-l-4 border-blue-500',
  green:  'border-l-4 border-green-500',
  orange: 'border-l-4 border-orange-400',
  red:    'border-l-4 border-red-500',
  gray:   'border-l-4 border-gray-300',
}

function formatHour(val) {
  if (val == null) return '—'
  const h = Math.floor(val)
  const m = Math.round((val - h) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatTime(t) {
  if (!t) return '—'
  return t.substring(0, 5)
}

export default function AttendanceCalendarPage() {
  const dispatch = useDispatch()
  const days = useSelector(selectCalendarDays)
  const loading = useSelector(selectCalendarLoading)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)

  useEffect(() => {
    dispatch(fetchCalendar({ year, month }))
  }, [dispatch, year, month])

  const handleMonthChange = (e) => {
    const [y, m] = e.target.value.split('-')
    setYear(Number(y))
    setMonth(Number(m))
  }

  const monthValue = `${year}-${String(month).padStart(2, '0')}`

  return (
    <div>
      <PageHeader
        title="Attendance Calendar"
        subtitle="Monthly view of your attendance records"
        actions={
          <input
            type="month"
            value={monthValue}
            onChange={handleMonthChange}
            className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        }
      />

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-4 text-sm text-gray-600">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <span key={key} className="flex items-center gap-1.5">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
        <table className="min-w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-3 py-3">Date</th>
              <th className="px-3 py-3">Day</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Check In</th>
              <th className="px-3 py-3">Check Out</th>
              <th className="px-3 py-3">Shift</th>
              <th className="px-3 py-3">Work Type</th>
              <th className="px-3 py-3">Min Hours</th>
              <th className="px-3 py-3">Worked</th>
              <th className="px-3 py-3">Pending</th>
              <th className="px-3 py-3">Overtime</th>
              <th className="px-3 py-3">Penalties</th>
              <th className="px-3 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading && (
              <tr>
                <td colSpan={13} className="text-center py-10 text-gray-400">Loading…</td>
              </tr>
            )}
            {!loading && days.length === 0 && (
              <tr>
                <td colSpan={13} className="text-center py-10 text-gray-400">No records found for this month.</td>
              </tr>
            )}
            {!loading && days.map((day) => {
              const meta = STATUS_META[day.status] || STATUS_META.no_record
              const rowCls = ROW_CLASS[day.rowClass] || ''
              return (
                <tr key={day.date} className={`bg-white hover:bg-gray-50 ${rowCls}`}>
                  <td className="px-3 py-2.5 font-medium text-gray-800">{day.date}</td>
                  <td className="px-3 py-2.5 text-gray-600">{day.dateName}</td>
                  <td className="px-3 py-2.5">
                    {day.types && day.types.length > 0
                      ? day.types.map(t => (
                          <span key={t} className="mr-1 inline-block px-1.5 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
                            {t === 'LATE_COME' ? 'Late Come' : 'Early Out'}
                          </span>
                        ))
                      : <span className="text-gray-400">—</span>
                    }
                  </td>
                  <td className="px-3 py-2.5 text-gray-700">{formatTime(day.checkIn)}</td>
                  <td className="px-3 py-2.5 text-gray-700">{formatTime(day.checkOut)}</td>
                  <td className="px-3 py-2.5 text-gray-600">{day.shiftName || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{day.workTypeName || '—'}</td>
                  <td className="px-3 py-2.5 text-gray-700">{formatHour(day.minimumHour)}</td>
                  <td className="px-3 py-2.5 text-gray-700">{formatHour(day.workedHour)}</td>
                  <td className="px-3 py-2.5 text-gray-700">{formatHour(day.pendingHour)}</td>
                  <td className="px-3 py-2.5 text-gray-700">{formatHour(day.overtime)}</td>
                  <td className="px-3 py-2.5">
                    {day.penalties > 0
                      ? <span className="border border-red-400 text-red-600 rounded px-1.5 py-0.5 text-xs">{day.penalties}</span>
                      : <span className="text-gray-400">—</span>
                    }
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge label={meta.label} variant={meta.variant} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
