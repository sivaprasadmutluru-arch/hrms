import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchAll, create, update, selectLoading, selectPagination,
  fetchConditions, createCondition, updateCondition, deleteCondition, selectConditions,
  fetchFilingStatuses, selectFilingStatuses,
} from './payrollSlice'
import { fetchAll as fetchEmployees } from '../employees/employeesSlice'
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

const WAGE_TYPE_OPTIONS = [
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'HOURLY', label: 'Hourly' },
  { value: 'DAILY', label: 'Daily' },
]

const PAY_FREQUENCY_OPTIONS = [
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'SEMI_MONTHLY', label: 'Semi-Monthly' },
]

const CONTRACT_STATUS_OPTIONS = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'TERMINATED', label: 'Terminated' },
]

export default function ContractsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const contracts = useSelector(s => s.payroll.contracts)
  const conditions = useSelector(selectConditions)
  const loading = useSelector(selectLoading)
  const pagination = useSelector(selectPagination)

  const [tab, setTab] = useState('Contracts')
  const [modalOpen, setModalOpen] = useState(false)
  const [employeeOptions, setEmployeeOptions] = useState([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [condModalOpen, setCondModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editingCond, setEditingCond] = useState(null)

  const filingStatuses = useSelector(selectFilingStatuses)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm()
  const { register: regCond, handleSubmit: handleCondSubmit, reset: resetCond, formState: { errors: condErrors } } = useForm()

  const deductLeaveFromBasicPay = watch('deductLeaveFromBasicPay')
  const calculateDailyLeaveAmount = watch('calculateDailyLeaveAmount')

  useEffect(() => { dispatch(fetchAll({ page: 0, size: 20 })) }, [dispatch])
  useEffect(() => { dispatch(fetchFilingStatuses()) }, [dispatch])
  useEffect(() => { if (tab === 'Pay Conditions') dispatch(fetchConditions({})) }, [tab, dispatch])

  const loadEmployees = async () => {
    setEmployeesLoading(true)
    try {
      const result = await dispatch(fetchEmployees({ page: 0, size: 200 })).unwrap()
      const list = result.content ?? result
      setEmployeeOptions(list.map(e => ({
        value: e.id,
        label: `${e.firstName || ''} ${e.lastName || ''}`.trim() + (e.employeeCode ? ` (${e.employeeCode})` : ''),
      })))
    } catch { /* silently ignore */ }
    finally { setEmployeesLoading(false) }
  }

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true); loadEmployees() }
  const openEdit = (row) => {
    setEditing(row)
    reset({ ...row, employeeId: row.employee?.id, filingStatusId: row.filingStatus?.id })
    setModalOpen(true)
    loadEmployees()
  }
  const openCreateCond = () => { setEditingCond(null); resetCond({}); setCondModalOpen(true) }
  const openEditCond = (row) => { setEditingCond(row); resetCond(row); setCondModalOpen(true) }

  const onSubmit = async (formData) => {
    try {
      const employeeId = Number(formData.employeeId)
      const payload = {
        ...formData,
        ...(employeeId > 0 ? { employee: { id: employeeId } } : {}),
        ...(user?.companyId ? { company: { id: user.companyId } } : {}),
        filingStatus: formData.filingStatusId ? { id: Number(formData.filingStatusId) } : null,
      }
      delete payload.employeeId
      delete payload.filingStatusId
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

  const getStatusVariant = (status) => {
    if (status === 'ACTIVE') return 'success'
    if (status === 'EXPIRED') return 'danger'
    if (status === 'TERMINATED') return 'danger'
    return 'default'
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
    { accessorKey: 'contractStatus', header: 'Status', cell: ({ getValue }) => <Badge label={getValue() || 'Draft'} variant={getStatusVariant(getValue())} /> },
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
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)} disabled={employeesLoading}>{employeesLoading ? 'Loading...' : editing ? 'Update' : 'Create'}</Button></div>}>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Employee" placeholder={employeesLoading ? 'Loading employees...' : 'Select employee...'} options={employeeOptions} error={errors.employeeId?.message} {...register('employeeId', { required: 'Required' })} />
            <Input label="Contract Name" error={errors.contractName?.message} {...register('contractName', { required: 'Required' })} />
            <Select label="Wage Type" options={WAGE_TYPE_OPTIONS} {...register('wageType')} />
            <Select label="Pay Frequency" options={PAY_FREQUENCY_OPTIONS} {...register('payFrequency')} />
            <Input label="Wage" type="number" step="0.01" {...register('wage', { valueAsNumber: true })} />
            <Select label="Contract Status" options={CONTRACT_STATUS_OPTIONS} {...register('contractStatus')} />
            <Input label="Start Date" type="date" {...register('startDate')} />
            <Input label="End Date" type="date" {...register('endDate')} />
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Allowances</h4>
            <div className="grid grid-cols-3 gap-4">
              <Input label="Housing Allowance" type="number" step="0.01" {...register('housingAllowance', { valueAsNumber: true })} />
              <Input label="Transport Allowance" type="number" step="0.01" {...register('transportAllowance', { valueAsNumber: true })} />
              <Input label="Other Allowance" type="number" step="0.01" {...register('otherAllowance', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Tax & Notice</h4>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Filing Status"
                placeholder="Select filing status..."
                options={filingStatuses.map(fs => ({ value: fs.id, label: fs.filingStatus }))}
                {...register('filingStatusId')}
              />
              <Input label="Notice Period (days)" type="number" {...register('noticePeriodInDays', { valueAsNumber: true })} />
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Leave Deduction</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="deductLeaveFromBasicPay" {...register('deductLeaveFromBasicPay')} className="h-4 w-4 text-indigo-600 rounded" />
                <label htmlFor="deductLeaveFromBasicPay" className="text-sm text-gray-700">Deduct Leave from Basic Pay</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="calculateDailyLeaveAmount" {...register('calculateDailyLeaveAmount')} className="h-4 w-4 text-indigo-600 rounded" />
                <label htmlFor="calculateDailyLeaveAmount" className="text-sm text-gray-700">Calculate Daily Leave Amount</label>
              </div>
            </div>
            {(deductLeaveFromBasicPay || calculateDailyLeaveAmount) && (
              <div className="mt-3">
                <Input label="Deduction for One Leave (amount)" type="number" step="0.01" {...register('deductionForOneLeaveAmount', { valueAsNumber: true })} />
              </div>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Document & Notes</h4>
            <div className="space-y-3">
              <Input label="Contract Document (file path)" {...register('contractDocument')} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3} {...register('note')} />
              </div>
            </div>
          </div>
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
