import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchCompanyLeaves, createCompanyLeave, updateCompanyLeave, deleteCompanyLeave } from './leaveSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'

export default function CompanyLeavesPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const companyId = user?.companyId
  const companyLeaves = useSelector(s => s.leave.companyLeaves)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    if (companyId) dispatch(fetchCompanyLeaves({ companyId }))
  }, [dispatch, companyId])

  const openCreate = () => {
    setEditing(null)
    reset({ name: '', basedOnWeekDay: false, weekDay: '', startDate: '', endDate: '' })
    setModal(true)
  }

  const openEdit = (l) => {
    setEditing(l)
    reset({
      name: l.name,
      basedOnWeekDay: l.basedOnWeekDay,
      weekDay: l.weekDay,
      startDate: l.startDate,
      endDate: l.endDate,
    })
    setModal(true)
  }

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      weekDay: data.weekDay !== '' ? Number(data.weekDay) : undefined,
    }
    try {
      if (editing) {
        await dispatch(updateCompanyLeave({ id: editing.id, data: payload })).unwrap()
        toast.success('Company leave updated')
      } else {
        await dispatch(createCompanyLeave({ data: payload, companyId })).unwrap()
        toast.success('Company leave created')
      }
      setModal(false)
      dispatch(fetchCompanyLeaves({ companyId }))
    } catch (e) { toast.error(e || 'Failed') }
  }

  const handleDelete = (id) => setConfirmModal({ open: true, id })

  const onConfirmDelete = async () => {
    try { await dispatch(deleteCompanyLeave(confirmModal.id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
    finally { setConfirmModal({ open: false, id: null }) }
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'basedOnWeekDay', header: 'Based on Weekday', render: r => r.basedOnWeekDay ? 'Yes' : 'No' },
    { key: 'weekDay', header: 'Week Day' },
    { key: 'startDate', header: 'Start Date' },
    { key: 'endDate', header: 'End Date' },
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
      <PageHeader title="Company Leaves" subtitle="Manage company-wide leave days">
        <Button onClick={openCreate}>Add Company Leave</Button>
      </PageHeader>
      <DataTable columns={columns} data={companyLeaves} />
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Company Leave' : 'New Company Leave'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name" {...register('name', { required: 'Required' })} error={errors.name?.message} />
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('basedOnWeekDay')} /> Based on Weekday
          </label>
          <Input
            label="Week Day (1-7)"
            type="number"
            min={1}
            max={7}
            {...register('weekDay', { min: { value: 1, message: 'Min 1' }, max: { value: 7, message: 'Max 7' } })}
            error={errors.weekDay?.message}
          />
          <Input label="Start Date" type="date" {...register('startDate')} />
          <Input label="End Date" type="date" {...register('endDate')} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmDelete}
        title="Delete Company Leave"
        message="Are you sure you want to delete this company leave? This cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  )
}
