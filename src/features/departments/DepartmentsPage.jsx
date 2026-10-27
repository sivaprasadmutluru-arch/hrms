import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchAll, create, update, remove, selectAll, selectLoading, selectPagination } from './departmentsSlice'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Pagination from '../../components/common/Pagination'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'
import { Building2, UsersRound, UserRound, Search, Plus, Sparkles, X } from 'lucide-react'

export default function DepartmentsPage() {
  const dispatch = useDispatch()
  const { user, effectiveCompanyId } = useAuth()
  const data = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const pagination = useSelector(selectPagination)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [query, setQuery] = useState('')
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchAll({ page: 0, size: 20 })) }, [dispatch])

  const openCreate = () => { setEditing(null); reset({ managerId: user?.employeeId ?? '' }); setModalOpen(true) }
  const openEdit = (row) => {
    setEditing(row)
    reset({ name: row.name, managerId: row.manager?.id })
    setModalOpen(true)
  }

  const onSubmit = async (formData) => {
    const companyId = effectiveCompanyId
    try {
      if (editing) {
        await dispatch(update({
          id: editing.id,
          data: { name: formData.name },
          params: { managerId: formData.managerId || undefined },
        })).unwrap()
        toast.success('Department updated')
      } else {
        await dispatch(create({
          body: { name: formData.name },
          params: { companyId, managerId: formData.managerId || undefined },
        })).unwrap()
        toast.success('Department created')
      }
      setModalOpen(false)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDelete = async () => {
    try {
      await dispatch(remove(deleteTarget.id)).unwrap()
      toast.success('Department removed')
      setDeleteTarget(null)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'name', header: 'Department', cell: ({ row }) => (
      <div className="department-name-cell"><span className="department-row-icon"><Building2 size={17} /></span><span><b>{row.original.name}</b><small>Company department</small></span></div>
    ) },
    { id: 'manager', header: 'Manager', cell: ({ row }) => {
      const m = row.original.manager
      return m ? <span className="department-manager-cell"><span><UserRound size={15} /></span>{`${m.firstName || ''} ${m.lastName || ''}`.trim() || '—'}</span> : <span className="department-unassigned">Not assigned</span>
    }},
    { id: 'status', header: 'Status', cell: ({ row }) => (
      <Badge label={row.original.isActive === false ? 'Inactive' : 'Active'} variant={row.original.isActive === false ? 'danger' : 'success'} />
    )},
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(row.original)}>Delete</Button>
      </div>
    )},
  ]

  const filteredData = data.filter(department => department.name?.toLowerCase().includes(query.trim().toLowerCase()))
  const activeCount = data.filter(department => department.isActive !== false).length
  const inactiveCount = data.length - activeCount

  return (
    <div className="departments-page">
      <div className="departments-heading">
        <div><span className="departments-kicker"><Sparkles size={13} /> PEOPLE OPERATIONS</span><h1>Departments</h1><p>Structure your teams and keep ownership clear across the organization.</p></div>
        <Button className="department-add-button" onClick={openCreate}><Plus size={17} /> New department</Button>
      </div>
      <div className="department-metrics">
        <article><span className="department-metric-icon total"><Building2 size={19} /></span><div><small>Total departments</small><strong>{pagination.total ?? data.length}</strong></div></article>
        <article><span className="department-metric-icon active"><UsersRound size={19} /></span><div><small>Active departments</small><strong>{activeCount}</strong></div></article>
        <article><span className="department-metric-icon inactive"><UserRound size={19} /></span><div><small>Inactive departments</small><strong>{inactiveCount}</strong></div></article>
      </div>
      <section className="department-directory">
        <div className="department-directory-heading"><div><h2>Department directory</h2><p>Manage departments and their team leads.</p></div><label className="department-search"><Search size={17} /><input aria-label="Search departments" placeholder="Search departments" value={query} onChange={event => setQuery(event.target.value)} />{query && <button aria-label="Clear search" onClick={() => setQuery('')}><X size={15} /></button>}</label></div>
        <DataTable columns={columns} data={filteredData} loading={loading} />
        <Pagination page={pagination.page} totalPages={Math.ceil(pagination.total / pagination.size)} onPageChange={p => dispatch(fetchAll({ page: p, size: 20 }))} />
      </section>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="lg" panelClassName="department-modal" title={editing ? 'Edit department' : 'Create a department'}
        footer={<div className="department-modal-actions"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button className="department-save-button" onClick={handleSubmit(onSubmit)}>{editing ? 'Save changes' : 'Create department'}</Button></div>}>
        <div className="department-modal-intro"><span><Building2 size={18} /></span><p>Give this team a clear name and assign a manager if one is already in place.</p></div>
        <div className="department-form-fields">
          <label className="department-form-field"><span>Department name <i>Required</i></span><div className={errors.name ? 'has-error' : ''}><Building2 size={17} /><input autoFocus placeholder="e.g. People & Culture" {...register('name', { required: 'Enter a department name' })} /></div>{errors.name && <small>{errors.name.message}</small>}</label>
          <label className="department-form-field"><span>Manager ID <i>Optional</i></span><div><UserRound size={17} /><input placeholder="Enter employee ID" {...register('managerId')} /></div><small>Assign a department lead now, or leave this blank and add one later.</small></label>
        </div>
      </Modal>
      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Department" message={`Delete department "${deleteTarget?.name}"? This cannot be undone.`} confirmLabel="Delete" />
    </div>
  )
}
