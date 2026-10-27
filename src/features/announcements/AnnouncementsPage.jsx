import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchAnnouncements, createAnnouncement, updateAnnouncement, deleteAnnouncement,
  selectAnnouncements, selectAnnouncementsLoading
} from './announcementsSlice'
import { markAnnouncementViewed } from '../base/baseExtrasSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'

export default function AnnouncementsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const announcements = useSelector(selectAnnouncements)
  const loading = useSelector(selectAnnouncementsLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchAnnouncements()) }, [dispatch])

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (row) => {
    setEditing(row)
    reset({ title: row.title, description: row.description, expiresOn: row.expiresOn })
    setModalOpen(true)
  }

  const handleView = async (id) => {
    if (!user?.employeeId) return
    try { await dispatch(markAnnouncementViewed({ id, employeeId: user.employeeId })).unwrap() }
    catch { /* silent */ }
  }

  const handleDelete = (id) => setConfirmModal({ open: true, id })
  const onConfirmDelete = async () => {
    try { await dispatch(deleteAnnouncement(confirmModal.id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
    finally { setConfirmModal({ open: false, id: null }) }
  }

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await dispatch(updateAnnouncement({ id: editing.id, data })).unwrap()
        toast.success('Announcement updated')
      } else {
        await dispatch(createAnnouncement({ ...data, company: { id: user?.companyId } })).unwrap()
        toast.success('Announcement created')
      }
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const activeAnnouncements = announcements.filter(item => !item.expiresOn || new Date(`${item.expiresOn}T23:59:59`) >= new Date()).length

  return (
    <div className="support-workspace announcements-workspace">
      <PageHeader title="Announcements" subtitle="Company announcements and updates"
        actions={<Button onClick={openCreate}>+ New Announcement</Button>} />
      <div className="support-metrics announcement-metrics">
        <div className="support-metric support-metric-open"><span>Published updates</span><strong>{announcements.length}</strong></div>
        <div className="support-metric support-metric-done"><span>Currently active</span><strong>{activeAnnouncements}</strong></div>
      </div>
      {loading ? <div className="announcement-loading">Loading announcements…</div> : announcements.length === 0 ? (
        <div className="announcement-empty"><span className="announcement-empty-icon">✦</span><h2>No announcements yet</h2><p>Share company news and important updates with your team.</p><Button onClick={openCreate}>Create announcement</Button></div>
      ) : (
        <div className="announcement-grid">
          {announcements.map(item => {
            const expired = item.expiresOn && new Date(`${item.expiresOn}T23:59:59`) < new Date()
            return <article className="announcement-card" key={item.id}>
              <div className="announcement-card-top"><span className="announcement-mark">✦</span><span className={`announcement-state ${expired ? 'is-expired' : ''}`}>{expired ? 'Expired' : 'Active'}</span></div>
              <h2>{item.title}</h2>
              <p className="announcement-description">{item.description || 'No additional details were provided.'}</p>
              <div className="announcement-card-foot"><span>{item.expiresOn ? `Expires ${item.expiresOn}` : 'No expiry date'}</span><div className="announcement-actions">
                <Button size="sm" variant="ghost" onClick={() => handleView(item.id)}>Mark viewed</Button>
                <Button size="sm" variant="secondary" onClick={() => openEdit(item)}>Edit</Button>
                <Button size="sm" variant="danger" onClick={() => handleDelete(item.id)}>Delete</Button>
              </div></div>
            </article>
          })}
        </div>
      )}
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmDelete}
        title="Delete Announcement"
        message="Are you sure you want to delete this announcement? This action cannot be undone."
        confirmLabel="Delete"
        loading={loading}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Announcement' : 'New Announcement'} panelClassName="support-form-modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        }>
        <div className="support-form">
          <Input label="Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <Input label="Expires On" type="date" {...register('expiresOn')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={4} {...register('description')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
