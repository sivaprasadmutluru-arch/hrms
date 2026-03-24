import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchAllocationRequests, createAllocationRequest, approveAllocationRequest,
  rejectAllocationRequest, fetchLeaveTypes, selectAllocationRequests, selectLoading
} from './leaveSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import { STATUS_COLORS } from '../../config/constants'

export default function LeaveAllocationPage() {
  const dispatch = useDispatch()
  const allocationRequests = useSelector(selectAllocationRequests)
  const loading = useSelector(selectLoading)
  const leaveTypes = useSelector(s => s.leave.leaveTypes)
  const [modalOpen, setModalOpen] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    dispatch(fetchAllocationRequests())
    dispatch(fetchLeaveTypes())
  }, [dispatch])

  const handleApprove = async (id) => {
    try {
      await dispatch(approveAllocationRequest(id)).unwrap()
      toast.success('Allocation request approved')
    } catch (e) { toast.error(e || 'Failed') }
  }

  const handleReject = async (id) => {
    const reason = window.prompt('Rejection reason (optional):') || undefined
    try {
      await dispatch(rejectAllocationRequest({ id, reason })).unwrap()
      toast.success('Allocation request rejected')
    } catch (e) { toast.error(e || 'Failed') }
  }

  const onSubmit = async (formData) => {
    try {
      await dispatch(createAllocationRequest({
        employee: { id: Number(formData.employeeId) },
        leaveType: { id: Number(formData.leaveTypeId) },
        requestedDays: Number(formData.requestedDays),
        description: formData.description,
      })).unwrap()
      toast.success('Allocation request submitted')
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeCode || '—' : '—'
    }},
    { id: 'leaveType', header: 'Leave Type', cell: ({ row }) => row.original.leaveType?.name || '—' },
    { accessorKey: 'requestedDays', header: 'Days Requested' },
    { accessorKey: 'requestedDate', header: 'Requested On' },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => <span className="max-w-xs truncate block">{getValue() || '—'}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue()} variant={STATUS_COLORS[getValue()?.toLowerCase()] || 'default'} /> },
    { id: 'actions', header: '', cell: ({ row }) => row.original.status === 'REQUESTED' ? (
      <div className="flex gap-2">
        <Button size="sm" variant="success" onClick={() => handleApprove(row.original.id)}>Approve</Button>
        <Button size="sm" variant="danger" onClick={() => handleReject(row.original.id)}>Reject</Button>
      </div>
    ) : null },
  ]

  return (
    <div>
      <PageHeader title="Leave Allocation Requests" subtitle="Employee requests for additional leave days"
        actions={<Button onClick={() => { reset(); setModalOpen(true) }}>+ New Request</Button>} />
      <DataTable columns={columns} data={allocationRequests} loading={loading} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Request Leave Allocation"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Submit</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Employee ID" error={errors.employeeId?.message} {...register('employeeId', { required: 'Required' })} />
          <Select label="Leave Type" options={leaveTypes.map(lt => ({ value: lt.id, label: lt.name }))}
            error={errors.leaveTypeId?.message} {...register('leaveTypeId', { required: 'Required' })} />
          <Input label="Days Requested" type="number" step="0.5"
            error={errors.requestedDays?.message} {...register('requestedDays', { required: 'Required', min: 0.5 })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3} {...register('description')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
