import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchLoans, createLoan, settleLoan, selectLoans, selectLoading } from './payrollSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import { formatDate } from '../../utils/formatters'
import useAuth from '../../hooks/useAuth'

const LOAN_TYPE_OPTIONS = [
  { value: 'LOAN', label: 'Loan' },
  { value: 'ADVANCED_SALARY', label: 'Advanced Salary' },
  { value: 'FINE', label: 'Fine' },
]

const APPLY_ON_OPTIONS = [
  { value: 'end_of_month', label: 'End of Month' },
  { value: 'start_of_month', label: 'Start of Month' },
]

export default function LoansPage() {
  const dispatch = useDispatch()
  const { user, isEmployee } = useAuth()
  const isEmp = isEmployee()
  const loans = useSelector(selectLoans)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: { isFixed: true }
  })

  const isFixed = watch('isFixed')

  useEffect(() => { dispatch(fetchLoans()) }, [dispatch])

  const handleSettle = async (id) => {
    if (!window.confirm('Mark this loan as settled?')) return
    try { await dispatch(settleLoan(id)).unwrap(); toast.success('Loan settled') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const onSubmit = async (formData) => {
    try {
      await dispatch(createLoan({
        ...formData,
        employee: { id: Number(formData.employeeId) },
        company: { id: user?.companyId },
      })).unwrap()
      toast.success('Loan created')
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'loanType', header: 'Type' },
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeCode || '—' : '—'
    }},
    { accessorKey: 'loanAmount', header: 'Amount', cell: ({ getValue }) => getValue() ? `$${getValue()}` : '—' },
    { accessorKey: 'installmentAmount', header: 'Installment', cell: ({ getValue }) => getValue() ? `$${getValue()}` : '—' },
    { accessorKey: 'installments', header: 'Installments' },
    { accessorKey: 'providedDate', header: 'Provided', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'settled', header: 'Status', cell: ({ getValue }) => (
      <Badge label={getValue() ? 'Settled' : 'Active'} variant={getValue() ? 'success' : 'warning'} />
    )},
    { id: 'actions', header: '', cell: ({ row }) => !isEmp && !row.original.settled ? (
      <Button size="sm" variant="success" onClick={() => handleSettle(row.original.id)}>Settle</Button>
    ) : null },
  ]

  return (
    <div>
      <PageHeader title="Loan Accounts" subtitle="Employee loans, advances, and fines"
        actions={!isEmp && <Button onClick={() => { reset({ isFixed: true }); setModalOpen(true) }}>+ New Loan</Button>} />
      <DataTable columns={columns} data={loans} loading={loading} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Loan Account"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Create</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <Select label="Loan Type" options={LOAN_TYPE_OPTIONS} {...register('loanType')} />
          <Input label="Employee ID" error={errors.employeeId?.message} {...register('employeeId', { required: 'Required' })} />
          <Input label="Loan Amount" type="number" step="0.01" error={errors.loanAmount?.message} {...register('loanAmount', { required: 'Required', valueAsNumber: true })} />
          <Input label="Provided Date" type="date" {...register('providedDate')} />
          <Input label="Installment Amount" type="number" step="0.01" {...register('installmentAmount', { valueAsNumber: true })} />
          <Input label="Number of Installments" type="number" {...register('installments', { valueAsNumber: true })} />
          <Input label="Installment Start Date" type="date" {...register('installmentStartDate')} />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3} {...register('description')} />
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="isFixed" {...register('isFixed')} className="h-4 w-4 text-indigo-600 rounded" />
            <label htmlFor="isFixed" className="text-sm text-gray-700">Fixed Amount</label>
          </div>

          {!isFixed && (
            <Input label="Rate (%)" type="number" step="0.01" {...register('rate', { valueAsNumber: true })} />
          )}

          <Select label="Apply On" options={APPLY_ON_OPTIONS} {...register('applyOn')} />
        </div>
      </Modal>
    </div>
  )
}
