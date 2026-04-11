import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchWorkTypeRequests, createWorkTypeRequest, approveWorkTypeRequest, rejectWorkTypeRequest,
  cancelWorkTypeRequest, bulkApproveWorkTypeRequests, bulkCancelWorkTypeRequests, exportWorkTypeRequests,
  selectWorkTypeRequests, selectWorkTypeRequestsLoading
} from './workTypeRequestSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import { STATUS_COLORS } from '../../config/constants'
import useAuth from '../../hooks/useAuth'

export default function WorkTypeRequestsPage() {
  const dispatch = useDispatch()
  const { user, isEmployee } = useAuth()
  const isEmp = isEmployee()
  const requests = useSelector(selectWorkTypeRequests)
  const loading = useSelector(selectWorkTypeRequestsLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState([])
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchWorkTypeRequests()) }, [dispatch])

  const toggleRow = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  const handleBulkApprove = async () => {
    const res = await dispatch(bulkApproveWorkTypeRequests(selectedIds))
    if (res.error) toast.error(res.payload)
    else { toast.success(`${selectedIds.length} requests approved`); setSelectedIds([]); dispatch(fetchWorkTypeRequests()) }
  }
  const handleBulkCancel = async () => {
    const res = await dispatch(bulkCancelWorkTypeRequests(selectedIds))
    if (res.error) toast.error(res.payload)
    else { toast.success(`${selectedIds.length} requests cancelled`); setSelectedIds([]); dispatch(fetchWorkTypeRequests()) }
  }
  const handleExport = () => dispatch(exportWorkTypeRequests(user?.companyId))

  const handleApprove = async (id) => {
    try { await dispatch(approveWorkTypeRequest(id)).unwrap(); toast.success('Approved') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const handleReject = async (id) => {
    try { await dispatch(rejectWorkTypeRequest(id)).unwrap(); toast.success('Rejected') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const onSubmit = async (formData) => {
    try {
      await dispatch(createWorkTypeRequest({
        employee: { id: Number(formData.employeeId) },
        requestedWorkType: { id: Number(formData.requestedWorkTypeId) },
        requestedDate: formData.requestedDate,
        requestedTill: formData.requestedTill,
        isPermanent: formData.isPermanent === 'true',
        description: formData.description,
        company: { id: user?.companyId },
      })).unwrap()
      toast.success('Work type request submitted')
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeCode || '—' : '—'
    }},
    { id: 'requestedWorkType', header: 'Requested Type', cell: ({ row }) => row.original.requestedWorkType?.workTypeName || '—' },
    { id: 'previousWorkType', header: 'Previous Type', cell: ({ row }) => row.original.previousWorkType?.workTypeName || '—' },
    { accessorKey: 'requestedDate', header: 'From' },
    { accessorKey: 'requestedTill', header: 'Till', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'isPermanent', header: 'Permanent', cell: ({ getValue }) => getValue() ? 'Yes' : 'No' },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue()} variant={STATUS_COLORS[getValue()?.toLowerCase()] || 'default'} /> },
    { id: 'actions', header: '', cell: ({ row }) => row.original.status === 'REQUESTED' && !isEmp ? (
      <div className="flex gap-2">
        <Button size="sm" variant="success" onClick={() => handleApprove(row.original.id)}>Approve</Button>
        <Button size="sm" variant="danger" onClick={() => handleReject(row.original.id)}>Reject</Button>
      </div>
    ) : null },
  ]

  return (
    <div>
      <PageHeader title="Work Type Requests" subtitle="Employee work type change requests"
        actions={
          <div className="flex gap-2">
            {!isEmp && <Button variant="secondary" onClick={handleExport}>Export</Button>}
            <Button onClick={() => { reset(); setModalOpen(true) }}>+ New Request</Button>
          </div>
        } />

      {selectedIds.length > 0 && !isEmp && (
        <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-lg mb-3">
          <span className="text-sm text-indigo-700">{selectedIds.length} selected</span>
          <Button size="sm" onClick={handleBulkApprove}>Approve Selected</Button>
          <Button size="sm" variant="danger" onClick={handleBulkCancel}>Cancel Selected</Button>
          <button onClick={() => setSelectedIds([])} className="text-xs text-indigo-500 ml-auto">Clear</button>
        </div>
      )}

      <DataTable columns={columns} data={requests} loading={loading} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Request Work Type Change"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Submit</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Employee ID" error={errors.employeeId?.message} {...register('employeeId', { required: 'Required' })} />
          <Input label="Requested Work Type ID" error={errors.requestedWorkTypeId?.message} {...register('requestedWorkTypeId', { required: 'Required' })} />
          <Input label="From Date" type="date" error={errors.requestedDate?.message} {...register('requestedDate', { required: 'Required' })} />
          <Input label="Till Date (leave blank for one day)" type="date" {...register('requestedTill')} />
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
