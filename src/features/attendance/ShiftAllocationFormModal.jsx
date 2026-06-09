import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { createShiftAllocation, updateShiftAllocation } from './shiftAllocationsSlice'
import { fetchShiftSchedules, selectShiftSchedules } from '../base/baseExtrasSlice'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'

export default function ShiftAllocationFormModal({ open, allocation, companyId, onClose }) {
  const dispatch = useDispatch()
  const employees = useSelector(s => s.employees.data)
  const shiftSchedules = useSelector(selectShiftSchedules)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm()

  useEffect(() => {
    dispatch(fetchShiftSchedules())
  }, [dispatch])

  useEffect(() => {
    if (allocation) {
      reset({
        employeeId:     allocation.employee?.id     || '',
        shiftId:        allocation.allocatedShift?.id || '',
        previousShiftId: allocation.previousShift?.id || '',
        effectiveDate:  allocation.effectiveDate    || '',
        description:    allocation.description      || '',
      })
    } else {
      reset()
    }
  }, [allocation, reset])

  const onSubmit = async (data) => {
    const payload = {
      employee:       { id: Number(data.employeeId) },
      allocatedShift: { id: Number(data.shiftId) },
      previousShift:  data.previousShiftId ? { id: Number(data.previousShiftId) } : null,
      effectiveDate:  data.effectiveDate || null,
      description:    data.description  || null,
      company:        companyId ? { id: companyId } : undefined,
    }
    const res = allocation
      ? await dispatch(updateShiftAllocation({ id: allocation.id, data: payload }))
      : await dispatch(createShiftAllocation(payload))

    if (res.error) { toast.error(res.payload); return }
    toast.success(allocation ? 'Allocation updated' : 'Allocation created')
    onClose()
  }

  const empLabel = (e) => `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.employeeCode || `#${e.id}`

  return (
    <Modal open={open} title={allocation ? 'Edit Shift Allocation' : 'New Shift Allocation'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Employee */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
          <select
            {...register('employeeId', { required: 'Employee is required' })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select employee…</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{empLabel(e)}</option>
            ))}
          </select>
          {errors.employeeId && <p className="text-xs text-red-500 mt-1">{errors.employeeId.message}</p>}
        </div>

        {/* Allocated Shift */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Allocate Shift *</label>
          <select
            {...register('shiftId', { required: 'Shift is required' })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select shift…</option>
            {shiftSchedules.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          {errors.shiftId && <p className="text-xs text-red-500 mt-1">{errors.shiftId.message}</p>}
        </div>

        {/* Previous Shift (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Previous Shift <span className="text-gray-400 font-normal">(optional)</span></label>
          <select
            {...register('previousShiftId')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">None</option>
            {shiftSchedules.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Effective Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date *</label>
          <input
            type="date"
            {...register('effectiveDate', { required: 'Effective date is required' })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.effectiveDate && <p className="text-xs text-red-500 mt-1">{errors.effectiveDate.message}</p>}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            {...register('description')}
            rows={2}
            placeholder="Reason for allocation…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : allocation ? 'Save Changes' : 'Create'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
