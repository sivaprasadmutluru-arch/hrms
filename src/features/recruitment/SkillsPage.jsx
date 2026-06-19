import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchSkills, createSkill, deleteSkill, selectSkills, selectLoading } from './recruitmentSlice'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'

export default function SkillsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const skills = useSelector(selectSkills)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchSkills(user?.companyId)) }, [dispatch, user?.companyId])

  const openEdit = (skill) => {
    setEditTarget(skill)
    reset({ title: skill.title })
    setModalOpen(true)
  }

  const onSubmit = async (data) => {
    try {
      if (editTarget) {
        await api.put(`/recruitment/skills/${editTarget.id}`, { ...data, company: { id: user?.companyId } })
        toast.success('Skill updated')
        setEditTarget(null)
        dispatch(fetchSkills(user?.companyId))
      } else {
        await dispatch(createSkill({ ...data, company: { id: user?.companyId } })).unwrap()
        toast.success('Skill created')
      }
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDelete = (id) => setConfirmModal({ open: true, id })
  const onConfirmDelete = async () => {
    try { await dispatch(deleteSkill(confirmModal.id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Error') }
    finally { setConfirmModal({ open: false, id: null }) }
  }

  const columns = [
    { accessorKey: 'title', header: 'Skill' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Skills" subtitle="Skills library for recruitment"
        actions={<Button onClick={() => { setEditTarget(null); reset(); setModalOpen(true) }}>+ Add Skill</Button>} />
      <DataTable columns={columns} data={skills} loading={loading} />
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmDelete}
        title="Delete Skill"
        message="Are you sure you want to delete this skill? This action cannot be undone."
        confirmLabel="Delete"
        loading={loading}
      />
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null) }} title={editTarget ? 'Edit Skill' : 'Add Skill'}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => { setModalOpen(false); setEditTarget(null) }}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editTarget ? 'Update' : 'Create'}</Button></div>}>
        <Input label="Skill Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
      </Modal>
    </div>
  )
}
