import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchRequests, createRequest, approveRequest, rejectRequest } from './assetsSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Badge from '../../components/common/Badge'
import useAuth from '../../hooks/useAuth'

const STATUS_VARIANT = {
  REQUESTED: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  ALLOCATED: 'primary',
}

export default function AssetRequestsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const companyId = user?.companyId
  const requests = useSelector(s => s.assets.requests)
  const [modal, setModal] = useState(false)
  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    if (companyId) dispatch(fetchRequests({ companyId }))
  }, [dispatch, companyId])

  const onSubmit = async (data) => {
    try {
      await dispatch(createRequest({ data: { ...data, company: { id: companyId } }, companyId })).unwrap()
      toast.success('Request submitted')
      setModal(false)
      reset()
      dispatch(fetchRequests({ companyId }))
    } catch (e) { toast.error(e || 'Failed') }
  }

  const handleApprove = async (id) => {
    try { await dispatch(approveRequest(id)).unwrap(); toast.success('Approved') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const handleReject = async (id) => {
    try { await dispatch(rejectRequest(id)).unwrap(); toast.success('Rejected') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const columns = [
    { key: 'employee', header: 'Employee', render: r => r.employee?.firstName ? `${r.employee.firstName} ${r.employee.lastName || ''}`.trim() : r.employee?.name || '-' },
    { key: 'asset', header: 'Asset', render: r => r.asset?.name || '-' },
    { key: 'category', header: 'Category', render: r => r.category?.name || '-' },
    { key: 'description', header: 'Description' },
    { key: 'status', header: 'Status', render: r => <Badge variant={STATUS_VARIANT[r.status] || 'default'}>{r.status}</Badge> },
    {
      key: 'actions', header: 'Actions',
      render: r => r.status === 'REQUESTED' ? (
        <div className="flex gap-2">
          <Button size="sm" onClick={() => handleApprove(r.id)}>Approve</Button>
          <Button size="sm" variant="danger" onClick={() => handleReject(r.id)}>Reject</Button>
        </div>
      ) : null
    }
  ]

  return (
    <div>
      <PageHeader title="Asset Requests" subtitle="Employee asset requests">
        <Button onClick={() => { reset(); setModal(true) }}>New Request</Button>
      </PageHeader>
      <DataTable columns={columns} data={requests} />
      <Modal open={modal} onClose={() => setModal(false)} title="New Asset Request">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea className="w-full border rounded px-3 py-2" rows={3} {...register('description')} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit">Submit</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
