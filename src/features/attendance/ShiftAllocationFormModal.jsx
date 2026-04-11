import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { createShiftAllocation, updateShiftAllocation } from './shiftAllocationsSlice'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'

export default function ShiftAllocationFormModal({ allocation, companyId, onClose }) {
  const dispatch = useDispatch()
  const employees = useSelector(s => s.employees.data)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    if (allocation) {
      reset({
        employeeId: allocation.employee?.id || '',
        shiftId: allocation.allocatedShift?.id || '',
        previousShiftId: allocation.previousShift?.id || '',
        effectiveDate: allocation.effectiveDate || '',
        description: allocation.description || '',
      })
    }
  }, [allocation, reset])

  const onSubmit = async (data) => {
    const payload = {
      employee: { id: data.employeeId },
      allocatedShift: { id: data.shiftId },
      previousShift: data.previousShiftId ? { id: data.previousShiftId } : null,
      effectiveDate: data.effectiveDate,
      description: data.description,
      company: companyId ? { id: companyId } : undefined,
    }
    const res = allocation
      ? await dispatch(updateShiftAllocation({ id: allocation.id, data: payload }))
      : await dispatch(createShiftAllocation(payload))

    if (res.error) { toast.error(res.payload); return }
    toast.success(allocation ? 'Allocation updated' : 'Allocation created')
    onClose()
  }

  return (
    <Modal title={allocation ? 'Edit Shift Allocation' : 'New Shift Allocation'} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
          <select
            {...register('employeeId', { required: 'Required' })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select employee...</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name || e.username}</option>)}
          </select>
          {errors.employeeId && <p className="text-xs text-red-500 mt-1">{errors.employeeId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Allocated Shift ID *</label>
          <input
            {...register('shiftId', { required: 'Required' })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter shift ID"
          />
          {errors.shiftId && <p className="text-xs text-red-500 mt-1">{errors.shiftId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Previous Shift ID (optional)</label>
          <input
            {...register('previousShiftId')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter previous shift ID"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date *</label>
          <input
            type="date"
            {...register('effectiveDate', { required: 'Required' })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.effectiveDate && <p className="text-xs text-red-500 mt-1">{errors.effectiveDate.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            {...register('description')}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">{allocation ? 'Save Changes' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  )
}
