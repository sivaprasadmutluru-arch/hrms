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
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })

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
    setModal(true)
  }

  const onSubmit = async (data) => {
    const payload = { holidayId: data.holidayId }
    if (allocType === 'department') {
      payload.departmentId = data.departmentId
    } else {
      // employeeIds is a multi-select; value comes as array or single string
      const ids = Array.isArray(data.employeeIds) ? data.employeeIds : [data.employeeIds]
      payload.employeeIds = ids.filter(Boolean).map(Number)
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
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Remove</Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Holiday Allocations" subtitle="Assign holidays to specific employees or departments"
        actions={<Button onClick={openCreate}>Add Allocation</Button>}
      />

      <DataTable columns={columns} data={allocations} />

      <Modal open={modal} onClose={() => setModal(false)} title="New Holiday Allocation">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          <div className="flex gap-3">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employees <span className="text-gray-400 font-normal">(hold Ctrl/Cmd to select multiple)</span>
              </label>
              <select
                multiple
                size={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                {...register('employeeIds')}
              >
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName || ''} {e.badgeId ? `(${e.badgeId})` : ''}
                  </option>
                ))}
              </select>
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

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit">Allocate</Button>
          </div>
        </form>
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
