import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ChevronLeftIcon, ChevronRightIcon, UserCircleIcon } from '@heroicons/react/24/outline'
import { fetchCalendar, selectCalendarDays, selectCalendarLoading } from './attendanceSlice'
import { fetchAll } from '../employees/employeesSlice'
import PageHeader from '../../components/common/PageHeader'
import Spinner from '../../components/common/Spinner'
import useAuth from '../../hooks/useAuth'

// ─── Day type config ──────────────────────────────────────────────────────────
const DAY_TYPE = {
  present:    { label: 'Present',        circle: 'bg-green-500 text-white',           dot: 'bg-green-500' },
  irregular:  { label: 'Irregular',      circle: 'bg-yellow-400 text-white',          dot: 'bg-yellow-400' },
  absent:     { label: 'Absent',         circle: 'bg-orange-500 text-white',          dot: 'bg-orange-500' },
  weekly_off: { label: 'Weekly Off',     circle: 'bg-green-200 text-green-800',       dot: 'bg-green-200' },
  on_leave:   { label: 'Leave',          circle: 'bg-purple-500 text-white',          dot: 'bg-purple-500' },
  holiday:    { label: 'Public Holiday', circle: 'bg-cyan-400 text-white',            dot: 'bg-cyan-400' },
  future:     { label: '',               circle: 'bg-transparent text-gray-400',      dot: '' },
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function buildCalendarGrid(year, month, days) {
  const dayMap = {}
  days.forEach(d => { dayMap[String(d.date)] = d })

  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const startWeekday = firstDay.getDay()

  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, dateStr, data: dayMap[dateStr] || null })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function formatHour(val) {
  if (val == null) return '—'
  const h = Math.floor(val)
  const m = Math.round((val - h) * 60)
  return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`
}

function formatTime(utcIso, fallback) {
  if (utcIso) return new Date(utcIso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })
  if (fallback) return String(fallback).substring(0, 5)
  return '—'
}

// ─── Employee picker (for admin users with no employee record) ────────────────
function EmployeePicker({ employees, onSelect }) {
  const [search, setSearch] = useState('')

  const filtered = employees.filter(emp => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      emp.firstName?.toLowerCase().includes(q) ||
      emp.lastName?.toLowerCase().includes(q) ||
      emp.badgeId?.toLowerCase().includes(q)
    )
  })

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center">
          <UserCircleIcon className="h-5 w-5 text-indigo-500" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Select an Employee</h2>
          <p className="text-xs text-gray-400">Choose an employee to view their attendance calendar</p>
        </div>
      </div>
      <input
        type="text"
        placeholder="Search by name or employee ID…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-3"
        autoFocus
      />
      <div className="max-h-72 overflow-y-auto divide-y divide-gray-50 rounded-lg border border-gray-100">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No employees found</p>
        ) : (
          filtered.map(emp => (
            <button
              key={emp.id}
              onClick={() => onSelect(emp)}
              className="w-full text-left px-4 py-2.5 hover:bg-indigo-50 transition-colors"
            >
              <span className="text-sm font-medium text-gray-800">
                {emp.firstName} {emp.lastName}
              </span>
              <span className="ml-2 text-xs text-gray-400">{emp.badgeId}</span>
              {emp.department?.name && (
                <span className="ml-2 text-xs text-indigo-400">{emp.department.name}</span>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  )
}

export default function AttendanceCalendarPage() {
  const dispatch = useDispatch()
  const { user, isEmployee } = useAuth()
  const days = useSelector(selectCalendarDays)
  const loading = useSelector(selectCalendarLoading)
  const allEmployees = useSelector(state => state.employees.data?.content || [])

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedEmployee, setSelectedEmployee] = useState(null)

  // URL param takes priority (e.g. linked from employee detail page)
  const searchParams = new URLSearchParams(window.location.search)
  const urlEmployeeId = searchParams.get('employeeId')

  // Admin users who have no employee record need to pick one explicitly.
  // Employees and admin users with their own employee record can view their own calendar.
  const isAdminWithoutRecord = !isEmployee() && !user?.employeeId && !urlEmployeeId

  const resolvedEmployeeId = urlEmployeeId
    || (selectedEmployee ? String(selectedEmployee.id) : undefined)

  // Fetch employees list so admin can pick
  useEffect(() => {
    if (!isEmployee()) {
      dispatch(fetchAll({ size: 500, active: true }))
    }
  }, [dispatch])

  // Fetch calendar when we have enough context
  useEffect(() => {
    if (isAdminWithoutRecord && !selectedEmployee) return
    dispatch(fetchCalendar({ year, month, employeeId: resolvedEmployeeId }))
    setSelectedDate(null)
  }, [dispatch, year, month, resolvedEmployeeId, isAdminWithoutRecord, selectedEmployee])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const monthLabel = new Date(year, month - 1).toLocaleDateString('en', { month: 'long', year: 'numeric' })
  const cells = buildCalendarGrid(year, month, days)
  const today = new Date().toISOString().slice(0, 10)
  const selectedData = selectedDate ? days.find(d => String(d.date) === selectedDate) : null

  // Admin with no employee record and no selection → show picker
  if (isAdminWithoutRecord) {
    return (
      <div className="attendance-workspace attendance-calendar-page">
        <PageHeader
          title="Attendance Calendar"
          subtitle="Monthly view of attendance records"
        />
        <EmployeePicker
          employees={allEmployees}
          onSelect={emp => setSelectedEmployee(emp)}
        />
      </div>
    )
  }

  return (
    <div className="attendance-workspace attendance-calendar-page">
      <PageHeader
        title="Attendance Calendar"
        subtitle="Monthly view of attendance records"
      />

      {/* Admin: employee switcher strip */}
      {!isEmployee() && (
        <div className="mb-4 flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-2.5">
          <UserCircleIcon className="h-4 w-4 text-indigo-400 flex-shrink-0" />
          <span className="text-sm text-gray-600">
            Viewing: <span className="font-semibold text-gray-800">
              {selectedEmployee
                ? `${selectedEmployee.firstName} ${selectedEmployee.lastName}`
                : urlEmployeeId
                  ? `Employee #${urlEmployeeId}`
                  : 'My Calendar'}
            </span>
          </span>
          {allEmployees.length > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <select
                value={selectedEmployee?.id || ''}
                onChange={e => {
                  if (!e.target.value) { setSelectedEmployee(null); return }
                  const emp = allEmployees.find(em => String(em.id) === e.target.value)
                  if (emp) setSelectedEmployee(emp)
                }}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              >
                {!user?.employeeId && <option value="">Select employee…</option>}
                {user?.employeeId && <option value="">My Calendar</option>}
                {allEmployees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {emp.firstName} {emp.lastName} ({emp.badgeId})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Calendar card ── */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-indigo-700">{monthLabel}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={prevMonth}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                <ChevronRightIcon className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : (
            <>
              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-2">
                {WEEKDAYS.map((wd, i) => (
                  <div
                    key={wd}
                    className={`text-center text-xs font-semibold py-1 ${i === 0 ? 'text-red-500' : 'text-gray-500'}`}
                  >
                    {wd}
                  </div>
                ))}
              </div>

              {/* Day grid */}
              <div className="grid grid-cols-7 gap-y-2">
                {cells.map((cell, idx) => {
                  if (!cell) return <div key={`empty-${idx}`} />

                  const { day, dateStr, data } = cell
                  const isToday = dateStr === today
                  const isFuture = !data || data.dayType === 'future'
                  const dayType = data?.dayType || (isFuture ? 'future' : 'absent')
                  const typeMeta = DAY_TYPE[dayType] || DAY_TYPE.future
                  const isSelected = selectedDate === dateStr
                  const isLate = !isFuture && data?.types?.includes('LATE_COME')

                  return (
                    <div
                      key={dateStr}
                      className="relative flex justify-center items-center py-1"
                    >
                      <button
                        onClick={() => !isFuture && setSelectedDate(isSelected ? null : dateStr)}
                        disabled={isFuture}
                        className={`
                          w-9 h-9 rounded-full text-sm font-semibold transition-all duration-150 relative
                          ${isFuture
                            ? 'text-gray-300 cursor-default'
                            : typeMeta.circle + ' hover:opacity-80 cursor-pointer'
                          }
                          ${isSelected ? 'ring-2 ring-offset-1 ring-indigo-500 scale-110' : ''}
                          ${isToday && !isFuture ? 'ring-2 ring-offset-1 ring-white shadow-md' : ''}
                        `}
                        title={data?.leaveTypeName || data?.holidayName || (isLate ? 'Late Come' : typeMeta.label)}
                      >
                        {day}
                      </button>
                      {isLate && (
                        <span className="absolute bottom-0 right-1/2 translate-x-4 translate-y-0.5 w-4 h-4 rounded-full bg-orange-500 text-white text-[9px] font-bold flex items-center justify-center ring-1 ring-white pointer-events-none">
                          L
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-2">
                {Object.entries(DAY_TYPE).filter(([k]) => k !== 'future').map(([key, meta]) => (
                  <span key={key} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${meta.dot}`} />
                    {meta.label}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── Detail panel ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          {selectedData ? (
            <>
              <h3 className="text-sm font-bold text-gray-800 mb-1">
                {new Date(selectedData.date).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </h3>
              {(() => {
                const meta = DAY_TYPE[selectedData.dayType] || DAY_TYPE.future
                return (
                  <span className={`inline-block mt-1 mb-4 px-3 py-1 rounded-full text-xs font-semibold ${meta.circle}`}>
                    {selectedData.holidayName || selectedData.leaveTypeName || meta.label}
                  </span>
                )
              })()}

              <div className="space-y-3 text-sm">
                {selectedData.checkIn && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Check In</span>
                    <span className="font-semibold text-gray-800">{formatTime(selectedData.checkInUtc, selectedData.checkIn)}</span>
                  </div>
                )}
                {selectedData.checkOut && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Check Out</span>
                    <span className="font-semibold text-gray-800">{formatTime(selectedData.checkOutUtc, selectedData.checkOut)}</span>
                  </div>
                )}
                {selectedData.clockInSource && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Source</span>
                    <span className="font-semibold text-gray-800 flex items-center gap-1">
                      {selectedData.clockInSource === 'device' && <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />}
                      {selectedData.clockInSource === 'mobile' && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full inline-block" />}
                      {selectedData.clockInSource === 'manual' && <span className="w-1.5 h-1.5 bg-gray-400 rounded-full inline-block" />}
                      {selectedData.clockInSource === 'device' 
                        ? (selectedData.clockInDeviceName || 'Biometric Device')
                        : selectedData.clockInSource.charAt(0).toUpperCase() + selectedData.clockInSource.slice(1)}
                    </span>
                  </div>
                )}
                {selectedData.workedHour != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Hours Worked</span>
                    <span className="font-semibold text-gray-800">{formatHour(selectedData.workedHour)}</span>
                  </div>
                )}
                {selectedData.minimumHour != null && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Required Hours</span>
                    <span className="font-semibold text-gray-800">{formatHour(selectedData.minimumHour)}</span>
                  </div>
                )}
                {selectedData.pendingHour > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Pending Hours</span>
                    <span className="font-semibold text-red-600">{formatHour(selectedData.pendingHour)}</span>
                  </div>
                )}
                {selectedData.overtime > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Overtime</span>
                    <span className="font-semibold text-indigo-600">{formatHour(selectedData.overtime)}</span>
                  </div>
                )}
                {selectedData.shiftName && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Shift</span>
                    <span className="font-semibold text-gray-800">{selectedData.shiftName}</span>
                  </div>
                )}
                {selectedData.workTypeName && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Work Type</span>
                    <span className="font-semibold text-gray-800">{selectedData.workTypeName}</span>
                  </div>
                )}
                {selectedData.types?.length > 0 && (
                  <div className="flex justify-between items-start">
                    <span className="text-gray-500">Flags</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {selectedData.types.map(t => (
                        <span key={t} className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                          {t === 'LATE_COME' ? 'Late Come' : 'Early Out'}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {selectedData.penalties > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Penalties</span>
                    <span className="font-semibold text-red-600">{selectedData.penalties}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center">
              <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-600">Select a day</p>
              <p className="text-xs text-gray-400 mt-1">Click any date to see details</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Monthly summary strip ── */}
      {!loading && days.length > 0 && (() => {
        const counts = days.reduce((acc, d) => {
          const t = d.dayType || 'absent'
          acc[t] = (acc[t] || 0) + 1
          return acc
        }, {})
        const summary = [
          { key: 'present',    label: 'Present' },
          { key: 'absent',     label: 'Absent' },
          { key: 'irregular',  label: 'Irregular' },
          { key: 'on_leave',   label: 'On Leave' },
          { key: 'weekly_off', label: 'Weekly Off' },
          { key: 'holiday',    label: 'Holidays' },
        ].filter(s => counts[s.key] > 0)

        return (
          <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Summary</h3>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
              {summary.map(s => {
                const meta = DAY_TYPE[s.key]
                return (
                  <div key={s.key} className="text-center">
                    <div className={`w-10 h-10 rounded-full ${meta.dot} mx-auto flex items-center justify-center text-white font-bold text-sm`}>
                      {counts[s.key]}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{s.label}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
