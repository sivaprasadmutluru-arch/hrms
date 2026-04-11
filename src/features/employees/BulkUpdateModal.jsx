import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { bulkUpdateEmployees } from './employeesSlice'
import { fetchAll as fetchDepartments } from '../departments/departmentsSlice'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'

export default function BulkUpdateModal({ employeeIds, onClose, onSuccess }) {
  const dispatch = useDispatch()
  const departments = useSelector(s => s.departments?.data || [])
  const { register, handleSubmit } = useForm()

  useEffect(() => {
    dispatch(fetchDepartments())
  }, [dispatch])

  const onSubmit = async (data) => {
    // Only include fields that are filled
    const payload = { employeeIds }
    if (data.department) payload.department = data.department
    if (data.shift) payload.shift = data.shift
    if (data.workType) payload.workType = data.workType
    if (data.jobPosition) payload.jobPosition = data.jobPosition

    const res = await dispatch(bulkUpdateEmployees(payload))
    if (res.error) { toast.error(res.payload); return }
    toast.success(`Updated ${employeeIds.length} employees`)
    onSuccess?.()
    onClose()
  }

  return (
    <Modal title={`Bulk Update (${employeeIds.length} employees)`} onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm text-gray-500">Leave fields blank to keep existing values.</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
          <select
            {...register('department')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">— No change —</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shift</label>
          <input
            {...register('shift')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Shift ID (leave blank for no change)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
          <input
            {...register('workType')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Work Type ID (leave blank for no change)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Position</label>
          <input
            {...register('jobPosition')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Job Position ID (leave blank for no change)"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Update Employees</Button>
        </div>
      </form>
    </Modal>
  )
}
