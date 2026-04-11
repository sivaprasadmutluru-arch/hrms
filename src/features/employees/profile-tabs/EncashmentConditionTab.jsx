import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchEncashmentCondition, upsertEncashmentCondition, deleteEncashmentCondition } from '../employeesSlice'
import { fetchLeaveTypes } from '../../leave/leaveSlice'
import Button from '../../../components/common/Button'
import Spinner from '../../../components/common/Spinner'

export default function EncashmentConditionTab({ employeeId, companyId }) {
  const dispatch = useDispatch()
  const encashment = useSelector(s => s.employees.encashmentCondition)
  const loading = useSelector(s => s.employees.loading)
  const leaveTypes = useSelector(s => s.leave.leaveTypes)
  const { register, handleSubmit, reset, setValue, watch } = useForm()

  useEffect(() => {
    if (employeeId) {
      dispatch(fetchEncashmentCondition({ id: employeeId, companyId }))
      dispatch(fetchLeaveTypes())
    }
  }, [dispatch, employeeId, companyId])

  useEffect(() => {
    if (encashment) {
      reset({
        maxEncashableDays: encashment.maxEncashableDays || '',
        eligibleLeaveTypes: encashment.eligibleLeaveTypes || [],
        isEligible: encashment.isEligible ?? true,
        notes: encashment.notes || '',
      })
    }
  }, [encashment, reset])

  const onSubmit = async (data) => {
    const res = await dispatch(upsertEncashmentCondition({ id: employeeId, data, companyId }))
    if (res.error) { toast.error(res.payload); return }
    toast.success('Encashment condition saved')
  }

  const handleDelete = async () => {
    const res = await dispatch(deleteEncashmentCondition({ id: employeeId, companyId }))
    if (res.error) { toast.error(res.payload); return }
    toast.success('Encashment condition removed')
    reset({ maxEncashableDays: '', eligibleLeaveTypes: [], isEligible: true, notes: '' })
  }

  if (loading && !encashment) return <div className="flex justify-center py-8"><Spinner /></div>

  const selectedTypes = watch('eligibleLeaveTypes') || []

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Leave Encashment Condition</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-lg">
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-gray-700">Is Eligible</label>
          <input type="checkbox" {...register('isEligible')} className="rounded border-gray-300 text-indigo-600 h-4 w-4" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Encashable Days</label>
          <input
            type="number"
            {...register('maxEncashableDays', { min: 0 })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="e.g. 30"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Eligible Leave Types</label>
          <div className="flex flex-wrap gap-2">
            {leaveTypes.map(lt => (
              <label key={lt.id || lt.name} className="flex items-center gap-1.5 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  value={lt.id || lt.name}
                  checked={selectedTypes.includes(lt.id || lt.name)}
                  onChange={(e) => {
                    const val = lt.id || lt.name
                    const current = selectedTypes.includes(val)
                      ? selectedTypes.filter(v => v !== val)
                      : [...selectedTypes, val]
                    setValue('eligibleLeaveTypes', current)
                  }}
                  className="rounded border-gray-300 text-indigo-600"
                />
                {lt.name || lt}
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            {...register('notes')}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Optional notes"
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit">Save</Button>
          {encashment && (
            <Button type="button" variant="danger" onClick={handleDelete}>Delete</Button>
          )}
        </div>
      </form>
    </div>
  )
}
