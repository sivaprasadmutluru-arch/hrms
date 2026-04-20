import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchObjectives, createObjective, updateObjective, deleteObjective,
  fetchObjectiveComments, addObjectiveComment, deleteObjectiveComment,
  selectLoading, selectObjectiveComments,
} from './performanceSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import { formatDate } from '../../utils/formatters'

const STATUS_OPTIONS = ['ACTIVE', 'COMPLETED', 'OVERDUE', 'ARCHIVED']
const STATUS_VARIANT = { COMPLETED: 'success', OVERDUE: 'danger', ARCHIVED: 'default', ACTIVE: 'primary' }

export default function ObjectivesPage() {
  const dispatch = useDispatch()
  const objectives = useSelector(s => s.performance.objectives)
  const loading = useSelector(selectLoading)
  const comments = useSelector(selectObjectiveComments)

  const [filterStatus, setFilterStatus] = useState('')
  const [filterSearch, setFilterSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingObj, setEditingObj] = useState(null)
  const [detailObj, setDetailObj] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [savingProgress, setSavingProgress] = useState(false)
  const [progressVal, setProgressVal] = useState(0)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchObjectives()) }, [dispatch])
  useEffect(() => {
    if (detailObj) {
      dispatch(fetchObjectiveComments(detailObj.id))
      setProgressVal(detailObj.progress || 0)
    }
  }, [dispatch, detailObj])

  const openCreate = () => { setEditingObj(null); reset({}); setModalOpen(true) }
  const openEdit = (obj) => { setEditingObj(obj); reset({ ...obj }); setModalOpen(true) }

  const onSubmit = async (formData) => {
    try {
      if (editingObj) {
        await dispatch(updateObjective({ id: editingObj.id, data: formData })).unwrap()
        toast.success('Objective updated')
      } else {
        await dispatch(createObjective(formData)).unwrap()
        toast.success('Objective created')
      }
      setModalOpen(false)
      dispatch(fetchObjectives())
    } catch (e) { toast.error(e || 'Failed') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this objective?')) return
    try {
      await dispatch(deleteObjective(id)).unwrap()
      toast.success('Deleted')
      setDetailObj(null)
    } catch { toast.error('Failed to delete') }
  }

  const handleProgressSave = async () => {
    if (!detailObj) return
    setSavingProgress(true)
    try {
      const updated = await dispatch(updateObjective({ id: detailObj.id, data: { ...detailObj, progress: progressVal } })).unwrap()
      setDetailObj(updated)
      toast.success('Progress saved')
      dispatch(fetchObjectives())
    } catch { toast.error('Failed') }
    finally { setSavingProgress(false) }
  }

  const handleAddComment = async () => {
    if (!commentText.trim()) return
    try {
      await dispatch(addObjectiveComment({ objectiveId: detailObj.id, data: { comment: commentText } })).unwrap()
      setCommentText('')
    } catch { toast.error('Failed to add comment') }
  }

  const handleDeleteComment = async (commentId) => {
    try { await dispatch(deleteObjectiveComment(commentId)).unwrap() }
    catch { toast.error('Failed') }
  }

  const filtered = objectives.filter(o => {
    if (filterStatus && o.status !== filterStatus) return false
    if (filterSearch && !`${o.title} ${o.employeeName}`.toLowerCase().includes(filterSearch.toLowerCase())) return false
    return true
  })

  const completedCount = objectives.filter(o => o.status === 'COMPLETED').length
  const overdueCount = objectives.filter(o => o.status === 'OVERDUE').length
  const avgProgress = objectives.length
    ? Math.round(objectives.reduce((sum, o) => sum + (o.progress || 0), 0) / objectives.length)
    : 0

  const columns = [
    { accessorKey: 'employeeName', header: 'Employee' },
    { accessorKey: 'title', header: 'Objective' },
    {
      accessorKey: 'weight', header: 'Weight',
      cell: ({ getValue }) => <span className="text-sm text-gray-600">{getValue() ? `${getValue()}%` : '—'}</span>
    },
    {
      accessorKey: 'dueDate', header: 'Due',
      cell: ({ getValue, row }) => {
        const due = getValue()
        const overdue = due && new Date(due) < new Date() && row.original.status !== 'COMPLETED'
        return <span className={overdue ? 'text-red-600 font-medium text-sm' : 'text-sm text-gray-600'}>{formatDate(due) || '—'}</span>
      }
    },
    {
      accessorKey: 'progress', header: 'Progress',
      cell: ({ getValue }) => (
        <div className="flex items-center gap-2 min-w-28">
          <div className="flex-1 bg-gray-200 rounded-full h-2">
            <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${getValue() || 0}%` }} />
          </div>
          <span className="text-xs text-gray-500 w-8 text-right">{getValue() || 0}%</span>
        </div>
      )
    },
    {
      accessorKey: 'status', header: 'Status',
      cell: ({ getValue }) => <Badge label={getValue() || 'ACTIVE'} variant={STATUS_VARIANT[getValue()] || 'primary'} />
    },
    {
      id: 'actions', header: '',
      cell: ({ row }) => (
        <div className="flex gap-1 justify-end">
          <button onClick={(e) => { e.stopPropagation(); openEdit(row.original) }}
            className="px-2 py-1 text-xs rounded text-indigo-600 hover:bg-indigo-50">Edit</button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(row.original.id) }}
            className="px-2 py-1 text-xs rounded text-red-500 hover:bg-red-50">Delete</button>
        </div>
      )
    },
  ]

  return (
    <div>
      <PageHeader
        title="Objectives"
        subtitle="Employee performance objectives and KPIs"
        actions={<Button onClick={openCreate}>+ New Objective</Button>}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Avg Progress</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{avgProgress}%</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Completed</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{completedCount}</p>
        </div>
        <div className="bg-white rounded-lg border p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wide">Overdue</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{overdueCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          className="border rounded px-3 py-1.5 text-sm w-56"
          placeholder="Search employee or title..."
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
        />
        <select className="border rounded px-3 py-1.5 text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        onRowClick={(row) => setDetailObj(row)}
      />

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editingObj ? 'Edit Objective' : 'New Objective'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editingObj ? 'Update' : 'Create'}</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Employee ID" error={errors.employeeId?.message} {...register('employeeId', { required: 'Required' })} />
          <Input label="Objective Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={3} {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Due Date" type="date" {...register('dueDate')} />
            <Input label="Weight (%)" type="number" min={0} max={100} {...register('weight')} />
          </div>
          <Select label="Status" options={STATUS_OPTIONS} {...register('status')} />
          {editingObj && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Progress (%)</label>
              <input type="range" min={0} max={100} className="w-full" {...register('progress')} />
            </div>
          )}
        </div>
      </Modal>

      {/* Detail / Progress Panel */}
      {detailObj && (
        <Modal open={!!detailObj} onClose={() => setDetailObj(null)} title={detailObj.title}
          footer={
            <div className="flex justify-between">
              <Button variant="danger" onClick={() => handleDelete(detailObj.id)}>Delete</Button>
              <Button variant="secondary" onClick={() => setDetailObj(null)}>Close</Button>
            </div>
          }>
          <div className="space-y-5">
            {/* Info */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-gray-500">Employee:</span> <span className="font-medium">{detailObj.employeeName || detailObj.employeeId}</span></div>
              <div><span className="text-gray-500">Due:</span> <span className="font-medium">{formatDate(detailObj.dueDate) || '—'}</span></div>
              <div><span className="text-gray-500">Weight:</span> <span className="font-medium">{detailObj.weight ? `${detailObj.weight}%` : '—'}</span></div>
              <div><span className="text-gray-500">Status:</span> <Badge label={detailObj.status || 'ACTIVE'} variant={STATUS_VARIANT[detailObj.status] || 'primary'} /></div>
            </div>
            {detailObj.description && <p className="text-sm text-gray-600">{detailObj.description}</p>}

            {/* Progress Updater */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <p className="text-sm font-medium text-gray-700 mb-3">Update Progress</p>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={0} max={100} value={progressVal}
                  onChange={e => setProgressVal(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm font-semibold text-indigo-600 w-10">{progressVal}%</span>
                <Button onClick={handleProgressSave} disabled={savingProgress}>
                  {savingProgress ? 'Saving...' : 'Save'}
                </Button>
              </div>
              <div className="mt-2 bg-gray-200 rounded-full h-2">
                <div className="bg-indigo-600 h-2 rounded-full transition-all" style={{ width: `${progressVal}%` }} />
              </div>
            </div>

            {/* Comments */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Comments</p>
              <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
                {comments.length === 0 && <p className="text-xs text-gray-400">No comments yet</p>}
                {comments.map(c => (
                  <div key={c.id} className="flex items-start justify-between bg-gray-50 rounded p-2">
                    <div>
                      <p className="text-xs font-medium text-gray-700">{c.authorName || 'You'}</p>
                      <p className="text-sm text-gray-600">{c.comment}</p>
                    </div>
                    <button onClick={() => handleDeleteComment(c.id)} className="text-gray-300 hover:text-red-400 text-xs ml-2">×</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  className="flex-1 border rounded px-3 py-1.5 text-sm"
                  placeholder="Add a comment..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                />
                <Button onClick={handleAddComment}>Post</Button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
