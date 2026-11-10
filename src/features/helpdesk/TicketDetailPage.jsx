import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import useAuth from '../../hooks/useAuth'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Avatar from '../../components/common/Avatar'
import { formatDateTime, formatDate } from '../../utils/formatters'
import { STATUS_COLORS } from '../../config/constants'
import api from '../../services/api'
import Combobox from '../../components/common/Combobox'

export default function TicketDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { effectiveCompanyId, user } = useAuth()
  const [params] = useSearchParams()
  const requestedCompany = params.get('companyId')
  const companyId = requestedCompany === null ? (effectiveCompanyId || user?.loginCompanyId) : (/^[1-9]\d*$/.test(requestedCompany) ? Number(requestedCompany) : null)
  const config = useMemo(() => ({ headers: companyId ? { 'X-Company-Id': companyId } : {}, timeout: 20000 }), [companyId])
  const [ticket,setTicket]=useState(null),[comments,setComments]=useState([]),[attachments,setAttachments]=useState([])
  const [loading,setLoading]=useState(true),[loadError,setLoadError]=useState(''),[commentsError,setCommentsError]=useState(''),[attachmentsError,setAttachmentsError]=useState(''),[retry,setRetry]=useState(0),[busy,setBusy]=useState(false)
  const pending=useRef(false)
  const failure=(e,fallback)=>e.response?.status===404?'This ticket was not found in the selected company. Open it again from Helpdesk.':e.response?.status===403?'You do not have access to this ticket in this company.':e.code==='ECONNABORTED'?'The request timed out. Please try again.':fallback
  const { register, handleSubmit, reset } = useForm()
  const [assignees,setAssignees]=useState([]),[assigneeId,setAssigneeId]=useState(''),[assigneeSearch,setAssigneeSearch]=useState(''),[assigning,setAssigning]=useState(false),[assignmentError,setAssignmentError]=useState('')
  const [attachmentPath, setAttachmentPath] = useState('')
  const [attachmentName, setAttachmentName] = useState('')

  useEffect(() => {
    const controller=new AbortController()
    const request={...config,signal:controller.signal}
    setTicket(null);setComments([]);setAttachments([]);setLoadError('');setCommentsError('');setAttachmentsError('');setLoading(true);setAssigneeId('');setAssigneeSearch('');setAssignees([]);setAssignmentError('')
    if(!companyId){setLoadError('Select a company in the header, then open the ticket from Helpdesk.');setLoading(false);return ()=>controller.abort()}
    api.get(`/helpdesk/tickets/${id}`,request).then(r=>{if(!controller.signal.aborted)setTicket(r.data)}).catch(e=>{if(!controller.signal.aborted)setLoadError(failure(e,'Unable to load this ticket. Please try again.'))}).finally(()=>{if(!controller.signal.aborted)setLoading(false)})
    api.get(`/helpdesk/tickets/${id}/comments`,request).then(r=>{if(!controller.signal.aborted)setComments(r.data)}).catch(()=>{if(!controller.signal.aborted)setCommentsError('Unable to load comments. Please retry.')})
    api.get(`/helpdesk/tickets/${id}/attachments`,request).then(r=>{if(!controller.signal.aborted)setAttachments(r.data)}).catch(()=>{if(!controller.signal.aborted)setAttachmentsError('Unable to load attachments. Please retry.')})
    return ()=>controller.abort()
  }, [id, config, companyId, retry])

  useEffect(()=>{
    if(!ticket?.canReassign||!ticket.companyId)return
    let active=true
    const timer=setTimeout(()=>api.get('/helpdesk/tickets/assignees',{params:{companyId:ticket.companyId,search:assigneeSearch},headers:{'X-Company-Id':ticket.companyId}}).then(r=>{if(active)setAssignees(r.data.employees)}).catch(e=>{if(active)setAssignmentError(e.response?.data?.message||'Unable to load employees')}),250)
    return()=>{active=false;clearTimeout(timer)}
  },[ticket?.canReassign,ticket?.companyId,assigneeSearch])
  async function action(work,success){
    if(pending.current)return
    pending.current=true;setBusy(true)
    try{await work();if(success)toast.success(success)}catch(e){toast.error(failure(e,'Unable to save this change. Please try again.'))}finally{pending.current=false;setBusy(false)}
  }
  const assign=async()=>{if(pending.current)return;setAssigning(true);setAssignmentError('');try{await action(async()=>{const r=await api.post(`/helpdesk/tickets/${id}/assign/${assigneeId}`,null,config);setTicket(r.data);setAssigneeId('')},'Ticket reassigned')}finally{setAssigning(false)}}
  const transition=(state)=>action(async()=>{const r=await api.post(`/helpdesk/tickets/${id}/${state}`,null,config);setTicket(r.data)},`Ticket ${state==='resolve'?'resolved':state==='close'?'closed':'reopened'}`)
  const handleResolve=()=>transition('resolve')
  const handleClose=()=>transition('close')
  const onComment=({comment})=>action(async()=>{const r=await api.post(`/helpdesk/tickets/${id}/comments`,{comment},config);setComments(previous=>[...previous,r.data]);setCommentsError('');reset()})
  const handleAddAttachment=()=>{if(!attachmentPath.trim())return;return action(async()=>{const r=await api.post(`/helpdesk/tickets/${id}/attachments`,{filePath:attachmentPath,fileName:attachmentName||attachmentPath},config);setAttachments(previous=>[...previous,r.data]);setAttachmentsError('');setAttachmentPath('');setAttachmentName('')},'Attachment added')}
  const handleDeleteAttachment=(attachmentId)=>action(async()=>{await api.delete(`/helpdesk/tickets/attachments/${attachmentId}`,config);setAttachments(previous=>previous.filter(a=>a.id!==attachmentId))},'Attachment removed')

  if(loading)return <p role="status" className="p-6 text-sm text-slate-600">Loading ticket…</p>
  if(loadError||!ticket)return <div className="support-workspace"><PageHeader title="Unable to open ticket"/><p role="alert" className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm text-red-700">{loadError||'This ticket could not be loaded.'}</p><div className="mt-4 flex gap-2"><Button variant="secondary" onClick={()=>navigate('/helpdesk')}>Back to Helpdesk</Button><Button onClick={()=>setRetry(value=>value+1)}>Retry</Button></div></div>

  return (
    <div className="support-workspace support-ticket-detail">
      <PageHeader title={ticket.subject || 'Ticket Detail'}
        subtitle={`#${ticket.ticketNumber || id}`}
        actions={
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => navigate('/helpdesk')}>← Back</Button>
            {ticket.canHandle && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED' && <Button variant="success" disabled={busy} onClick={handleResolve}>Resolve</Button>}
            {ticket.canHandle && ['RESOLVED','CLOSED'].includes(ticket.status) && <Button variant="secondary" disabled={busy} onClick={()=>transition('reopen')}>Reopen</Button>}
            {ticket.canHandle && ticket.status !== 'CLOSED' && <Button variant="danger" disabled={busy} onClick={handleClose}>Close</Button>}
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
            {attachmentsError&&<p role="alert" className="text-sm text-red-700">{attachmentsError} <button onClick={()=>setRetry(v=>v+1)} className="underline">Retry</button></p>}
            <div className="space-y-2 mb-3">
              {attachments.map(a => (
                <div key={a.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                  <span className="text-sm text-gray-700 truncate">{a.fileName || a.filePath}</span>
                  <button disabled={busy} onClick={() => handleDeleteAttachment(a.id)} className="text-red-400 hover:text-red-600 text-xs ml-2">Delete</button>
                </div>
              ))}
              {attachments.length === 0 && !attachmentsError && <p className="text-sm text-gray-400">No attachments.</p>}
            </div>
            <div className="flex gap-2">
              <input value={attachmentName} onChange={e => setAttachmentName(e.target.value)} placeholder="File name (optional)"
                className="w-1/3 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input value={attachmentPath} onChange={e => setAttachmentPath(e.target.value)} placeholder="File path or URL"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <Button size="sm" disabled={busy} onClick={handleAddAttachment}>Add</Button>
            </div>
          </Card>

          <Card>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Comments ({comments.length})</h3>
            {commentsError&&<p role="alert" className="text-sm text-red-700">{commentsError} <button onClick={()=>setRetry(v=>v+1)} className="underline">Retry</button></p>}
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
              {comments.length === 0 && !commentsError && <p className="text-sm text-gray-400 text-center py-4">No comments yet</p>}
            </div>
            <form onSubmit={handleSubmit(onComment)} className="flex gap-2">
              <input {...register('comment', { required: true })} placeholder="Add a comment..." className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <Button type="submit" disabled={busy} size="sm">Send</Button>
            </form>
          </Card>
        </div>
        <div className="space-y-4">
          <Card>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Status</span><Badge label={ticket.status || 'Open'} variant={STATUS_COLORS[ticket.status?.toLowerCase()] || 'warning'} /></div>
              <div className="flex justify-between"><span className="text-gray-500">Priority</span><Badge label={ticket.priority} variant={ticket.priority === 'HIGH' || ticket.priority === 'CRITICAL' ? 'danger' : 'warning'} /></div>
              <div className="flex justify-between"><span className="text-gray-500">Department</span><span>{ticket.department?.name || '—'}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Assigned to</span><span>{ticket.assignedTo?.name||(['RESOLVED','CLOSED'].includes(ticket.status)?'No assignee':'Awaiting manual assignment')}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Created</span><span>{formatDate(ticket.createdAt)}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Requester</span><span>{ticket.requesterName || '—'}</span></div>
            </div>
          </Card>
          {ticket.canReassign&&<Card><h3 className="text-sm font-semibold text-gray-700 mb-3">Assign / reassign ticket</h3><Combobox inlineOptions label="Support contact" placeholder="Search employee name or email" value={assigneeId} onChange={setAssigneeId} onSearchChange={setAssigneeSearch} options={assignees.map(e=>({value:e.id,label:e.name||e.email,sublabel:e.email}))}/><Button className="mt-3" disabled={busy||!assigneeId} loading={assigning} onClick={assign}>Assign ticket</Button>{assignmentError&&<p role="alert" className="mt-2 text-sm text-red-700">{assignmentError}</p>}</Card>}
        </div>
      </div>
    </div>
  )
}
