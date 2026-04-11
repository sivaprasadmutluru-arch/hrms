import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { createRotatingShiftAssign, updateRotatingShiftAssign, createRotatingWorkTypeAssign, updateRotatingWorkTypeAssign } from './rotatingAssignsSlice'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'

export default function RotatingAssignFormModal({ assign, type, companyId, onClose }) {
  const dispatch = useDispatch()
  const employees = useSelector(s => s.employees.data)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    if (assign) {
      reset({
        employeeId: assign.employee?.id || '',
        templateId: (type === 'shift' ? assign.rotatingShift?.id : assign.rotatingWorkType?.id) || '',
        startDate: assign.startDate || '',
        shiftOrWorkTypeId: (type === 'shift' ? assign.shift?.id : assign.workType?.id) || '',
      })
    }
  }, [assign, type, reset])

  const onSubmit = async (data) => {
    const payload = {
      employee: { id: data.employeeId },
      startDate: data.startDate,
      company: companyId ? { id: companyId } : undefined,
    }
    if (type === 'shift') {
      payload.rotatingShift = { id: data.templateId }
      if (data.shiftOrWorkTypeId) payload.shift = { id: data.shiftOrWorkTypeId }
    } else {
      payload.rotatingWorkType = { id: data.templateId }
      if (data.shiftOrWorkTypeId) payload.workType = { id: data.shiftOrWorkTypeId }
    }

    const thunk = assign
      ? (type === 'shift' ? updateRotatingShiftAssign({ id: assign.id, data: payload }) : updateRotatingWorkTypeAssign({ id: assign.id, data: payload }))
      : (type === 'shift' ? createRotatingShiftAssign(payload) : createRotatingWorkTypeAssign(payload))

    const res = await dispatch(thunk)
    if (res.error) { toast.error(res.payload); return }
    toast.success(assign ? 'Assignment updated' : 'Assignment created')
    onClose()
  }

  const typeLabel = type === 'shift' ? 'Shift' : 'Work Type'

  return (
    <Modal title={`${assign ? 'Edit' : 'New'} Rotating ${typeLabel} Assignment`} onClose={onClose}>
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
          <label className="block text-sm font-medium text-gray-700 mb-1">Rotating {typeLabel} Template ID *</label>
          <input
            {...register('templateId', { required: 'Required' })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={`Enter rotating ${typeLabel.toLowerCase()} ID`}
          />
          {errors.templateId && <p className="text-xs text-red-500 mt-1">{errors.templateId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
          <input
            type="date"
            {...register('startDate', { required: 'Required' })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Direct {typeLabel} Override (optional)</label>
          <input
            {...register('shiftOrWorkTypeId')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={`Enter ${typeLabel.toLowerCase()} ID`}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">{assign ? 'Save Changes' : 'Create'}</Button>
        </div>
      </form>
    </Modal>
  )
}
