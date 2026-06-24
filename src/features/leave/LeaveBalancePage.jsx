import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  ChevronDownIcon, ChevronRightIcon, Squares2X2Icon, UserGroupIcon, UserIcon,
} from '@heroicons/react/24/outline'
import {
  fetchLeaveBalance, selectLeaveBalance, selectLoading,
  fetchAccrualLog, selectAccrualLog,
  fetchLeaveTypes, selectLeaveTypes,
  updateLeaveBalance, exportLeaveBalance,
} from './leaveSlice'
import api from '../../services/api'
import ConfirmModal from '../../components/common/ConfirmModal'
import { fetchAll as fetchEmployees, selectAll as selectEmployees } from '../employees/employeesSlice'
import PageHeader from '../../components/common/PageHeader'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import { formatDate } from '../../utils/formatters'
import useAuth from '../../hooks/useAuth'

const GROUP_OPTIONS = [
  { value: 'type', label: 'Leave Type', Icon: Squares2X2Icon },
  { value: 'employee', label: 'Employee', Icon: UserIcon },
  { value: 'flat', label: 'Flat', Icon: UserGroupIcon },
]

const num = (v) => (Number.isFinite(+v) ? +v : 0)

// Balance "pill" — green when healthy, amber when low, red when exhausted
function BalancePill({ value }) {
  const v = num(value)
  const variant =
    v <= 0 ? 'bg-red-100 text-red-700 ring-red-200'
    : v <= 2 ? 'bg-amber-100 text-amber-700 ring-amber-200'
    : 'bg-emerald-100 text-emerald-700 ring-emerald-200'
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${variant}`}>
      {v.toFixed(1)}
    </span>
  )
}

// Group flat rows by a chosen key, preserving first-seen order
function groupBy(rows, key) {
  const map = new Map()
  for (const r of rows) {
    const k = r[key]
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(r)
  }
  return Array.from(map.entries()).map(([keyValue, items]) => ({ keyValue, items }))
}

export default function LeaveBalancePage() {
  const dispatch = useDispatch()
  const { user, isHRManager, isBranchAdmin, isEnterpriseAdmin, isPlatformAdmin } = useAuth()
  const companyId = user?.companyId
  const leaveBalance = useSelector(selectLeaveBalance)
  const loading = useSelector(selectLoading)
  const accrualLog = useSelector(selectAccrualLog)
  const leaveTypes = useSelector(selectLeaveTypes)
  const employees = useSelector(selectEmployees)

  const [grouping, setGrouping] = useState('type')
  const [collapsed, setCollapsed] = useState({}) // keyed by group label
  const [search, setSearch] = useState('')

  const [logModal, setLogModal] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Export filters
  const [exportModal, setExportModal] = useState(false)
  const [empSearch, setEmpSearch] = useState('')
  const [filterEmployeeIds, setFilterEmployeeIds] = useState([])
  const [filterLeaveTypeIds, setFilterLeaveTypeIds] = useState([])
  const [filterFromDate, setFilterFromDate] = useState('')
  const [filterToDate, setFilterToDate] = useState('')
  const [excludeZeroBalance, setExcludeZeroBalance] = useState(false)

  const canManage = isPlatformAdmin() || isEnterpriseAdmin() || isBranchAdmin() || isHRManager()

  useEffect(() => {
    dispatch(fetchLeaveBalance())
    dispatch(fetchLeaveTypes())
    dispatch(fetchEmployees({ page: 0, size: 500 }))
  }, [dispatch])

  // Reset collapse state whenever grouping changes so the new view starts expanded
  useEffect(() => { setCollapsed({}) }, [grouping])

  const openLog = (row) => {
    setLogModal({ employeeId: row.employeeId, leaveTypeId: row.leaveTypeId, name: `${row.employeeName} – ${row.leaveTypeName}` })
    dispatch(fetchAccrualLog({ employeeId: row.employeeId, leaveTypeId: row.leaveTypeId }))
  }

  const openEdit = (row) => {
    setEditTarget(row)
    setEditForm({
      availableDays: row.availableDays ?? 0,
      carryforwardDays: row.carryforwardDays ?? 0,
      totalLeaveDays: row.totalLeaveDays ?? 0,
      resetDate: row.resetDate || '',
      expiredDate: row.expiredDate || '',
    })
  }

  const confirmDelete = async () => {
    setDeleting(true)
    try {
      await api.delete(`/leave/allocations/${deleteTarget.id}`)
      toast.success('Leave balance deleted')
      setDeleteTarget(null)
      dispatch(fetchLeaveBalance())
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to delete leave balance')
    } finally {
      setDeleting(false)
    }
  }

  const handleEditSave = async () => {
    setSaving(true)
    try {
      await dispatch(updateLeaveBalance({
        id: editTarget.id,
        data: {
          availableDays: editForm.availableDays !== '' ? Number(editForm.availableDays) : 0,
          carryforwardDays: editForm.carryforwardDays !== '' ? Number(editForm.carryforwardDays) : 0,
          totalLeaveDays: editForm.totalLeaveDays !== '' ? Number(editForm.totalLeaveDays) : 0,
          resetDate: editForm.resetDate || null,
          expiredDate: editForm.expiredDate || null,
        },
      })).unwrap()
      toast.success('Leave balance updated')
      setEditTarget(null)
    } catch (e) {
      toast.error(e || 'Failed to update leave balance')
    } finally {
      setSaving(false)
    }
  }

  const openExportModal = () => {
    setFilterEmployeeIds([])
    setFilterLeaveTypeIds([])
    setFilterFromDate('')
    setFilterToDate('')
    setExcludeZeroBalance(false)
    setEmpSearch('')
    setExportModal(true)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await dispatch(exportLeaveBalance({
        companyId,
        employeeIds: filterEmployeeIds.length > 0 ? filterEmployeeIds : undefined,
        leaveTypeIds: filterLeaveTypeIds.length > 0 ? filterLeaveTypeIds : undefined,
        fromDate: filterFromDate || undefined,
        toDate: filterToDate || undefined,
        excludeZeroBalance: excludeZeroBalance || undefined,
      })).unwrap()
      setExportModal(false)
    } catch (e) {
      toast.error(e || 'Failed to export')
    } finally {
      setExporting(false)
    }
  }

  const toggleEmployeeFilter = (id) =>
    setFilterEmployeeIds(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])

  const toggleLeaveTypeFilter = (id) =>
    setFilterLeaveTypeIds(prev => prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id])

  const filteredEmployees = employees.filter(emp => {
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim().toLowerCase()
    return name.includes(empSearch.toLowerCase())
  })

  // Apply search across the raw list before grouping
  const searchedRows = useMemo(() => {
    if (!search) return leaveBalance
    const q = search.toLowerCase()
    return leaveBalance.filter(r =>
      (r.employeeName || '').toLowerCase().includes(q) ||
      (r.leaveTypeName || '').toLowerCase().includes(q)
    )
  }, [leaveBalance, search])

  // Group rows per the active grouping mode
  const groups = useMemo(() => {
    if (grouping === 'type') return groupBy(searchedRows, 'leaveTypeName')
    if (grouping === 'employee') return groupBy(searchedRows, 'employeeName')
    return [{ keyValue: null, items: searchedRows }]
  }, [searchedRows, grouping])

  const toggleCollapse = (key) =>
    setCollapsed(prev => ({ ...prev, [key]: !prev[key] }))

  // Column visibility depends on grouping (hide the redundant key column)
  const showEmployeeCol = grouping !== 'employee'
  const showLeaveTypeCol = grouping !== 'type'

  const Actions = ({ row }) => (
    <div className="flex gap-2 justify-end">
      <Button size="sm" variant="ghost" onClick={() => openLog(row)}>Log</Button>
      {canManage && <Button size="sm" variant="secondary" onClick={() => openEdit(row)}>Edit</Button>}
      {canManage && <Button size="sm" variant="danger" onClick={() => setDeleteTarget(row)}>Delete</Button>}
    </div>
  )

  const Th = ({ children, right }) => (
    <th className={`px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide ${right ? 'text-right' : 'text-left'}`}>{children}</th>
  )

  return (
    <div>
      <PageHeader
        title="Leave Balance"
        subtitle="Available leave days per employee and type"
        actions={
          <Button variant="secondary" onClick={openExportModal}>Export Excel</Button>
        }
      />

      {/* Toolbar: search + grouping toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by employee or leave type…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-80 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 self-start">
          {GROUP_OPTIONS.map(opt => {
            const active = grouping === opt.value
            const Icon = opt.Icon
            return (
              <button
                key={opt.value}
                onClick={() => setGrouping(opt.value)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  active ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-gray-200' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Grouped tables */}
      {loading ? (
        <div className="rounded-xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-400">Loading…</div>
      ) : groups.length === 0 || groups.every(g => g.items.length === 0) ? (
        <div className="rounded-xl border border-gray-100 bg-white p-10 text-center text-sm text-gray-400">No leave balances found.</div>
      ) : (
        <div className="space-y-4">
          {groups.map(group => {
            const key = group.keyValue ?? '__flat__'
            const isCollapsed = collapsed[key]
            return (
              <div key={key} className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                {grouping !== 'flat' && (
                  <button
                    onClick={() => toggleCollapse(key)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50/80 hover:bg-gray-50 transition-colors sticky top-0 z-10"
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed
                        ? <ChevronRightIcon className="h-4 w-4 text-gray-400" />
                        : <ChevronDownIcon className="h-4 w-4 text-gray-400" />}
                      <span className="font-semibold text-gray-800">{group.keyValue || '—'}</span>
                      <span className="text-xs font-normal text-gray-400">{group.items.length} {group.items.length === 1 ? 'record' : 'records'}</span>
                    </div>
                  </button>
                )}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-white">
                        <tr>
                          {showEmployeeCol && <Th>Employee</Th>}
                          {showLeaveTypeCol && <Th>Leave Type</Th>}
                          <Th>Available</Th>
                          <Th>Carry Forward</Th>
                          <Th>Total (avail+cf)</Th>
                          <Th>Used</Th>
                          <Th>Leave Balance</Th>
                          <Th>Assigned</Th>
                          <Th>Reset</Th>
                          <Th>Expires</Th>
                          <Th right>Actions</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {group.items.map((row) => {
                          const balance = num(row.totalLeaveDays) - num(row.usedDays)
                          return (
                            <tr key={row.id} className="hover:bg-gray-50/60">
                              {showEmployeeCol && (
                                <td className="px-4 py-3 text-sm text-gray-800 font-medium whitespace-nowrap">{row.employeeName || '—'}</td>
                              )}
                              {showLeaveTypeCol && (
                                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{row.leaveTypeName || '—'}</td>
                              )}
                              <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap font-semibold">{num(row.availableDays).toFixed(1)}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{num(row.carryforwardDays).toFixed(1)}</td>
                              <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">{num(row.totalLeaveDays).toFixed(1)}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{num(row.usedDays).toFixed(1)}</td>
                              <td className="px-4 py-3 text-sm whitespace-nowrap"><BalancePill value={balance} /></td>
                              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{row.assignedDate || '—'}</td>
                              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{row.resetDate ? formatDate(row.resetDate) : '—'}</td>
                              <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">{row.expiredDate ? formatDate(row.expiredDate) : '—'}</td>
                              <td className="px-4 py-3 whitespace-nowrap"><Actions row={row} /></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Accrual Log Modal */}
      <Modal open={!!logModal} onClose={() => setLogModal(null)}
        title={`Accrual History — ${logModal?.name || ''}`}>
        {accrualLog.length === 0
          ? <p className="text-sm text-gray-400 italic">No accrual records found. This leave type may not have accrual enabled.</p>
          : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Days Credited</th>
                  <th className="pb-2">Note</th>
                </tr>
              </thead>
              <tbody>
                {accrualLog.map(entry => (
                  <tr key={entry.id} className="border-b last:border-0">
                    <td className="py-2">{formatDate(entry.accrualDate)}</td>
                    <td className="py-2 font-medium text-green-600">+{entry.days}</td>
                    <td className="py-2 text-gray-500">{entry.note === 'PRORATA_JOINING' ? 'Pro-rata (joining month)' : 'Monthly'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </Modal>

      {/* Edit Balance Modal */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={`Edit Balance — ${editTarget?.employeeName || ''} / ${editTarget?.leaveTypeName || ''}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button onClick={handleEditSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Available Days" type="number" min="0" step="0.5"
            value={editForm.availableDays}
            onChange={e => setEditForm(f => ({ ...f, availableDays: e.target.value }))} />
          <Input label="Carry Forward Days" type="number" min="0" step="0.5"
            value={editForm.carryforwardDays}
            onChange={e => setEditForm(f => ({ ...f, carryforwardDays: e.target.value }))} />
          <Input label="Total Leave Days" type="number" min="0" step="0.5"
            value={editForm.totalLeaveDays}
            onChange={e => setEditForm(f => ({ ...f, totalLeaveDays: e.target.value }))} />
          <Input label="Reset Date" type="date"
            value={editForm.resetDate}
            onChange={e => setEditForm(f => ({ ...f, resetDate: e.target.value }))} />
          <Input label="Expiry Date (carry forward)" type="date"
            value={editForm.expiredDate}
            onChange={e => setEditForm(f => ({ ...f, expiredDate: e.target.value }))} />
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete Leave Balance"
        message={`Are you sure you want to delete the leave balance for ${deleteTarget?.employeeName || ''} / ${deleteTarget?.leaveTypeName || ''}? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
      />

      {/* Export Modal */}
      <Modal
        open={exportModal}
        onClose={() => setExportModal(false)}
        title="Export Leave Balance"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setExportModal(false)}>Cancel</Button>
            <Button onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exporting…' : 'Download Excel'}
            </Button>
          </div>
        }
      >
        <div className="space-y-5">
          {/* Employee selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">Employees</label>
              {filterEmployeeIds.length > 0
                ? <button className="text-xs text-blue-500 hover:underline" onClick={() => setFilterEmployeeIds([])}>
                    Clear ({filterEmployeeIds.length} selected)
                  </button>
                : <span className="text-xs text-gray-400">All employees (none selected)</span>}
            </div>
            <input
              type="text" placeholder="Search employees…" value={empSearch}
              onChange={e => setEmpSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="border border-gray-200 rounded-lg bg-gray-50 max-h-40 overflow-y-auto divide-y divide-gray-100">
              {filteredEmployees.length === 0 && <p className="text-sm text-gray-400 italic px-3 py-3">No employees found</p>}
              {filteredEmployees.map(emp => {
                const id = emp.id
                const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email
                const checked = filterEmployeeIds.includes(id)
                return (
                  <label key={id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white transition-colors ${checked ? 'bg-blue-50' : ''}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleEmployeeFilter(id)}
                      className="rounded border-gray-300 text-blue-600" />
                    <span className="text-sm text-gray-800">{name}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Leave Type selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-gray-700">Leave Types</label>
              {filterLeaveTypeIds.length > 0
                ? <button className="text-xs text-blue-500 hover:underline" onClick={() => setFilterLeaveTypeIds([])}>
                    Clear ({filterLeaveTypeIds.length} selected)
                  </button>
                : <span className="text-xs text-gray-400">All types (none selected)</span>}
            </div>
            <div className="border border-gray-200 rounded-lg bg-gray-50 max-h-40 overflow-y-auto divide-y divide-gray-100">
              {(leaveTypes || []).length === 0 && <p className="text-sm text-gray-400 italic px-3 py-3">No leave types found</p>}
              {(leaveTypes || []).map(lt => {
                const checked = filterLeaveTypeIds.includes(lt.id)
                return (
                  <label key={lt.id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white transition-colors ${checked ? 'bg-blue-50' : ''}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleLeaveTypeFilter(lt.id)}
                      className="rounded border-gray-300 text-blue-600" />
                    <span className="text-sm text-gray-800">{lt.name}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Assigned From</label>
              <input type="date" value={filterFromDate}
                onChange={e => setFilterFromDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Assigned To</label>
              <input type="date" value={filterToDate}
                onChange={e => setFilterToDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {/* Exclude zero balance */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={excludeZeroBalance}
              onChange={e => setExcludeZeroBalance(e.target.checked)}
              className="rounded border-gray-300 text-blue-600" />
            <span className="text-sm text-gray-700">Exclude zero-balance rows (no remaining days)</span>
          </label>
        </div>
      </Modal>
    </div>
  )
}
