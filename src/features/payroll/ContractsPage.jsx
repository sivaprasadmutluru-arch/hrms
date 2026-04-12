import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchAll, create, update, selectLoading, selectPagination,
  fetchConditions, createCondition, updateCondition, deleteCondition, selectConditions,
  fetchFilingStatuses, selectFilingStatuses,
  fetchAllowances, selectAllowances,
  fetchDeductions, selectDeductions,
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
import ConfirmModal from '../../components/common/ConfirmModal'
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

const CONDITION_TYPE_OPTIONS = [
  { value: 'EQUAL', label: 'Equal (==)' },
  { value: 'NOT_EQUAL', label: 'Not Equal (!=)' },
  { value: 'LESS_THAN', label: 'Less Than (<)' },
  { value: 'GREATER_THAN', label: 'Greater Than (>)' },
  { value: 'LESS_THAN_OR_EQUAL', label: 'Less Than or Equal (<=)' },
  { value: 'GREATER_THAN_OR_EQUAL', label: 'Greater Than or Equal (>=)' },
  { value: 'CONTAINS', label: 'Contains' },
]

const FIELD_OPTIONS = [
  { value: 'children', label: 'Children' },
  { value: 'marital_status', label: 'Marital Status' },
  { value: 'experience', label: 'Experience' },
  { value: 'gender', label: 'Gender' },
  { value: 'country', label: 'Country' },
  { value: 'state', label: 'State' },
  { value: 'contract_set__pay_frequency', label: 'Pay Frequency' },
  { value: 'contract_set__wage_type', label: 'Wage Type' },
  { value: 'contract_set__department__department', label: 'Department on Contract' },
]

function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value ?? '—'}</p>
    </div>
  )
}

