import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchEmployeeNotes, createEmployeeNote, updateEmployeeNote, deleteEmployeeNote,
  selectEmployeeNotes, selectLoading,
} from './employeeExtrasSlice'
import { fetchAll as fetchEmployees, selectAll as selectEmployees } from './employeesSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import ConfirmModal from '../../components/common/ConfirmModal'
import { formatDate } from '../../utils/formatters'

export default function EmployeeNotesPage() {
  const dispatch = useDispatch()
  const notes = useSelector(selectEmployeeNotes)
  const loading = useSelector(selectLoading)
  const employees = useSelector(selectEmployees)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [selectedEmployee, setSelectedEmployee] = useState('')
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, action: null })

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    dispatch(fetchEmployees({}))
  }, [dispatch])

  useEffect(() => {
    if (selectedEmployee) dispatch(fetchEmployeeNotes(selectedEmployee))
  }, [dispatch, selectedEmployee])

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (note) => {
    setEditing(note)
    reset({ title: note.title, note: note.note })
    setModalOpen(true)
  }

  const onSubmit = async (formData) => {
    if (!selectedEmployee && !editing) {
      toast.error('Select an employee first')
      return
    }
    try {
      if (editing) {
        await dispatch(updateEmployeeNote({ noteId: editing.id, data: formData })).unwrap()
        toast.success('Note updated')
      } else {
        await dispatch(createEmployeeNote({ employeeId: selectedEmployee, data: formData })).unwrap()
        toast.success('Note created')
      }
      setModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDelete = (id) => {
    setConfirmModal({ open: true, id, action: 'deleteNote' })
  }

  const onConfirmDelete = async () => {
    const { id, action } = confirmModal
    try {
      if (action === 'deleteNote') await dispatch(deleteEmployeeNote(id)).unwrap()
      toast.success('Deleted')
      setConfirmModal({ open: false, id: null, action: null })
    } catch (e) { toast.error(e || 'Error') }
  }

  const employeeOptions = employees.map(e => ({
    value: e.id,
    label: `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.employeeCode || String(e.id),
  }))

  const columns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'note', header: 'Note', cell: ({ getValue }) => <span className="max-w-sm truncate block">{getValue() || '—'}</span> },
    { id: 'createdBy', header: 'Created By', cell: ({ row }) => {
      const cb = row.original.createdBy
      return cb ? `${cb.firstName || ''} ${cb.lastName || ''}`.trim() : '—'
    }},
    { accessorKey: 'createdAt', header: 'Date', cell: ({ getValue }) => formatDate(getValue()) },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Employee Notes" subtitle="Internal notes on employee profiles"
        actions={<Button onClick={openCreate}>+ Add Note</Button>} />

      <div className="bg-white rounded-xl border border-gray-200 p-4 max-w-sm">
        <Select label="Filter by Employee"
          options={[{ value: '', label: 'Select employee…' }, ...employeeOptions]}
          value={selectedEmployee}
          onChange={e => setSelectedEmployee(e.target.value)} />
      </div>

      <DataTable columns={columns} data={notes} loading={loading} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Note' : 'Add Note'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        }>
        <div className="space-y-4">
          {!editing && (
            <Select label="Employee" options={[{ value: '', label: 'Select…' }, ...employeeOptions]}
              value={selectedEmployee} onChange={e => setSelectedEmployee(e.target.value)} />
          )}
          <Input label="Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={4} {...register('note')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
