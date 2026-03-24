import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchSurveyTemplates, createSurveyTemplate, updateSurveyTemplate, deleteSurveyTemplate,
  selectSurveyTemplates, selectLoading,
} from './recruitmentSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'

export default function SurveysPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const templates = useSelector(selectSurveyTemplates)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchSurveyTemplates(user?.companyId)) }, [dispatch, user?.companyId])

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (t) => { setEditing(t); reset({ title: t.title, description: t.description }); setModalOpen(true) }

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await dispatch(updateSurveyTemplate({ id: editing.id, data })).unwrap()
        toast.success('Template updated')
      } else {
        await dispatch(createSurveyTemplate({ ...data, company: { id: user?.companyId } })).unwrap()
        toast.success('Template created')
      }
      setModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return
    try { await dispatch(deleteSurveyTemplate(id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => <span className="max-w-xs truncate block">{getValue() || '—'}</span> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Survey Templates" subtitle="Reusable survey templates for job applications"
        actions={<Button onClick={openCreate}>+ Add Template</Button>} />
      <DataTable columns={columns} data={templates} loading={loading} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Template' : 'Add Template'}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button></div>}>
        <div className="space-y-4">
          <Input label="Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={3} {...register('description')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