export default function ContractsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const contracts = useSelector(s => s.payroll.contracts)
  const conditions = useSelector(selectConditions)
  const allowances = useSelector(selectAllowances)
  const deductions = useSelector(selectDeductions)
  const loading = useSelector(selectLoading)
  const pagination = useSelector(selectPagination)

  const [tab, setTab] = useState('Contracts')
  const [modalOpen, setModalOpen] = useState(false)
  const [employeeOptions, setEmployeeOptions] = useState([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [condModalOpen, setCondModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [editingCond, setEditingCond] = useState(null)
  const [viewContract, setViewContract] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })

  const filingStatuses = useSelector(selectFilingStatuses)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm()
  const { register: regCond, handleSubmit: handleCondSubmit, reset: resetCond, watch: watchCond, formState: { errors: condErrors } } = useForm({ defaultValues: { isAllowance: true } })

  const deductLeaveFromBasicPay = watch('deductLeaveFromBasicPay')
  const calculateDailyLeaveAmount = watch('calculateDailyLeaveAmount')
  const condIsAllowance = watchCond('isAllowance')

  useEffect(() => { dispatch(fetchAll({ page: 0, size: 20 })) }, [dispatch])
  useEffect(() => { dispatch(fetchFilingStatuses()) }, [dispatch])
  useEffect(() => { dispatch(fetchAllowances()) }, [dispatch])
  useEffect(() => { dispatch(fetchDeductions()) }, [dispatch])
  useEffect(() => {
    if (tab === 'Pay Conditions') dispatch(fetchConditions({}))
  }, [tab, dispatch])

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

  const openCreate = () => { setEditing(null); reset({ contractStatus: 'ACTIVE' }); setModalOpen(true); loadEmployees() }
  const openEdit = (row) => {
    setEditing(row)
    reset({ ...row, employeeId: row.employee?.id, filingStatusId: row.filingStatus?.id })
    setModalOpen(true)
    loadEmployees()
  }
  const openCreateCond = () => { setEditingCond(null); resetCond({ isAllowance: true }); setCondModalOpen(true) }
  const openEditCond = (row) => {
    setEditingCond(row)
    resetCond({
      field: row.field,
      conditionType: row.conditionType,
      value: row.value,
      isAllowance: row.isAllowance ?? true,
      allowanceId: row.allowanceId,
      deductionId: row.deductionId,
    })
    setCondModalOpen(true)
  }

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
      const isAllowance = formData.isAllowance ?? true
      const payload = {
        field: formData.field,
        conditionType: formData.conditionType,
        value: formData.value,
        isAllowance,
        allowanceId: isAllowance ? (Number(formData.allowanceId) || null) : null,
        deductionId: !isAllowance ? (Number(formData.deductionId) || null) : null,
      }
      if (editingCond) { await dispatch(updateCondition({ id: editingCond.id, data: payload })).unwrap(); toast.success('Condition updated') }
      else { await dispatch(createCondition(payload)).unwrap(); toast.success('Condition created') }
      setCondModalOpen(false)
      dispatch(fetchConditions({}))
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDeleteCond = (id) => setConfirmModal({ open: true, id })

  const onConfirmDelete = async () => {
    try { await dispatch(deleteCondition(confirmModal.id)).unwrap(); toast.success('Deleted') }
    catch { toast.error('Failed') }
    finally { setConfirmModal({ open: false, id: null }) }
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
    { accessorKey: 'conditionType', header: 'Condition Type' },
    { accessorKey: 'value', header: 'Value' },
    { id: 'appliesTo', header: 'Applies To', cell: ({ row }) => (
      <Badge label={row.original.isAllowance ? 'Allowance' : 'Deduction'} variant={row.original.isAllowance ? 'success' : 'warning'} />
    )},
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
          <DataTable columns={columns} data={contracts} loading={loading} onRowClick={row => setViewContract(row)} />
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

      {/* Contract Detail View Modal */}
      <Modal open={!!viewContract} onClose={() => setViewContract(null)} title="Contract Details" size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setViewContract(null)}>Close</Button>
            <Button onClick={() => { openEdit(viewContract); setViewContract(null) }}>Edit</Button>
          </div>
        }>
        {viewContract && (
          <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Basic Info</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <DetailRow label="Employee" value={viewContract.employee ? `${viewContract.employee.firstName || ''} ${viewContract.employee.lastName || ''}`.trim() : '—'} />
                <DetailRow label="Contract Name" value={viewContract.contractName} />
                <DetailRow label="Wage Type" value={viewContract.wageType} />
                <DetailRow label="Pay Frequency" value={viewContract.payFrequency} />
                <DetailRow label="Wage" value={formatCurrency(viewContract.wage)} />
                <DetailRow label="Status" value={<Badge label={viewContract.contractStatus || 'Draft'} variant={getStatusVariant(viewContract.contractStatus)} />} />
                <DetailRow label="Start Date" value={formatDate(viewContract.startDate)} />
                <DetailRow label="End Date" value={formatDate(viewContract.endDate)} />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Allowances</h4>
              <div className="grid grid-cols-3 gap-x-6 gap-y-3">
                <DetailRow label="Housing" value={formatCurrency(viewContract.housingAllowance)} />
                <DetailRow label="Transport" value={formatCurrency(viewContract.transportAllowance)} />
                <DetailRow label="Other" value={formatCurrency(viewContract.otherAllowance)} />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Tax & Notice</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <DetailRow label="Filing Status" value={viewContract.filingStatus?.filingStatus || '—'} />
                <DetailRow label="Notice Period" value={viewContract.noticePeriodInDays ? `${viewContract.noticePeriodInDays} days` : '—'} />
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Leave Deduction</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                <DetailRow label="Deduct from Basic Pay" value={viewContract.deductLeaveFromBasicPay ? 'Yes' : 'No'} />
                <DetailRow label="Calculate Daily Amount" value={viewContract.calculateDailyLeaveAmount ? 'Yes' : 'No'} />
                {(viewContract.deductLeaveFromBasicPay || viewContract.calculateDailyLeaveAmount) && (
                  <DetailRow label="Deduction per Leave" value={formatCurrency(viewContract.deductionForOneLeaveAmount)} />
                )}
              </div>
            </div>

            {(viewContract.contractDocument || viewContract.note) && (
              <div className="border-t pt-4">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Document & Notes</h4>
                <div className="space-y-3">
                  {viewContract.contractDocument && <DetailRow label="Document" value={viewContract.contractDocument} />}
                  {viewContract.note && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Note</p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">{viewContract.note}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmDelete}
        title="Delete Condition"
        message="Are you sure you want to delete this pay condition? This cannot be undone."
        confirmLabel="Delete"
        loading={loading}
      />

      {/* Condition Modal */}
      <Modal open={condModalOpen} onClose={() => setCondModalOpen(false)} title={editingCond ? 'Edit Condition' : 'New Pay Condition'}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setCondModalOpen(false)}>Cancel</Button><Button onClick={handleCondSubmit(onCondSubmit)}>{editingCond ? 'Update' : 'Create'}</Button></div>}>
        <div className="space-y-4">
          <Select label="Field" options={FIELD_OPTIONS} error={condErrors.field?.message} {...regCond('field', { required: 'Required' })} />
          <Select label="Condition Type" options={CONDITION_TYPE_OPTIONS} error={condErrors.conditionType?.message} {...regCond('conditionType', { required: 'Required' })} />
          <Input label="Value" error={condErrors.value?.message} {...regCond('value', { required: 'Required' })} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="condIsAllowance" {...regCond('isAllowance')} className="h-4 w-4 text-indigo-600 rounded" />
            <label htmlFor="condIsAllowance" className="text-sm text-gray-700">Applies to Allowance (uncheck for Deduction)</label>
          </div>
          {condIsAllowance ? (
            <Select label="Allowance" options={allowances.map(a => ({ value: a.id, label: a.title }))} {...regCond('allowanceId')} />
          ) : (
            <Select label="Deduction" options={deductions.map(d => ({ value: d.id, label: d.title }))} {...regCond('deductionId')} />
          )}
        </div>
      </Modal>
    </div>
  )
}
