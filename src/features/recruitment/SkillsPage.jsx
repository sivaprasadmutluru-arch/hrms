import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchSkills, createSkill, deleteSkill, selectSkills, selectLoading } from './recruitmentSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'

export default function SkillsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const skills = useSelector(selectSkills)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchSkills(user?.companyId)) }, [dispatch, user?.companyId])

  const onSubmit = async (data) => {
    try {
      await dispatch(createSkill({ ...data, company: { id: user?.companyId } })).unwrap()
      toast.success('Skill created')
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this skill?')) return
    try { await dispatch(deleteSkill(id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'title', header: 'Skill' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
    )},
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Skills" subtitle="Skills library for recruitment"
        actions={<Button onClick={() => { reset(); setModalOpen(true) }}>+ Add Skill</Button>} />
      <DataTable columns={columns} data={skills} loading={loading} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Skill"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>Create</Button></div>}>
        <Input label="Skill Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
      </Modal>
    </div>
  )
}
