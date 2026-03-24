import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchAll, create, update, selectLoading, selectPagination,
  fetchConditions, createCondition, updateCondition, deleteCondition, selectConditions,
} from './payrollSlice'
import useAuth from '../../hooks/useAuth'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Pagination from '../../components/common/Pagination'
import { formatDate, formatCurrency } from '../../utils/formatters'

const TABS = ['Contracts', 'Pay Conditions']

export default function ContractsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const contracts = useSelector(s => s.payroll.contracts)
  const conditions = useSelector(selectConditions)
  const loading = useSelector(selectLoading)
  const pagination = useSelector(selectPagination)

  const [tab, setTab] = useState('Contracts')
  const [modalOpen, setModalOpen] = useState(false)
  const [condModalOpen, setCondModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editingCond, setEditingCond] = useState(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const { register: regCond, handleSubmit: handleCondSubmit, reset: resetCond, formState: { errors: condErrors } } = useForm()

  useEffect(() => { dispatch(fetchAll({ page: 0, size: 20 })) }, [dispatch])
  useEffect(() => { if (tab === 'Pay Conditions') dispatch(fetchConditions({})) }, [tab, dispatch])

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (row) => { setEditing(row); reset(row); setModalOpen(true) }
  const openCreateCond = () => { setEditingCond(null); resetCond({}); setCondModalOpen(true) }
  const openEditCond = (row) => { setEditingCond(row); resetCond(row); setCondModalOpen(true) }

  const onSubmit = async (formData) => {
    try {
      const payload = {
        ...formData,
        employee: { id: Number(formData.employeeId) },
        company: { id: user?.companyId },
      }
      delete payload.employeeId
      if (editing) { await dispatch(update({ id: editing.id, data: payload })).unwrap(); toast.success('Contract updated') }
      else { await dispatch(create(payload)).unwrap(); toast.success('Contract created') }
      setModalOpen(false)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Error') }
  }

  const onCondSubmit = async (formData) => {
    try {
      if (editingCond) { await dispatch(updateCondition({ id: editingCond.id, data: formData })).unwrap(); toast.success('Condition updated') }
      else { await dispatch(createCondition(formData)).unwrap(); toast.success('Condition created') }
      setCondModalOpen(false)
      dispatch(fetchConditions({}))
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDeleteCond = async (id) => {
    if (!window.confirm('Delete this condition?')) return
    try { await dispatch(deleteCondition(id)).unwrap(); toast.success('Deleted') }
    catch { toast.error('Failed') }
  }

  const columns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—' : '—'
    }},
    { accessorKey: 'contractName', header: 'Contract Name' },
    { accessorKey: 'wageType', header: 'Type' },
    { accessorKey: 'wage', header: 'Wage', cell: ({ getValue }) => formatCurrency(getValue()) },
    { accessorKey: 'startDate', header: 'Start', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'endDate', header: 'End', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'contractStatus', header: 'Status', cell: ({ getValue }) => <Badge label={getValue() || 'Draft'} variant={getValue() === 'EXPIRED' ? 'danger' : getValue() === 'ACTIVE' ? 'success' : 'default'} /> },
    { id: 'actions', header: '', cell: ({ row }) => <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button> },
  ]

  const condColumns = [
    { accessorKey: 'field', header: 'Field' },
    { accessorKey: 'operator', header: 'Operator' },
    { accessorKey: 'value', header: 'Value' },
    { accessorKey: 'secondaryValue', header: 'Secondary Value', cell: ({ getValue }) => getValue() || '—' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEditCond(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDeleteCond(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Payroll Contracts" subtitle="Employee contracts and salary details"
        actions={
          tab === 'Contracts'
            ? <Button onClick={openCreate}>+ New Contract</Button>
            : <Button onClick={openCreateCond}>+ New Condition</Button>
        }
      />

      <div className="flex gap-2 border-b border-gray-200 mb-4">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Contracts' && (
        <>
          <DataTable columns={columns} data={contracts} loading={loading} />
          <Pagination page={pagination.page} totalPages={Math.ceil(pagination.total / pagination.size)} onPageChange={p => dispatch(fetchAll({ page: p, size: 20 }))} />
        </>
      )}

      {tab === 'Pay Conditions' && (
        <DataTable columns={condColumns} data={conditions} loading={loading} />
      )}

      {/* Contract Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Contract' : 'New Contract'} size="lg"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button></div>}>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Employee ID" error={errors.employeeId?.message} {...register('employeeId', { required: 'Required' })} />
          <Input label="Contract Name" error={errors.contractName?.message} {...register('contractName', { required: 'Required' })} />
          <Select label="Wage Type" options={['MONTHLY', 'HOURLY', 'DAILY']} {...register('wageType')} />
          <Input label="Wage" type="number" {...register('wage')} />
          <Input label="Start Date" type="date" {...register('startDate')} />
          <Input label="End Date" type="date" {...register('endDate')} />
        </div>
      </Modal>

      {/* Condition Modal */}
      <Modal open={condModalOpen} onClose={() => setCondModalOpen(false)} title={editingCond ? 'Edit Condition' : 'New Pay Condition'}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setCondModalOpen(false)}>Cancel</Button><Button onClick={handleCondSubmit(onCondSubmit)}>{editingCond ? 'Update' : 'Create'}</Button></div>}>
        <div className="space-y-4">
          <Input label="Field" error={condErrors.field?.message} {...regCond('field', { required: 'Required' })} placeholder="e.g. basic_pay" />
          <Input label="Operator" error={condErrors.operator?.message} {...regCond('operator', { required: 'Required' })} placeholder="e.g. gt, lt, eq" />
          <Input label="Value" error={condErrors.value?.message} {...regCond('value', { required: 'Required' })} />
          <Input label="Secondary Value (optional)" {...regCond('secondaryValue')} />
        </div>
      </Modal>
    </div>
  )
}
