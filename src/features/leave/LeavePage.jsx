import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchAll, create, update, remove, bulkRemove, fetchLeaveTypes, fetchLeaveAllocations, approveLeave, rejectLeave,
  importHistoricalLeaves,
  downloadHistoricalLeaveTemplate,
  exportLeaveRequests,
  cancelLeave, bulkAllocateLeave, annualLeaveReset,
  exportLeaveAllocations, importLeaveAllocations,
  fetchLeaveRequestComments, addLeaveRequestComment, deleteLeaveRequestComment,
  fetchConditionApprovals, addConditionApproval, approveConditionStep, rejectConditionStep,
  fetchLeaveRequestFiles, uploadLeaveRequestFile, deleteLeaveRequestFile,
  fetchLeaveBalance, updateLeaveBalance,
  selectAll, selectLoading, selectPagination,
  selectLeaveRequestComments, selectConditionApprovals, selectLeaveRequestFiles,
  selectLeaveBalance,
} from './leaveSlice'
import api from '../../services/api'
import LeaveAttachmentActions from './LeaveAttachmentActions'
import LeaveRequestActionMenu from './LeaveRequestActionMenu'
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
  const { user, roles, effectiveCompanyId, isEmployee, isHRManager, isBranchAdmin, isEnterpriseAdmin, isPlatformAdmin } = useAuth()
  const platformAdmin = isPlatformAdmin()
  const canManage = platformAdmin || roles.includes('SUPER_ADMIN') || isEnterpriseAdmin() || isBranchAdmin() || isHRManager()
  const canDeleteCancelledLeave = platformAdmin || roles.includes('SUPER_ADMIN')
  const data = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const pagination = useSelector(selectPagination)
  const leaveTypes = useSelector(s => s.leave.leaveTypes)
  const leaveTypesLoading = useSelector(s => s.leave.leaveTypesLoading)
  const leaveTypesError = useSelector(s => s.leave.leaveTypesError)
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
  const [selectedRequestIds, setSelectedRequestIds] = useState(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, ids: [] })
  const [requestDeleting, setRequestDeleting] = useState(false)
  const [requestYear, setRequestYear] = useState(String(new Date().getFullYear()))
  const [showCancelledRequests, setShowCancelledRequests] = useState(false)
  const [allocationYear, setAllocationYear] = useState('')
  const [selectedAllocationIds, setSelectedAllocationIds] = useState(new Set())
  const [allocationDeleteConfirm, setAllocationDeleteConfirm] = useState({ open: false, ids: [] })
  const [allocationDeleting, setAllocationDeleting] = useState(false)

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
  const allocationImportRef = useRef(null)
  const historicalImportRef = useRef(null)
  const [allocationImporting, setAllocationImporting] = useState(false)
  const [historicalImporting, setHistoricalImporting] = useState(false)
  const [historicalTemplateDownloading, setHistoricalTemplateDownloading] = useState(false)
  const [requestExporting, setRequestExporting] = useState(false)
  const [allocationExporting, setAllocationExporting] = useState(false)
  const [purgeModal, setPurgeModal] = useState(false)
  const [purgeSummary, setPurgeSummary] = useState(null)
  const [purgeConfirmation, setPurgeConfirmation] = useState('')
  const [purgeLoading, setPurgeLoading] = useState(false)
  const canPurgeLeaveData = platformAdmin || roles.includes('SUPER_ADMIN')

  const leaveRequestParams = (page = 0, size = 20) => ({
    page,
    size,
    ...(requestYear ? { year: Number(requestYear) } : {}),
    ...(canDeleteCancelledLeave && showCancelledRequests ? { includeCancelled: true } : {}),
  })

  const requireCompany = () => {
    if (effectiveCompanyId) return effectiveCompanyId
    toast.error('Select a company before importing leave data')
    return null
  }

  const openPurgeLeaveData = async () => {
    const companyId = requireCompany()
    if (!companyId) return
    setPurgeLoading(true)
    try {
      const response = await api.get('/leave/admin/purge-summary', { params: { companyId } })
      setPurgeSummary(response.data || {})
      setPurgeConfirmation('')
      setPurgeModal(true)
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Unable to load leave-data summary')
    } finally {
      setPurgeLoading(false)
    }
  }

  const confirmPurgeLeaveData = async () => {
    const companyId = requireCompany()
    if (!companyId || purgeConfirmation !== 'DELETE ALL LEAVE DATA') return
    setPurgeLoading(true)
    try {
      const response = await api.post('/leave/admin/purge', { confirmation: purgeConfirmation }, { params: { companyId } })
      toast.success(`${response.data?.totalDeleted || 0} leave records deleted`)
      setPurgeModal(false)
      setPurgeSummary(null)
      await Promise.all([
        dispatch(fetchAll({ page: 0, size: 20, ...(requestYear ? { year: Number(requestYear) } : {}) })),
        dispatch(fetchLeaveAllocations(allocationYear ? { year: Number(allocationYear) } : {})),
        dispatch(fetchLeaveBalance()),
      ])
    } catch (error) {
      toast.error(error?.response?.data?.message || 'Failed to delete leave data')
    } finally {
      setPurgeLoading(false)
    }
  }

  const handleAllocationTemplate = async () => {
    const companyId = requireCompany()
    if (!companyId) return
    setAllocationExporting(true)
    try {
      await dispatch(exportLeaveAllocations(companyId)).unwrap()
      toast.success('Allocation Excel downloaded')
    } catch (e) {
      toast.error(e || 'Failed to download allocation Excel')
    } finally {
      setAllocationExporting(false)
    }
  }

  const handleAllocationImport = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const companyId = requireCompany()
    if (!companyId) return
    setAllocationImporting(true)
    try {
      const result = await dispatch(importLeaveAllocations({ companyId, file })).unwrap()
      const imported = result.imported || 0
      const failed = result.failed || 0
      if (imported) toast.success(`${imported} leave allocation${imported === 1 ? '' : 's'} imported`)
      if (failed) toast.error(`${failed} row${failed === 1 ? '' : 's'} failed: ${result.errors?.[0] || 'check the Excel values'}`)
      if (!imported && !failed) toast('No allocation rows found in the file')
      await Promise.all([
        dispatch(fetchLeaveAllocations(allocationYear ? { year: Number(allocationYear) } : {})),
        dispatch(fetchLeaveBalance()),
      ])
    } catch (e) {
      toast.error(e || 'Failed to import leave allocations')
    } finally {
      setAllocationImporting(false)
    }
  }

  const handleHistoricalImport = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const companyId = requireCompany()
    if (!companyId) return
    setHistoricalImporting(true)
    try {
      const result = await dispatch(importHistoricalLeaves({ companyId, file })).unwrap()
      const imported = result.imported || 0
      const duplicates = result.duplicates || 0
      const failed = result.failed || 0
      const skipped = result.skipped || 0
      if (imported) toast.success(`${imported} historical leave request${imported === 1 ? '' : 's'} imported`)
      if (duplicates) toast(`${duplicates} duplicate row${duplicates === 1 ? '' : 's'} skipped`)
      if (failed) toast.error(`${failed} row${failed === 1 ? '' : 's'} failed: ${result.errors?.[0] || 'check employee IDs and dates'}`)
      if (!imported && !duplicates && !failed) toast(`No leave rows imported (${skipped} blank row${skipped === 1 ? '' : 's'} skipped)`)
      await Promise.all([
        dispatch(fetchAll(leaveRequestParams())),
        dispatch(fetchLeaveBalance()),
      ])
    } catch (e) {
      toast.error(e || 'Failed to import historical leave requests')
    } finally {
      setHistoricalImporting(false)
    }
  }

  const handleHistoricalTemplateDownload = async () => {
    setHistoricalTemplateDownloading(true)
    try {
      await dispatch(downloadHistoricalLeaveTemplate()).unwrap()
      toast.success('Sample template downloaded')
    } catch (e) {
      toast.error(e || 'Failed to download sample template')
    } finally {
      setHistoricalTemplateDownloading(false)
    }
  }

  const handleRequestExport = async () => {
    setRequestExporting(true)
    try {
      await dispatch(exportLeaveRequests()).unwrap()
      toast.success('Leave requests downloaded')
    } catch (e) {
      toast.error(e || 'Failed to download leave requests')
    } finally {
      setRequestExporting(false)
    }
  }

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
  const leaveDuration = watch('leaveDuration') || 'FULL_DAY'
  const leaveStartDate = watch('startDate')
  const leaveEndDate = watch('endDate')
  const selectedLeaveTypeId = watch('leaveTypeId')
  const selectedLeaveType = leaveTypes.find(type => String(type.id) === String(selectedLeaveTypeId))
  const isSickLeave = String(selectedLeaveType?.name || '').replace(/[^a-z]/gi, '').toLowerCase() === 'sickleave'
  const showCertificateUpload = !editTarget && isSickLeave && leaveDuration === 'FULL_DAY'
    && Boolean(leaveStartDate && leaveEndDate && leaveEndDate > leaveStartDate)
  const { register: regApproval, handleSubmit: handleApprovalSubmit, reset: resetApproval, formState: { errors: approvalErrors } } = useForm()

  useEffect(() => {
    dispatch(fetchAll(leaveRequestParams()))
    dispatch(fetchLeaveBalance())
  }, [dispatch, requestYear, effectiveCompanyId, platformAdmin, canDeleteCancelledLeave, showCancelledRequests])

  useEffect(() => {
    // Employee context can arrive after /auth/me. Refetch on context changes,
    // and discard responses from the previous company.
    if (!platformAdmin && !canManage && !effectiveCompanyId) return
    const request = dispatch(fetchLeaveTypes(effectiveCompanyId))
    return () => request.abort()
  }, [dispatch, effectiveCompanyId, platformAdmin, canManage])

  useEffect(() => {
    if (leaveDuration !== 'FULL_DAY' && leaveStartDate) {
      setValue('endDate', leaveStartDate, { shouldValidate: true })
    }
  }, [leaveDuration, leaveStartDate, setValue])

  useEffect(() => {
    dispatch(fetchLeaveAllocations(allocationYear ? { year: Number(allocationYear) } : {}))
    setSelectedAllocationIds(new Set())
  }, [dispatch, allocationYear, effectiveCompanyId])

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
      dispatch(fetchLeaveRequestFiles(request.id)).unwrap(),
    ]).catch(() => toast.error('Unable to load attachments. Please reopen the request and try again.'))
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
    try { await dispatch(approveLeave(id)).unwrap(); setDetailOpen(false); toast.success('Approved'); dispatch(fetchAll(leaveRequestParams())) }
    catch (e) { toast.error(e || 'Failed') }
  }
  const handleReject = (id) => {
    setRejectModal({ open: true, id, reason: '' })
  }
  const submitReject = async () => {
    try {
      await dispatch(rejectLeave({ id: rejectModal.id, reason: rejectModal.reason || undefined })).unwrap()
      toast.success('Rejected')
      setDetailOpen(false)
      setRejectModal({ open: false, id: null, reason: '' })
      dispatch(fetchAll(leaveRequestParams()))
    } catch (e) { toast.error(e || 'Failed') }
  }

  const handleCancel = (id) => setConfirmModal({ open: true, action: 'cancel', id })

  const toggleRequest = (id) => setSelectedRequestIds(current => {
    const next = new Set(current)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const requestQuery = requestSearch.trim().toLowerCase()
  const visibleRequests = requestQuery ? data.filter(request =>
    (request.employeeName || '').toLowerCase().includes(requestQuery) ||
    (request.leaveTypeName || '').toLowerCase().includes(requestQuery) ||
    (request.status || '').toLowerCase().includes(requestQuery) ||
    (request.departmentName || '').toLowerCase().includes(requestQuery)
  ) : data
  const cancellableRequests = visibleRequests.filter(request => request.status === 'CANCELLED')

  const toggleAllRequests = () => setSelectedRequestIds(current => {
    const pageIds = cancellableRequests.map(request => request.id)
    const allSelected = pageIds.length > 0 && pageIds.every(id => current.has(id))
    const next = new Set(current)
    pageIds.forEach(id => allSelected ? next.delete(id) : next.add(id))
    return next
  })

  useEffect(() => setSelectedRequestIds(new Set()), [effectiveCompanyId, pagination.page, tab, requestSearch, showCancelledRequests])

  const confirmRequestDelete = async () => {
    const ids = deleteConfirm.ids
    if (!ids.length) return
    setRequestDeleting(true)
    try {
      let deleted = ids.length
      if (ids.length === 1) await dispatch(remove(ids[0])).unwrap()
      else await dispatch(bulkRemove(ids)).unwrap()
      toast.success(`${deleted} leave request${deleted === 1 ? '' : 's'} deleted`)
      setSelectedRequestIds(current => {
        const next = new Set(current); ids.forEach(id => next.delete(id)); return next
      })
      setDeleteConfirm({ open: false, ids: [] })
      await Promise.all([
        dispatch(fetchAll(leaveRequestParams(pagination.page, pagination.size || 20))),
        dispatch(fetchLeaveBalance()),
      ])
    } catch (e) {
      toast.error(e || 'Failed to delete leave request')
    } finally {
      setRequestDeleting(false)
    }
  }

  const onConfirmAction = async () => {
    const { action, id } = confirmModal
    try {
      if (action === 'cancel') {
        await dispatch(cancelLeave(id)).unwrap(); toast.success('Cancelled'); dispatch(fetchAll(leaveRequestParams()))
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
      dispatch(fetchLeaveAllocations(allocationYear ? { year: Number(allocationYear) } : {}))
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
      dispatch(fetchLeaveAllocations(allocationYear ? { year: Number(allocationYear) } : {}))
    } catch (e) { toast.error(e || 'Annual reset failed') }
  }


  const openEdit = (request) => {
    setEditTarget(request)
    reset({
      leaveTypeId: request.leaveTypeId || request.leaveType?.id || '',
      startDate: request.startDate || '',
      endDate: request.endDate || '',
      leaveDuration: request.leaveDuration || 'FULL_DAY',
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
          leaveDuration: formData.leaveDuration || 'FULL_DAY',
          description: formData.description,
          companyId: effectiveCompanyId,
        }
        if (canManage && formData.applyFor === 'employee') {
          payload.employeeId = Number(formData.employeeId)
        }
        if (showCertificateUpload) payload.certificate = formData.certificate?.[0]
        await dispatch(create(payload)).unwrap()
        toast.success(formData.applyFor === 'employee' ? 'Leave applied for employee' : 'Leave applied')
      }
      setModalOpen(false)
      dispatch(fetchAll(leaveRequestParams()))
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
    { id: 'actions', header: 'Actions', enableSorting: false, meta: { stickyLeft: true }, cell: ({ row }) => (
      <LeaveRequestActionMenu request={row.original} canDeleteCancelledLeave={canDeleteCancelledLeave}
        onAction={action => {
          const request = row.original
          if (action === 'details') openDetail(request)
          else if (action === 'approve') handleApprove(request.id)
          else if (action === 'reject') handleReject(request.id)
          else if (action === 'edit') openEdit(request)
          else if (action === 'cancel') handleCancel(request.id)
          else if (action === 'delete') setDeleteConfirm({ open: true, ids: [request.id] })
        }} />
    )},
    ...(canDeleteCancelledLeave ? [{
      id: 'select',
      enableSorting: false,
      header: () => <input type="checkbox" aria-label="Select all leave requests on this page"
        checked={cancellableRequests.length > 0 && cancellableRequests.every(request => selectedRequestIds.has(request.id))}
        onChange={toggleAllRequests} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />,
      cell: ({ row }) => row.original.status === 'CANCELLED' && <input type="checkbox" aria-label={`Select cancelled leave request for ${row.original.employeeName || 'employee'}`}
        checked={selectedRequestIds.has(row.original.id)} onChange={() => toggleRequest(row.original.id)}
        onClick={event => event.stopPropagation()} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />,
    }] : []),
    { id: 'employee', header: 'Employee', cell: ({ row }) => row.original.employeeName || '—' },
    { id: 'department', header: 'Department', cell: ({ row }) => row.original.departmentName || '—' },
    { id: 'leaveType', header: 'Type', cell: ({ row }) => row.original.leaveTypeName || '—' },
    { accessorKey: 'startDate', header: 'Start', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'endDate', header: 'End', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'requestedDays', header: 'Days', cell: ({ getValue }) => getValue() != null ? getValue() : '—' },
    { accessorKey: 'description', header: 'Reason', cell: ({ getValue }) => <span className="max-w-xs truncate block">{getValue() || '—'}</span> },
    { id: 'approvedBy', header: 'Approved By', cell: ({ row }) => row.original.approvedByName || '—' },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue()} variant={STATUS_COLORS[getValue()?.toLowerCase()] || 'default'} /> },
  ]

  const allocationColumns = [
    ...(canManage ? [{
      id: 'select', enableSorting: false,
      header: () => <input type="checkbox" aria-label="Select all visible leave allocations"
        checked={filteredAllocations.length > 0 && filteredAllocations.every(item => selectedAllocationIds.has(item.id))}
        onChange={() => setSelectedAllocationIds(current => {
          const next = new Set(current)
          const allSelected = filteredAllocations.length > 0 && filteredAllocations.every(item => next.has(item.id))
          filteredAllocations.forEach(item => allSelected ? next.delete(item.id) : next.add(item.id))
          return next
        })} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />,
      cell: ({ row }) => <input type="checkbox" aria-label={`Select allocation for ${row.original.employeeName || 'employee'}`}
        checked={selectedAllocationIds.has(row.original.id)} onChange={() => setSelectedAllocationIds(current => {
          const next = new Set(current); next.has(row.original.id) ? next.delete(row.original.id) : next.add(row.original.id); return next
        })} onClick={event => event.stopPropagation()} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />,
    }] : []),
    { id: 'employee', header: 'Employee', cell: ({ row }) => row.original.employeeName || '—' },
    { id: 'leaveType', header: 'Type', cell: ({ row }) => row.original.leaveTypeName || '—' },
    { accessorKey: 'totalLeaveDays', header: 'Allocated' },
    { accessorKey: 'availableDays', header: 'Available' },
    { accessorKey: 'usedDays', header: 'Used' },
    { accessorKey: 'remainingDays', header: 'Remaining' },
    { accessorKey: 'year', header: 'Year' },
    ...(canManage ? [{ id: 'actions', header: '', cell: ({ row }) => <Button size="sm" variant="danger" onClick={() => setAllocationDeleteConfirm({ open: true, ids: [row.original.id] })}>Delete</Button> }] : []),
  ]

  const allocationQuery = allocationSearch.trim().toLowerCase()
  const filteredAllocations = allocationQuery ? leaveAllocations.filter(allocation =>
    (allocation.employeeName || '').toLowerCase().includes(allocationQuery) ||
    (allocation.leaveTypeName || '').toLowerCase().includes(allocationQuery)
  ) : leaveAllocations

  const confirmAllocationDelete = async () => {
    const ids = allocationDeleteConfirm.ids
    if (!ids.length) return
    setAllocationDeleting(true)
    try {
      if (ids.length === 1) await api.delete(`/leave/allocations/${ids[0]}`)
      else await api.post('/leave/allocations/bulk-delete', ids)
      toast.success(`${ids.length} leave allocation${ids.length === 1 ? '' : 's'} deleted`)
      setAllocationDeleteConfirm({ open: false, ids: [] })
      setSelectedAllocationIds(new Set())
      await Promise.all([dispatch(fetchLeaveAllocations(allocationYear ? { year: Number(allocationYear) } : {})), dispatch(fetchLeaveBalance())])
    } catch (e) { toast.error(e?.response?.data?.message || 'Failed to delete leave allocation') }
    finally { setAllocationDeleting(false) }
  }

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
    <div className="space-y-5 pb-6">
      <PageHeader title="Leave Management" subtitle="Requests, types, and allocations"
        actions={<div className="flex flex-wrap justify-end gap-2">
          {canPurgeLeaveData && <Button variant="danger" onClick={openPurgeLeaveData} disabled={purgeLoading}>
            Delete all leave data
          </Button>}
          <Button onClick={() => {
          setEditTarget(null)
          setEmployeeSearch('')
          reset({ applyFor: 'self', employeeId: '', leaveTypeId: '', startDate: '', endDate: '', description: '' })
          setModalOpen(true)
          }}>+ Apply Leave</Button>
        </div>} />
      <div className="inline-flex max-w-full flex-wrap gap-1 rounded-2xl border border-[#DCE7F2] bg-white p-1.5 shadow-[0_6px_20px_rgba(30,65,96,0.04)]">
        {(isEmployee() ? EMPLOYEE_TABS : ALL_TABS).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${tab === t ? 'bg-[#1F5F9D] text-white shadow-[0_5px_12px_rgba(31,95,157,0.2)]' : 'text-slate-500 hover:bg-[#F2F7FC] hover:text-[#24496B]'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Requests' && (() => {
        return <>
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#DCE7F2] bg-gradient-to-r from-white to-[#F6F9FD] p-4 shadow-[0_6px_20px_rgba(30,65,96,0.035)] sm:flex-row sm:items-center sm:justify-between">
            <input
              type="text"
              placeholder="Search by employee, type, department or status…"
              value={requestSearch}
              onChange={e => setRequestSearch(e.target.value)}
              className="w-full rounded-xl border border-[#DCE7F2] bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#77A9D9] focus:ring-4 focus:ring-[#E6F0FA] sm:w-96"
            />
            {canManage && (
              <div className="flex gap-2">
                <select aria-label="Filter leave requests by year" value={requestYear}
                  onChange={event => { setRequestYear(event.target.value); setSelectedRequestIds(new Set()) }}
                  className="rounded-xl border border-[#DCE7F2] bg-white px-3.5 py-2.5 text-sm text-[#294766] outline-none focus:border-[#77A9D9] focus:ring-4 focus:ring-[#E6F0FA]">
                  <option value="">All years</option>
                  {Array.from({ length: 8 }, (_, index) => new Date().getFullYear() + 1 - index).map(year => <option key={year} value={year}>{year}</option>)}
                </select>
                {canDeleteCancelledLeave && <label className="flex items-center gap-2 text-sm text-gray-600 whitespace-nowrap">
                  <input type="checkbox" checked={showCancelledRequests}
                    onChange={event => { setShowCancelledRequests(event.target.checked); setSelectedRequestIds(new Set()) }} />
                  Show cancelled
                </label>}
                {canDeleteCancelledLeave && selectedRequestIds.size > 0 && (
                  <Button variant="danger" onClick={() => setDeleteConfirm({ open: true, ids: [...selectedRequestIds] })}>
                    Delete cancelled ({selectedRequestIds.size})
                  </Button>
                )}
                <input
                  ref={historicalImportRef}
                  type="file"
                  accept=".xlsx"
                  className="hidden"
                  onChange={handleHistoricalImport}
                />
                <Button variant="secondary" onClick={handleHistoricalTemplateDownload} disabled={historicalTemplateDownloading}>
                  {historicalTemplateDownloading ? 'Downloading…' : 'Download Sample Template'}
                </Button>
                <Button variant="secondary" onClick={handleRequestExport} disabled={requestExporting}>
                  {requestExporting ? 'Downloading…' : 'Download Leave Requests'}
                </Button>
                <Button variant="secondary" onClick={() => historicalImportRef.current?.click()} disabled={historicalImporting}>
                  {historicalImporting ? 'Uploading…' : 'Upload Old Leaves'}
                </Button>
              </div>
            )}
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white shadow-[0_8px_26px_rgba(30,65,96,0.05)]">
            <DataTable columns={requestColumns} data={visibleRequests} loading={loading} />
          </div>
          <Pagination page={pagination.page} totalPages={Math.ceil(pagination.total / pagination.size)} onPageChange={p => dispatch(fetchAll(leaveRequestParams(p, 20)))} />
        </>
      })()}
      {tab === 'Allocations' && (
        <>
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-[#DCE7F2] bg-gradient-to-r from-white to-[#F6F9FD] p-4 shadow-[0_6px_20px_rgba(30,65,96,0.035)] sm:flex-row sm:items-center sm:justify-between">
            <input
              type="text"
              placeholder="Search by employee or leave type…"
              value={allocationSearch}
              onChange={e => setAllocationSearch(e.target.value)}
              className="w-full rounded-xl border border-[#DCE7F2] bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#77A9D9] focus:ring-4 focus:ring-[#E6F0FA] sm:w-80"
            />
            <div className="flex gap-2">
              <select aria-label="Filter leave allocations by year" value={allocationYear} onChange={event => setAllocationYear(event.target.value)}
                className="rounded-xl border border-[#DCE7F2] bg-white px-3.5 py-2.5 text-sm text-[#294766] outline-none focus:border-[#77A9D9] focus:ring-4 focus:ring-[#E6F0FA]">
                <option value="">All years</option>
                {Array.from({ length: 8 }, (_, index) => new Date().getFullYear() + 1 - index).map(year => <option key={year} value={year}>{year}</option>)}
              </select>
              {selectedAllocationIds.size > 0 && <Button variant="danger" onClick={() => setAllocationDeleteConfirm({ open: true, ids: [...selectedAllocationIds] })}>Delete Selected ({selectedAllocationIds.size})</Button>}
              <input
                ref={allocationImportRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleAllocationImport}
              />
              <Button variant="secondary" onClick={handleAllocationTemplate} disabled={allocationExporting}>
                {allocationExporting ? 'Downloading…' : 'Download Allocations'}
              </Button>
              <Button variant="secondary" onClick={() => allocationImportRef.current?.click()} disabled={allocationImporting}>
                {allocationImporting ? 'Uploading…' : 'Upload Excel'}
              </Button>
              <Button variant="secondary" onClick={handleBulkAllocate}>Bulk Allocate</Button>
              <Button variant="danger" onClick={handleAnnualReset}>Annual Reset</Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white shadow-[0_8px_26px_rgba(30,65,96,0.05)]">
            <DataTable
              columns={allocationColumns}
              data={filteredAllocations}
              loading={loading}
            />
          </div>
        </>
      )}
      {tab === 'Assigned Leaves' && (() => {
        const myAllocations = leaveAllocations.filter(a => a.employeeId === user?.employeeId || a.employeeName === user?.name || a.employeeName === user?.username)
        return (
          <div className="space-y-4">
            {myAllocations.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No leave allocations assigned to you</p>
            )}
            <div className="overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white shadow-[0_8px_26px_rgba(30,65,96,0.05)]">
              <table className="w-full text-sm">
                <thead className="border-b border-[#DCE7F2] bg-[#F4F8FC]">
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
                    const used = a.usedDays ?? 0
                    return (
                      <tr key={a.id || i} className="transition-colors hover:bg-[#F7FAFD]">
                        <td className="py-3 px-4 font-medium text-gray-900">{a.leaveTypeName || '—'}</td>
                        <td className="py-3 px-4 text-gray-600">{a.totalLeaveDays ?? '—'}</td>
                        <td className="py-3 px-4 text-green-600 font-semibold">{a.remainingDays ?? a.availableDays ?? '—'}</td>
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
          <div className="mb-4 rounded-2xl border border-[#DCE7F2] bg-white p-4 shadow-[0_6px_20px_rgba(30,65,96,0.035)]">
            <input
              type="text"
              placeholder="Search by employee or leave type…"
              value={balanceSearch}
              onChange={e => setBalanceSearch(e.target.value)}
              className="w-full rounded-xl border border-[#DCE7F2] bg-[#F8FAFC] px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-[#77A9D9] focus:ring-4 focus:ring-[#E6F0FA] sm:w-80"
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
                <div key={a.id || i} className="group relative overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white p-5 shadow-[0_7px_22px_rgba(30,65,96,0.045)] transition hover:-translate-y-0.5 hover:shadow-md">
                  <span className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#4D8FD1] to-[#E7C65B]" />
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
                      <p className="text-2xl font-bold tracking-tight text-[#2D6FB4]">{a.availableDays ?? '—'}</p>
                      <p className="text-xs text-gray-400">days available</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-600">{used} used</p>
                      <p className="text-xs text-gray-400">of {a.totalLeaveDays ?? '—'} total</p>
                    </div>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#EAF0F6]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#377DBD] to-[#E2BE54] transition-all"
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
          <Select label="Leave Type *" placeholder={leaveTypesLoading ? 'Loading leave types…' : 'Select a leave type'} disabled={leaveTypesLoading || !!leaveTypesError} options={leaveTypes.map(lt => ({ value: lt.id, label: lt.name }))} error={leaveTypesError || errors.leaveTypeId?.message} {...register('leaveTypeId', { required: 'Select a leave type' })} />
          {!leaveTypesLoading && (leaveTypesError || !leaveTypes.length) && (
            <div role="status" className="text-sm text-gray-600">
              {!leaveTypesError && <p>No leave types are configured for your company. Contact HR.</p>}
              <Button variant="secondary" size="sm" onClick={() => dispatch(fetchLeaveTypes(effectiveCompanyId))}>Retry loading leave types</Button>
            </div>
          )}
          <Select label="Leave Duration" options={[
            { value: 'FULL_DAY', label: 'Full day' },
            { value: 'FIRST_HALF', label: 'First half' },
            { value: 'SECOND_HALF', label: 'Second half' },
          ]} {...register('leaveDuration')} />
          <Input label="Start Date" type="date" error={errors.startDate?.message} {...register('startDate', { required: 'Required' })} />
          <Input label="End Date" type="date" disabled={leaveDuration !== 'FULL_DAY'} error={errors.endDate?.message} {...register('endDate', { required: 'Required' })} />
          {showCertificateUpload && (
            <div>
              <Input label="Sick leave certificate *" type="file" accept="application/pdf,image/*"
                error={errors.certificate?.message}
                {...register('certificate', {
                  shouldUnregister: true,
                  validate: files => !showCertificateUpload || (files?.length > 0 && files[0].size <= 10 * 1024 * 1024)
                    || 'Attach a certificate (PDF or image, up to 10 MB)',
                })} />
              <p className="mt-1 text-sm text-gray-500">A certificate is required for sick leave longer than one day.</p>
            </div>
          )}
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
              <div><span className="font-medium text-gray-600">Duration:</span> {selectedRequest.leaveDuration === 'FIRST_HALF' ? 'First half' : selectedRequest.leaveDuration === 'SECOND_HALF' ? 'Second half' : 'Full day'}</div>
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
                      <span className="text-gray-700 truncate min-w-0 mr-3" title={f.fileName || 'Attachment'}>{f.fileName || 'Attachment'}</span>
                      <LeaveAttachmentActions key={`${selectedRequest.id}:${f.id}`} requestId={selectedRequest.id} file={f} companyId={selectedRequest.companyId || effectiveCompanyId} />
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

      <ConfirmModal
        open={deleteConfirm.open}
        onClose={() => !requestDeleting && setDeleteConfirm({ open: false, ids: [] })}
        onConfirm={confirmRequestDelete}
        title={deleteConfirm.ids.length === 1 ? 'Delete Cancelled Leave' : 'Delete Cancelled Leaves'}
        message={`Permanently delete ${deleteConfirm.ids.length} cancelled leave request${deleteConfirm.ids.length === 1 ? '' : 's'}? Related comments, approval steps, and attachments will also be removed. This cannot be undone.`}
        confirmLabel={requestDeleting ? 'Deleting…' : `Delete ${deleteConfirm.ids.length}`}
        danger
      />

      <ConfirmModal open={allocationDeleteConfirm.open}
        onClose={() => !allocationDeleting && setAllocationDeleteConfirm({ open: false, ids: [] })}
        onConfirm={confirmAllocationDelete}
        title={allocationDeleteConfirm.ids.length === 1 ? 'Delete Leave Allocation' : 'Delete Selected Allocations'}
        message={`Permanently delete ${allocationDeleteConfirm.ids.length} selected leave allocation${allocationDeleteConfirm.ids.length === 1 ? '' : 's'}? Existing leave requests will remain. This cannot be undone.`}
        confirmLabel={allocationDeleting ? 'Deleting…' : `Delete ${allocationDeleteConfirm.ids.length}`} />

      <Modal
        open={purgeModal}
        onClose={() => !purgeLoading && setPurgeModal(false)}
        title="Delete all leave data"
        footer={<div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setPurgeModal(false)} disabled={purgeLoading}>Cancel</Button>
          <Button variant="danger" onClick={confirmPurgeLeaveData}
            disabled={purgeLoading || purgeConfirmation !== 'DELETE ALL LEAVE DATA'}>
            {purgeLoading ? 'Deleting…' : 'Delete permanently'}
          </Button>
        </div>}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            This permanently deletes leave requests, attachments, approvals, allocations, balances, accrual logs, and employee leave restrictions for the selected company. Leave types, holiday settings, and other policy configuration stay unchanged.
          </div>
          {purgeSummary && <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
            <p className="mb-2 font-semibold text-gray-900">Records to delete: {Object.values(purgeSummary).reduce((total, count) => total + Number(count || 0), 0)}</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              {Object.entries(purgeSummary).filter(([, count]) => Number(count) > 0).map(([table, count]) => (
                <div key={table} className="flex justify-between gap-2"><span>{table.replaceAll('_', ' ')}</span><strong>{count}</strong></div>
              ))}
            </div>
          </div>}
          <Input
            label="Type DELETE ALL LEAVE DATA to confirm"
            value={purgeConfirmation}
            onChange={event => setPurgeConfirmation(event.target.value)}
            autoComplete="off"
          />
        </div>
      </Modal>

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
