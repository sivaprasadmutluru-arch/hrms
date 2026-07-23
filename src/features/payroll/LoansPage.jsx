import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchLoans, createLoan, settleLoan, deleteLoan, selectLoans, selectLoading } from './payrollSlice'
import {
  fetchMyLoanRequests, submitLoanRequest,
  approveLoanRequest, rejectLoanRequest, fetchAllLoanRequestsForCompany,
  selectMyLoanRequests, selectAllLoanRequests, selectLoanRequestsLoading,
} from './loanRequestSlice'
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

const REQUEST_STATUS_VARIANT = { PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger' }
const TABS = ['Accounts', 'Requests']

export default function LoansPage() {
  const dispatch = useDispatch()
  const { user, isEmployee, effectiveCompanyId } = useAuth()
  const isEmp = isEmployee()
  const loans = useSelector(selectLoans)
  const loading = useSelector(selectLoading)
  const myRequests = useSelector(selectMyLoanRequests)
  const allRequests = useSelector(selectAllLoanRequests)
  const requestsLoading = useSelector(selectLoanRequestsLoading)

  const [tab, setTab] = useState(isEmp ? 'Requests' : 'Accounts')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, action: null })
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm({
    defaultValues: { isFixed: true }
  })

  const isFixed = watch('isFixed')

  // Apply-for-loan (employee) form
  const [applyModalOpen, setApplyModalOpen] = useState(false)
  const { register: applyRegister, handleSubmit: applyHandleSubmit, reset: applyReset,
    formState: { errors: applyErrors } } = useForm()

  // Approve/Reject (admin) modal
  const [reviewModal, setReviewModal] = useState(null) // { id, action: 'approve' | 'reject' }
  const [reviewRemarks, setReviewRemarks] = useState('')

  useEffect(() => { dispatch(fetchLoans()) }, [dispatch])

  useEffect(() => {
    if (tab !== 'Requests') return
    if (isEmp) {
      dispatch(fetchMyLoanRequests())
    } else if (effectiveCompanyId) {
      dispatch(fetchAllLoanRequestsForCompany(effectiveCompanyId))
    }
  }, [dispatch, tab, isEmp, effectiveCompanyId])

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

  const onApplySubmit = async (formData) => {
    try {
      await dispatch(submitLoanRequest({
        loanType: formData.loanType,
        requestedAmount: Number(formData.requestedAmount),
        requestedInstallments: formData.requestedInstallments ? Number(formData.requestedInstallments) : null,
        reason: formData.reason,
      })).unwrap()
      toast.success('Loan request submitted')
      setApplyModalOpen(false)
      applyReset()
    } catch (e) { toast.error(typeof e === 'string' ? e : e?.message || 'Failed to submit') }
  }

  const submitReview = async () => {
    if (!reviewModal) return
    try {
      if (reviewModal.action === 'approve') {
        await dispatch(approveLoanRequest({ id: reviewModal.id, remarks: reviewRemarks })).unwrap()
        toast.success('Loan request approved — set up the Loan Account in the Accounts tab')
      } else {
        await dispatch(rejectLoanRequest({ id: reviewModal.id, remarks: reviewRemarks })).unwrap()
        toast.success('Loan request rejected')
      }
      setReviewModal(null)
      setReviewRemarks('')
      dispatch(fetchAllLoanRequestsForCompany(effectiveCompanyId))
    } catch (e) { toast.error(typeof e === 'string' ? e : e?.message || 'Failed') }
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

  const myRequestColumns = [
    { accessorKey: 'loanType', header: 'Type' },
    { accessorKey: 'requestedAmount', header: 'Amount', cell: ({ getValue }) => getValue() ? `$${getValue()}` : '—' },
    { accessorKey: 'requestedInstallments', header: 'Installments', cell: ({ getValue }) => getValue() ?? '—' },
    { accessorKey: 'reason', header: 'Reason', cell: ({ getValue }) => <span className="text-sm text-gray-600 line-clamp-2">{getValue()}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue()} variant={REQUEST_STATUS_VARIANT[getValue()] || 'default'} /> },
    { accessorKey: 'reviewRemarks', header: 'Reviewer Remarks', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'createdAt', header: 'Submitted', cell: ({ getValue }) => formatDate(getValue()) },
  ]

  const adminRequestColumns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => row.original.employeeName || '—' },
    { accessorKey: 'loanType', header: 'Type' },
    { accessorKey: 'requestedAmount', header: 'Amount', cell: ({ getValue }) => getValue() ? `$${getValue()}` : '—' },
    { accessorKey: 'requestedInstallments', header: 'Installments', cell: ({ getValue }) => getValue() ?? '—' },
    { accessorKey: 'reason', header: 'Reason', cell: ({ getValue }) => <span className="text-sm text-gray-600 line-clamp-2">{getValue()}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue()} variant={REQUEST_STATUS_VARIANT[getValue()] || 'default'} /> },
    { accessorKey: 'createdAt', header: 'Submitted', cell: ({ getValue }) => formatDate(getValue()) },
    { id: 'actions', header: '', cell: ({ row }) => row.original.status === 'PENDING' ? (
      <div className="flex gap-2">
        <Button size="sm" variant="success" onClick={() => { setReviewModal({ id: row.original.id, action: 'approve' }); setReviewRemarks('') }}>Approve</Button>
        <Button size="sm" variant="danger" onClick={() => { setReviewModal({ id: row.original.id, action: 'reject' }); setReviewRemarks('') }}>Reject</Button>
      </div>
    ) : null },
  ]

  return (
    <div>
      <PageHeader title="Loan Accounts" subtitle="Employee loans, advances, and fines"
        actions={
          isEmp
            ? <Button onClick={() => { applyReset(); setApplyModalOpen(true) }}>+ Apply for Loan</Button>
            : (tab === 'Accounts' && <Button onClick={() => { setEditTarget(null); reset({ isFixed: true }); setModalOpen(true) }}>+ New Loan</Button>)
        } />

      <div className="flex gap-2 border-b border-gray-200 mb-4">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Accounts' && (
        <DataTable columns={columns} data={loans} loading={loading} />
      )}

      {tab === 'Requests' && isEmp && (
        <DataTable columns={myRequestColumns} data={myRequests} loading={requestsLoading} />
      )}

      {tab === 'Requests' && !isEmp && (
        <DataTable columns={adminRequestColumns} data={allRequests} loading={requestsLoading} />
      )}

      {/* Admin: Create/Edit Loan Account */}
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

      {/* Employee: Apply for Loan */}
      <Modal open={applyModalOpen} onClose={() => setApplyModalOpen(false)} title="Apply for Loan"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setApplyModalOpen(false)}>Cancel</Button>
            <Button onClick={applyHandleSubmit(onApplySubmit)} loading={requestsLoading}>Submit</Button>
          </div>
        }>
        <div className="space-y-4">
          <Select label="Loan Type" options={LOAN_TYPE_OPTIONS} {...applyRegister('loanType', { required: true })} />
          <Input label="Requested Amount" type="number" step="0.01"
            error={applyErrors.requestedAmount?.message}
            {...applyRegister('requestedAmount', { required: 'Required', valueAsNumber: true, min: { value: 0.01, message: 'Must be greater than zero' } })} />
          <Input label="Number of Installments" type="number" {...applyRegister('requestedInstallments', { valueAsNumber: true })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              {...applyRegister('reason', { required: 'Reason is required' })}
              rows={3}
              className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${applyErrors.reason ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Explain why you're requesting this loan/advance..."
            />
            {applyErrors.reason && <span className="text-red-500 text-xs mt-1 block">{applyErrors.reason.message}</span>}
          </div>
        </div>
      </Modal>

      {/* Admin: Approve/Reject Loan Request */}
      <Modal open={!!reviewModal} onClose={() => setReviewModal(null)}
        title={reviewModal?.action === 'approve' ? 'Approve Loan Request' : 'Reject Loan Request'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setReviewModal(null)}>Cancel</Button>
            <Button
              variant={reviewModal?.action === 'approve' ? 'success' : 'danger'}
              onClick={submitReview}
              disabled={reviewModal?.action === 'reject' && !reviewRemarks.trim()}
            >
              {reviewModal?.action === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </div>
        }>
        <div className="space-y-2">
          {reviewModal?.action === 'approve' && (
            <p className="text-sm text-gray-500">Approving only marks the request Approved — you'll still need to create the Loan Account yourself in the Accounts tab.</p>
          )}
          <label className="block text-sm font-medium text-gray-700">
            Remarks{reviewModal?.action === 'reject' && <span className="text-red-500"> *</span>}
          </label>
          <textarea
            value={reviewRemarks}
            onChange={(e) => setReviewRemarks(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder={reviewModal?.action === 'reject' ? 'Why is this request being rejected?' : 'Optional note...'}
          />
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
