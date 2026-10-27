import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchDynamicFields, createDynamicField, updateDynamicField, deleteDynamicField,
  fetchChoices, createChoice, deleteChoice,
  selectDynamicFields, selectChoices, selectDynamicFieldsLoading
} from './dynamicFieldsSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'

const FIELD_TYPES = [
  { value: 1, label: 'Char (Text Input)' },
  { value: 2, label: 'Integer (Number)' },
  { value: 3, label: 'Text (Multi-line)' },
  { value: 4, label: 'Date' },
  { value: 5, label: 'File' },
]

export default function DynamicFieldsPage() {
  const dispatch = useDispatch()
  const fields = useSelector(selectDynamicFields)
  const choices = useSelector(selectChoices)
  const loading = useSelector(selectDynamicFieldsLoading)
  const [fieldModalOpen, setFieldModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [choiceTitle, setChoiceTitle] = useState('')
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, action: null })

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    dispatch(fetchDynamicFields())
    dispatch(fetchChoices())
  }, [dispatch])

  const openCreate = () => { setEditing(null); reset({}); setFieldModalOpen(true) }
  const openEdit = (row) => {
    setEditing(row)
    reset({
      model: row.model,
      verboseName: row.verboseName,
      fieldName: row.fieldName,
      type: row.type,
      isRequired: row.isRequired,
      removeColumn: row.removeColumn,
    })
    setFieldModalOpen(true)
  }

  const handleDeleteField = (id) => setConfirmModal({ open: true, id, action: 'field' })

  const onSubmitField = async (data) => {
    const payload = {
      ...data,
      type: parseInt(data.type),
      isRequired: data.isRequired === true || data.isRequired === 'true',
      removeColumn: data.removeColumn === true || data.removeColumn === 'true',
    }
    try {
      if (editing) {
        await dispatch(updateDynamicField({ id: editing.id, data: payload })).unwrap()
        toast.success('Field updated')
      } else {
        await dispatch(createDynamicField(payload)).unwrap()
        toast.success('Field created')
      }
      setFieldModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleCreateChoice = async () => {
    if (!choiceTitle.trim()) return
    try {
      await dispatch(createChoice({ title: choiceTitle })).unwrap()
      toast.success('Choice added')
      setChoiceTitle('')
    } catch (e) { toast.error(e || 'Failed') }
  }

  const handleDeleteChoice = (id) => setConfirmModal({ open: true, id, action: 'choice' })
  const onConfirmDelete = async () => {
    const { id, action } = confirmModal
    try {
      if (action === 'field') { await dispatch(deleteDynamicField(id)).unwrap(); toast.success('Field deleted') }
      else if (action === 'choice') { await dispatch(deleteChoice(id)).unwrap(); toast.success('Choice deleted') }
    } catch (e) { toast.error(e || 'Failed') }
    finally { setConfirmModal({ open: false, id: null, action: null }) }
  }

  const fieldColumns = [
    { accessorKey: 'model', header: 'Model' },
    { accessorKey: 'verboseName', header: 'Verbose Name' },
    { accessorKey: 'fieldName', header: 'Field Name' },
    { accessorKey: 'type', header: 'Type', cell: ({ getValue }) => FIELD_TYPES.find(t => t.value === getValue())?.label || getValue() },
    { accessorKey: 'isRequired', header: 'Required', cell: ({ getValue }) => getValue() ? 'Yes' : 'No' },
    { accessorKey: 'removeColumn', header: 'Remove Column', cell: ({ getValue }) => getValue() ? 'Yes' : 'No' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDeleteField(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div className="admin-settings-workspace">
      <PageHeader title="Dynamic Fields" subtitle="Extend employee and HR forms with custom fields" />

      {/* Dynamic Fields Section */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base font-semibold text-gray-900">Custom Fields</h2>
          <Button onClick={openCreate}>+ Add Field</Button>
        </div>
          <div className="admin-settings-table"><DataTable columns={fieldColumns} data={fields} loading={loading} /></div>
      </div>

      {/* Choices Section */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-4">Choice Options</h2>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            className="flex-1 max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="New choice title"
            value={choiceTitle}
            onChange={e => setChoiceTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreateChoice()}
          />
          <Button onClick={handleCreateChoice}>Add Choice</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {choices.map(c => (
            <span key={c.id} className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 rounded-full text-sm">
              {c.title}
              <button onClick={() => handleDeleteChoice(c.id)} className="text-gray-400 hover:text-red-500 text-xs font-bold">×</button>
            </span>
          ))}
          {choices.length === 0 && <p className="text-sm text-gray-400">No choices defined yet.</p>}
        </div>
      </div>

      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null, action: null })}
        onConfirm={onConfirmDelete}
        title={confirmModal.action === 'field' ? 'Delete Field' : 'Delete Choice'}
        message={confirmModal.action === 'field' ? 'Are you sure you want to delete this dynamic field?' : 'Are you sure you want to delete this choice?'}
        confirmLabel="Delete"
        loading={loading}
      />
      {/* Field Modal */}
      <Modal open={fieldModalOpen} onClose={() => setFieldModalOpen(false)} title={editing ? 'Edit Dynamic Field' : 'Add Dynamic Field'} panelClassName="admin-settings-modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFieldModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmitField)}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        }>
        <div className="admin-settings-form">
          <Input label="Model" placeholder="e.g. employee, leave" error={errors.model?.message}
            {...register('model', { required: 'Required' })} />
          <Input label="Verbose Name" placeholder="Display label" {...register('verboseName')} />
          <Input label="Field Name" placeholder="e.g. custom_field_1" {...register('fieldName')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Field Type</label>
            <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" {...register('type')}>
              <option value="">Select type</option>
              {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('isRequired')} className="rounded" />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('removeColumn')} className="rounded" />
              Remove Column
            </label>
          </div>
        </div>
      </Modal>
    </div>
  )
}
