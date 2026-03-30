import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchClaims, createClaim, approveClaim, rejectClaim,
  selectClaims, selectLoading
} from './helpdeskSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'

export default function ClaimsPage() {
  const dispatch = useDispatch()
  const { user, isEmployee } = useAuth()
  const isEmp = isEmployee()
  const claims = useSelector(selectClaims)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchClaims()) }, [dispatch])

  const handleApprove = async (id) => {
    try { await dispatch(approveClaim(id)).unwrap(); toast.success('Claim approved') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const handleReject = async (id) => {
    try { await dispatch(rejectClaim(id)).unwrap(); toast.success('Claim rejected') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const onSubmit = async (formData) => {
    try {
      await dispatch(createClaim({
        ticket: { id: Number(formData.ticketId) },
        employee: { id: Number(formData.employeeId) },
        company: { id: user?.companyId },
      })).unwrap()
      toast.success('Claim submitted')
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const getStatus = (row) => {
    if (row.isApproved) return 'APPROVED'
    if (row.isRejected) return 'REJECTED'
    return 'PENDING'
  }

  const STATUS_MAP = { approved: 'success', rejected: 'danger', pending: 'warning' }

  const columns = [
    { id: 'ticket', header: 'Ticket', cell: ({ row }) => row.original.ticket?.title || `#${row.original.ticket?.id}` || '—' },
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeCode || '—' : '—'
    }},
    { id: 'status', header: 'Status', cell: ({ row }) => {
      const status = getStatus(row.original)
      return <Badge label={status} variant={STATUS_MAP[status.toLowerCase()] || 'default'} />
    }},
    { id: 'actions', header: '', cell: ({ row }) => {
      const status = getStatus(row.original)
      if (status !== 'PENDING' || isEmp) return null
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="success" onClick={() => handleApprove(row.original.id)}>Approve</Button>
          <Button size="sm" variant="danger" onClick={() => handleReject(row.original.id)}>Reject</Button>
        </div>
      )
    }},
  ]

  return (
    <div>
      <PageHeader title="Claim Requests" subtitle="Ticket claim requests from employees"
        actions={<Button onClick={() => { reset(); setModalOpen(true) }}>+ New Claim</Button>} />
      <DataTable columns={columns} data={claims} loading={loading} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Submit Claim Request"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Submit</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Ticket ID" error={errors.ticketId?.message} {...register('ticketId', { required: 'Required' })} />
          <Input label="Employee ID" error={errors.employeeId?.message} {...register('employeeId', { required: 'Required' })} />
        </div>
      </Modal>
    </div>
  )
}
