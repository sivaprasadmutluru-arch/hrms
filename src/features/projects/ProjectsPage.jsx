import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchAll, create, update, remove, selectAll, selectLoading } from './projectsSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Spinner from '../../components/common/Spinner'
import EmptyState from '../../components/common/EmptyState'
import ConfirmModal from '../../components/common/ConfirmModal'
import { formatDate } from '../../utils/formatters'
import { FolderIcon, CalendarIcon } from '@heroicons/react/24/outline'

const STATUS_VARIANT = { PLANNED: 'default', IN_PROGRESS: 'success', ON_HOLD: 'warning', COMPLETED: 'primary', CANCELLED: 'danger' }

export default function ProjectsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const data = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, project: null })
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchAll({ page: 0, size: 50 })) }, [dispatch])

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (e, p) => { e.stopPropagation(); setEditing(p); reset(p); setModalOpen(true) }

  const handleDelete = (e, project) => { e.stopPropagation(); setConfirmModal({ open: true, project }) }
  const onConfirmDelete = async () => {
    try { await dispatch(remove(confirmModal.project.id)).unwrap(); toast.success('Project deleted') }
    catch (e) { toast.error(e || 'Failed to delete project') }
    finally { setConfirmModal({ open: false, project: null }) }
  }

  const onSubmit = async (formData) => {
    try {
      if (editing) { await dispatch(update({ id: editing.id, data: formData })).unwrap(); toast.success('Project updated') }
      else { await dispatch(create(formData)).unwrap(); toast.success('Project created') }
      setModalOpen(false)
      dispatch(fetchAll({ page: 0, size: 50 }))
    } catch (e) { toast.error(e || 'Error') }
  }

  if (loading) return <Spinner className="py-16" />

  return (
    <div>
      <PageHeader title="Projects" subtitle="Manage projects and tasks" actions={<Button onClick={openCreate}>+ New Project</Button>} />
      {data.length === 0 ? (
        <EmptyState title="No projects" description="Create your first project to get started." action={<Button onClick={openCreate}>+ New Project</Button>} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {data.map(project => (
            <Card key={project.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/projects/${project.id}`)}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <FolderIcon className="h-5 w-5 text-indigo-600" />
                </div>
                <Badge label={project.status || 'Active'} variant={STATUS_VARIANT[project.status] || 'default'} />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{project.title}</h3>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{project.description || 'No description'}</p>
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="flex items-center gap-1"><CalendarIcon className="h-3 w-3" />{formatDate(project.startDate)}</span>
                <Button size="sm" variant="ghost" onClick={(e) => openEdit(e, project)}>Edit</Button>
                <Button size="sm" variant="danger" onClick={(e) => handleDelete(e, project)}>Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, project: null })}
        onConfirm={onConfirmDelete}
        title="Delete Project"
        message={`Are you sure you want to delete "${confirmModal.project?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={loading}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Project' : 'New Project'}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button></div>}>
        <div className="space-y-4">
          <Input label="Project Name" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={3} {...register('description')} />
          </div>
          <Select label="Status" options={['PLANNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']} {...register('status')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" {...register('startDate')} />
            <Input label="End Date" type="date" {...register('endDate')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
