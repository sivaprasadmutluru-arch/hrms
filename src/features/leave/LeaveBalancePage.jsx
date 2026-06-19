import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  fetchLeaveBalance, selectLeaveBalance, selectLoading,
  fetchAccrualLog, selectAccrualLog,
  updateLeaveBalance, exportLeaveBalance,
} from './leaveSlice'
import api from '../../services/api'
import ConfirmModal from '../../components/common/ConfirmModal'
import { fetchAll as fetchEmployees, selectAll as selectEmployees } from '../employees/employeesSlice'
import PageHeader from '../../components/common/PageHeader'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import { formatDate } from '../../utils/formatters'
import useAuth from '../../hooks/useAuth'

export default function LeaveBalancePage() {
  const dispatch = useDispatch()
  const { user, isHRManager, isBranchAdmin, isEnterpriseAdmin, isPlatformAdmin } = useAuth()
  const companyId = user?.companyId
  const leaveBalance = useSelector(selectLeaveBalance)
  const loading = useSelector(selectLoading)
  const accrualLog = useSelector(selectAccrualLog)

  const employees = useSelector(selectEmployees)

  const [logModal, setLogModal] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  // Export filters
  const [filterEmployeeIds, setFilterEmployeeIds] = useState([])
  const [filterFromDate, setFilterFromDate] = useState('')
  const [filterToDate, setFilterToDate] = useState('')

  const canManage = isPlatformAdmin() || isEnterpriseAdmin() || isBranchAdmin() || isHRManager()

  useEffect(() => {
    dispatch(fetchLeaveBalance())
    dispatch(fetchEmployees({ page: 0, size: 500 }))
  }, [dispatch])

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

  const [exportModal, setExportModal] = useState(false)
  const [empSearch, setEmpSearch] = useState('')
  const [search, setSearch] = useState('')

  const openExportModal = () => {
    setFilterEmployeeIds([])
    setFilterFromDate('')
    setFilterToDate('')
    setEmpSearch('')
    setExportModal(true)
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      await dispatch(exportLeaveBalance({
        companyId,
        employeeIds: filterEmployeeIds.length > 0 ? filterEmployeeIds : undefined,
        fromDate: filterFromDate || undefined,
        toDate: filterToDate || undefined,
      })).unwrap()
      setExportModal(false)
    } catch (e) {
      toast.error(e || 'Failed to export')
    } finally {
      setExporting(false)
    }
  }

  const toggleEmployeeFilter = (id) => {
    setFilterEmployeeIds(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    )
  }

  const filteredEmployees = employees.filter(emp => {
    const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim().toLowerCase()
    return name.includes(empSearch.toLowerCase())
  })

  const columns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => row.original.employeeName || '—' },
    { id: 'leaveType', header: 'Leave Type', cell: ({ row }) => row.original.leaveTypeName || '—' },
    { accessorKey: 'availableDays', header: 'Available', cell: ({ getValue }) => <span className="font-semibold">{(getValue() ?? 0).toFixed(1)}</span> },
    { accessorKey: 'carryforwardDays', header: 'Carry Forward', cell: ({ getValue }) => (getValue() ?? 0).toFixed(1) },
    { accessorKey: 'totalLeaveDays', header: 'Total (avail+cf)', cell: ({ getValue }) => (getValue() ?? 0).toFixed(1) },
    { accessorKey: 'usedDays', header: 'Used', cell: ({ getValue }) => (getValue() ?? 0).toFixed(1) },
    { accessorKey: 'assignedDate', header: 'Assigned', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'expiredDate', header: 'Expires', cell: ({ getValue }) => getValue() || '—' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="ghost" onClick={() => openLog(row.original)}>Accrual Log</Button>
        {canManage && (
          <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        )}
        {canManage && (
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(row.original)}>Delete</Button>
        )}
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader
        title="Leave Balance"
        subtitle="Available leave days per employee and type"
        actions={
          <Button variant="secondary" onClick={openExportModal}>
            Export Excel
          </Button>
        }
      />

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by employee or leave type…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-80 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <DataTable
        columns={columns}
        data={search
          ? leaveBalance.filter(r =>
              (r.employeeName || '').toLowerCase().includes(search.toLowerCase()) ||
              (r.leaveTypeName || '').toLowerCase().includes(search.toLowerCase())
            )
          : leaveBalance
        }
        loading={loading}
      />

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
          <Input
            label="Available Days"
            type="number"
            min="0"
            step="0.5"
            value={editForm.availableDays}
            onChange={e => setEditForm(f => ({ ...f, availableDays: e.target.value }))}
          />
          <Input
            label="Carry Forward Days"
            type="number"
            min="0"
            step="0.5"
            value={editForm.carryforwardDays}
            onChange={e => setEditForm(f => ({ ...f, carryforwardDays: e.target.value }))}
          />
          <Input
            label="Total Leave Days"
            type="number"
            min="0"
            step="0.5"
            value={editForm.totalLeaveDays}
            onChange={e => setEditForm(f => ({ ...f, totalLeaveDays: e.target.value }))}
          />
          <Input
            label="Reset Date"
            type="date"
            value={editForm.resetDate}
            onChange={e => setEditForm(f => ({ ...f, resetDate: e.target.value }))}
          />
          <Input
            label="Expiry Date (carry forward)"
            type="date"
            value={editForm.expiredDate}
            onChange={e => setEditForm(f => ({ ...f, expiredDate: e.target.value }))}
          />
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
                : <span className="text-xs text-gray-400">All employees (none selected)</span>
              }
            </div>
            <input
              type="text"
              placeholder="Search employees…"
              value={empSearch}
              onChange={e => setEmpSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="border border-gray-200 rounded-lg bg-gray-50 max-h-48 overflow-y-auto divide-y divide-gray-100">
              {filteredEmployees.length === 0 && (
                <p className="text-sm text-gray-400 italic px-3 py-3">No employees found</p>
              )}
              {filteredEmployees.map(emp => {
                const id = emp.id
                const name = `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.email
                const checked = filterEmployeeIds.includes(id)
                return (
                  <label key={id} className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-white transition-colors ${checked ? 'bg-blue-50' : ''}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleEmployeeFilter(id)}
                      className="rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm text-gray-800">{name}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Assigned From</label>
              <input
                type="date"
                value={filterFromDate}
                onChange={e => setFilterFromDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Assigned To</label>
              <input
                type="date"
                value={filterToDate}
                onChange={e => setFilterToDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
