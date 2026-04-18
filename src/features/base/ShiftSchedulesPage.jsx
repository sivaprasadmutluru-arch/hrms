import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchShiftSchedules, createShiftSchedule, updateShiftSchedule, deleteShiftSchedule, selectShiftSchedules } from './baseExtrasSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'

export default function ShiftSchedulesPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const shifts = useSelector(selectShiftSchedules)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
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
  }, [modalOpen, editing])

  const onSubmit = async (data) => {
    const payload = {
      name: data.name,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      minimumWorkingHour: data.minimumWorkingHour ? Number(data.minimumWorkingHour) : null,
      overtimeCutoff: data.overtimeCutoff || null,
      minimumOvertimeToApprove: data.minimumOvertimeToApprove || null,
      company: user?.companyId ? { id: user.companyId } : undefined,
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
    { accessorKey: 'name', header: 'Shift Name' },
    { accessorKey: 'startTime', header: 'Start Time', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'endTime', header: 'End Time', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'minimumWorkingHour', header: 'Min Hours', cell: ({ getValue }) => getValue() != null ? `${getValue()}h` : '—' },
    { accessorKey: 'minimumOvertimeToApprove', header: 'Min OT', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'overtimeCutoff', header: 'OT Cutoff', cell: ({ getValue }) => getValue() || '—' },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(row.original)}>Delete</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Shift Schedules" subtitle="Manage work shift schedules" actions={<Button onClick={openCreate}>+ New Shift</Button>} />
      <DataTable columns={columns} data={shifts} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Shift' : 'New Shift'}
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
        </div>
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Shift" message={`Delete shift "${deleteTarget?.name}"?`} confirmLabel="Delete" />
    </div>
  )
}
