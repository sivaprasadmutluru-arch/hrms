import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchMyRequests, fetchMyDocuments, createDocument, approveDocument, rejectDocument,
  selectMyRequests, selectDocuments, selectDocumentsLoading
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
  const myRequests = useSelector(selectMyRequests)
  const documents = useSelector(selectDocuments)
  const loading = useSelector(selectDocumentsLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [respondingTo, setRespondingTo] = useState(null) // document request being responded to
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    dispatch(fetchMyDocuments())
    if (isEmp) dispatch(fetchMyRequests())
  }, [dispatch])

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

  const openRespond = (request) => {
    setRespondingTo(request)
    reset({ title: request.title })
    setModalOpen(true)
  }

  const openSubmit = () => {
    setRespondingTo(null)
    reset({})
    setModalOpen(true)
  }

  const onSubmit = async (data) => {
    try {
      let filePath = null
      if (data.file?.[0]) {
        const formData = new FormData()
        formData.append('file', data.file[0])
        const uploadRes = await import('../../services/api').then(m => m.default.post('/files/document', formData))
        filePath = uploadRes.data.path
      }
      await dispatch(createDocument({
        title: data.title,
        issueDate: data.issueDate || null,
        expiryDate: data.expiryDate || null,
        notifyBeforeDays: data.notifyBeforeDays ? Number(data.notifyBeforeDays) : null,
        status: 'SUBMITTED',
        filePath,
        documentRequest: respondingTo ? { id: respondingTo.id } : null,
        employee: { id: user?.employeeId || Number(data.employeeId) },
        company: { id: user?.companyId },
      })).unwrap()
      toast.success('Document submitted')
      setModalOpen(false)
      reset()
      setRespondingTo(null)
    } catch (e) {
      toast.error(typeof e === 'string' ? e : (e?.response?.data?.message || e?.message || 'Failed to submit document'))
    }
  }

  const columns = [
    { accessorKey: 'title', header: 'Title' },
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—' : '—'
    }},
    { accessorKey: 'expiryDate', header: 'Expires', cell: ({ getValue }) => getValue() || '—' },
    { id: 'status', header: 'Status', cell: ({ row }) => (
      <Badge label={row.original.status || 'SUBMITTED'} variant={STATUS_VARIANT[row.original.status] || 'default'} />
    )},
    { id: 'actions', header: '', cell: ({ row }) => {
      const s = row.original.status
      if (isEmp || s === 'APPROVED' || s === 'REJECTED') return null
      return (
        <div className="flex gap-2">
          <Button size="sm" variant="success" onClick={() => handleApprove(row.original.id)}>Approve</Button>
          <Button size="sm" variant="danger" onClick={() => handleReject(row.original.id)}>Reject</Button>
        </div>
      )
    }},
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="My Documents" subtitle="Your submitted documents and pending requests"
        actions={<Button onClick={openSubmit}>+ Submit Document</Button>} />

      {/* Pending requests for employee */}
      {isEmp && myRequests.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-amber-800 mb-3">
            Pending Document Requests ({myRequests.length})
          </h2>
          <div className="space-y-2">
            {myRequests.map(req => (
              <div key={req.id} className="flex items-center justify-between bg-white rounded-xl border border-amber-100 px-4 py-3 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{req.title}</p>
                  {req.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{req.description}</p>}
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    {req.documentFormat && <span>Format: {req.documentFormat}</span>}
                    {req.maxSizeMb && <span>Max: {req.maxSizeMb} MB</span>}
                  </div>
                </div>
                <Button size="sm" onClick={() => openRespond(req)}>Upload</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isEmp && myRequests.length === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-3 text-sm text-green-700">
          No pending document requests.
        </div>
      )}

      {/* Submitted documents */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-4 pb-2">
          <h2 className="text-sm font-semibold text-gray-700">Submitted Documents</h2>
        </div>
        <DataTable columns={columns} data={documents} loading={loading} />
      </div>

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setRespondingTo(null) }}
        title={respondingTo ? `Upload: ${respondingTo.title}` : 'Submit Document'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setRespondingTo(null) }}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Submit</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          {!isEmp && (
            <Input label="Employee ID" error={errors.employeeId?.message} {...register('employeeId', { required: !user?.employeeId ? 'Required' : false })} />
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">File</label>
            <input type="file" className="block w-full text-sm text-gray-500 file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" {...register('file')} />
          </div>
          <Input label="Issue Date" type="date" {...register('issueDate')} />
          <Input label="Expiry Date" type="date" {...register('expiryDate')} />
        </div>
      </Modal>
    </div>
  )
}
