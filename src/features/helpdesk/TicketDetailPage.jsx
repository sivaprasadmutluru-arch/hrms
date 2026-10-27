import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchById, resolve, close, fetchComments, addComment, selectSelected,
  fetchTicketAttachments, addTicketAttachment, deleteTicketAttachment,
  selectTicketAttachments,
} from './helpdeskSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Avatar from '../../components/common/Avatar'
import { formatDateTime, formatDate } from '../../utils/formatters'
import { STATUS_COLORS } from '../../config/constants'

export default function TicketDetailPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const ticket = useSelector(selectSelected)
  const comments = useSelector(s => s.helpdesk.comments)
  const attachments = useSelector(selectTicketAttachments)
  const { register, handleSubmit, reset } = useForm()
  const [attachmentPath, setAttachmentPath] = useState('')
  const [attachmentName, setAttachmentName] = useState('')

  useEffect(() => {
    dispatch(fetchById(id))
    dispatch(fetchComments(id))
    dispatch(fetchTicketAttachments(id))
  }, [dispatch, id])

  const handleResolve = async () => {
    try { await dispatch(resolve(id)).unwrap(); toast.success('Ticket resolved') } catch { toast.error('Failed') }
  }
  const handleClose = async () => {
    try { await dispatch(close(id)).unwrap(); toast.success('Ticket closed') } catch { toast.error('Failed') }
  }
  const onComment = async ({ comment }) => {
    try { await dispatch(addComment({ id, data: { comment } })).unwrap(); reset(); dispatch(fetchComments(id)) }
    catch { toast.error('Failed') }
  }

  const handleAddAttachment = async () => {
    if (!attachmentPath.trim()) return
    try {
      await dispatch(addTicketAttachment({ ticketId: id, data: { filePath: attachmentPath, fileName: attachmentName || attachmentPath } })).unwrap()
      setAttachmentPath(''); setAttachmentName('')
      toast.success('Attachment added')
    } catch (e) { toast.error(e || 'Failed') }
  }

  const handleDeleteAttachment = async (attachId) => {
    try { await dispatch(deleteTicketAttachment(attachId)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
  }

  if (!ticket) return null

  return (
    <div className="support-workspace support-ticket-detail">
      <PageHeader title={ticket.subject || 'Ticket Detail'}
        subtitle={`#${ticket.ticketNumber || id}`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/helpdesk')}>← Back</Button>
            {ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && <Button variant="success" onClick={handleResolve}>Resolve</Button>}
            {ticket.status !== 'CLOSED' && <Button variant="danger" onClick={handleClose}>Close</Button>}
          </div>
        } />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Description</h3>
            <p className="text-sm text-gray-600">{ticket.description || 'No description provided.'}</p>
          </Card>

          {/* Attachments */}
          <Card>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Attachments ({attachments.length})</h3>
            <div className="space-y-2 mb-3">
              {attachments.map(a => (
                <div key={a.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700 truncate">{a.fileName || a.filePath}</span>
                  <button onClick={() => handleDeleteAttachment(a.id)} className="text-red-400 hover:text-red-600 text-xs ml-2">Delete</button>
                </div>
              ))}
              {attachments.length === 0 && <p className="text-sm text-gray-400">No attachments.</p>}
            </div>
            <div className="flex gap-2">
              <input value={attachmentName} onChange={e => setAttachmentName(e.target.value)} placeholder="File name (optional)"
                className="w-1/3 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input value={attachmentPath} onChange={e => setAttachmentPath(e.target.value)} placeholder="File path or URL"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <Button size="sm" onClick={handleAddAttachment}>Add</Button>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Comments ({comments.length})</h3>
            <div className="space-y-4 mb-4">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <Avatar name={c.authorName || 'User'} size="sm" />
                  <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700">{c.authorName || 'User'}</span>
                      <span className="text-xs text-gray-400">{formatDateTime(c.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-600">{c.comment}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No comments yet</p>}
            </div>
            <form onSubmit={handleSubmit(onComment)} className="flex gap-2">
              <input {...register('comment', { required: true })} placeholder="Add a comment..." className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <Button type="submit" size="sm">Send</Button>
            </form>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Status</span><Badge label={ticket.status || 'Open'} variant={STATUS_COLORS[ticket.status?.toLowerCase()] || 'warning'} /></div>
              <div className="flex justify-between"><span className="text-gray-500">Priority</span><Badge label={ticket.priority} variant={ticket.priority === 'HIGH' || ticket.priority === 'URGENT' ? 'danger' : 'warning'} /></div>
              <div className="flex justify-between"><span className="text-gray-500">Category</span><span>{ticket.category || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Created</span><span>{formatDate(ticket.createdAt)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Requester</span><span>{ticket.requesterName || '—'}</span></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
