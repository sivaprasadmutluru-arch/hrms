import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchShiftRequests, createShiftRequest, approveShiftRequest, rejectShiftRequest,
  cancelShiftRequest, deleteShiftRequest, bulkApproveShiftRequests, bulkCancelShiftRequests,
  exportShiftRequests, selectShiftRequests, selectShiftRequestsLoading,
} from './shiftRequestSlice'
import api from '../../services/api'
import { fetchShiftSchedules, selectShiftSchedules } from '../base/baseExtrasSlice'
import { fetchAll, selectAll as selectEmployees } from '../employees/employeesSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import ConfirmModal from '../../components/common/ConfirmModal'
import Spinner from '../../components/common/Spinner'
import useAuth from '../../hooks/useAuth'

const STATUS_TABS = ['All', 'REQUESTED', 'APPROVED', 'REJECTED', 'CANCELLED']

const STATUS_BADGE = {
  REQUESTED: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  CANCELLED: 'default',
}

export default function ShiftRequestsPage() {
  const dispatch = useDispatch()
  const { user, isEmployee } = useAuth()
  const isEmp = isEmployee()
  const requests = useSelector(selectShiftRequests)
  const loading = useSelector(selectShiftRequestsLoading)
  const employees = useSelector(selectEmployees)
  const shiftSchedules = useSelector(selectShiftSchedules)

  const [activeTab, setActiveTab] = useState('All')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])
  const [confirmCancel, setConfirmCancel] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm({
    defaultValues: { isPermanent: false },
  })
  const isPermanent = watch('isPermanent')

  useEffect(() => {
    dispatch(fetchShiftRequests())
    dispatch(fetchShiftSchedules())
    if (!isEmp) dispatch(fetchAll({ companyId: user?.companyId }))
  }, [dispatch, user?.companyId, isEmp])

  const filtered = useMemo(() => {
    if (activeTab === 'All') return requests
    return requests.filter(r => r.status === activeTab)
  }, [requests, activeTab])

  const toggleRow = (id) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])

  const toggleAll = () =>
    setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(r => r.id))

  const handleApprove = async (id) => {
    try {
      await dispatch(approveShiftRequest(id)).unwrap()
      toast.success('Shift request approved')
    } catch (e) { toast.error(e || 'Failed to approve') }
  }

  const handleReject = async (id) => {
    try {
      await dispatch(rejectShiftRequest(id)).unwrap()
      toast.success('Shift request rejected')
    } catch (e) { toast.error(e || 'Failed to reject') }
  }

  const handleCancel = async () => {
    try {
      await dispatch(cancelShiftRequest(confirmCancel.id)).unwrap()
      toast.success('Shift request cancelled')
    } catch (e) { toast.error(e || 'Failed to cancel') }
    setConfirmCancel(null)
  }

  const handleDelete = async () => {
    try {
      await dispatch(deleteShiftRequest(confirmDelete.id)).unwrap()
      toast.success('Shift request deleted')
    } catch (e) { toast.error(e || 'Failed to delete') }
    setConfirmDelete(null)
  }

  const handleBulkApprove = async () => {
    try {
      await dispatch(bulkApproveShiftRequests(selectedIds)).unwrap()
      toast.success(`${selectedIds.length} requests approved`)
      setSelectedIds([])
      dispatch(fetchShiftRequests())
    } catch (e) { toast.error(e || 'Bulk approve failed') }
  }

  const handleBulkCancel = async () => {
    try {
      await dispatch(bulkCancelShiftRequests(selectedIds)).unwrap()
      toast.success(`${selectedIds.length} requests cancelled`)
      setSelectedIds([])
      dispatch(fetchShiftRequests())
    } catch (e) { toast.error(e || 'Bulk cancel failed') }
  }

  const openEdit = (req) => {
    setEditTarget(req)
    reset({
      employeeId: req.employee?.id || '',
      requestedShiftId: req.requestedShift?.id || '',
      requestedDate: req.requestedDate || '',
      requestedTill: req.requestedTill || '',
      isPermanent: req.isPermanent || false,
      description: req.description || '',
    })
    setModalOpen(true)
  }

  const onSubmit = async (formData) => {
    try {
      if (editTarget) {
        await api.put(`/attendance/shift-requests/${editTarget.id}`, {
          employee: { id: isEmp ? user?.employeeId : Number(formData.employeeId) },
          requestedShift: { id: Number(formData.requestedShiftId) },
          requestedDate: formData.requestedDate,
          requestedTill: formData.isPermanent ? null : formData.requestedTill || null,
          isPermanent: !!formData.isPermanent,
          description: formData.description || null,
          company: { id: user?.companyId },
        })
        toast.success('Shift request updated')
        setEditTarget(null)
        dispatch(fetchShiftRequests())
      } else {
        const payload = {
          employee: { id: isEmp ? user?.employeeId : Number(formData.employeeId) },
          requestedShift: { id: Number(formData.requestedShiftId) },
          requestedDate: formData.requestedDate,
          requestedTill: formData.isPermanent ? null : formData.requestedTill || null,
          isPermanent: !!formData.isPermanent,
          description: formData.description || null,
          company: { id: user?.companyId },
        }
        await dispatch(createShiftRequest(payload)).unwrap()
        toast.success('Shift request submitted')
      }
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(typeof e === 'string' ? e : 'Failed to submit') }
  }

  const empName = (emp) => emp
    ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeCode || `#${emp.id}`
    : '—'

  return (
    <div className="p-6">
      <PageHeader
        title="Shift Requests"
        subtitle="Employee-initiated shift change requests"
        actions={
          <div className="flex gap-2">
            {!isEmp && (
              <Button variant="secondary" onClick={() => dispatch(exportShiftRequests(user?.companyId))}>
                Export
              </Button>
            )}
            <Button onClick={() => { setEditTarget(null); reset(); setModalOpen(true) }}>+ New Request</Button>
          </div>
        }
      />

      {/* Status Tabs */}
      <div className="flex gap-2 mt-4 flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab === 'All' ? `All (${requests.length})` : `${tab} (${requests.filter(r => r.status === tab).length})`}
          </button>
        ))}
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && !isEmp && (
        <div className="flex items-center gap-3 mt-3 bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100">
          <span className="text-sm text-indigo-700 font-medium">{selectedIds.length} selected</span>
          <Button size="sm" onClick={handleBulkApprove}>Approve</Button>
          <Button size="sm" variant="danger" onClick={handleBulkCancel}>Cancel</Button>
          <button onClick={() => setSelectedIds([])} className="text-xs text-indigo-500 ml-auto hover:underline">
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading && !requests.length ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {!isEmp && (
                    <th className="py-3 px-4 w-8">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === filtered.length && filtered.length > 0}
                        onChange={toggleAll}
                        className="rounded border-gray-300"
                      />
                    </th>
                  )}
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Employee</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Previous Shift</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Requested Shift</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">From</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Till</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Permanent</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Applied</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={!isEmp ? 10 : 9} className="text-center py-10 text-gray-400">
                      No shift requests found
                    </td>
                  </tr>
                )}
                {filtered.map(req => {
                  const isOwn = req.employee?.id === user?.employeeId
                  const isPending = req.status === 'REQUESTED'
                  const isApplied = !!req.shiftChanged

                  return (
                    <tr key={req.id} className="hover:bg-gray-50">
                      {!isEmp && (
                        <td className="py-3 px-4">
                          {isPending && (
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(req.id)}
                              onChange={() => toggleRow(req.id)}
                              className="rounded border-gray-300"
                            />
                          )}
                        </td>
                      )}
                      <td className="py-3 px-4 font-medium text-gray-900">{empName(req.employee)}</td>
                      <td className="py-3 px-4 text-gray-500">{req.previousShift?.name || '—'}</td>
                      <td className="py-3 px-4 text-gray-700">{req.requestedShift?.name || '—'}</td>
                      <td className="py-3 px-4 text-gray-600">{req.requestedDate || '—'}</td>
                      <td className="py-3 px-4 text-gray-500">
                        {req.isPermanent ? <span className="text-indigo-500 text-xs font-medium">Permanent</span> : req.requestedTill || '—'}
                      </td>
                      <td className="py-3 px-4">
                        {req.isPermanent
                          ? <span className="text-xs text-indigo-600 font-medium">Yes</span>
                          : <span className="text-xs text-gray-400">No</span>}
                      </td>
                      <td className="py-3 px-4">
                        {isApplied
                          ? <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">✓ Applied</span>
                          : <span className="text-xs text-gray-400">Pending</span>}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={STATUS_BADGE[req.status] || 'default'} label={req.status} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-end">
                          {/* Manager actions */}
                          {!isEmp && isPending && (
                            <>
                              <button
                                onClick={() => handleApprove(req.id)}
                                className="text-xs text-green-600 hover:underline font-medium"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleReject(req.id)}
                                className="text-xs text-red-500 hover:underline font-medium"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {!isEmp && req.status === 'APPROVED' && (
                            <button
                              onClick={() => setConfirmCancel(req)}
                              className="text-xs text-yellow-600 hover:underline font-medium"
                            >
                              Cancel
                            </button>
                          )}
                          {/* Employee: cancel own pending request */}
                          {isEmp && isOwn && isPending && (
                            <button
                              onClick={() => setConfirmCancel(req)}
                              className="text-xs text-yellow-600 hover:underline font-medium"
                            >
                              Cancel
                            </button>
                          )}
                          {/* Edit: only pending */}
                          {!isEmp && isPending && (
                            <button
                              onClick={() => openEdit(req)}
                              className="text-xs text-indigo-600 hover:underline font-medium"
                            >
                              Edit
                            </button>
                          )}
                          {/* Delete: only non-approved */}
                          {!isEmp && req.status !== 'APPROVED' && (
                            <button
                              onClick={() => setConfirmDelete(req)}
                              className="text-xs text-gray-400 hover:text-red-500 hover:underline"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Request Modal */}
      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null) }}
        title={editTarget ? 'Edit Shift Request' : 'Request Shift Change'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditTarget(null) }}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editTarget ? 'Update' : 'Submit Request'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Employee selector — hidden for employees (use own ID) */}
          {!isEmp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
              <select
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                {...register('employeeId', { required: 'Employee is required' })}
              >
                <option value="">Select employee…</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>
                    {`${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeCode || `#${emp.id}`}
                  </option>
                ))}
              </select>
              {errors.employeeId && <p className="text-xs text-red-500 mt-1">{errors.employeeId.message}</p>}
            </div>
          )}

          {/* Requested Shift */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Requested Shift *</label>
            <select
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              {...register('requestedShiftId', { required: 'Shift is required' })}
            >
              <option value="">Select shift…</option>
              {shiftSchedules.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.requestedShiftId && <p className="text-xs text-red-500 mt-1">{errors.requestedShiftId.message}</p>}
          </div>

          {/* From Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date *</label>
            <input
              type="date"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              {...register('requestedDate', { required: 'Start date is required' })}
            />
            {errors.requestedDate && <p className="text-xs text-red-500 mt-1">{errors.requestedDate.message}</p>}
          </div>

          {/* Permanent toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPermanent"
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              {...register('isPermanent')}
            />
            <label htmlFor="isPermanent" className="text-sm font-medium text-gray-700">
              Permanent shift change
            </label>
          </div>

          {/* Till Date — hidden if permanent */}
          {!isPermanent && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Till Date *</label>
              <input
                type="date"
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                {...register('requestedTill', { required: !isPermanent ? 'End date is required for temporary requests' : false })}
              />
              {errors.requestedTill && <p className="text-xs text-red-500 mt-1">{errors.requestedTill.message}</p>}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Reason for shift change…"
              {...register('description')}
            />
          </div>
        </div>
      </Modal>

      {/* Cancel confirmation */}
      {confirmCancel && (
        <ConfirmModal
          title="Cancel Shift Request"
          message={`Cancel this shift request for ${empName(confirmCancel.employee)}? ${confirmCancel.shiftChanged ? 'The employee\'s shift will be reverted to their previous shift.' : ''}`}
          onConfirm={handleCancel}
          onCancel={() => setConfirmCancel(null)}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <ConfirmModal
          title="Delete Shift Request"
          message="Delete this shift request? This cannot be undone."
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
