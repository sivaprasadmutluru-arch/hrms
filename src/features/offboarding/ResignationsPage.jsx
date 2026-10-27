import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchResignations, createResignation, approveResignation, rejectResignation,
  selectResignations, selectLoading
} from './offboardingSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'

const STATUS_VARIANT = { APPROVED: 'success', REJECTED: 'danger', REQUESTED: 'warning' }

export default function ResignationsPage() {
  const dispatch = useDispatch()
  const { user, isEmployee } = useAuth()
  const isEmp = isEmployee()
  const resignations = useSelector(selectResignations)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchResignations()) }, [dispatch])

  const handleApprove = async (id) => {
    try { await dispatch(approveResignation(id)).unwrap(); toast.success('Resignation approved') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const handleReject = async (id) => {
    try { await dispatch(rejectResignation(id)).unwrap(); toast.success('Resignation rejected') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const onSubmit = async (data) => {
    try {
      await dispatch(createResignation({
        ...data,
        employee: { id: Number(data.employeeId) },
        company: { id: user?.companyId },
      })).unwrap()
      toast.success('Resignation submitted')
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeCode || '—' : '—'
    }},
    { accessorKey: 'title', header: 'Title', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'plannedToLeaveOn', header: 'Planned Leave Date', cell: ({ getValue }) => getValue() || '—' },
    { id: 'status', header: 'Status', cell: ({ row }) => (
      <Badge label={row.original.status || 'REQUESTED'} variant={STATUS_VARIANT[row.original.status] || 'default'} />
    )},
    { id: 'actions', header: '', cell: ({ row }) => {
      if (row.original.status !== 'REQUESTED' || isEmp) return null
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="success" onClick={() => handleApprove(row.original.id)}>Approve</Button>
          <Button size="sm" variant="danger" onClick={() => handleReject(row.original.id)}>Reject</Button>
        </div>
      )
    }},
  ]

  return (
    <div className="offboarding-workspace">
      <PageHeader title="Resignations" subtitle="Employee resignation requests"
        actions={<Button onClick={() => { reset(); setModalOpen(true) }}>+ New Resignation</Button>} />
      <div className="offboarding-table"><DataTable columns={columns} data={resignations} loading={loading} /></div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Submit Resignation" panelClassName="offboarding-form-modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Submit</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Employee ID" error={errors.employeeId?.message} {...register('employeeId', { required: 'Required' })} />
          <Input label="Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <Input label="Planned Leave Date" type="date" error={errors.plannedToLeaveOn?.message} {...register('plannedToLeaveOn')} />
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
