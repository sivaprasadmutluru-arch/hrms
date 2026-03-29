import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchAllowances, createAllowance, updateAllowance, deleteAllowance,
  selectAllowances, selectLoading,
} from './payrollSlice'
import useAuth from '../../hooks/useAuth'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'

const BASED_ON_OPTIONS = [
  { value: 'basic_pay', label: 'Basic Pay' },
  { value: 'children', label: 'Children' },
  { value: 'attendance', label: 'Attendance' },
  { value: 'overtime', label: 'Overtime' },
  { value: 'shift_id', label: 'Shift' },
  { value: 'work_type_id', label: 'Work Type' },
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

const CONDITION_OPTIONS = [
  { value: 'equal', label: 'Equal (==)' },
  { value: 'notequal', label: 'Not Equal (!=)' },
  { value: 'lt', label: 'Less Than (<)' },
  { value: 'gt', label: 'Greater Than (>)' },
  { value: 'le', label: 'Less Than or Equal (<=)' },
  { value: 'ge', label: 'Greater Than or Equal (>=)' },
  { value: 'icontains', label: 'Contains' },
]

export default function AllowancesPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const allowances = useSelector(selectAllowances)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: { isFixed: true, isTaxable: true, isConditionBased: false, includeActiveEmployees: false, hasMaxLimit: false }
  })

  const isFixed = watch('isFixed')
  const isConditionBased = watch('isConditionBased')
  const basedOn = watch('basedOn')
  const hasMaxLimit = watch('hasMaxLimit')

  useEffect(() => { dispatch(fetchAllowances()) }, [dispatch])

  const openCreate = () => { setEditing(null); reset({ isFixed: true, isTaxable: true, isConditionBased: false, includeActiveEmployees: false, hasMaxLimit: false }); setModalOpen(true) }
  const openEdit = (row) => { setEditing(row); reset({ ...row, isFixed: row.isFixed ?? true }); setModalOpen(true) }

  const onSubmit = async (formData) => {
    try {
      const payload = { ...formData, company: { id: user?.companyId } }
      if (editing) {
        await dispatch(updateAllowance({ id: editing.id, data: payload })).unwrap()
        toast.success('Allowance updated')
      } else {
        await dispatch(createAllowance(payload)).unwrap()
        toast.success('Allowance created')
      }
      setModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this allowance?')) return
    try { await dispatch(deleteAllowance(id)).unwrap(); toast.success('Deleted') }
    catch { toast.error('Failed') }
  }

  const columns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'isFixed', header: 'Type', cell: ({ getValue }) => (
      <Badge label={getValue() ? 'Fixed' : 'Variable'} variant={getValue() ? 'primary' : 'default'} />
    )},
    { accessorKey: 'amount', header: 'Amount', cell: ({ getValue, row }) => {
      if (row.original.isFixed) return getValue() != null ? `$${getValue()}` : '—'
      return row.original.rate != null ? `${row.original.rate}% of ${row.original.basedOn || '—'}` : '—'
    }},
    { accessorKey: 'isTaxable', header: 'Taxable', cell: ({ getValue }) => (
      <Badge label={getValue() ? 'Yes' : 'No'} variant={getValue() ? 'warning' : 'default'} />
    )},
    { accessorKey: 'isConditionBased', header: 'Condition', cell: ({ getValue }) => getValue() ? <Badge label="Yes" variant="primary" /> : '—' },
    { accessorKey: 'includeActiveEmployees', header: 'All Employees', cell: ({ getValue }) => getValue() ? <Badge label="Yes" variant="success" /> : '—' },
    { accessorKey: 'oneTimeDate', header: 'One-time Date', cell: ({ getValue }) => getValue() || '—' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Allowances" subtitle="Salary allowances and benefits configuration"
        actions={<Button onClick={openCreate}>+ New Allowance</Button>} />
      <DataTable columns={columns} data={allowances} loading={loading} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Allowance' : 'New Allowance'} size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        }>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <Input label="Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isTaxable" {...register('isTaxable')} className="h-4 w-4 text-indigo-600 rounded" />
              <label htmlFor="isTaxable" className="text-sm text-gray-700">Taxable</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isFixed" {...register('isFixed')} className="h-4 w-4 text-indigo-600 rounded" />
              <label htmlFor="isFixed" className="text-sm text-gray-700">Fixed Amount</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="includeActiveEmployees" {...register('includeActiveEmployees')} className="h-4 w-4 text-indigo-600 rounded" />
              <label htmlFor="includeActiveEmployees" className="text-sm text-gray-700">Include All Active Employees</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isConditionBased" {...register('isConditionBased')} className="h-4 w-4 text-indigo-600 rounded" />
              <label htmlFor="isConditionBased" className="text-sm text-gray-700">Condition Based</label>
            </div>
          </div>

          {isFixed ? (
            <Input label="Amount" type="number" step="0.01" error={errors.amount?.message} {...register('amount', { valueAsNumber: true })} />
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <Select label="Based On" options={BASED_ON_OPTIONS} {...register('basedOn')} />
              {(!basedOn || basedOn === 'basic_pay') && (
                <Input label="Rate (%)" type="number" step="0.01" {...register('rate', { valueAsNumber: true })} />
              )}
              {basedOn === 'attendance' && (
                <Input label="Per Attendance Amount" type="number" step="0.01" {...register('perAttendanceFixedAmount', { valueAsNumber: true })} />
              )}
              {basedOn === 'children' && (
                <Input label="Per Child Amount" type="number" step="0.01" {...register('perChildrenFixedAmount', { valueAsNumber: true })} />
              )}
              {basedOn === 'shift_id' && (
                <Input label="Shift Per Attendance Amount" type="number" step="0.01" {...register('shiftPerAttendanceAmount', { valueAsNumber: true })} />
              )}
              {basedOn === 'overtime' && (
                <Input label="Amount Per Hour" type="number" step="0.01" {...register('amountPerOneHr', { valueAsNumber: true })} />
              )}
              {basedOn === 'work_type_id' && (
                <Input label="Work Type Per Attendance Amount" type="number" step="0.01" {...register('workTypePerAttendanceAmount', { valueAsNumber: true })} />
              )}
            </div>
          )}

          {isConditionBased && (
            <div className="grid grid-cols-3 gap-3 bg-gray-50 p-3 rounded-lg">
              <Select label="Field" options={FIELD_OPTIONS} {...register('field')} />
              <Select label="Condition" options={CONDITION_OPTIONS} {...register('condition')} />
              <Input label="Value" {...register('value')} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input label="One-time Date (optional)" type="date" {...register('oneTimeDate')} />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="hasMaxLimit" {...register('hasMaxLimit')} className="h-4 w-4 text-indigo-600 rounded" />
                <label htmlFor="hasMaxLimit" className="text-sm text-gray-700">Has Max Limit</label>
              </div>
              {hasMaxLimit && (
                <Input label="Maximum Amount" type="number" step="0.01" {...register('maximumAmount', { valueAsNumber: true })} />
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t pt-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">If Choice</label>
              <select {...register('ifChoice')} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="basic_pay">Basic Pay</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">If Condition</label>
              <select {...register('ifCondition')} className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="gt">Greater Than</option>
                <option value="lt">Less Than</option>
                <option value="equal">Equal</option>
                <option value="notequal">Not Equal</option>
                <option value="ge">Greater or Equal</option>
                <option value="le">Less or Equal</option>
                <option value="range">Range</option>
              </select>
            </div>
            <Input label="If Amount" type="number" step="0.01" {...register('ifAmount', { valueAsNumber: true })} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Range (optional)" type="number" step="0.01" {...register('startRange', { valueAsNumber: true })} />
            <Input label="End Range (optional)" type="number" step="0.01" {...register('endRange', { valueAsNumber: true })} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
