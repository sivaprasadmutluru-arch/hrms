import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  fetchAll, create, update, remove, assign, returnAsset, duplicateAsset,
  exportAssets, importAssets, fetchCategories,
  selectAll, selectLoading, selectPagination, selectCategories,
} from './assetsSlice'
import {
  fetchAll as fetchEmployees,
  selectAll as selectEmployees,
} from '../employees/employeesSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import ConfirmModal from '../../components/common/ConfirmModal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Pagination from '../../components/common/Pagination'
import { formatDate } from '../../utils/formatters'
import useAuth from '../../hooks/useAuth'

export default function AssetsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user, effectiveCompanyId } = useAuth()
  const companyId = effectiveCompanyId
  const data = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const pagination = useSelector(selectPagination)
  const categories = useSelector(selectCategories)
  const employees = useSelector(selectEmployees)
  const [modalOpen, setModalOpen] = useState(false)
  const [assignModal, setAssignModal] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [editing, setEditing] = useState(null)
  const importRef = useRef(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const { register: regAssign, handleSubmit: handleAssignSubmit, reset: resetAssign, formState: { errors: assignErrors } } = useForm()

  useEffect(() => {
    dispatch(fetchAll({ page: 0, size: 20 }))
    if (companyId) dispatch(fetchCategories({ companyId }))
    dispatch(fetchEmployees({ size: 500 }))
  }, [dispatch, companyId])

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (row) => { setEditing(row); reset({ ...row, categoryId: row.category?.id ?? '', assignedToId: row.assignedTo?.id ?? '' }); setModalOpen(true) }
  const openAssign = (row) => { setAssignModal(row); resetAssign({}) }

  const onSubmit = async ({ categoryId, assignedToId, ...formData }) => {
    const category = categoryId ? { id: Number(categoryId) } : undefined
    const assignedTo = assignedToId ? { id: Number(assignedToId) } : undefined
    try {
      if (editing) {
        await dispatch(update({ id: editing.id, data: { ...formData, ...(category && { category }), assignedTo: assignedTo ?? null } })).unwrap()
        toast.success('Asset updated')
      } else {
        await dispatch(create({ ...formData, company: { id: companyId }, ...(category && { category }), ...(assignedTo && { assignedTo }) })).unwrap()
        toast.success('Asset created')
      }
      setModalOpen(false)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Error') }
  }

  const onAssign = async (formData) => {
    try {
      await dispatch(assign({ id: assignModal.id, employeeId: formData.employeeId })).unwrap()
      toast.success('Asset assigned')
      setAssignModal(null)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleReturn = async (id) => {
    try {
      await dispatch(returnAsset(id)).unwrap()
      toast.success('Asset returned')
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch { toast.error('Failed to return asset') }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await dispatch(remove(deleteTarget.id)).unwrap()
      toast.success('Asset deleted')
      setDeleteTarget(null)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Failed to delete asset') }
    finally { setDeleteLoading(false) }
  }

  const handleDuplicate = async (id) => {
    try {
      await dispatch(duplicateAsset({ id, companyId })).unwrap()
      toast.success('Asset duplicated')
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Failed to duplicate') }
  }

  const handleExport = async () => {
    try {
      const blob = await dispatch(exportAssets(companyId)).unwrap()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'assets.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) { toast.error(e || 'Export failed') }
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const result = await dispatch(importAssets({ file, companyId })).unwrap()
      toast.success(`Imported ${result.count ?? 'assets'} successfully`)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Import failed') }
    e.target.value = ''
  }

  const columns = [
    { accessorKey: 'assetName', header: 'Asset Name' },
    { accessorKey: 'assetId', header: 'Tag' },
    { accessorKey: 'category.name', header: 'Category', cell: ({ row }) => row.original.category?.name || row.original.category || '—' },
    { accessorKey: 'assignedTo', header: 'Assigned To', cell: ({ getValue }) => getValue() ? `${getValue().firstName || ''} ${getValue().lastName || ''}`.trim() : <span className="text-gray-400">Unassigned</span> },
    { accessorKey: 'purchaseDate', header: 'Purchased', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue() || 'AVAILABLE'} variant={getValue() === 'ASSIGNED' ? 'primary' : getValue() === 'MAINTENANCE' ? 'warning' : 'success'} /> },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="secondary" onClick={() => navigate(`/assets/${row.original.id}`)}>Details</Button>
          <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => handleDuplicate(row.original.id)}>Duplicate</Button>
          {row.original.status !== 'ASSIGNED' && <Button size="sm" variant="primary" onClick={() => openAssign(row.original)}>Assign</Button>}
          {row.original.status === 'ASSIGNED' && <Button size="sm" variant="ghost" onClick={() => handleReturn(row.original.id)}>Return</Button>}
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(row.original)}>Delete</Button>
        </div>
      )
    },
  ]

  return (
    <div>
      <PageHeader title="Asset Inventory" subtitle="Track and manage company assets"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={handleExport}>Export</Button>
            <Button variant="secondary" onClick={() => importRef.current?.click()}>Import</Button>
            <input ref={importRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
            <Button onClick={openCreate}>+ New Asset</Button>
          </div>
        }
      />

      <DataTable columns={columns} data={data} loading={loading} />
      <Pagination page={pagination.page} totalPages={Math.ceil(pagination.total / pagination.size)} onPageChange={p => dispatch(fetchAll({ page: p, size: 20 }))} />

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Asset' : 'New Asset'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Asset Name" error={errors.assetName?.message} {...register('assetName', { required: 'Required' })} />
          <Input label="Asset Tag / ID" {...register('assetId')} />
          <Select label="Category" placeholder="— Select category —"
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            {...register('categoryId')} />
          <Select label="Status" options={['AVAILABLE', 'IN_USE', 'DAMAGED', 'RETIRED']} {...register('status')} />
          <Select label="Assigned To" placeholder="— Unassigned —"
            options={employees.map(e => ({ value: e.id, label: `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.email }))}
            {...register('assignedToId')} />
          <Input label="Purchase Date" type="date" {...register('purchaseDate')} />
          <Input label="Purchase Cost" type="number" {...register('purchaseCost')} />
          <Input label="Warranty Expiry" type="date" {...register('warrantyExpiry')} />
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        loading={deleteLoading}
        title="Delete Asset"
        message={`Are you sure you want to delete "${deleteTarget?.assetName}"? This action cannot be undone.`}
        confirmLabel="Delete"
      />

      {/* Assign Modal */}
      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title={`Assign: ${assignModal?.assetName}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setAssignModal(null)}>Cancel</Button>
            <Button onClick={handleAssignSubmit(onAssign)}>Assign</Button>
          </div>
        }>
        <div className="space-y-4">
          <Select label="Employee" placeholder="— Select employee —"
            options={employees.map(e => ({ value: e.id, label: `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.email }))}
            error={assignErrors.employeeId?.message}
            {...regAssign('employeeId', { required: 'Required' })} />
        </div>
      </Modal>
    </div>
  )
}
