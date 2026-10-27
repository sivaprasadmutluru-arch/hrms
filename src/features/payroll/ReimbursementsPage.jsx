import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../../services/api'
import {
  fetchReimbursements, createReimbursement, approveReimbursement, rejectReimbursement,
  fetchReimbursementAttachments, addReimbursementAttachment, deleteReimbursementAttachment,
  fetchReimbursementComments, addReimbursementComment, deleteReimbursementComment,
  selectReimbursements, selectLoading, selectReimbursementAttachments, selectReimbursementComments,
} from './payrollSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import ConfirmModal from '../../components/common/ConfirmModal'
import { formatDate } from '../../utils/formatters'
import { STATUS_COLORS } from '../../config/constants'
import useAuth from '../../hooks/useAuth'
import useCurrency from '../../hooks/useCurrency'

const TYPE_OPTIONS = [
  { value: 'REIMBURSEMENT', label: 'Reimbursement' },
  { value: 'BONUS_ENCASHMENT', label: 'Bonus Encashment' },
  { value: 'LEAVE_ENCASHMENT', label: 'Leave Encashment' },
]

export default function ReimbursementsPage() {
  const dispatch = useDispatch()
  const { user, isEmployee } = useAuth()
  const { format } = useCurrency()
  const isEmp = isEmployee()
  const reimbursements = useSelector(selectReimbursements)
  const loading = useSelector(selectLoading)
  const attachments = useSelector(selectReimbursementAttachments)
  const comments = useSelector(selectReimbursementComments)

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [commentText, setCommentText] = useState('')
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm()
  const { register: regAttach, handleSubmit: handleAttach, reset: resetAttach } = useForm()

  const reimbursementType = watch('reimbursementType')

  useEffect(() => { dispatch(fetchReimbursements()) }, [dispatch])

  const openEdit = (row) => {
    setEditTarget(row)
    reset({
      title: row.title,
      reimbursementType: row.reimbursementType,
      employeeId: row.employee?.id,
      amount: row.amount,
      allowanceOn: row.allowanceOn,
      description: row.description,
    })
    setModalOpen(true)
  }

  const openDetail = (row) => {
    setSelected(row)
    setDetailOpen(true)
    dispatch(fetchReimbursementAttachments(row.id))
    dispatch(fetchReimbursementComments(row.id))
  }

  const handleApprove = async (id) => {
    try { await dispatch(approveReimbursement(id)).unwrap(); toast.success('Approved') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const handleReject = async (id) => {
    try { await dispatch(rejectReimbursement(id)).unwrap(); toast.success('Rejected') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const onSubmit = async (formData) => {
    try {
      if (editTarget) {
        await api.put(`/payroll/reimbursements/${editTarget.id}`, {
          ...formData,
          employee: { id: Number(formData.employeeId) },
          company: { id: user?.companyId },
        })
        toast.success('Reimbursement updated')
        setEditTarget(null)
        dispatch(fetchReimbursements())
      } else {
        await dispatch(createReimbursement({
          ...formData,
          employee: { id: Number(formData.employeeId) },
          company: { id: user?.companyId },
        })).unwrap()
        toast.success('Reimbursement request submitted')
      }
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e?.response?.data?.message || e || 'Error') }
  }

  const onAddAttachment = async (formData) => {
    try {
      await dispatch(addReimbursementAttachment({ reimbursementId: selected.id, data: formData })).unwrap()
      resetAttach()
      toast.success('Attachment added')
    } catch { toast.error('Failed') }
  }

  const handleDeleteAttachment = (id) => setConfirmModal({ open: true, id })

  const onConfirmDelete = async () => {
    try { await dispatch(deleteReimbursementAttachment(confirmModal.id)).unwrap() }
    catch { toast.error('Failed') }
    finally { setConfirmModal({ open: false, id: null }) }
  }

  const handleAddComment = async () => {
    if (!commentText.trim()) return
    try {
      await dispatch(addReimbursementComment({ reimbursementId: selected.id, comment: commentText })).unwrap()
      setCommentText('')
      toast.success('Comment added')
    } catch { toast.error('Failed') }
  }

  const handleDeleteComment = async (id) => {
    try { await dispatch(deleteReimbursementComment(id)).unwrap() }
    catch { toast.error('Failed') }
  }

  const columns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'reimbursementType', header: 'Type' },
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeCode || '—' : '—'
    }},
    { accessorKey: 'amount', header: 'Amount', cell: ({ getValue }) => getValue() ? format(getValue()) : '—' },
    { accessorKey: 'allowanceOn', header: 'Date', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => <span className="max-w-xs truncate block">{getValue() || '—'}</span> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue()} variant={STATUS_COLORS[getValue()?.toLowerCase()] || 'default'} /> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openDetail(row.original)}>Details</Button>
        {row.original.status === 'REQUESTED' && (
          <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        )}
        {row.original.status === 'REQUESTED' && !isEmp && <>
          <Button size="sm" variant="success" onClick={() => handleApprove(row.original.id)}>Approve</Button>
          <Button size="sm" variant="danger" onClick={() => handleReject(row.original.id)}>Reject</Button>
        </>}
      </div>
    )},
  ]

  return (
    <div className="payroll-workspace">
      <PageHeader title="Reimbursements" subtitle="Employee reimbursement and encashment requests"
        actions={<Button onClick={() => { setEditTarget(null); reset(isEmp ? { employeeId: String(user?.employeeId) } : {}); setModalOpen(true) }}>+ New Request</Button>} />
      <DataTable columns={columns} data={reimbursements} loading={loading} />

      {/* Create / Edit Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null) }} title={editTarget ? 'Edit Reimbursement Request' : 'Submit Reimbursement Request'} panelClassName="payroll-form-modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditTarget(null) }}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editTarget ? 'Update' : 'Submit'}</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <Select label="Type" options={TYPE_OPTIONS} {...register('reimbursementType')} />
          {!isEmp && <Input label="Employee ID" error={errors.employeeId?.message} {...register('employeeId', { required: 'Required' })} />}
          <Input label="Amount" type="number" step="0.01" error={errors.amount?.message} {...register('amount', { required: 'Required', valueAsNumber: true })} />
          <Input label="Date" type="date" {...register('allowanceOn')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3} {...register('description')} />
          </div>

          {/* Conditional fields based on type */}
          {reimbursementType === 'LEAVE_ENCASHMENT' && (
            <div className="space-y-3 bg-indigo-50 p-3 rounded-lg">
              <p className="text-xs font-semibold text-indigo-700 uppercase tracking-wide">Leave Encashment Details</p>
              <Input label="Leave Type ID" type="number" {...register('leaveTypeId', { valueAsNumber: true })} />
              <Input label="Accrued (FD) to Encash" type="number" step="0.01" {...register('adToEncash', { valueAsNumber: true })} />
              <Input label="Carry Forward (CFD) to Encash" type="number" step="0.01" {...register('cfdToEncash', { valueAsNumber: true })} />
            </div>
          )}

          {reimbursementType === 'BONUS_ENCASHMENT' && (
            <div className="space-y-3 bg-amber-50 p-3 rounded-lg">
              <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Bonus Encashment Details</p>
              <Input label="Bonus to Encash" type="number" step="0.01" {...register('bonusToEncash', { valueAsNumber: true })} />
            </div>
          )}

          {reimbursementType === 'REIMBURSEMENT' && (
            <div className="space-y-3 bg-gray-50 p-3 rounded-lg">
              <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Reimbursement Details</p>
              <Input label="Attachment Path (file path / URL)" {...register('attachmentPath')} />
            </div>
          )}
        </div>
      </Modal>

      {/* Detail Modal — Attachments + Comments */}
      <Modal open={detailOpen} onClose={() => setDetailOpen(false)} title="Reimbursement Details" panelClassName="payroll-form-modal">
        {selected && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
              <div><span className="font-medium text-gray-600">Title:</span> {selected.title}</div>
              <div><span className="font-medium text-gray-600">Type:</span> {selected.reimbursementType}</div>
              <div><span className="font-medium text-gray-600">Amount:</span> {selected.amount ? format(selected.amount) : '—'}</div>
              <div><span className="font-medium text-gray-600">Status:</span> <Badge label={selected.status} variant={STATUS_COLORS[selected.status?.toLowerCase()] || 'default'} /></div>
            </div>

            {/* Attachments */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Attachments</h4>
              <div className="space-y-2 mb-3">
                {attachments.length === 0
                  ? <p className="text-sm text-gray-400 italic">No attachments.</p>
                  : attachments.map(a => (
                    <div key={a.id} className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      <span className="text-gray-700">{a.fileName}</span>
                      <button onClick={() => handleDeleteAttachment(a.id)} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                    </div>
                  ))}
              </div>
              <form onSubmit={handleAttach(onAddAttachment)} className="flex gap-2">
                <input {...regAttach('fileName', { required: true })} placeholder="File name" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input {...regAttach('filePath', { required: true })} placeholder="File path / URL" className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <Button size="sm" type="submit">Add</Button>
              </form>
            </div>

            {/* Comments */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Comments</h4>
              <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
                {comments.length === 0
                  ? <p className="text-sm text-gray-400 italic">No comments yet.</p>
                  : comments.map(c => (
                    <div key={c.id} className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-medium text-gray-700">
                            {c.employee ? `${c.employee.firstName || ''} ${c.employee.lastName || ''}`.trim() : 'Unknown'}
                          </span>
                          <p className="text-gray-600 mt-0.5">{c.comment}</p>
                        </div>
                        <button onClick={() => handleDeleteComment(c.id)} className="text-gray-400 hover:text-red-500 text-xs shrink-0">✕</button>
                      </div>
                    </div>
                  ))}
              </div>
              <div className="flex gap-2">
                <input value={commentText} onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                  placeholder="Add a comment…"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <Button size="sm" onClick={handleAddComment}>Post</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmDelete}
        title="Delete Attachment"
        message="Are you sure you want to delete this attachment? This cannot be undone."
        confirmLabel="Delete"
        loading={loading}
      />
    </div>
  )
}
