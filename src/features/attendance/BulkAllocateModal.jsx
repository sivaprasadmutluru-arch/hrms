import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { bulkAllocateShifts } from './shiftAllocationsSlice'
import { fetchShiftSchedules, selectShiftSchedules } from '../base/baseExtrasSlice'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'

export default function BulkAllocateModal({ open, companyId, onClose }) {
  const dispatch = useDispatch()
  const employees = useSelector(s => s.employees.data)
  const shiftSchedules = useSelector(selectShiftSchedules)
  const [selectedIds, setSelectedIds] = useState([])
  const [search, setSearch] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm()

  useEffect(() => {
    dispatch(fetchShiftSchedules())
  }, [dispatch])

  const toggle = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const toggleAll = () =>
    setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(e => e.id))

  const empLabel = (e) => `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.employeeCode || `#${e.id}`

  const filtered = employees.filter(e =>
    search === '' || empLabel(e).toLowerCase().includes(search.toLowerCase())
  )

  const onSubmit = async (data) => {
    if (!selectedIds.length) { toast.error('Select at least one employee'); return }
    const res = await dispatch(bulkAllocateShifts({
      employeeIds:   selectedIds,
      shiftId:       Number(data.shiftId),
      companyId,
      effectiveDate: data.effectiveDate,
    }))
    if (res.error) { toast.error(res.payload); return }
    toast.success(`Shift allocated to ${selectedIds.length} employee${selectedIds.length > 1 ? 's' : ''}`)
    onClose()
  }

  return (
    <Modal open={open} title="Bulk Shift Allocation" onClose={onClose} size="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Shift dropdown */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Shift *</label>
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

        {/* Employee list */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Employees <span className="text-indigo-600 font-semibold">({selectedIds.length} selected)</span>
            </label>
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-indigo-600 hover:underline"
            >
              {selectedIds.length === filtered.length && filtered.length > 0 ? 'Deselect all' : 'Select all'}
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employees…"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          <div className="max-h-52 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {filtered.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-4">No employees found</p>
            )}
            {filtered.map(e => (
              <label
                key={e.id}
                className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(e.id)}
                  onChange={() => toggle(e.id)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">{empLabel(e)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting || !selectedIds.length}>
            {isSubmitting ? 'Allocating…' : `Allocate to ${selectedIds.length || '—'} employee${selectedIds.length !== 1 ? 's' : ''}`}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
