import { useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ChevronLeftIcon, ChevronRightIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import api from '../../services/api'
import {
  fetchRegister, updateRegisterCell,
  selectRegister, selectRegisterLoading,
} from './attendanceSlice'
import { fetchAll as fetchCompanies } from '../companies/companiesSlice'
import PageHeader from '../../components/common/PageHeader'
import Spinner from '../../components/common/Spinner'
import useAuth from '../../hooks/useAuth'

// ─── Cell display config ──────────────────────────────────────────────────────
const CELL_META = {
  EX: { label: 'Attendance not required', bg: 'bg-slate-100 text-slate-600' },
  P:  { label: 'Present',    bg: 'bg-green-100 text-green-800 hover:bg-green-200' },
  A:  { label: 'Absent',     bg: 'bg-red-100 text-red-700 hover:bg-red-200' },
  L:  { label: 'Late',       bg: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
  WO: { label: 'Weekly Off', bg: 'bg-gray-100 text-gray-400' },
  H:  { label: 'Holiday',    bg: 'bg-cyan-100 text-cyan-700' },
  OL: { label: 'On Leave',   bg: 'bg-purple-100 text-purple-700' },
  '-': { label: 'Future',    bg: 'bg-transparent text-gray-300' },
}

const EDITABLE = new Set(['P', 'A', 'L'])
const STATUS_OPTIONS = ['present', 'absent', 'late']
const STATUS_LABEL = { present: 'Present', absent: 'Absent', late: 'Late' }

// ─── Popover for inline edit ───────────────────────────────────────────────────
function CellPopover({ onSelect, onClose }) {
  const ref = useRef(null)
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute z-50 mt-1 w-28 bg-white rounded-lg shadow-lg border border-gray-200 py-1 text-xs"
    >
      {STATUS_OPTIONS.map(s => (
        <button
          key={s}
          className="w-full text-left px-3 py-1.5 hover:bg-indigo-50 text-gray-700"
          onMouseDown={() => onSelect(s)}
        >
          {STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  )
}

// ─── Single cell ──────────────────────────────────────────────────────────────
function RegisterCell({ cell, employeeId, date, companyId, onEdit, editingKey, setEditingKey }) {
  if (!cell) return <td className="px-1 py-1.5 text-center text-gray-300 text-xs">-</td>

  const status = cell.displayStatus || '-'
  const meta = CELL_META[status] || CELL_META['-']
  const canEdit = EDITABLE.has(status)
  const key = `${employeeId}-${date}`
  const isOpen = editingKey === key

  return (
    <td className="px-0.5 py-1 text-center relative">
      <button
        className={`inline-flex items-center justify-center w-8 h-6 rounded text-[11px] font-semibold transition-colors ${meta.bg} ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
        onClick={() => canEdit && setEditingKey(isOpen ? null : key)}
        title={meta.label}
      >
        {status}
      </button>
      {isOpen && (
        <CellPopover
          onClose={() => setEditingKey(null)}
          onSelect={(newStatus) => {
            setEditingKey(null)
            onEdit(employeeId, date, newStatus)
          }}
        />
      )}
    </td>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AttendanceRegisterPage() {
  const dispatch = useDispatch()
  const { user, isPlatformAdmin, isEnterpriseAdmin, effectiveCompanyId } = useAuth()
  const register = useSelector(selectRegister)
  const loading = useSelector(selectRegisterLoading)

  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [companies, setCompanies] = useState([])
  const [companyId, setCompanyId] = useState(isPlatformAdmin() ? null : effectiveCompanyId)
  const [departments, setDepartments] = useState([])
  const [departmentId, setDepartmentId] = useState('')
  const [editingKey, setEditingKey] = useState(null)
  const [exporting, setExporting] = useState(false)

  // Only platform admin gets a per-page company picker; enterprise admin uses the top-nav BranchSwitcher
  const showCompanyDropdown = isPlatformAdmin()

  // Load companies list for platform admin only
  useEffect(() => {
    if (isPlatformAdmin()) {
      dispatch(fetchCompanies({ page: 0, size: 200 }))
        .unwrap()
        .then(data => {
          const list = data.content || data
          setCompanies(list)
          if (list.length > 0) setCompanyId(list[0].id)
        })
        .catch(() => toast.error('Failed to load companies'))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load departments when company changes
  useEffect(() => {
    setDepartmentId('')
    if (!companyId) return
    api.get('/departments', { params: { companyId, page: 0, size: 200 } })
      .then(r => setDepartments(r.data.content || r.data))
      .catch(() => setDepartments([]))
  }, [companyId])

  // Load register
  useEffect(() => {
    if (!companyId) return
    dispatch(fetchRegister({
      companyId,
      departmentId: departmentId || undefined,
      year,
      month,
    }))
  }, [dispatch, companyId, departmentId, year, month])

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  const handleEdit = (empId, date, newStatus) => {
    dispatch(updateRegisterCell({ employeeId: empId, date, status: newStatus, companyId }))
      .unwrap()
      .then(() => toast.success('Attendance updated'))
      .catch(msg => toast.error(msg || 'Failed to update'))
  }

  const handleExport = async () => {
    if (!companyId) return
    setExporting(true)
    try {
      const params = new URLSearchParams({ companyId, year, month })
      if (departmentId) params.append('departmentId', departmentId)
      const res = await api.get(`/attendance/register/export?${params}`, {
        responseType: 'blob',
        headers: { 'X-Company-Id': companyId },
      })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance_register_${register?.monthLabel?.replace(' ', '_') || `${year}_${month}`}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const monthLabel = new Date(year, month - 1).toLocaleDateString('en', { month: 'long', year: 'numeric' })
  const dates = register?.dates || []
  const employees = register?.employees || []

  // Day-of-week headers (Mon, 01)
  const dateHeaders = dates.map(d => {
    const dt = new Date(d + 'T00:00:00')
    return {
      date: d,
      day: dt.getDate(),
      wd: dt.toLocaleDateString('en', { weekday: 'short' }),
      isSun: dt.getDay() === 0,
      isSat: dt.getDay() === 6,
    }
  })

  return (
    <div className="attendance-workspace attendance-register-page">
      <PageHeader
        title="Attendance Register"
        subtitle="Monthly grid view — all employees"
        actions={
          <button
            onClick={handleExport}
            disabled={exporting || !register}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        }
      />

      {/* ── Filters ── */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {showCompanyDropdown && companies.length > 0 && (
          <select
            value={companyId || ''}
            onChange={e => setCompanyId(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white shadow-sm focus:ring-2 focus:ring-indigo-400 outline-none"
          >
            {!companyId && <option value="">— Select Company —</option>}
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}

        <select
          value={departmentId}
          onChange={e => setDepartmentId(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white shadow-sm focus:ring-2 focus:ring-indigo-400 outline-none"
        >
          <option value="">All Departments</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>

        {/* Month navigation */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4 text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-indigo-700 w-36 text-center">{monthLabel}</span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <ChevronRightIcon className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* ── Register grid ── */}
      {loading ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : !register || employees.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center text-gray-400 text-sm">
          No employees found for the selected filters.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-auto">
          <table className="min-w-max w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {/* Sticky employee column */}
                <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left font-semibold text-gray-600 whitespace-nowrap border-r border-gray-100 min-w-[180px]">
                  Employee
                </th>
                <th className="sticky left-[180px] z-10 bg-gray-50 px-3 py-3 text-left font-semibold text-gray-600 whitespace-nowrap border-r border-gray-100 min-w-[120px]">
                  Department
                </th>
                {dateHeaders.map(h => (
                  <th
                    key={h.date}
                    className={`px-0.5 py-2 text-center font-medium ${h.isSun ? 'text-red-400' : h.isSat ? 'text-orange-400' : 'text-gray-500'}`}
                    style={{ minWidth: '36px' }}
                  >
                    <div>{h.wd}</div>
                    <div className="text-[10px] font-bold">{h.day}</div>
                  </th>
                ))}
                {/* Summary columns */}
                <th className="px-2 py-3 text-center font-semibold text-green-700 border-l border-gray-100 whitespace-nowrap">P</th>
                <th className="px-2 py-3 text-center font-semibold text-red-600 border-l border-gray-100 whitespace-nowrap">A</th>
                <th className="px-2 py-3 text-center font-semibold text-orange-600 border-l border-gray-100 whitespace-nowrap">L</th>
                <th className="px-2 py-3 text-center font-semibold text-purple-600 border-l border-gray-100 whitespace-nowrap">OL</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, idx) => (
                <tr
                  key={emp.employeeId}
                  className={`border-b border-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-indigo-50/30 transition-colors`}
                >
                  {/* Employee name — sticky */}
                  <td className="sticky left-0 z-10 bg-inherit px-4 py-2 border-r border-gray-100 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {emp.avatarUrl ? (
                        <img src={emp.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                          {emp.name?.charAt(0)?.toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium text-gray-800">{emp.name}</span>
                    </div>
                  </td>
                  {/* Department — sticky */}
                  <td className="sticky left-[180px] z-10 bg-inherit px-3 py-2 border-r border-gray-100 text-gray-500 whitespace-nowrap">
                    {emp.department || '—'}
                  </td>
                  {/* Day cells */}
                  {dates.map(date => (
                    <RegisterCell
                      key={date}
                      cell={emp.days[date]}
                      employeeId={emp.employeeId}
                      date={date}
                      companyId={companyId}
                      onEdit={handleEdit}
                      editingKey={editingKey}
                      setEditingKey={setEditingKey}
                    />
                  ))}
                  {/* Summary */}
                  <td className="px-2 py-2 text-center font-semibold text-green-700 border-l border-gray-100">{emp.presentCount}</td>
                  <td className="px-2 py-2 text-center font-semibold text-red-600 border-l border-gray-100">{emp.absentCount}</td>
                  <td className="px-2 py-2 text-center font-semibold text-orange-600 border-l border-gray-100">{emp.lateCount}</td>
                  <td className="px-2 py-2 text-center font-semibold text-purple-600 border-l border-gray-100">{emp.leaveCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Legend ── */}
      {!loading && register && (
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
          {Object.entries(CELL_META).filter(([k]) => k !== '-').map(([k, m]) => (
            <span key={k} className="flex items-center gap-1.5">
              <span className={`inline-flex items-center justify-center w-7 h-5 rounded font-semibold ${m.bg.split(' ').slice(0, 2).join(' ')}`}>{k}</span>
              {m.label}
            </span>
          ))}
          <span className="ml-2 text-gray-400">Click P / A / L to edit</span>
        </div>
      )}
    </div>
  )
}
