import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchMyDocuments, createDocument, approveDocument, rejectDocument,
  selectDocuments, selectDocumentsLoading
} from './documentsSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'

const STATUS_VARIANT = { APPROVED: 'success', REJECTED: 'danger', SUBMITTED: 'info', REQUESTED: 'warning' }

export default function MyDocumentsPage() {
  const dispatch = useDispatch()
  const { user, isEmployee } = useAuth()
  const isEmp = isEmployee()
  const documents = useSelector(selectDocuments)
  const loading = useSelector(selectDocumentsLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchMyDocuments()) }, [dispatch])

  const handleApprove = async (id) => {
    try { await dispatch(approveDocument(id)).unwrap(); toast.success('Document approved') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const handleReject = async (id) => {
    const reason = window.prompt('Reject reason (optional):')
    if (reason === null) return
    try { await dispatch(rejectDocument({ id, rejectReason: reason })).unwrap(); toast.success('Document rejected') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const onSubmit = async (data) => {
    try {
      await dispatch(createDocument({
        ...data,
        employee: { id: Number(data.employeeId) },
        company: { id: user?.companyId },
      })).unwrap()
      toast.success('Document submitted')
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'title', header: 'Title' },
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeCode || '—' : '—'
    }},
    { accessorKey: 'expiryDate', header: 'Expires', cell: ({ getValue }) => getValue() || '—' },
    { id: 'status', header: 'Status', cell: ({ row }) => (
      <Badge label={row.original.status || 'REQUESTED'} variant={STATUS_VARIANT[row.original.status] || 'default'} />
    )},
    { id: 'actions', header: '', cell: ({ row }) => {
      const s = row.original.status
      if (s === 'APPROVED' || s === 'REJECTED' || isEmp) return null
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
      <PageHeader title="Employee Documents" subtitle="Submitted employee documents"
        actions={<Button onClick={() => { reset(); setModalOpen(true) }}>+ Submit Document</Button>} />
      <DataTable columns={columns} data={documents} loading={loading} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Submit Document"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Submit</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <Input label="Employee ID" error={errors.employeeId?.message} {...register('employeeId', { required: 'Required' })} />
          <Input label="Issue Date" type="date" {...register('issueDate')} />
          <Input label="Expiry Date" type="date" {...register('expiryDate')} />
          <Input label="Notify Before (days)" type="number" {...register('notifyBeforeDays')} />
        </div>
      </Modal>
    </div>
  )
}
