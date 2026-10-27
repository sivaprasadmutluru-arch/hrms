import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  fetchHolidays,
  fetchHolidayAllocations,
  createHolidayAllocation,
  deleteHolidayAllocation,
} from './leaveSlice'
import { fetchAll as fetchEmployees } from '../employees/employeesSlice'
import { fetchAll as fetchDepartments } from '../departments/departmentsSlice'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'

export default function HolidayAllocationPage() {
  const dispatch = useDispatch()
  const { user, effectiveCompanyId } = useAuth()
  const companyId = effectiveCompanyId

  const holidays = useSelector(s => s.leave.holidays)
  const allocations = useSelector(s => s.leave.holidayAllocations)
  const employees = useSelector(s => s.employees.data || s.employees.content || [])
  const departments = useSelector(s => s.departments.data || s.departments.content || [])

  const [searchParams] = useSearchParams()
  const [modal, setModal] = useState(false)
  const [allocType, setAllocType] = useState('employee') // 'employee' | 'department'
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const [editModal, setEditModal] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({})

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    if (!companyId) return
    dispatch(fetchHolidays({ companyId }))
    dispatch(fetchHolidayAllocations({ companyId }))
    dispatch(fetchEmployees({ companyId, size: 500 }))
    dispatch(fetchDepartments({ companyId }))
  }, [dispatch, companyId])

  // Auto-open modal pre-filled when arriving via ?holidayId= from HolidaysPage
  useEffect(() => {
    const holidayId = searchParams.get('holidayId')
    if (holidayId && holidays.length > 0) {
      reset({ holidayId })
      setAllocType('employee')
      setModal(true)
    }
  }, [searchParams, holidays])

  const openCreate = () => {
    reset({})
    setAllocType('employee')
    setSelectedEmployeeIds([])
    setEmployeeSearch('')
    setModal(true)
  }

  const openEdit = (row) => {
    setEditTarget(row)
    setEditForm({ holidayId: row.holidayId || '' })
    setEditModal(true)
  }

  const handleEditSave = async () => {
    try {
      await api.put(`/leave/holiday-allocations/${editTarget.id}`, editForm)
      toast.success('Allocation updated')
      setEditModal(false)
      setEditTarget(null)
      dispatch(fetchHolidayAllocations({ companyId }))
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to update allocation')
    }
  }

  const onSubmit = async (data) => {
    const payload = { holidayId: data.holidayId }
    if (allocType === 'department') {
      payload.departmentId = data.departmentId
    } else {
      payload.employeeIds = selectedEmployeeIds.map(Number)
      if (!payload.employeeIds.length) {
        toast.error('Select at least one employee')
        return
      }
    }
    try {
      const res = await dispatch(createHolidayAllocation({ data: payload, companyId })).unwrap()
      toast.success(`Allocated: ${res.created} new, ${res.skipped} already existed`)
      setModal(false)
      dispatch(fetchHolidayAllocations({ companyId }))
    } catch (e) {
      toast.error(e || 'Failed to allocate')
    }
  }

  const handleDelete = (id) => setConfirmModal({ open: true, id })
  const onConfirmDelete = async () => {
    try {
      await dispatch(deleteHolidayAllocation(confirmModal.id)).unwrap()
      toast.success('Allocation removed')
    } catch (e) {
      toast.error(e || 'Failed')
    } finally {
      setConfirmModal({ open: false, id: null })
    }
  }

  const columns = [
    { accessorKey: 'holidayName', header: 'Holiday' },
    { accessorKey: 'startDate', header: 'Start Date' },
    { accessorKey: 'endDate', header: 'End Date' },
    {
      id: 'allocatedTo', header: 'Allocated To',
      cell: ({ row }) => {
        const r = row.original
        return (
          <span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full mr-2 ${r.type === 'department' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
              {r.type === 'department' ? 'Dept' : 'Employee'}
            </span>
            {r.targetName}
          </span>
        )
      },
    },
    {
      id: 'actions', header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Remove</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Holiday Allocations" subtitle="Assign holidays to specific employees or departments"
        actions={<Button onClick={openCreate}>Add Allocation</Button>}
      />

      <DataTable columns={columns} data={allocations} />

      <Modal open={modal} onClose={() => setModal(false)} title="New Holiday Allocation" size="lg" panelClassName="allocation-form-modal"
        footer={<div className="allocation-modal-actions"><Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button><Button type="submit" form="holiday-allocation-form">Allocate</Button></div>}>
        <form id="holiday-allocation-form" onSubmit={handleSubmit(onSubmit)} className="allocation-form-layout">
          {/* Holiday select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Holiday</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              {...register('holidayId', { required: 'Required' })}
            >
              <option value="">Select holiday</option>
              {holidays.map(h => (
                <option key={h.id} value={h.id}>{h.name} ({h.startDate})</option>
              ))}
            </select>
            {errors.holidayId && <p className="text-red-500 text-xs mt-1">{errors.holidayId.message}</p>}
          </div>

          {/* Allocation type toggle */}
          <div className="allocation-type-toggle flex gap-3">
            <button
              type="button"
              onClick={() => setAllocType('employee')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${allocType === 'employee' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
            >
              By Employee
            </button>
            <button
              type="button"
              onClick={() => setAllocType('department')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${allocType === 'department' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
            >
              By Department
            </button>
          </div>

          {/* Employee multi-select */}
          {allocType === 'employee' && (
            <div className="allocation-employee-picker">
              <div className="allocation-picker-heading"><label>Employees</label><span>{selectedEmployeeIds.length} selected</span></div>
              <label className="allocation-search"><span aria-hidden="true">⌕</span><input value={employeeSearch} onChange={e => setEmployeeSearch(e.target.value)} placeholder="Search employees" aria-label="Search employees" /></label>
              <div className="allocation-employee-list">
                {employees.filter(e => `${e.firstName || ''} ${e.lastName || ''} ${e.badgeId || ''} ${e.departmentName || ''}`.toLowerCase().includes(employeeSearch.toLowerCase())).length === 0 ? <p className="allocation-empty-employees">{employees.length ? 'No matching employees.' : 'No employees are available.'}</p> : employees.filter(e => `${e.firstName || ''} ${e.lastName || ''} ${e.badgeId || ''} ${e.departmentName || ''}`.toLowerCase().includes(employeeSearch.toLowerCase())).map(e => (
                  <label key={e.id} className="allocation-employee-option"><input type="checkbox" checked={selectedEmployeeIds.includes(e.id)} onChange={() => setSelectedEmployeeIds(ids => ids.includes(e.id) ? ids.filter(id => id !== e.id) : [...ids, e.id])} /><span className="allocation-employee-avatar">{(e.firstName || 'E').charAt(0).toUpperCase()}</span><span className="allocation-employee-name">{e.firstName} {e.lastName || ''}</span>{e.departmentName && <small>{e.departmentName}</small>}</label>
                ))}
              </div>
            </div>
          )}

          {/* Department select */}
          {allocType === 'department' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                {...register('departmentId', { required: allocType === 'department' ? 'Required' : false })}
              >
                <option value="">Select department</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              {errors.departmentId && <p className="text-red-500 text-xs mt-1">{errors.departmentId.message}</p>}
            </div>
          )}

        </form>
      </Modal>

      <Modal
        open={editModal}
        onClose={() => { setEditModal(false); setEditTarget(null) }}
        title="Edit Holiday Allocation"
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => { setEditModal(false); setEditTarget(null) }}>Cancel</Button>
            <Button onClick={handleEditSave}>Save</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Holiday</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
              value={editForm.holidayId || ''}
              onChange={e => setEditForm(f => ({ ...f, holidayId: e.target.value }))}
            >
              <option value="">Select holiday</option>
              {holidays.map(h => (
                <option key={h.id} value={h.id}>{h.name} ({h.startDate})</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmDelete}
        title="Remove Allocation"
        message="Remove this holiday allocation? The employee/department will no longer have this holiday excluded from leave calculations."
        confirmLabel="Remove"
      />
    </div>
  )
}
