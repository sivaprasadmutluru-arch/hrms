import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchMailTemplates, createMailTemplate, updateMailTemplate, deleteMailTemplate,
  selectMailTemplates, selectBaseExtrasLoading,
} from '../base/baseExtrasSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'

const TEMPLATE_TYPES = ['LEAVE_APPROVAL', 'LEAVE_REJECTION', 'ATTENDANCE_REMINDER', 'PAYSLIP', 'ONBOARDING', 'OFFBOARDING', 'GENERAL']

export default function EmailTemplatesPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const templates = useSelector(selectMailTemplates)
  const loading = useSelector(selectBaseExtrasLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchMailTemplates()) }, [dispatch])

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (row) => {
    setEditing(row)
    reset({ title: row.title, subject: row.subject, body: row.body, templateType: row.templateType })
    setModalOpen(true)
  }

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await dispatch(updateMailTemplate({ id: editing.id, data })).unwrap()
        toast.success('Template updated')
      } else {
        await dispatch(createMailTemplate({ ...data, company: { id: user?.companyId } })).unwrap()
        toast.success('Template created')
      }
      setModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this template?')) return
    try { await dispatch(deleteMailTemplate(id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'subject', header: 'Subject' },
    { accessorKey: 'templateType', header: 'Type' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Email Templates" subtitle="Manage notification email templates"
        actions={<Button onClick={openCreate}>+ New Template</Button>} />
      <DataTable columns={columns} data={templates} loading={loading} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Template' : 'New Template'}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button></div>}>
        <div className="space-y-4">
          <Input label="Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <Input label="Subject" error={errors.subject?.message} {...register('subject', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Type</label>
            <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              {...register('templateType')}>
              {TEMPLATE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={6} {...register('body')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
