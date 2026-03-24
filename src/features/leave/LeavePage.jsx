import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchAll, create, fetchLeaveTypes, fetchLeaveAllocations, approveLeave, rejectLeave,
  cancelLeave, bulkAllocateLeave, annualLeaveReset,
  fetchLeaveRequestComments, addLeaveRequestComment, deleteLeaveRequestComment,
  fetchConditionApprovals, addConditionApproval, approveConditionStep, rejectConditionStep,
  fetchLeaveRequestFiles, uploadLeaveRequestFile, deleteLeaveRequestFile,
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
import { formatDate } from '../../utils/formatters'
import { STATUS_COLORS } from '../../config/constants'
import useAuth from '../../hooks/useAuth'

const TABS = ['Requests', 'Types', 'Allocations']

export default function LeavePage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
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
    catch { toast.error('Failed') }
  }
  const handleReject = async (id) => {
    const reason = window.prompt('Rejection reason (optional):') || undefined
    try { await dispatch(rejectLeave({ id, reason })).unwrap(); toast.success('Rejected'); dispatch(fetchAll({ page: 0, size: 20 })) }
    catch { toast.error('Failed') }
  }

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return
    try { await dispatch(cancelLeave(id)).unwrap(); toast.success('Cancelled'); dispatch(fetchAll({ page: 0, size: 20 })) }
    catch (e) { toast.error(e || 'Failed') }
  }

  const handleBulkAllocate = async () => {
    const leaveTypeId = window.prompt('Leave Type ID:')
    if (!leaveTypeId) return
    const days = window.prompt('Days to allocate:')
    if (!days) return
    const year = window.prompt('Year:', new Date().getFullYear())
    if (!year) return
    try {
      await dispatch(bulkAllocateLeave({ companyId: user?.companyId, leaveTypeId: Number(leaveTypeId), days: Number(days), year: Number(year) })).unwrap()
      toast.success('Bulk allocation completed')
      dispatch(fetchLeaveAllocations())
    } catch (e) { toast.error(e || 'Bulk allocation failed') }
  }

  const handleAnnualReset = async () => {
    const year = window.prompt('Reset allocations for year:', new Date().getFullYear())
    if (!year) return
    if (!window.confirm(`Run annual leave reset for ${year}? This will carry forward or expire existing balances.`)) return
    try {
      await dispatch(annualLeaveReset({ companyId: user?.companyId, year: Number(year) })).unwrap()
      toast.success(`Annual reset completed for ${year}`)
      dispatch(fetchLeaveAllocations())
    } catch (e) { toast.error(e || 'Annual reset failed') }
  }

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

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return
    try {
      await dispatch(deleteLeaveRequestComment({ requestId: selectedRequest.id, commentId })).unwrap()
      dispatch(fetchLeaveRequestComments(selectedRequest.id))
    } catch { toast.error('Failed') }
  }

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
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeCode || '—' : '—'
    }},
    { id: 'leaveType', header: 'Type', cell: ({ row }) => row.original.leaveType?.name || '—' },
    { accessorKey: 'startDate', header: 'Start', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'endDate', header: 'End', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'description', header: 'Reason', cell: ({ getValue }) => <span className="max-w-xs truncate block">{getValue() || '—'}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue()} variant={STATUS_COLORS[getValue()?.toLowerCase()] || 'default'} /> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openDetail(row.original)}>Details</Button>
        {row.original.status === 'REQUESTED' && <>
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
    { accessorKey: 'name', header: 'Leave Type' },
    { accessorKey: 'defaultDays', header: 'Default Days' },
    { accessorKey: 'description', header: 'Description' },
  ]

  const allocationColumns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeCode || '—' : '—'
    }},
    { id: 'leaveType', header: 'Type', cell: ({ row }) => row.original.leaveType?.name || '—' },
    { accessorKey: 'totalLeaveDays', header: 'Allocated' },
    { accessorKey: 'availableDays', header: 'Available' },
    { accessorKey: 'year', header: 'Year' },
  ]

  return (
    <div>
      <PageHeader title="Leave Management" subtitle="Requests, types, and allocations"
        actions={<Button onClick={() => { reset({}); setModalOpen(true) }}>+ Apply Leave</Button>} />
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {TABS.map(t => (
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
      {tab === 'Types' && <DataTable columns={typeColumns} data={leaveTypes} loading={loading} />}
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

      {/* Request Detail Modal — Comments + Condition Approvals */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Leave Request Details">
        {selectedRequest && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <div><span className="font-medium text-gray-600">Employee:</span> {selectedRequest.employee ? `${selectedRequest.employee.firstName || ''} ${selectedRequest.employee.lastName || ''}`.trim() : '—'}</div>
              <div><span className="font-medium text-gray-600">Type:</span> {selectedRequest.leaveType?.name || '—'}</div>
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
    </div>
  )
}
