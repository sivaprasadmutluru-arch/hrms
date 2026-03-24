import { useEffect, useState } from 'react'
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
import { PlusIcon } from '@heroicons/react/24/outline'

const STAGE_COLORS = { TODO: 'default', IN_PROGRESS: 'primary', TESTING: 'warning', DONE: 'success' }

export default function ProjectDetailPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const project = useSelector(selectSelected)
  const tasks = useSelector(selectTasks)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    dispatch(fetchById(id))
    dispatch(fetchTasks(id))
  }, [dispatch, id])

  const openCreate = (stage) => { setEditingTask(null); reset({ stage }); setModalOpen(true) }
  const openEdit = (task) => { setEditingTask(task); reset(task); setModalOpen(true) }

  const onSubmit = async (formData) => {
    try {
      if (editingTask) { await dispatch(updateTask({ id: editingTask.id, data: formData })).unwrap(); toast.success('Task updated') }
      else { await dispatch(createTask({ projectId: id, data: formData })).unwrap(); toast.success('Task created') }
      setModalOpen(false)
      dispatch(fetchTasks(id))
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDelete = async (taskId) => {
    try { await dispatch(deleteTask(taskId)).unwrap(); toast.success('Task deleted'); dispatch(fetchTasks(id)) }
    catch { toast.error('Failed') }
  }

  if (!project) return <Spinner className="py-16" />

  return (
    <div>
      <PageHeader title={project.name} subtitle={project.description}
        actions={<Button variant="secondary" onClick={() => navigate('/projects')}>← Back</Button>} />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {TASK_STAGES.map(stage => {
          const stageTasks = tasks.filter(t => t.stage === stage)
          return (
            <div key={stage} className="flex flex-col gap-2">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Badge label={stage.replace('_', ' ')} variant={STAGE_COLORS[stage]} />
                  <span className="text-xs text-gray-400 font-medium">{stageTasks.length}</span>
                </div>
                <button onClick={() => openCreate(stage)} className="p-1 rounded hover:bg-gray-100 transition-colors">
                  <PlusIcon className="h-4 w-4 text-gray-400" />
                </button>
              </div>
              {stageTasks.map(task => (
                <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEdit(task)}>
                  <p className="text-sm font-medium text-gray-800 mb-1">{task.title}</p>
                  {task.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{task.description}</p>}
                  <div className="flex items-center justify-between">
                    {task.dueDate && <span className="text-xs text-gray-400">{formatDate(task.dueDate)}</span>}
                    {task.priority && <Badge label={task.priority} variant={task.priority === 'HIGH' ? 'danger' : task.priority === 'MEDIUM' ? 'warning' : 'default'} />}
                  </div>
                </Card>
              ))}
            </div>
          )
        })}
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingTask ? 'Edit Task' : 'New Task'}
        footer={
          <div className="flex justify-between">
            {editingTask && <Button variant="danger" onClick={() => { handleDelete(editingTask.id); setModalOpen(false) }}>Delete</Button>}
            <div className="flex gap-2 ml-auto">
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSubmit(onSubmit)}>{editingTask ? 'Update' : 'Create'}</Button>
            </div>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Task Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={2} {...register('description')} />
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
