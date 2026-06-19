import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchLoans, createLoan, settleLoan, deleteLoan, selectLoans, selectLoading } from './payrollSlice'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import ConfirmModal from '../../components/common/ConfirmModal'
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
  const [editTarget, setEditTarget] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, action: null })
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: { isFixed: true }
  })

  const isFixed = watch('isFixed')

  useEffect(() => { dispatch(fetchLoans()) }, [dispatch])

  const openEdit = (loan) => {
    setEditTarget(loan)
    reset({
      title: loan.title,
      loanType: loan.loanType,
      employeeId: loan.employee?.id,
      loanAmount: loan.loanAmount,
      providedDate: loan.providedDate,
      installmentAmount: loan.installmentAmount,
      installments: loan.installments,
      installmentStartDate: loan.installmentStartDate,
      description: loan.description,
      isFixed: loan.isFixed !== false,
      rate: loan.rate,
      applyOn: loan.applyOn,
    })
    setModalOpen(true)
  }

  const handleSettle = (id) => setConfirmModal({ open: true, id, action: 'settle' })
  const handleDelete = (id) => setConfirmModal({ open: true, id, action: 'delete' })

  const onConfirmAction = async () => {
    const { id, action } = confirmModal
    try {
      if (action === 'settle') { await dispatch(settleLoan(id)).unwrap(); toast.success('Loan settled') }
      else if (action === 'delete') { await dispatch(deleteLoan(id)).unwrap(); toast.success('Loan deleted') }
    } catch (e) { toast.error(e || 'Failed') }
    finally { setConfirmModal({ open: false, id: null, action: null }) }
  }

  const onSubmit = async (formData) => {
    try {
      if (editTarget) {
        await api.put(`/payroll/loans/${editTarget.id}`, {
          ...formData,
          employee: { id: Number(formData.employeeId) },
          company: { id: user?.companyId },
        })
        toast.success('Loan updated')
        setEditTarget(null)
        dispatch(fetchLoans())
      } else {
        await dispatch(createLoan({
          ...formData,
          employee: { id: Number(formData.employeeId) },
          company: { id: user?.companyId },
        })).unwrap()
        toast.success('Loan created')
      }
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e?.response?.data?.message || e || 'Error') }
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
    { id: 'progress', header: 'Progress', cell: ({ row }) => {
      const total = row.original.installments || 0
      const paid = row.original.paidInstallments ?? null
      if (!total) return '—'
      if (paid !== null) {
        const pct = Math.round((paid / total) * 100)
        return (
          <div className="flex items-center gap-2 min-w-[90px]">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs text-gray-500 whitespace-nowrap">{paid}/{total}</span>
          </div>
        )
      }
      return <span className="text-xs text-gray-500">{total} installments</span>
    }},
    { accessorKey: 'providedDate', header: 'Provided', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'settled', header: 'Status', cell: ({ getValue }) => (
      <Badge label={getValue() ? 'Settled' : 'Active'} variant={getValue() ? 'success' : 'warning'} />
    )},
    { id: 'actions', header: '', cell: ({ row }) => !isEmp && !row.original.settled ? (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="success" onClick={() => handleSettle(row.original.id)}>Settle</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    ) : null },
  ]

  return (
    <div>
      <PageHeader title="Loan Accounts" subtitle="Employee loans, advances, and fines"
        actions={!isEmp && <Button onClick={() => { setEditTarget(null); reset({ isFixed: true }); setModalOpen(true) }}>+ New Loan</Button>} />
      <DataTable columns={columns} data={loans} loading={loading} />
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null) }} title={editTarget ? 'Edit Loan Account' : 'Create Loan Account'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditTarget(null) }}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editTarget ? 'Update' : 'Create'}</Button>
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
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null, action: null })}
        onConfirm={onConfirmAction}
        title={confirmModal.action === 'settle' ? 'Settle Loan' : 'Delete Loan'}
        message={confirmModal.action === 'settle' ? 'Mark this loan as settled? This action cannot be undone.' : 'Are you sure you want to delete this loan? This cannot be undone.'}
        confirmLabel={confirmModal.action === 'settle' ? 'Settle' : 'Delete'}
        loading={loading}
      />
    </div>
  )
}
