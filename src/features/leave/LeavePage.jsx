import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchAll, create, fetchLeaveTypes, fetchLeaveAllocations, approveLeave, rejectLeave,
  cancelLeave, bulkAllocateLeave, annualLeaveReset, runManualAccrual,
  fetchLeaveRequestComments, addLeaveRequestComment, deleteLeaveRequestComment,
  fetchConditionApprovals, addConditionApproval, approveConditionStep, rejectConditionStep,
  fetchLeaveRequestFiles, uploadLeaveRequestFile, deleteLeaveRequestFile,
  createLeaveType, updateLeaveType, deleteLeaveType,
  selectAll, selectLoading, selectPagination,
  selectLeaveRequestComments, selectConditionApprovals, selectLeaveRequestFiles,
} from './leaveSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Pagination from '../../components/common/Pagination'
import ConfirmModal from '../../components/common/ConfirmModal'
import { formatDate } from '../../utils/formatters'
import { STATUS_COLORS } from '../../config/constants'
import useAuth from '../../hooks/useAuth'

const ALL_TABS = ['Requests', 'Types', 'Allocations']
const EMPLOYEE_TABS = ['Requests']

export default function LeavePage() {
  const dispatch = useDispatch()
  const { user, isEmployee } = useAuth()
  const data = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const pagination = useSelector(selectPagination)
  const leaveTypes = useSelector(s => s.leave.leaveTypes)
  const leaveAllocations = useSelector(s => s.leave.leaveAllocations)
  const comments = useSelector(selectLeaveRequestComments)
  const conditionApprovals = useSelector(selectConditionApprovals)
  const leaveRequestFiles = useSelector(selectLeaveRequestFiles)

  const [tab, setTab] = useState('Requests')
  const [modalOpen, setModalOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [addingApproval, setAddingApproval] = useState(false)

  // Leave type modal state (null = closed, {} = create, {id,...} = edit)
  const [typeModal, setTypeModal] = useState(null)

  // Reject modal state
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, reason: '' })
  // Bulk allocate modal state
  const [bulkModal, setBulkModal] = useState({ open: false, leaveTypeId: '', days: '', year: String(new Date().getFullYear()) })
  // Annual reset modal state
  const [resetModal, setResetModal] = useState({ open: false, year: String(new Date().getFullYear()) })
  const [confirmModal, setConfirmModal] = useState({ open: false, action: null, id: null })

  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const { register: regApproval, handleSubmit: handleApprovalSubmit, reset: resetApproval, formState: { errors: approvalErrors } } = useForm()

  useEffect(() => {
    dispatch(fetchAll({ page: 0, size: 20 }))
    dispatch(fetchLeaveTypes())
    dispatch(fetchLeaveAllocations())
  }, [dispatch])

  const openDetail = (request) => {
    setSelectedRequest(request)
    setDetailOpen(true)
    dispatch(fetchLeaveRequestComments(request.id))
    dispatch(fetchConditionApprovals(request.id))
    dispatch(fetchLeaveRequestFiles(request.id))
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedRequest) return
    try {
      await dispatch(uploadLeaveRequestFile({ requestId: selectedRequest.id, file })).unwrap()
      toast.success('File uploaded')
    } catch (err) {
      toast.error(err || 'Upload failed')
    }
    e.target.value = ''
  }

  const handleDeleteFile = async (fileId) => {
    try {
      await dispatch(deleteLeaveRequestFile(fileId)).unwrap()
      toast.success('File removed')
    } catch {
      toast.error('Failed to remove file')
    }
  }

  const handleApprove = async (id) => {
    try { await dispatch(approveLeave(id)).unwrap(); toast.success('Approved'); dispatch(fetchAll({ page: 0, size: 20 })) }
    catch (e) { toast.error(e || 'Failed') }
  }
  const handleReject = (id) => {
    setRejectModal({ open: true, id, reason: '' })
  }
  const submitReject = async () => {
    try {
      await dispatch(rejectLeave({ id: rejectModal.id, reason: rejectModal.reason || undefined })).unwrap()
      toast.success('Rejected')
      setRejectModal({ open: false, id: null, reason: '' })
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Failed') }
  }

  const handleCancel = (id) => setConfirmModal({ open: true, action: 'cancel', id })

  const onConfirmAction = async () => {
    const { action, id } = confirmModal
    try {
      if (action === 'cancel') {
        await dispatch(cancelLeave(id)).unwrap(); toast.success('Cancelled'); dispatch(fetchAll({ page: 0, size: 20 }))
      } else if (action === 'accrual') {
        const result = await dispatch(runManualAccrual()).unwrap()
        toast.success(`Accrual complete: ${result.posted} credits posted`)
      } else if (action === 'deleteType') {
        await dispatch(deleteLeaveType(id)).unwrap(); toast.success('Leave type deleted')
      } else if (action === 'deleteComment') {
        await dispatch(deleteLeaveRequestComment({ requestId: selectedRequest.id, commentId: id })).unwrap()
        dispatch(fetchLeaveRequestComments(selectedRequest.id))
      }
    } catch (e) { toast.error(e || 'Failed') }
    finally { setConfirmModal({ open: false, action: null, id: null }) }
  }

  const handleBulkAllocate = () => {
    setBulkModal({ open: true, leaveTypeId: '', days: '', year: String(new Date().getFullYear()) })
  }
  const submitBulkAllocate = async () => {
    if (!bulkModal.leaveTypeId || !bulkModal.days || !bulkModal.year) {
      toast.error('All fields are required')
      return
    }
    try {
      await dispatch(bulkAllocateLeave({
        companyId: user?.companyId,
        leaveTypeId: Number(bulkModal.leaveTypeId),
        days: Number(bulkModal.days),
        year: Number(bulkModal.year),
      })).unwrap()
      toast.success('Bulk allocation completed')
      setBulkModal(m => ({ ...m, open: false }))
      dispatch(fetchLeaveAllocations())
    } catch (e) { toast.error(e || 'Bulk allocation failed') }
  }

  const handleAnnualReset = () => {
    setResetModal({ open: true, year: String(new Date().getFullYear()) })
  }
  const submitAnnualReset = async () => {
    if (!resetModal.year) { toast.error('Year is required'); return }
    try {
      await dispatch(annualLeaveReset({ companyId: user?.companyId, year: Number(resetModal.year) })).unwrap()
      toast.success(`Annual reset completed for ${resetModal.year}`)
      setResetModal(m => ({ ...m, open: false }))
      dispatch(fetchLeaveAllocations())
    } catch (e) { toast.error(e || 'Annual reset failed') }
  }

  const openCreateType = () => setTypeModal({
    name: '', totalDays: '', paymentType: 'PAID',
    carryforwardType: 'NO_CARRYFORWARD', leaveValidationType: 'AUTOMATIC', colorCode: '',
    accrualEnabled: false, midYearJoinerMode: 'MANUAL',
    negativeBalanceAllowed: false, negativeBalanceLimit: '',
  })
  const openEditType = (lt) => setTypeModal({
    id: lt.id, name: lt.name, totalDays: String(lt.totalDays ?? ''),
    paymentType: lt.paymentType || 'PAID',
    carryforwardType: lt.carryforwardType || 'NO_CARRYFORWARD',
    leaveValidationType: lt.leaveValidationType || 'AUTOMATIC',
    colorCode: lt.colorCode || '',
    accrualEnabled: lt.accrualEnabled || false,
    midYearJoinerMode: lt.midYearJoinerMode || 'MANUAL',
    negativeBalanceAllowed: lt.negativeBalanceAllowed || false,
    negativeBalanceLimit: lt.negativeBalanceLimit != null ? String(lt.negativeBalanceLimit) : '',
  })
  const submitTypeModal = async () => {
    const { id, name, totalDays, paymentType, carryforwardType, leaveValidationType, colorCode,
            accrualEnabled, midYearJoinerMode, negativeBalanceAllowed, negativeBalanceLimit } = typeModal
    if (!name.trim() || !totalDays) { toast.error('Name and days are required'); return }
    const payload = {
      name, totalDays: Number(totalDays), paymentType, carryforwardType, leaveValidationType,
      colorCode: colorCode || null, accrualEnabled, midYearJoinerMode,
      negativeBalanceAllowed,
      negativeBalanceLimit: negativeBalanceAllowed && negativeBalanceLimit ? Number(negativeBalanceLimit) : null,
    }
    try {
      if (id) {
        await dispatch(updateLeaveType({ id, data: payload })).unwrap()
        toast.success('Leave type updated')
      } else {
        await dispatch(createLeaveType({ ...payload, company: { id: user?.companyId } })).unwrap()
        toast.success('Leave type created')
      }
      setTypeModal(null)
    } catch (e) { toast.error(e || 'Failed') }
  }

  const handleRunAccrual = () => setConfirmModal({ open: true, action: 'accrual', id: null })
  const handleDeleteType = (id) => setConfirmModal({ open: true, action: 'deleteType', id })

  const onSubmit = async (formData) => {
    try {
      await dispatch(create({ ...formData, companyId: user?.companyId })).unwrap()
      toast.success('Leave applied')
      setModalOpen(false)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleAddComment = async () => {
    if (!commentText.trim()) return
    try {
      await dispatch(addLeaveRequestComment({ requestId: selectedRequest.id, comment: commentText })).unwrap()
      setCommentText('')
      dispatch(fetchLeaveRequestComments(selectedRequest.id))
      toast.success('Comment added')
    } catch { toast.error('Failed to add comment') }
  }

  const handleDeleteComment = (commentId) => setConfirmModal({ open: true, action: 'deleteComment', id: commentId })

  const onAddApprovalStep = async (formData) => {
    try {
      await dispatch(addConditionApproval({ requestId: selectedRequest.id, data: formData })).unwrap()
      resetApproval()
      setAddingApproval(false)
      dispatch(fetchConditionApprovals(selectedRequest.id))
      toast.success('Approval step added')
    } catch { toast.error('Failed') }
  }

  const handleApproveStep = async (stepId) => {
    try {
      await dispatch(approveConditionStep(stepId)).unwrap()
      dispatch(fetchConditionApprovals(selectedRequest.id))
      toast.success('Step approved')
    } catch { toast.error('Failed') }
  }

  const handleRejectStep = async (stepId) => {
    try {
      await dispatch(rejectConditionStep(stepId)).unwrap()
      dispatch(fetchConditionApprovals(selectedRequest.id))
      toast.success('Step rejected')
    } catch { toast.error('Failed') }
  }

  const requestColumns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => row.original.employeeName || '—' },
    { id: 'leaveType', header: 'Type', cell: ({ row }) => row.original.leaveTypeName || '—' },
    { accessorKey: 'startDate', header: 'Start', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'endDate', header: 'End', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'description', header: 'Reason', cell: ({ getValue }) => <span className="max-w-xs truncate block">{getValue() || '—'}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue()} variant={STATUS_COLORS[getValue()?.toLowerCase()] || 'default'} /> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openDetail(row.original)}>Details</Button>
        {row.original.status === 'REQUESTED' && !isEmployee() && <>
          <Button size="sm" variant="success" onClick={() => handleApprove(row.original.id)}>Approve</Button>
          <Button size="sm" variant="danger" onClick={() => handleReject(row.original.id)}>Reject</Button>
        </>}
        {(row.original.status === 'REQUESTED' || row.original.status === 'APPROVED') &&
          <Button size="sm" variant="ghost" onClick={() => handleCancel(row.original.id)}>Cancel</Button>
        }
      </div>
    )},
  ]

  const typeColumns = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'totalDays', header: 'Days' },
    { accessorKey: 'paymentType', header: 'Payment', cell: ({ getValue }) => <Badge label={getValue()} variant={getValue() === 'PAID' ? 'success' : 'default'} /> },
    { accessorKey: 'carryforwardType', header: 'Carryforward', cell: ({ getValue }) => <span className="text-xs text-gray-600">{(getValue() || '').replace(/_/g, ' ')}</span> },
    { accessorKey: 'leaveValidationType', header: 'Approval', cell: ({ getValue }) => <span className="text-xs text-gray-600">{(getValue() || '').replace(/_/g, ' ')}</span> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEditType(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDeleteType(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  const allocationColumns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => row.original.employeeName || '—' },
    { id: 'leaveType', header: 'Type', cell: ({ row }) => row.original.leaveTypeName || '—' },
    { accessorKey: 'totalLeaveDays', header: 'Allocated' },
    { accessorKey: 'availableDays', header: 'Available' },
    { accessorKey: 'year', header: 'Year' },
  ]

  return (
    <div>
      <PageHeader title="Leave Management" subtitle="Requests, types, and allocations"
        actions={<Button onClick={() => { reset({}); setModalOpen(true) }}>+ Apply Leave</Button>} />
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {(isEmployee() ? EMPLOYEE_TABS : ALL_TABS).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Requests' && <>
        <DataTable columns={requestColumns} data={data} loading={loading} />
        <Pagination page={pagination.page} totalPages={Math.ceil(pagination.total / pagination.size)} onPageChange={p => dispatch(fetchAll({ page: p, size: 20 }))} />
      </>}
      {tab === 'Types' && (
        <>
          <div className="flex justify-end gap-2 mb-4">
            <Button variant="secondary" onClick={handleRunAccrual}>Run Accrual</Button>
            <Button onClick={openCreateType}>+ Add Type</Button>
          </div>
          <DataTable columns={typeColumns} data={leaveTypes} loading={loading} />
        </>
      )}
      {tab === 'Allocations' && (
        <>
          <div className="flex justify-end gap-2 mb-4">
            <Button variant="secondary" onClick={handleBulkAllocate}>Bulk Allocate</Button>
            <Button variant="danger" onClick={handleAnnualReset}>Annual Reset</Button>
          </div>
          <DataTable columns={allocationColumns} data={leaveAllocations} loading={loading} />
        </>
      )}

      {/* Apply Leave Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Apply for Leave"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>Submit</Button></div>}>
        <div className="space-y-4">
          <Select label="Leave Type" options={leaveTypes.map(lt => ({ value: lt.id, label: lt.name }))} error={errors.leaveTypeId?.message} {...register('leaveTypeId', { required: 'Required' })} />
          <Input label="Start Date" type="date" error={errors.startDate?.message} {...register('startDate', { required: 'Required' })} />
          <Input label="End Date" type="date" error={errors.endDate?.message} {...register('endDate', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={3} {...register('description')} />
          </div>
        </div>
      </Modal>

      {/* Leave Type Create/Edit Modal */}
      <Modal open={!!typeModal} onClose={() => setTypeModal(null)} title={typeModal?.id ? 'Edit Leave Type' : 'Add Leave Type'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTypeModal(null)}>Cancel</Button>
            <Button onClick={submitTypeModal}>{typeModal?.id ? 'Save' : 'Create'}</Button>
          </div>
        }>
        {typeModal && (
          <div className="space-y-4">
            <Input label="Name" value={typeModal.name}
              onChange={e => setTypeModal(m => ({ ...m, name: e.target.value }))} />
            <Input label="Days per year" type="number" min="1" value={typeModal.totalDays}
              onChange={e => setTypeModal(m => ({ ...m, totalDays: e.target.value }))} />
            <Select label="Payment type"
              options={[{ value: 'PAID', label: 'Paid' }, { value: 'UNPAID', label: 'Unpaid' }]}
              value={typeModal.paymentType}
              onChange={e => setTypeModal(m => ({ ...m, paymentType: e.target.value }))} />
            <Select label="Carryforward"
              options={[
                { value: 'NO_CARRYFORWARD', label: 'No carryforward' },
                { value: 'CARRYFORWARD', label: 'Carry forward' },
                { value: 'CARRYFORWARD_EXPIRE', label: 'Carry forward (expires)' },
              ]}
              value={typeModal.carryforwardType}
              onChange={e => setTypeModal(m => ({ ...m, carryforwardType: e.target.value }))} />
            <Select label="Approval"
              options={[
                { value: 'AUTOMATIC', label: 'Automatic' },
                { value: 'MANAGER_VALIDATION', label: 'Manager approval' },
                { value: 'HR_VALIDATION', label: 'HR approval' },
              ]}
              value={typeModal.leaveValidationType}
              onChange={e => setTypeModal(m => ({ ...m, leaveValidationType: e.target.value }))} />
            <Input label="Color code (optional)" placeholder="#4f46e5" value={typeModal.colorCode}
              onChange={e => setTypeModal(m => ({ ...m, colorCode: e.target.value }))} />

            <div className="border-t pt-4 mt-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Accrual Settings</p>
              <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
                <input type="checkbox" checked={!!typeModal.accrualEnabled}
                  onChange={e => setTypeModal(m => ({ ...m, accrualEnabled: e.target.checked }))} />
                Enable monthly accrual (leave earned gradually, not upfront)
              </label>
              {typeModal.accrualEnabled && (
                <>
                  <p className="text-xs text-gray-500 mb-3">
                    Monthly rate = {typeModal.totalDays ? (Number(typeModal.totalDays) / 12).toFixed(1) : '?'} days/month
                  </p>
                  <Select label="Mid-year joiner mode"
                    options={[
                      { value: 'MANUAL', label: 'Manual (HR sets opening balance; skip joining month)' },
                      { value: 'AUTO_PRORATA', label: 'Auto pro-rata (system calculates joining month)' },
                    ]}
                    value={typeModal.midYearJoinerMode}
                    onChange={e => setTypeModal(m => ({ ...m, midYearJoinerMode: e.target.value }))} />
                </>
              )}
              <label className="flex items-center gap-2 text-sm mt-3 cursor-pointer">
                <input type="checkbox" checked={!!typeModal.negativeBalanceAllowed}
                  onChange={e => setTypeModal(m => ({ ...m, negativeBalanceAllowed: e.target.checked }))} />
                Allow negative balance
              </label>
              {typeModal.negativeBalanceAllowed && (
                <Input label="Max negative balance (days)" type="number" min="0" step="0.5"
                  value={typeModal.negativeBalanceLimit}
                  onChange={e => setTypeModal(m => ({ ...m, negativeBalanceLimit: e.target.value }))}
                  className="mt-2" />
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Reject Leave Modal */}
      <Modal open={rejectModal.open} onClose={() => setRejectModal(m => ({ ...m, open: false }))} title="Reject Leave Request"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setRejectModal(m => ({ ...m, open: false }))}>Cancel</Button>
            <Button variant="danger" onClick={submitReject}>Reject</Button>
          </div>
        }>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rejection reason (optional)</label>
          <textarea
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            rows={3}
            value={rejectModal.reason}
            onChange={e => setRejectModal(m => ({ ...m, reason: e.target.value }))}
            placeholder="Enter a reason…"
          />
        </div>
      </Modal>

      {/* Bulk Allocate Modal */}
      <Modal open={bulkModal.open} onClose={() => setBulkModal(m => ({ ...m, open: false }))} title="Bulk Allocate Leave"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBulkModal(m => ({ ...m, open: false }))}>Cancel</Button>
            <Button onClick={submitBulkAllocate}>Allocate</Button>
          </div>
        }>
        <div className="space-y-4">
          <Select
            label="Leave Type"
            placeholder="Select a leave type"
            options={leaveTypes.map(lt => ({ value: String(lt.id), label: lt.name }))}
            value={bulkModal.leaveTypeId}
            onChange={e => setBulkModal(m => ({ ...m, leaveTypeId: e.target.value }))}
          />
          <Input label="Days to allocate" type="number" min="0.5" step="0.5"
            value={bulkModal.days}
            onChange={e => setBulkModal(m => ({ ...m, days: e.target.value }))}
          />
          <Input label="Year" type="number" min="2000" max="2100"
            value={bulkModal.year}
            onChange={e => setBulkModal(m => ({ ...m, year: e.target.value }))}
          />
        </div>
      </Modal>

      {/* Annual Reset Modal */}
      <Modal open={resetModal.open} onClose={() => setResetModal(m => ({ ...m, open: false }))} title="Annual Leave Reset"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setResetModal(m => ({ ...m, open: false }))}>Cancel</Button>
            <Button variant="danger" onClick={submitAnnualReset}>Run Reset</Button>
          </div>
        }>
        <div className="space-y-3">
          <p className="text-sm text-gray-600">This will carry forward or expire existing balances for all employees in the company.</p>
          <Input label="Year to reset" type="number" min="2000" max="2100"
            value={resetModal.year}
            onChange={e => setResetModal(m => ({ ...m, year: e.target.value }))}
          />
        </div>
      </Modal>

      {/* Request Detail Modal — Comments + Condition Approvals */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Leave Request Details">
        {selectedRequest && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <div><span className="font-medium text-gray-600">Employee:</span> {selectedRequest.employeeName || '—'}</div>
              <div><span className="font-medium text-gray-600">Type:</span> {selectedRequest.leaveTypeName || '—'}</div>
              <div><span className="font-medium text-gray-600">Period:</span> {formatDate(selectedRequest.startDate)} – {formatDate(selectedRequest.endDate)}</div>
              <div><span className="font-medium text-gray-600">Status:</span> <Badge label={selectedRequest.status} variant={STATUS_COLORS[selectedRequest.status?.toLowerCase()] || 'default'} /></div>
              {selectedRequest.description && <div><span className="font-medium text-gray-600">Reason:</span> {selectedRequest.description}</div>}
            </div>

            {/* Condition Approvals */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-gray-700">Approval Steps</h4>
                <Button size="sm" variant="secondary" onClick={() => setAddingApproval(v => !v)}>
                  {addingApproval ? 'Cancel' : '+ Add Step'}
                </Button>
              </div>
              {addingApproval && (
                <form onSubmit={handleApprovalSubmit(onAddApprovalStep)} className="bg-gray-50 rounded-lg p-3 mb-3 space-y-3">
                  <Input label="Sequence" type="number" error={approvalErrors.sequence?.message}
                    {...regApproval('sequence', { required: 'Required', valueAsNumber: true })} />
                  <div className="flex justify-end">
                    <Button size="sm" type="submit">Add</Button>
                  </div>
                </form>
              )}
              {conditionApprovals.length === 0
                ? <p className="text-sm text-gray-400 italic">No approval steps defined.</p>
                : (
                  <div className="space-y-2">
                    {conditionApprovals.map(step => (
                      <div key={step.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm">
                        <div className="space-x-3">
                          <span className="font-medium text-gray-700">Step {step.sequence}</span>
                          <span className="text-gray-500">{step.manager ? `${step.manager.firstName || ''} ${step.manager.lastName || ''}`.trim() : 'Unassigned'}</span>
                          {step.isApproved && <Badge label="Approved" variant="success" />}
                          {step.isRejected && <Badge label="Rejected" variant="danger" />}
                          {!step.isApproved && !step.isRejected && <Badge label="Pending" variant="default" />}
                        </div>
                        {!step.isApproved && !step.isRejected && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="success" onClick={() => handleApproveStep(step.id)}>Approve</Button>
                            <Button size="sm" variant="danger" onClick={() => handleRejectStep(step.id)}>Reject</Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
            </div>

            {/* Attachments */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Attachments</h4>
              <div className="space-y-2 mb-3 max-h-36 overflow-y-auto">
                {leaveRequestFiles.length === 0
                  ? <p className="text-sm text-gray-400 italic">No files attached.</p>
                  : leaveRequestFiles.map(f => (
                    <div key={f.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      <span className="text-gray-700 truncate">{f.fileName || f.filePath}</span>
                      <button onClick={() => handleDeleteFile(f.id)} className="text-gray-400 hover:text-red-500 text-xs ml-2 shrink-0">✕</button>
                    </div>
                  ))}
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">
                + Attach File
                <input type="file" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            {/* Comments */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Comments</h4>
              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {comments.length === 0
                  ? <p className="text-sm text-gray-400 italic">No comments yet.</p>
                  : comments.map(c => (
                    <div key={c.id} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-medium text-gray-700">
                            {c.employee ? `${c.employee.firstName || ''} ${c.employee.lastName || ''}`.trim() : 'Unknown'}
                          </span>
                          <p className="text-gray-600 mt-0.5">{c.comment}</p>
                        </div>
                        <button onClick={() => handleDeleteComment(c.id)} className="text-gray-400 hover:text-red-500 text-xs shrink-0">✕</button>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                  placeholder="Add a comment…"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <Button size="sm" onClick={handleAddComment}>Post</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, action: null, id: null })}
        onConfirm={onConfirmAction}
        title={
          confirmModal.action === 'cancel' ? 'Cancel Leave Request' :
          confirmModal.action === 'accrual' ? 'Run Monthly Accrual' :
          confirmModal.action === 'deleteType' ? 'Delete Leave Type' :
          'Delete Comment'
        }
        message={
          confirmModal.action === 'cancel' ? 'Are you sure you want to cancel this leave request?' :
          confirmModal.action === 'accrual' ? 'Run monthly accrual for today? This credits leave to all accrual-enabled leave types.' :
          confirmModal.action === 'deleteType' ? 'Delete this leave type? This cannot be undone.' :
          'Are you sure you want to delete this comment?'
        }
        confirmLabel={confirmModal.action === 'cancel' ? 'Cancel Leave' : confirmModal.action === 'accrual' ? 'Run Accrual' : 'Delete'}
        loading={loading}
      />
    </div>
  )
}
