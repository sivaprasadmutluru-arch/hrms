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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
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

  const normalizedSearch = search.trim().toLowerCase()
  const filteredProjects = data.filter(project => {
    const matchesSearch = !normalizedSearch || `${project.title || ''} ${project.description || ''}`.toLowerCase().includes(normalizedSearch)
    return matchesSearch && (statusFilter === 'ALL' || project.status === statusFilter)
  })
  const projectCount = data.length
  const activeCount = data.filter(project => project.status === 'IN_PROGRESS').length
  const plannedCount = data.filter(project => project.status === 'PLANNED').length
  const completedCount = data.filter(project => project.status === 'COMPLETED').length

  if (loading) return <Spinner className="py-16" />

  return (
    <div className="projects-workspace">
      <PageHeader title="Projects" subtitle="Manage projects and tasks" actions={<Button onClick={openCreate}>+ New Project</Button>} />
      <div className="projects-overview">
        {[
          { label: 'All projects', value: projectCount, tone: 'total' },
          { label: 'In progress', value: activeCount, tone: 'active' },
          { label: 'Planned', value: plannedCount, tone: 'planned' },
          { label: 'Completed', value: completedCount, tone: 'complete' },
        ].map(item => <div className={`projects-stat projects-stat-${item.tone}`} key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}
      </div>
      <div className="projects-library-toolbar">
        <div><span>PROJECT LIBRARY</span><h2>Your workspace</h2></div>
        <div className="projects-filters">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects" aria-label="Search projects" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter projects by status">
            <option value="ALL">All statuses</option>
            {Object.keys(STATUS_VARIANT).map(status => <option key={status} value={status}>{status.replace('_', ' ')}</option>)}
          </select>
        </div>
      </div>
      {data.length === 0 ? (
        <EmptyState title="No projects yet" description="Create your first project to organize work, tasks, and timelines." action={<Button onClick={openCreate}>+ New Project</Button>} />
      ) : filteredProjects.length === 0 ? (
        <div className="projects-empty-filter">No projects match these filters. Try another search or status.</div>
      ) : (
        <div className="projects-grid">
          {filteredProjects.map(project => (
            <Card key={project.id} className="project-card" onClick={() => navigate(`/projects/${project.id}`)}>
              <div className="project-card-identity">
                <div className="project-folder-icon"><FolderIcon /></div>
                <div className="project-card-copy">
                  <div className="project-card-title-line">
                    <h3>{project.title}</h3>
                    <Badge label={(project.status || 'PLANNED').replace('_', ' ')} variant={STATUS_VARIANT[project.status] || 'default'} />
                  </div>
                  <p className="project-card-description">{project.description || 'Add a short summary to help your team understand this project.'}</p>
                </div>
              </div>
              <div className="project-card-dates">
                <div><span>START DATE</span><strong><CalendarIcon />{formatDate(project.startDate) || 'Not set'}</strong></div>
                <div><span>END DATE</span><strong><CalendarIcon />{formatDate(project.endDate) || 'Not set'}</strong></div>
              </div>
              <div className="project-card-actions">
                <button onClick={e => openEdit(e, project)}>Edit details</button>
                <button className="project-open-action" onClick={() => navigate(`/projects/${project.id}`)}>Open project <span>→</span></button>
                <button className="project-delete-action" aria-label={`Delete ${project.title}`} onClick={e => handleDelete(e, project)}>Delete</button>
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
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Project' : 'New Project'} size="lg" panelClassName="projects-form-modal"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button></div>}>
        <div className="projects-form-grid">
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
