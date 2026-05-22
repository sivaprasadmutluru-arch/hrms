import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchById, fetchTasks, createTask, updateTask, deleteTask, selectSelected, selectTasks } from './projectsSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Spinner from '../../components/common/Spinner'
import { TASK_STAGES } from '../../config/constants'
import { formatDate } from '../../utils/formatters'
import { PlusIcon, CalendarIcon, UserIcon } from '@heroicons/react/24/outline'

const STAGE_COLORS = { TODO: 'default', IN_PROGRESS: 'primary', TESTING: 'warning', DONE: 'success' }
const PRIORITY_COLORS = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'default' }

export default function ProjectDetailPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const project = useSelector(selectSelected)
  const allTasks = useSelector(selectTasks)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  // Local task state for optimistic drag-and-drop updates
  const [localTasks, setLocalTasks] = useState([])
  const dragTask = useRef(null)
  const dragFromStage = useRef(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchById(id)); dispatch(fetchTasks(id)) }, [dispatch, id])
  useEffect(() => { setLocalTasks(allTasks) }, [allTasks])

  const openCreate = (stage) => { setEditingTask(null); reset({ stage, priority: 'MEDIUM' }); setModalOpen(true) }
  const openEdit = (task) => { setEditingTask(task); reset(task); setModalOpen(true) }

  const onSubmit = async (formData) => {
    try {
      if (editingTask) {
        await dispatch(updateTask({ id: editingTask.id, data: formData })).unwrap()
        toast.success('Task updated')
      } else {
        await dispatch(createTask({ projectId: id, data: formData })).unwrap()
        toast.success('Task created')
      }
      setModalOpen(false)
      dispatch(fetchTasks(id))
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDelete = async (taskId) => {
    try { await dispatch(deleteTask(taskId)).unwrap(); toast.success('Task deleted'); dispatch(fetchTasks(id)) }
    catch { toast.error('Failed') }
  }

  // ─── Drag-and-drop ───────────────────────────────────────────────────────────

  const onDragStart = (task, stage) => {
    dragTask.current = task
    dragFromStage.current = stage
  }

  const onDragOver = (e) => { e.preventDefault() }

  const onDrop = async (e, targetStage) => {
    e.preventDefault()
    const task = dragTask.current
    if (!task || dragFromStage.current === targetStage) return

    // Optimistic update
    setLocalTasks(prev => prev.map(t => t.id === task.id ? { ...t, stage: targetStage } : t))

    try {
      await dispatch(updateTask({ id: task.id, data: { ...task, stage: targetStage } })).unwrap()
      toast.success(`Moved to ${targetStage.replace('_', ' ')}`)
      dispatch(fetchTasks(id))
    } catch {
      toast.error('Failed to move task')
      setLocalTasks(allTasks)
    }
    dragTask.current = null
    dragFromStage.current = null
  }

  // ─── Stats ───────────────────────────────────────────────────────────────────

  const doneCount = localTasks.filter(t => t.stage === 'DONE').length
  const totalCount = localTasks.length
  const completionPct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0

  if (!project) return <Spinner className="py-16" />

  return (
    <div>
      <PageHeader
        title={project.title}
        subtitle={project.description}
        actions={<Button variant="secondary" onClick={() => navigate('/projects')}>← Back</Button>}
      />

      {/* Project Summary Card */}
      <div className="bg-white rounded-lg border p-4 mb-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wide">Status</p>
          <Badge label={project.status || 'PLANNED'} variant={project.status === 'COMPLETED' ? 'primary' : project.status === 'ON_HOLD' ? 'warning' : project.status === 'CANCELLED' ? 'danger' : project.status === 'IN_PROGRESS' ? 'success' : 'default'} />
        </div>
        {project.startDate && (
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Start Date</p>
            <p className="font-medium mt-0.5 flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5 text-gray-400" />{formatDate(project.startDate)}</p>
          </div>
        )}
        {project.endDate && (
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">End Date</p>
            <p className="font-medium mt-0.5 flex items-center gap-1"><CalendarIcon className="h-3.5 w-3.5 text-gray-400" />{formatDate(project.endDate)}</p>
          </div>
        )}
        {project.managerName && (
          <div>
            <p className="text-gray-500 text-xs uppercase tracking-wide">Manager</p>
            <p className="font-medium mt-0.5 flex items-center gap-1"><UserIcon className="h-3.5 w-3.5 text-gray-400" />{project.managerName}</p>
          </div>
        )}
        <div className="col-span-2 sm:col-span-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Overall Completion</p>
            <span className="text-xs font-semibold text-indigo-600">{completionPct}% ({doneCount}/{totalCount} tasks done)</span>
          </div>
          <div className="bg-gray-200 rounded-full h-2">
            <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${completionPct}%` }} />
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {TASK_STAGES.map(stage => {
          const stageTasks = localTasks.filter(t => t.stage === stage)
          const doneInStage = stage === 'DONE' ? stageTasks.length : 0
          return (
            <div
              key={stage}
              className="flex flex-col gap-2 min-h-48"
              onDragOver={onDragOver}
              onDrop={e => onDrop(e, stage)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between mb-1 px-1">
                <div className="flex items-center gap-2">
                  <Badge label={stage.replace('_', ' ')} variant={STAGE_COLORS[stage]} />
                  <span className="text-xs text-gray-400 font-medium">{stageTasks.length}</span>
                </div>
                <button
                  onClick={() => openCreate(stage)}
                  className="p-1 rounded hover:bg-gray-100 transition-colors"
                  title={`Add task to ${stage}`}
                >
                  <PlusIcon className="h-4 w-4 text-gray-400" />
                </button>
              </div>

              {/* Drop zone when empty */}
              {stageTasks.length === 0 && (
                <div className="flex-1 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center min-h-20">
                  <p className="text-xs text-gray-400">Drop tasks here</p>
                </div>
              )}

              {/* Task Cards */}
              {stageTasks.map(task => (
                <Card
                  key={task.id}
                  draggable
                  onDragStart={() => onDragStart(task, stage)}
                  className="cursor-grab hover:shadow-md transition-shadow active:opacity-60 select-none"
                  onClick={() => openEdit(task)}
                >
                  <p className="text-sm font-medium text-gray-800 mb-1">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      {task.priority && (
                        <Badge label={task.priority} variant={PRIORITY_COLORS[task.priority] || 'default'} />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      {task.assigneeName && (
                        <span className="flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />{task.assigneeName}
                        </span>
                      )}
                      {task.dueDate && (
                        <span className={`flex items-center gap-1 ${new Date(task.dueDate) < new Date() && stage !== 'DONE' ? 'text-red-500' : ''}`}>
                          <CalendarIcon className="h-3 w-3" />{formatDate(task.dueDate)}
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )
        })}
      </div>

      {/* Task Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingTask ? 'Edit Task' : 'New Task'}
        footer={
          <div className="flex justify-between">
            {editingTask && (
              <Button variant="danger" onClick={() => { handleDelete(editingTask.id); setModalOpen(false) }}>Delete</Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit(onSubmit)}>{editingTask ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <Input label="Task Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              {...register('description')}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Stage" options={TASK_STAGES} {...register('stage')} />
            <Select label="Priority" options={['LOW', 'MEDIUM', 'HIGH']} {...register('priority')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Assignee ID" {...register('assigneeId')} />
            <Input label="Due Date" type="date" {...register('dueDate')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
