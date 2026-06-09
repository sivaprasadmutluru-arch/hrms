import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { fetchShiftAllocations, approveShiftAllocation, cancelShiftAllocation, deleteShiftAllocation, selectShiftAllocations, selectShiftAllocationsLoading } from './shiftAllocationsSlice'
import { fetchAll as fetchEmployees } from '../employees/employeesSlice'
import useAuth from '../../hooks/useAuth'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Badge from '../../components/common/Badge'
import Spinner from '../../components/common/Spinner'
import ConfirmModal from '../../components/common/ConfirmModal'
import ShiftAllocationFormModal from './ShiftAllocationFormModal'
import BulkAllocateModal from './BulkAllocateModal'

const STATUS_OPTIONS = ['All', 'PENDING', 'APPROVED', 'CANCELLED', 'REJECTED']

const STATUS_BADGE = {
  PENDING: 'warning',
  APPROVED: 'success',
  CANCELLED: 'danger',
  REJECTED: 'danger',
}

export default function ShiftAllocationsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const allocations = useSelector(selectShiftAllocations)
  const loading = useSelector(selectShiftAllocationsLoading)

  const [statusFilter, setStatusFilter] = useState('All')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showBulk, setShowBulk] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  useEffect(() => {
    dispatch(fetchEmployees({ page: 0, size: 500 }))
  }, [dispatch])

  useEffect(() => {
    const params = {}
    if (statusFilter !== 'All') params.status = statusFilter
    dispatch(fetchShiftAllocations(params))
  }, [dispatch, statusFilter])

  const handleApprove = async (id) => {
    const res = await dispatch(approveShiftAllocation(id))
    if (res.error) toast.error(res.payload)
    else toast.success('Allocation approved')
  }

  const handleCancel = async (id) => {
    const res = await dispatch(cancelShiftAllocation(id))
    if (res.error) toast.error(res.payload)
    else toast.success('Allocation cancelled')
  }

  const handleDelete = async () => {
    const res = await dispatch(deleteShiftAllocation(confirmDelete.id))
    if (res.error) toast.error(res.payload)
    else toast.success('Allocation deleted')
    setConfirmDelete(null)
  }

  if (loading && !allocations.length) return <div className="flex justify-center p-12"><Spinner /></div>

  return (
    <div className="p-6">
      <PageHeader
        title="Shift Allocations"
        subtitle="Allocate shifts to employees and manage approvals"
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setShowBulk(true)}>Bulk Allocate</Button>
            <Button onClick={() => { setEditing(null); setShowForm(true) }}>+ New Allocation</Button>
          </div>
        }
      />

      <div className="mt-4 flex gap-2">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Employee</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Allocated Shift</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Previous Shift</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Effective Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Allocated By</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allocations.length === 0 && (
                <tr><td colSpan={7} className="text-center py-8 text-gray-400">No allocations found</td></tr>
              )}
              {allocations.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium text-gray-900">
                    {[a.employee?.firstName, a.employee?.lastName].filter(Boolean).join(' ') || a.employee?.employeeCode || a.employee?.id || '—'}
                  </td>
                  <td className="py-3 px-4 text-gray-600">{a.allocatedShift?.name || '—'}</td>
                  <td className="py-3 px-4 text-gray-500">{a.previousShift?.name || '—'}</td>
                  <td className="py-3 px-4 text-gray-600">{a.effectiveDate || '—'}</td>
                  <td className="py-3 px-4">
                    <Badge variant={STATUS_BADGE[a.status] || 'default'}>{a.status}</Badge>
                  </td>
                  <td className="py-3 px-4 text-gray-500">
                    {[a.allocatedBy?.firstName, a.allocatedBy?.lastName].filter(Boolean).join(' ') || a.allocatedBy?.employeeCode || '—'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      {a.status === 'PENDING' && (
                        <button onClick={() => handleApprove(a.id)} className="text-xs text-green-600 hover:underline">Approve</button>
                      )}
                      {a.status === 'PENDING' && (
                        <button onClick={() => handleCancel(a.id)} className="text-xs text-yellow-600 hover:underline">Cancel</button>
                      )}
                      <button
                        onClick={() => { setEditing(a); setShowForm(true) }}
                        className="text-xs text-indigo-600 hover:underline"
                      >Edit</button>
                      <button onClick={() => setConfirmDelete(a)} className="text-xs text-red-500 hover:underline">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <ShiftAllocationFormModal
          open
          allocation={editing}
          companyId={user?.companyId}
          onClose={() => { setShowForm(false); setEditing(null) }}
        />
      )}

      {showBulk && (
        <BulkAllocateModal
          open
          companyId={user?.companyId}
          onClose={() => setShowBulk(false)}
        />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Delete Allocation"
          message="Delete this shift allocation?"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
