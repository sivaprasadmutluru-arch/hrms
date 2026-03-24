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

export default function LoansPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const loans = useSelector(selectLoans)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

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
    { id: 'actions', header: '', cell: ({ row }) => !row.original.settled ? (
      <Button size="sm" variant="success" onClick={() => handleSettle(row.original.id)}>Settle</Button>
    ) : null },
  ]

  return (
    <div>
      <PageHeader title="Loan Accounts" subtitle="Employee loans, advances, and fines"
        actions={<Button onClick={() => { reset(); setModalOpen(true) }}>+ New Loan</Button>} />
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
          <Input label="Loan Amount" type="number" step="0.01" error={errors.loanAmount?.message} {...register('loanAmount', { required: 'Required' })} />
          <Input label="Provided Date" type="date" {...register('providedDate')} />
          <Input label="Installment Amount" type="number" step="0.01" {...register('installmentAmount')} />
          <Input label="Number of Installments" type="number" {...register('installments')} />
          <Input label="Installment Start Date" type="date" {...register('installmentStartDate')} />
        </div>
      </Modal>
    </div>
  )
}
