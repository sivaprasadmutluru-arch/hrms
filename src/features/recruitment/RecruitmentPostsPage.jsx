import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchAll, create, update, remove, selectLoading, selectPagination } from './recruitmentSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Pagination from '../../components/common/Pagination'
import ConfirmModal from '../../components/common/ConfirmModal'
import { formatDate } from '../../utils/formatters'

export default function RecruitmentPostsPage() {
  const dispatch = useDispatch()
  const posts = useSelector(s => s.recruitment.posts)
  const loading = useSelector(selectLoading)
  const pagination = useSelector(selectPagination)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, post: null })
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchAll({ page: 0, size: 20 })) }, [dispatch])

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (row) => { setEditing(row); reset(row); setModalOpen(true) }

  const handleDelete = (row) => setConfirmModal({ open: true, post: row })
  const onConfirmDelete = async () => {
    try { await dispatch(remove(confirmModal.post.id)).unwrap(); toast.success('Job post deleted') }
    catch (e) { toast.error(e || 'Failed to delete job post') }
    finally { setConfirmModal({ open: false, post: null }) }
  }

  const onSubmit = async (formData) => {
    try {
      if (editing) { await dispatch(update({ id: editing.id, data: formData })).unwrap(); toast.success('Post updated') }
      else { await dispatch(create(formData)).unwrap(); toast.success('Job post created') }
      setModalOpen(false)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Error') }
  }

  const openCount = posts.filter(post => post.status !== 'CLOSED').length
  const applicantCount = posts.reduce((total, post) => total + (Number(post.applicantCount) || 0), 0)

  return (
    <div className="recruitment-workspace">
      <PageHeader title="Job Posts" subtitle="Manage open positions and recruitment" actions={<Button onClick={openCreate}>+ New Post</Button>} />
      <div className="recruitment-post-stats">
        <div><span>Open positions</span><strong>{loading ? '—' : openCount}</strong><small>Currently accepting applications</small></div>
        <div><span>All job posts</span><strong>{loading ? '—' : pagination.total}</strong><small>Across the current workspace</small></div>
        <div><span>Applicants</span><strong>{loading ? '—' : applicantCount}</strong><small>Candidates across these roles</small></div>
      </div>
      {loading ? <div className="recruitment-job-grid" aria-busy="true">{Array.from({ length: 3 }, (_, index) => <div className="recruitment-job-skeleton" key={index} />)}</div> : (
        <div className="recruitment-job-grid">
          {posts.length === 0 ? <div className="recruitment-empty">No job posts yet. Create a post to start building your hiring pipeline.</div> : posts.map(post => (
            <article className="recruitment-job-card" key={post.id}>
              <div className="recruitment-job-card-top">
                <div className="recruitment-job-mark">{(post.title || 'J').slice(0, 1).toUpperCase()}</div>
                <Badge label={post.status || 'OPEN'} variant={post.status === 'CLOSED' ? 'danger' : 'success'} />
              </div>
              <h2>{post.title || 'Untitled position'}</h2>
              <p className="recruitment-job-department">{post.department || 'Department not specified'}</p>
              <div className="recruitment-job-meta">
                <span>{post.location || 'Location flexible'}</span>
                <span>{String(post.type || 'FULL_TIME').replaceAll('_', ' ')}</span>
              </div>
              <div className="recruitment-job-card-foot">
                <div><strong>{Number(post.applicantCount) || 0}</strong><span> applicants</span></div>
                <span>Closes {post.deadline ? formatDate(post.deadline) : 'No deadline'}</span>
              </div>
              <div className="recruitment-job-actions">
                <Button size="sm" variant="secondary" onClick={() => openEdit(post)}>Edit post</Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(post)}>Delete</Button>
              </div>
            </article>
          ))}
        </div>
      )}
      <Pagination page={pagination.page} totalPages={Math.ceil(pagination.total / pagination.size)} onPageChange={p => dispatch(fetchAll({ page: p, size: 20 }))} />
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, post: null })}
        onConfirm={onConfirmDelete}
        title="Delete Job Post"
        message={`Are you sure you want to delete "${confirmModal.post?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={loading}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Job Post' : 'New Job Post'} size="lg" panelClassName="recruitment-form-modal recruitment-job-modal"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Publish'}</Button></div>}>
        <div className="recruitment-job-form">
          <Input label="Job Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Department" {...register('department')} />
            <Input label="Location" {...register('location')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Employment Type" options={[{value:'FULL_TIME',label:'Full Time'},{value:'PART_TIME',label:'Part Time'},{value:'CONTRACT',label:'Contract'},{value:'INTERN',label:'Intern'}]} {...register('type')} />
            <Input label="Application Deadline" type="date" {...register('deadline')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={4} {...register('description')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
