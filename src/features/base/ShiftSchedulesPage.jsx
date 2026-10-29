import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchShiftSchedules, createShiftSchedule, updateShiftSchedule, deleteShiftSchedule, selectShiftSchedules } from './baseExtrasSlice'
import Button from '../../components/common/Button'
import SetupDirectory from '../../components/common/SetupDirectory'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'
import { Clock3, CalendarDays } from 'lucide-react'

const DAYS = [
  { value: 'MONDAY', label: 'Mon' },
  { value: 'TUESDAY', label: 'Tue' },
  { value: 'WEDNESDAY', label: 'Wed' },
  { value: 'THURSDAY', label: 'Thu' },
  { value: 'FRIDAY', label: 'Fri' },
  { value: 'SATURDAY', label: 'Sat' },
  { value: 'SUNDAY', label: 'Sun' },
]

function formatWeekOff(weeklyOffDays) {
  if (!weeklyOffDays) return '—'
  const values = weeklyOffDays.split(',').filter(Boolean)
  if (values.length === 0) return '—'
  return values.map(v => DAYS.find(d => d.value === v)?.label || v).join(', ')
}

export default function ShiftSchedulesPage() {
  const dispatch = useDispatch()
  const { effectiveCompanyId } = useAuth()
  const shifts = useSelector(selectShiftSchedules)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [weekOff, setWeekOff] = useState([])
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchShiftSchedules()) }, [dispatch])

  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (row) => { setEditing(row); setModalOpen(true) }

  useEffect(() => {
    if (!modalOpen) return
    reset(editing ? {
      name: editing.name,
      startTime: editing.startTime,
      endTime: editing.endTime,
      minimumWorkingHour: editing.minimumWorkingHour,
      overtimeCutoff: editing.overtimeCutoff || '',
      minimumOvertimeToApprove: editing.minimumOvertimeToApprove || '',
    } : {})
    setWeekOff(editing?.weeklyOffDays ? editing.weeklyOffDays.split(',').filter(Boolean) : [])
  }, [modalOpen, editing])

  const toggleWeekOffDay = (day) => {
    setWeekOff(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day])
  }

  const onSubmit = async (data) => {
    const payload = {
      name: data.name,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      minimumWorkingHour: data.minimumWorkingHour ? Number(data.minimumWorkingHour) : null,
      overtimeCutoff: data.overtimeCutoff || null,
      minimumOvertimeToApprove: data.minimumOvertimeToApprove || null,
      weeklyOffDays: weekOff.length ? weekOff.join(',') : null,
      // The header company switcher is the source of truth. A platform admin's
      // profile company can differ from the company they are currently managing.
      company: effectiveCompanyId ? { id: effectiveCompanyId } : undefined,
    }
    try {
      if (editing) {
        await dispatch(updateShiftSchedule({ id: editing.id, data: payload })).unwrap()
        toast.success('Shift updated')
      } else {
        await dispatch(createShiftSchedule(payload)).unwrap()
        toast.success('Shift created')
      }
      setModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDelete = async () => {
    try {
      await dispatch(deleteShiftSchedule(deleteTarget.id)).unwrap()
      toast.success('Shift deleted')
      setDeleteTarget(null)
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'name', header: 'Shift', cell: ({ row }) => <span className="setup-name-cell"><i><Clock3 size={16} /></i><b>{row.original.name}</b></span> },
    { accessorKey: 'startTime', header: 'Start Time', cell: ({ getValue }) => <span className="setup-time-cell">{getValue() || '—'}</span> },
    { accessorKey: 'endTime', header: 'End Time', cell: ({ getValue }) => <span className="setup-time-cell">{getValue() || '—'}</span> },
    { accessorKey: 'minimumWorkingHour', header: 'Min Hours', cell: ({ getValue }) => <span className="setup-hours-cell">{getValue() != null ? `${getValue()}h` : '—'}</span> },
    { accessorKey: 'minimumOvertimeToApprove', header: 'Min OT', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'overtimeCutoff', header: 'OT Cutoff', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'weeklyOffDays', header: 'Week Off', cell: ({ getValue }) => <span className="setup-related-cell"><CalendarDays size={15} />{formatWeekOff(getValue())}</span> },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <div className="flex gap-2 setup-table-actions">
          <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(row.original)}>Delete</Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <SetupDirectory title="Shift schedules" subtitle="Set working hours, overtime rules and weekly rest days for your teams." icon={<Clock3 size={22} />} itemLabel="shift" data={shifts} columns={columns} searchText={item => `${item.name || ''} ${item.startTime || ''} ${item.endTime || ''} ${formatWeekOff(item.weeklyOffDays)}`} action={<Button className="setup-primary-button" onClick={openCreate}>+ New shift</Button>} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="lg" panelClassName="setup-form-modal" title={editing ? 'Edit shift schedule' : 'New shift schedule'}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button></div>}>
        <div className="space-y-4">
          <Input label="Shift Name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start Time" type="time" {...register('startTime')} />
            <Input label="End Time" type="time" {...register('endTime')} />
          </div>
          <Input label="Minimum Working Hours" type="number" {...register('minimumWorkingHour')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Min OT to Approve (HH:MM)" placeholder="00:30" {...register('minimumOvertimeToApprove')} />
            <Input label="OT Cutoff (HH:MM)" placeholder="02:00" {...register('overtimeCutoff')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Working Week</label>
            <div className="shift-weekdays flex gap-2">
              {DAYS.map(d => {
                const isOff = weekOff.includes(d.value)
                return (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleWeekOffDay(d.value)}
                    className={`w-11 h-9 rounded-lg text-xs font-medium border transition-colors ${
                      isOff
                        ? 'bg-gray-100 text-gray-400 border-gray-200'
                        : 'bg-indigo-600 text-white border-indigo-600'
                    }`}
                    title={isOff ? `${d.label}: Week Off` : `${d.label}: Working Day`}
                  >
                    {d.label}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1">Highlighted days are working days. Click a day to mark it as week off.</p>
          </div>
        </div>
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Shift" message={`Delete shift "${deleteTarget?.name}"?`} confirmLabel="Delete" />
    </>
  )
}
