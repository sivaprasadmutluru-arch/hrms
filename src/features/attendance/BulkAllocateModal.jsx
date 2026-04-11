import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { bulkAllocateShifts } from './shiftAllocationsSlice'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'

export default function BulkAllocateModal({ companyId, onClose }) {
  const dispatch = useDispatch()
  const employees = useSelector(s => s.employees.data)
  const [selectedIds, setSelectedIds] = useState([])
  const { register, handleSubmit, formState: { errors } } = useForm()

  const toggle = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const onSubmit = async (data) => {
    if (!selectedIds.length) { toast.error('Select at least one employee'); return }
    const res = await dispatch(bulkAllocateShifts({
      employeeIds: selectedIds,
      shiftId: data.shiftId,
      companyId,
      effectiveDate: data.effectiveDate,
    }))
    if (res.error) { toast.error(res.payload); return }
    toast.success('Shifts allocated successfully')
    onClose()
  }

  return (
    <Modal title="Bulk Shift Allocation" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shift ID *</label>
          <input
            {...register('shiftId', { required: 'Required' })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter shift ID"
          />
          {errors.shiftId && <p className="text-xs text-red-500 mt-1">{errors.shiftId.message}</p>}
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Employees ({selectedIds.length} selected)
          </label>
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {employees.map(e => (
              <label key={e.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(e.id)}
                  onChange={() => toggle(e.id)}
                  className="rounded border-gray-300 text-indigo-600"
                />
                <span className="text-sm text-gray-700">{e.name || e.username}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Allocate Shifts</Button>
        </div>
      </form>
    </Modal>
  )
}
