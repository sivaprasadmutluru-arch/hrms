import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchSkillZones, createSkillZone, deleteSkillZone,
  selectSkillZones, selectLoading
} from './recruitmentSlice'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'

export default function SkillZonePage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const skillZones = useSelector(selectSkillZones)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchSkillZones()) }, [dispatch])

  const handleDelete = (id) => setConfirmModal({ open: true, id })
  const onConfirmDelete = async () => {
    try { await dispatch(deleteSkillZone(confirmModal.id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
    finally { setConfirmModal({ open: false, id: null }) }
  }

  const openEdit = (zone) => {
    setEditTarget(zone)
    reset({ title: zone.title, description: zone.description })
    setModalOpen(true)
  }

  const onSubmit = async (formData) => {
    try {
      if (editTarget) {
        await api.put(`/recruitment/skill-zones/${editTarget.id}`, { ...formData, company: { id: user?.companyId } })
        toast.success('Skill zone updated')
        setEditTarget(null)
        dispatch(fetchSkillZones())
      } else {
        await dispatch(createSkillZone({ ...formData, company: { id: user?.companyId } })).unwrap()
        toast.success('Skill zone created')
      }
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
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
    <div className="recruitment-workspace">
      <PageHeader title="Skill Zones" subtitle="Categorize candidates by skills"
        actions={<Button onClick={() => { setEditTarget(null); reset(); setModalOpen(true) }}>+ New Skill Zone</Button>} />
      <div className="recruitment-table"><DataTable columns={columns} data={skillZones} loading={loading} /></div>
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmDelete}
        title="Delete Skill Zone"
        message="Are you sure you want to delete this skill zone? This action cannot be undone."
        confirmLabel="Delete"
        loading={loading}
      />
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null) }} title={editTarget ? 'Edit Skill Zone' : 'Create Skill Zone'} panelClassName="recruitment-form-modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditTarget(null) }}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editTarget ? 'Update' : 'Create'}</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3} {...register('description')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
