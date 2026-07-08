import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchAll, create, update, fetchLeaveTypes, fetchLeaveAllocations, approveLeave, rejectLeave,
  cancelLeave, bulkAllocateLeave, annualLeaveReset,
  fetchLeaveRequestComments, addLeaveRequestComment, deleteLeaveRequestComment,
  fetchConditionApprovals, addConditionApproval, approveConditionStep, rejectConditionStep,
  fetchLeaveRequestFiles, uploadLeaveRequestFile, deleteLeaveRequestFile,
  fetchLeaveBalance, updateLeaveBalance,
  selectAll, selectLoading, selectPagination,
  selectLeaveRequestComments, selectConditionApprovals, selectLeaveRequestFiles,
  selectLeaveBalance,
} from './leaveSlice'
import api from '../../services/api'
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
import {
  fetchAll as fetchEmployees,
  fetchAllGlobal as fetchEmployeesGlobal,
  selectAll as selectEmployees,
} from '../employees/employeesSlice'

const ALL_TABS = ['Requests', 'Allocations', 'Balance']
const EMPLOYEE_TABS = ['Requests', 'Assigned Leaves', 'Balance']

export default function LeavePage() {
  const dispatch = useDispatch()
  const { user, effectiveCompanyId, isEmployee, isHRManager, isBranchAdmin, isEnterpriseAdmin, isPlatformAdmin } = useAuth()
  const platformAdmin = isPlatformAdmin()
  const canManage = platformAdmin || isEnterpriseAdmin() || isBranchAdmin() || isHRManager()
  const data = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const pagination = useSelector(selectPagination)
  const leaveTypes = useSelector(s => s.leave.leaveTypes)
  const leaveAllocations = useSelector(s => s.leave.leaveAllocations)
  const leaveBalance = useSelector(selectLeaveBalance)
  const comments = useSelector(selectLeaveRequestComments)
  const conditionApprovals = useSelector(selectConditionApprovals)
  const leaveRequestFiles = useSelector(selectLeaveRequestFiles)
  const employees = useSelector(selectEmployees)

  const [tab, setTab] = useState('Requests')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [addingApproval, setAddingApproval] = useState(false)

  // Reject modal state
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, reason: '' })
  // Bulk allocate modal state
  const [bulkModal, setBulkModal] = useState({ open: false, leaveTypeId: '', days: '', year: String(new Date().getFullYear()) })
  // Annual reset modal state
  const [resetModal, setResetModal] = useState({ open: false, year: String(new Date().getFullYear()) })
  const [confirmModal, setConfirmModal] = useState({ open: false, action: null, id: null })

  // Balance tab edit/delete
  const [balanceEditTarget, setBalanceEditTarget] = useState(null)
  const [balanceEditForm, setBalanceEditForm] = useState({})
  const [balanceSaving, setBalanceSaving] = useState(false)
  const [balanceDeleteTarget, setBalanceDeleteTarget] = useState(null)
  const [balanceDeleting, setBalanceDeleting] = useState(false)
  const [balanceSearch, setBalanceSearch] = useState('')
  const [requestSearch, setRequestSearch] = useState('')
  const [allocationSearch, setAllocationSearch] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')

  const openBalanceEdit = (a) => {
    setBalanceEditTarget(a)
    setBalanceEditForm({
      availableDays: a.availableDays ?? 0,
      carryforwardDays: a.carryforwardDays ?? 0,
      totalLeaveDays: a.totalLeaveDays ?? 0,
    })
  }

  const handleBalanceEditSave = async () => {
    setBalanceSaving(true)
    try {
      await dispatch(updateLeaveBalance({
        id: balanceEditTarget.id,
        data: {
          availableDays: Number(balanceEditForm.availableDays),
          carryforwardDays: Number(balanceEditForm.carryforwardDays),
          totalLeaveDays: Number(balanceEditForm.totalLeaveDays),
        },
      })).unwrap()
      toast.success('Leave balance updated')
      setBalanceEditTarget(null)
      dispatch(fetchLeaveBalance())
    } catch (e) {
      toast.error(e || 'Failed to update')
    } finally {
      setBalanceSaving(false)
    }
  }

  const confirmBalanceDelete = async () => {
    setBalanceDeleting(true)
    try {
      await api.delete(`/leave/balance/${balanceDeleteTarget.id}`)
      toast.success('Leave balance deleted')
      setBalanceDeleteTarget(null)
      dispatch(fetchLeaveBalance())
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to delete')
    } finally {
      setBalanceDeleting(false)
    }
  }

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: { applyFor: 'self' },
  })
  const applyFor = watch('applyFor')
  const selectedEmployeeId = watch('employeeId')
  const { register: regApproval, handleSubmit: handleApprovalSubmit, reset: resetApproval, formState: { errors: approvalErrors } } = useForm()

  useEffect(() => {
    dispatch(fetchAll({ page: 0, size: 20 }))
    dispatch(fetchLeaveTypes())
    dispatch(fetchLeaveAllocations())
    dispatch(fetchLeaveBalance())
  }, [dispatch])

  useEffect(() => {
    if (!canManage) return
    if (platformAdmin && !effectiveCompanyId) {
      dispatch(fetchEmployeesGlobal({ page: 0, size: 500 }))
    } else {
      dispatch(fetchEmployees({ companyId: effectiveCompanyId, page: 0, size: 500 }))
    }
  }, [dispatch, canManage, effectiveCompanyId, platformAdmin])

  const openDetail = (request) => {
    setSelectedRequest(request)
    setDetailOpen(true)
    Promise.all([
      dispatch(fetchLeaveRequestComments(request.id)),
      dispatch(fetchConditionApprovals(request.id)),
      dispatch(fetchLeaveRequestFiles(request.id)),
    ]).catch(() => {})
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
        companyId: effectiveCompanyId,
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
      await dispatch(annualLeaveReset({ companyId: effectiveCompanyId, year: Number(resetModal.year) })).unwrap()
      toast.success(`Annual reset completed for ${resetModal.year}`)
      setResetModal(m => ({ ...m, open: false }))
      dispatch(fetchLeaveAllocations())
    } catch (e) { toast.error(e || 'Annual reset failed') }
  }


  const openEdit = (request) => {
    setEditTarget(request)
    reset({
      leaveTypeId: request.leaveTypeId || request.leaveType?.id || '',
      startDate: request.startDate || '',
      endDate: request.endDate || '',
      description: request.description || '',
    })
    setModalOpen(true)
  }

  const onSubmit = async (formData) => {
    try {
      if (editTarget) {
        await dispatch(update({ id: editTarget.id, data: { ...formData } })).unwrap()
        toast.success('Leave request updated')
        setEditTarget(null)
      } else {
        const payload = {
          leaveTypeId: formData.leaveTypeId,
          startDate: formData.startDate,
          endDate: formData.endDate,
          description: formData.description,
          companyId: effectiveCompanyId,
        }
        if (canManage && formData.applyFor === 'employee') {
          payload.employeeId = Number(formData.employeeId)
        }
        await dispatch(create(payload)).unwrap()
        toast.success(formData.applyFor === 'employee' ? 'Leave applied for employee' : 'Leave applied')
      }
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
    { id: 'department', header: 'Department', cell: ({ row }) => row.original.departmentName || '—' },
    { id: 'leaveType', header: 'Type', cell: ({ row }) => row.original.leaveTypeName || '—' },
    { accessorKey: 'startDate', header: 'Start', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'endDate', header: 'End', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'requestedDays', header: 'Days', cell: ({ getValue }) => getValue() != null ? getValue() : '—' },
    { accessorKey: 'description', header: 'Reason', cell: ({ getValue }) => <span className="max-w-xs truncate block">{getValue() || '—'}</span> },
    { id: 'approvedBy', header: 'Approved By', cell: ({ row }) => row.original.approvedByName || '—' },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue()} variant={STATUS_COLORS[getValue()?.toLowerCase()] || 'default'} /> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openDetail(row.original)}>Details</Button>
        {row.original.status === 'REQUESTED' && (
          <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        )}
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

  const allocationColumns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => row.original.employeeName || '—' },
    { id: 'leaveType', header: 'Type', cell: ({ row }) => row.original.leaveTypeName || '—' },
    { accessorKey: 'totalLeaveDays', header: 'Allocated' },
    { accessorKey: 'availableDays', header: 'Available' },
    { accessorKey: 'year', header: 'Year' },
  ]

  const filteredEmployees = employees.filter(employee => {
    const query = employeeSearch.trim().toLowerCase()
    if (!query) return true
    return [
      employee.fullName,
      `${employee.firstName || ''} ${employee.lastName || ''}`,
      employee.badgeId,
      employee.workEmail,
      employee.email,
    ].some(value => String(value || '').toLowerCase().includes(query))
  })

  const employeeLabel = employee => {
    const name = employee.fullName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || `Employee #${employee.id}`
    return employee.badgeId ? `${name} (${employee.badgeId})` : name
  }

  return (
    <div>
      <PageHeader title="Leave Management" subtitle="Requests, types, and allocations"
        actions={<Button onClick={() => {
          setEditTarget(null)
          setEmployeeSearch('')
          reset({ applyFor: 'self', employeeId: '', leaveTypeId: '', startDate: '', endDate: '', description: '' })
          setModalOpen(true)
        }}>+ Apply Leave</Button>} />
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {(isEmployee() ? EMPLOYEE_TABS : ALL_TABS).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Requests' && (() => {
        const rq = requestSearch.toLowerCase()
        const filteredRequests = rq
          ? data.filter(r =>
              (r.employeeName || '').toLowerCase().includes(rq) ||
              (r.leaveTypeName || '').toLowerCase().includes(rq) ||
              (r.status || '').toLowerCase().includes(rq) ||
              (r.departmentName || '').toLowerCase().includes(rq)
            )
          : data
        return <>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by employee, type, department or status…"
              value={requestSearch}
              onChange={e => setRequestSearch(e.target.value)}
              className="w-full sm:w-96 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <DataTable columns={requestColumns} data={filteredRequests} loading={loading} />
          <Pagination page={pagination.page} totalPages={Math.ceil(pagination.total / pagination.size)} onPageChange={p => dispatch(fetchAll({ page: p, size: 20 }))} />
        </>
      })()}
      {tab === 'Allocations' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <input
              type="text"
              placeholder="Search by employee or leave type…"
              value={allocationSearch}
              onChange={e => setAllocationSearch(e.target.value)}
              className="w-full sm:w-80 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2">
              <Button variant="secondary" onClick={handleBulkAllocate}>Bulk Allocate</Button>
              <Button variant="danger" onClick={handleAnnualReset}>Annual Reset</Button>
            </div>
          </div>
          <DataTable
            columns={allocationColumns}
            data={allocationSearch
              ? leaveAllocations.filter(a =>
                  (a.employeeName || '').toLowerCase().includes(allocationSearch.toLowerCase()) ||
                  (a.leaveTypeName || '').toLowerCase().includes(allocationSearch.toLowerCase())
                )
              : leaveAllocations
            }
            loading={loading}
          />
        </>
      )}
      {tab === 'Assigned Leaves' && (() => {
        const myAllocations = leaveAllocations.filter(a => a.employeeId === user?.employeeId || a.employeeName === user?.name || a.employeeName === user?.username)
        return (
          <div className="space-y-4">
            {myAllocations.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No leave allocations assigned to you</p>
            )}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Leave Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Allocated Days</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Available Days</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Used Days</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Year</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {myAllocations.map((a, i) => {
                    const used = (a.totalLeaveDays ?? 0) - (a.availableDays ?? 0)
                    return (
                      <tr key={a.id || i} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{a.leaveTypeName || '—'}</td>
                        <td className="py-3 px-4 text-gray-600">{a.totalLeaveDays ?? '—'}</td>
                        <td className="py-3 px-4 text-green-600 font-semibold">{a.availableDays ?? '—'}</td>
                        <td className="py-3 px-4 text-red-500">{used}</td>
                        <td className="py-3 px-4 text-gray-500">{a.year || '—'}</td>
                      </tr>
                    )
                  })}
                  {myAllocations.length === 0 && (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-400">No assigned leaves found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}
      {tab === 'Balance' && (() => {
        const base = isEmployee()
          ? leaveBalance.filter(a => a.employeeId === user?.employeeId || a.employeeName === user?.name)
          : leaveBalance
        const q = balanceSearch.toLowerCase()
        const myBalance = q
          ? base.filter(a =>
              (a.employeeName || '').toLowerCase().includes(q) ||
              (a.leaveTypeName || '').toLowerCase().includes(q)
            )
          : base
        return (
          <div>
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search by employee or leave type…"
              value={balanceSearch}
              onChange={e => setBalanceSearch(e.target.value)}
              className="w-full sm:w-80 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myBalance.length === 0 && (
              <p className="text-sm text-gray-400 col-span-full text-center py-8">No leave balance records found</p>
            )}
            {myBalance.map((a, i) => {
              const used = a.usedDays ?? 0
              const pct = a.totalLeaveDays > 0 ? Math.round(((a.availableDays ?? 0) / a.totalLeaveDays) * 100) : 0
              return (
                <div key={a.id || i} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-800 text-sm">{a.leaveTypeName || '—'}</p>
                      {!isEmployee() && <p className="text-xs text-gray-500">{a.employeeName || '—'}</p>}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-400">{a.assignedDate ? new Date(a.assignedDate).getFullYear() : '—'}</span>
                      {canManage && (
                        <>
                          <button onClick={() => openBalanceEdit(a)} className="ml-2 text-xs text-indigo-500 hover:text-indigo-700 font-medium">Edit</button>
                          <button onClick={() => setBalanceDeleteTarget(a)} className="text-xs text-red-400 hover:text-red-600 font-medium">Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-end justify-between mb-2">
                    <div>
                      <p className="text-2xl font-bold text-indigo-600">{a.availableDays ?? '—'}</p>
                      <p className="text-xs text-gray-400">days available</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-600">{used} used</p>
                      <p className="text-xs text-gray-400">of {a.totalLeaveDays ?? '—'} total</p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          </div>
        )
      })()}

      {/* Apply / Edit Leave Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null) }} title={editTarget ? 'Edit Leave Request' : 'Apply for Leave'}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => { setModalOpen(false); setEditTarget(null) }}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editTarget ? 'Update' : 'Submit'}</Button></div>}>
        <div className="space-y-4">
          {!editTarget && canManage && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Apply leave for</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer ${applyFor !== 'employee' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'}`}>
                    <input type="radio" value="self" {...register('applyFor')} />
                    <span className="text-sm">Me</span>
                  </label>
                  <label className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer ${applyFor === 'employee' ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'}`}>
                    <input type="radio" value="employee" {...register('applyFor')} />
                    <span className="text-sm">Another employee</span>
                  </label>
                </div>
              </div>
              {applyFor === 'employee' && (
                <div className="space-y-2">
                  <Input
                    label="Search employee"
                    placeholder="Search by name, employee ID, or email"
                    value={employeeSearch}
                    onChange={event => {
                      setEmployeeSearch(event.target.value)
                      setValue('employeeId', '', { shouldValidate: false })
                    }}
                    error={errors.employeeId?.message}
                  />
                  <input type="hidden" {...register('employeeId', {
                    validate: value => applyFor !== 'employee' || Boolean(value) || 'Search and select an employee',
                  })} />
                  {employeeSearch.trim() && !selectedEmployeeId && (
                    <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-sm">
                      {filteredEmployees.length > 0 ? filteredEmployees.slice(0, 10).map(employee => (
                        <button
                          type="button"
                          key={employee.id}
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-indigo-50 border-b border-gray-100 last:border-b-0"
                          onClick={() => {
                            setEmployeeSearch(employeeLabel(employee))
                            setValue('employeeId', String(employee.id), { shouldValidate: true })
                          }}
                        >
                          <span className="font-medium text-gray-800">{employeeLabel(employee)}</span>
                          {(employee.workEmail || employee.email) && (
                            <span className="block text-xs text-gray-500">{employee.workEmail || employee.email}</span>
                          )}
                        </button>
                      )) : (
                        <p className="px-3 py-3 text-sm text-gray-500">No employees found</p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          <Select label="Leave Type" options={leaveTypes.map(lt => ({ value: lt.id, label: lt.name }))} error={errors.leaveTypeId?.message} {...register('leaveTypeId', { required: 'Required' })} />
          <Input label="Start Date" type="date" error={errors.startDate?.message} {...register('startDate', { required: 'Required' })} />
          <Input label="End Date" type="date" error={errors.endDate?.message} {...register('endDate', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={3} {...register('description')} />
          </div>
        </div>
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
        title={confirmModal.action === 'cancel' ? 'Cancel Leave Request' : 'Delete Comment'}
        message={
          confirmModal.action === 'cancel' ? 'Are you sure you want to cancel this leave request?' :
          'Are you sure you want to delete this comment?'
        }
        confirmLabel={confirmModal.action === 'cancel' ? 'Cancel Leave' : 'Delete'}
        loading={loading}
      />

      {/* Balance Edit Modal */}
      <Modal
        open={!!balanceEditTarget}
        onClose={() => setBalanceEditTarget(null)}
        title={`Edit Balance — ${balanceEditTarget?.employeeName || ''} / ${balanceEditTarget?.leaveTypeName || ''}`}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBalanceEditTarget(null)}>Cancel</Button>
            <Button onClick={handleBalanceEditSave} disabled={balanceSaving}>{balanceSaving ? 'Saving…' : 'Save'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Available Days"
            type="number"
            min="0"
            step="0.5"
            value={balanceEditForm.availableDays}
            onChange={e => setBalanceEditForm(f => ({ ...f, availableDays: e.target.value }))}
          />
          <Input
            label="Carry Forward Days"
            type="number"
            min="0"
            step="0.5"
            value={balanceEditForm.carryforwardDays}
            onChange={e => setBalanceEditForm(f => ({ ...f, carryforwardDays: e.target.value }))}
          />
          <Input
            label="Total Leave Days"
            type="number"
            min="0"
            step="0.5"
            value={balanceEditForm.totalLeaveDays}
            onChange={e => setBalanceEditForm(f => ({ ...f, totalLeaveDays: e.target.value }))}
          />
        </div>
      </Modal>

      {/* Balance Delete Confirm */}
      <ConfirmModal
        open={!!balanceDeleteTarget}
        onClose={() => setBalanceDeleteTarget(null)}
        onConfirm={confirmBalanceDelete}
        title="Delete Leave Balance"
        message={`Are you sure you want to delete the leave balance for ${balanceDeleteTarget?.employeeName || ''} / ${balanceDeleteTarget?.leaveTypeName || ''}? This cannot be undone.`}
        confirmLabel="Delete"
        loading={balanceDeleting}
      />
    </div>
  )
}
