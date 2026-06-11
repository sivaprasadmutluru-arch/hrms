import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchRequests, createRequest, updateRequest, approveRequest, rejectRequest } from './assetsSlice'
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
  const { user, effectiveCompanyId } = useAuth()
  const companyId = effectiveCompanyId
  const requests = useSelector(s => s.assets.requests)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const { register, handleSubmit, reset } = useForm()

  useEffect(() => {
    if (companyId) dispatch(fetchRequests({ companyId }))
  }, [dispatch, companyId])

  const openCreate = () => { setEditing(null); reset({}); setModal(true) }
  const openEdit = (row) => { setEditing(row); reset({ description: row.description }); setModal(true) }

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await dispatch(updateRequest({ id: editing.id, data })).unwrap()
        toast.success('Request updated')
      } else {
        await dispatch(createRequest({ data: { ...data, company: { id: companyId } }, companyId })).unwrap()
        toast.success('Request submitted')
      }
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
    { key: 'asset', header: 'Asset', render: r => r.asset?.name || r.asset?.assetName || '-' },
    { key: 'category', header: 'Category', render: r => r.category?.name || '-' },
    { key: 'description', header: 'Description' },
    { key: 'status', header: 'Status', render: r => <Badge variant={STATUS_VARIANT[r.status] || 'default'}>{r.status}</Badge> },
    {
      key: 'actions', header: 'Actions',
      render: r => (
        <div className="flex gap-2">
          {r.status === 'REQUESTED' && (
            <>
              <Button size="sm" onClick={() => handleApprove(r.id)}>Approve</Button>
              <Button size="sm" variant="danger" onClick={() => handleReject(r.id)}>Reject</Button>
              <Button size="sm" variant="secondary" onClick={() => openEdit(r)}>Edit</Button>
            </>
          )}
        </div>
      )
    }
  ]

  return (
    <div>
      <PageHeader title="Asset Requests" subtitle="Employee asset requests"
        actions={<Button onClick={openCreate}>New Request</Button>} />
      <DataTable columns={columns} data={requests} />
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Request' : 'New Asset Request'}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Submit'}</Button>
          </div>
        }>
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea className="w-full border rounded px-3 py-2" rows={3} {...register('description')} />
          </div>
        </form>
      </Modal>
    </div>
  )
}
