import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchHolidays, createHoliday, updateHoliday, deleteHoliday } from './leaveSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'

export default function HolidaysPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const companyId = user?.companyId
  const holidays = useSelector(s => s.leave.holidays)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    if (companyId) dispatch(fetchHolidays({ companyId }))
  }, [dispatch, companyId])

  const openCreate = () => { setEditing(null); reset({}); setModal(true) }
  const openEdit = (h) => { setEditing(h); reset({ name: h.name, startDate: h.startDate, endDate: h.endDate, recurring: h.recurring }); setModal(true) }

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await dispatch(updateHoliday({ id: editing.id, data })).unwrap()
        toast.success('Holiday updated')
      } else {
        await dispatch(createHoliday({ data, companyId })).unwrap()
        toast.success('Holiday created')
      }
      setModal(false)
      dispatch(fetchHolidays({ companyId }))
    } catch (e) { toast.error(e || 'Failed') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this holiday?')) return
    try { await dispatch(deleteHoliday(id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'startDate', header: 'Start Date' },
    { key: 'endDate', header: 'End Date' },
    { key: 'recurring', header: 'Recurring', render: r => r.recurring ? 'Yes' : 'No' },
    {
      key: 'actions', header: 'Actions',
      render: r => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(r.id)}>Delete</Button>
        </div>
      )
    }
  ]

  return (
    <div>
      <PageHeader title="Holidays" subtitle="Manage company holidays">
        <Button onClick={openCreate}>Add Holiday</Button>
      </PageHeader>
      <DataTable columns={columns} data={holidays} />
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Holiday' : 'New Holiday'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name" {...register('name', { required: 'Required' })} error={errors.name?.message} />
          <Input label="Start Date" type="date" {...register('startDate')} />
          <Input label="End Date" type="date" {...register('endDate')} />
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('recurring')} /> Recurring
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
