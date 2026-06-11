import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchCategories, createCategory, updateCategory, deleteCategory, duplicateCategory } from './assetsSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'

export default function AssetCategoriesPage() {
  const dispatch = useDispatch()
  const { user, effectiveCompanyId } = useAuth()
  const companyId = effectiveCompanyId
  const categories = useSelector(s => s.assets.categories)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    if (companyId) dispatch(fetchCategories({ companyId }))
  }, [dispatch, companyId])

  const openCreate = () => { setEditing(null); reset({}); setModal(true) }
  const openEdit = (c) => { setEditing(c); reset({ name: c.name }); setModal(true) }

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await dispatch(updateCategory({ id: editing.id, data })).unwrap()
        toast.success('Category updated')
      } else {
        await dispatch(createCategory({ data, companyId })).unwrap()
        toast.success('Category created')
      }
      setModal(false)
      dispatch(fetchCategories({ companyId }))
    } catch (e) { toast.error(e || 'Failed') }
  }

  const handleDelete = (id) => setConfirmModal({ open: true, id })

  const onConfirmDelete = async () => {
    try { await dispatch(deleteCategory(confirmModal.id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
    finally { setConfirmModal({ open: false, id: null }) }
  }

  const handleDuplicate = async (id) => {
    try { await dispatch(duplicateCategory({ id, companyId })).unwrap(); toast.success('Duplicated') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const columns = [
    { key: 'name', header: 'Name' },
    {
      key: 'actions', header: 'Actions',
      render: r => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Edit</Button>
          <Button size="sm" variant="outline" onClick={() => handleDuplicate(r.id)}>Duplicate</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(r.id)}>Delete</Button>
        </div>
      )
    }
  ]

  return (
    <div>
      <PageHeader title="Asset Categories" subtitle="Manage asset categories"
        actions={<Button onClick={openCreate}>Add Category</Button>} />
      <DataTable columns={columns} data={categories} />
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Category' : 'New Category'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name" {...register('name', { required: 'Required' })} error={errors.name?.message} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmDelete}
        title="Delete Category"
        message="Are you sure you want to delete this category? This cannot be undone."
        confirmLabel="Delete"
      />
    </div>
  )
}
