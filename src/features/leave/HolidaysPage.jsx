import { useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchHolidays, createHoliday, updateHoliday, deleteHoliday, exportHolidays, importHolidays } from './leaveSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'

export default function HolidaysPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const companyId = user?.companyId
  const holidays = useSelector(s => s.leave.holidays)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const importRef = useRef()

  const handleExport = () => dispatch(exportHolidays(companyId))
  const handleImport = async (file) => {
    const res = await dispatch(importHolidays({ companyId, file }))
    if (res.error) { toast.error(res.payload); return }
    const { imported = 0, errors: errs = [] } = res.payload || {}
    toast.success(`Imported ${imported} holidays${errs.length ? `, ${errs.length} errors` : ''}`)
    dispatch(fetchHolidays({ companyId }))
  }
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

  const handleDelete = (id) => setConfirmModal({ open: true, id })

  const onConfirmDelete = async () => {
    try { await dispatch(deleteHoliday(confirmModal.id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
    finally { setConfirmModal({ open: false, id: null }) }
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
        <div className="flex gap-2">
          <Button variant="secondary" onClick={handleExport}>Export</Button>
          <Button variant="secondary" onClick={() => importRef.current?.click()}>Import</Button>
          <input
            ref={importRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={e => { const f = e.target.files[0]; if (f) handleImport(f); e.target.value = '' }}
          />
          <Button onClick={openCreate}>Add Holiday</Button>
        </div>
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
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmDelete}
        title="Delete Holiday"
        message="Are you sure you want to delete this holiday? This cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  )
}
