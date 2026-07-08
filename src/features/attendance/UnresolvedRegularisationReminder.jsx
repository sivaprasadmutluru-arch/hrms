import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchUnresolvedRegularisations, submitRequest,
  selectUnresolved, selectRegLoading,
} from './regularisationSlice'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'
import { formatDate } from '../../utils/formatters'

const SESSION_DISMISS_KEY = 'regReminderDismissedAt'

const REQUEST_TYPES = [
  { value: 'LATE_ARRIVAL',             label: 'Late Arrival' },
  { value: 'MISSING_PUNCH',            label: 'Missing Punch' },
  { value: 'WORKING_HOURS_CORRECTION', label: 'Working Hours Correction' },
  { value: 'OVERTIME_REQUEST',         label: 'Overtime Request' },
  { value: 'WRONG_STATUS',             label: 'Wrong Status' },
  { value: 'HALF_TO_FULL_DAY',         label: 'Half Day → Full Day' },
  { value: 'WORK_FROM_HOME',           label: 'Work From Home' },
  { value: 'OFFICIAL_DUTY',            label: 'Official Duty' },
]

export default function UnresolvedRegularisationReminder() {
  const dispatch = useDispatch()
  const unresolved = useSelector(selectUnresolved)
  const loading = useSelector(selectRegLoading)
  const [dismissed, setDismissed] = useState(() => !!sessionStorage.getItem(SESSION_DISMISS_KEY))
  const [selected, setSelected] = useState(null)
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm()
  const selectedType = watch('requestType')

  useEffect(() => {
    if (!dismissed) dispatch(fetchUnresolvedRegularisations())
  }, [dispatch, dismissed])

  if (dismissed || unresolved.length === 0) return null

  const remindLater = () => {
    sessionStorage.setItem(SESSION_DISMISS_KEY, String(Date.now()))
    setDismissed(true)
  }

  const onSubmit = async (data) => {
    try {
      await dispatch(submitRequest({ ...data, attendanceId: selected.attendanceId })).unwrap()
      toast.success('Regularisation request submitted')
      setSelected(null)
      reset()
    } catch (e) { toast.error(typeof e === 'string' ? e : 'Failed to submit') }
  }

  const showTimings = ['MISSING_PUNCH', 'WORKING_HOURS_CORRECTION'].includes(selectedType)
  const showOT = selectedType === 'OVERTIME_REQUEST'

  return (
    <Modal
      open
      onClose={remindLater}
      title={selected ? 'Submit Regularisation Reason' : 'Attendance Needs Your Attention'}
      footer={
        selected ? (
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setSelected(null); reset() }}>Back</Button>
            <Button onClick={handleSubmit(onSubmit)} loading={loading}>Submit</Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button variant="secondary" onClick={remindLater}>Remind me later</Button>
          </div>
        )
      }
    >
      {!selected && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            The following attendance {unresolved.length === 1 ? 'day was' : 'days were'} marked irregular
            (late arrival, early checkout, or short hours). Please submit a reason for each.
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {unresolved.map(u => (
              <div key={u.attendanceId} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="text-sm">
                  <span className="font-medium text-gray-800">{formatDate(u.attendanceDate)}</span>
                  <span className="text-gray-500 ml-2">
                    Check in: {u.checkIn || '—'} / Check out: {u.checkOut || '—'}
                  </span>
                </div>
                <Button size="sm" variant="warning" onClick={() => setSelected(u)}>Submit Now</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selected && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 text-sm text-yellow-800">
            <span className="font-medium">{formatDate(selected.attendanceDate)}</span>
            {' — '}Check in: {selected.checkIn || '—'} / Check out: {selected.checkOut || '—'}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
            <select
              {...register('requestType', { required: 'Select a request type' })}
              className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${errors.requestType ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Select type</option>
              {REQUEST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {errors.requestType && <span className="text-red-500 text-xs mt-1 block">{errors.requestType.message}</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              {...register('reason', { required: 'Reason is required' })}
              rows={3}
              className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${errors.reason ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Explain the reason for this request..."
            />
            {errors.reason && <span className="text-red-500 text-xs mt-1 block">{errors.reason.message}</span>}
          </div>
          {showTimings && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requested Check In</label>
                <input type="time" {...register('requestedCheckIn')}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requested Check Out</label>
                <input type="time" {...register('requestedCheckOut')}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>
          )}
          {showOT && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requested Overtime Hours</label>
              <input type="number" step="0.5" min="0" {...register('requestedOvertimeHours', { min: 0 })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. 2.5" />
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
