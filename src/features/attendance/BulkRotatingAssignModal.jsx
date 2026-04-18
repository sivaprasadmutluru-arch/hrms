import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../../services/api'
import { bulkAssignRotatingShifts, bulkAssignRotatingWorkTypes } from './rotatingAssignsSlice'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'

function empName(e) {
  return e.fullName || `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.email || `#${e.id}`
}

export default function BulkRotatingAssignModal({ type, companyId, onClose }) {
  const dispatch = useDispatch()
  const employees = useSelector(s => s.employees.data)
  const [templates, setTemplates] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const { register, handleSubmit, formState: { errors } } = useForm()

  useEffect(() => {
    const endpoint = type === 'shift' ? '/rotating-shifts' : '/rotating-work-types'
    api.get(endpoint).then(r => setTemplates(r.data.content || r.data)).catch(() => {})
  }, [type])

  const toggle = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const toggleAll = () => {
    setSelectedIds(prev => prev.length === employees.length ? [] : employees.map(e => e.id))
  }

  const onSubmit = async (data) => {
    if (!selectedIds.length) { toast.error('Select at least one employee'); return }
    const payload = {
      employeeIds: selectedIds,
      startDate: data.startDate,
      basedOn: data.basedOn || undefined,
      rotateEvery: data.rotateEvery || undefined,
    }
    if (type === 'shift') {
      payload.rotatingShiftId = Number(data.templateId)
      if (data.shiftOrWorkTypeId) payload.shiftId = Number(data.shiftOrWorkTypeId)
    } else {
      payload.rotatingWorkTypeId = Number(data.templateId)
      if (data.shiftOrWorkTypeId) payload.workTypeId = Number(data.shiftOrWorkTypeId)
    }

    const thunk = type === 'shift' ? bulkAssignRotatingShifts(payload) : bulkAssignRotatingWorkTypes(payload)
    const res = await dispatch(thunk)
    if (res.error) { toast.error(res.payload); return }
    toast.success(`${selectedIds.length} assignments created`)
    onClose()
  }

  const typeLabel = type === 'shift' ? 'Shift' : 'Work Type'

  return (
    <Modal title={`Bulk Rotating ${typeLabel} Assign`} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rotating {typeLabel} Template *</label>
          <select
            {...register('templateId', { required: 'Required' })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select template...</option>
            {templates.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Based On</label>
            <select
              {...register('basedOn')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Select —</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rotate Every</label>
            <select
              {...register('rotateEvery')}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">— Select —</option>
              <option value="monday">Monday</option>
              <option value="tuesday">Tuesday</option>
              <option value="wednesday">Wednesday</option>
              <option value="thursday">Thursday</option>
              <option value="friday">Friday</option>
              <option value="saturday">Saturday</option>
              <option value="sunday">Sunday</option>
            </select>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Select Employees ({selectedIds.length} selected)
            </label>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-indigo-600 hover:underline"
            >
              {selectedIds.length === employees.length ? 'Deselect All' : 'Select All'}
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {employees.map(e => (
              <label key={e.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(e.id)}
                  onChange={() => toggle(e.id)}
                  className="rounded border-gray-300 text-indigo-600"
                />
                <span className="text-sm text-gray-700">{empName(e)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit">Assign ({selectedIds.length})</Button>
        </div>
      </form>
    </Modal>
  )
}
