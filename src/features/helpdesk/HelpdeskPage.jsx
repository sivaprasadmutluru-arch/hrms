import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Combobox from '../../components/common/Combobox'
import { formatDate } from '../../utils/formatters'
import { STATUS_COLORS } from '../../config/constants'
import useAuth from '../../hooks/useAuth'

export default function HelpdeskPage() {
  const navigate = useNavigate()
  const { user, effectiveCompanyId } = useAuth()
  const [data,setData]=useState([]),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false)
  const [modalOpen,setModalOpen]=useState(false),[departments,setDepartments]=useState([]),[departmentId,setDepartmentId]=useState('')
  const [error,setError]=useState(''),[formError,setFormError]=useState(''),[query,setQuery]=useState(''),[queue,setQueue]=useState('all')
  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const message=e=>e.response?.status>=500?'Unable to load helpdesk. Please try again.':e.response?.data?.message||'Unable to load helpdesk. Please try again.'
  const load=useCallback(async()=>{
    const r=await api.get('/helpdesk/tickets',{headers:effectiveCompanyId?{'X-Company-Id':effectiveCompanyId}:{}})
    return r.data
  },[effectiveCompanyId])
  useEffect(()=>{let active=true;setData([]);setModalOpen(false);setLoading(true);setError('');load().then(rows=>{if(active)setData(rows)}).catch(e=>{if(active)setError(message(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[load])
  useEffect(()=>{if(!modalOpen||!user?.companyId)return;let active=true;setDepartments([]);api.get('/helpdesk/tickets/departments',{params:{companyId:user.companyId},headers:{'X-Company-Id':user.companyId}}).then(r=>{if(active)setDepartments(r.data)}).catch(e=>{if(active)setFormError(message(e))});return()=>{active=false}},[modalOpen,user?.companyId])
  const onSubmit = async (formData) => {
    setSaving(true);setFormError('')
    try {
      const r=await api.post('/helpdesk/tickets',{...formData,department:departmentId?{id:Number(departmentId)}:null},{headers:{'X-Company-Id':user.companyId}})
      toast.success(r.data.assignedTo?`Ticket assigned to ${r.data.assignedTo.name}`:'Ticket created — awaiting manual assignment')
      setModalOpen(false);navigate(`/helpdesk/${r.data.id}?companyId=${r.data.companyId || user.companyId}`)
    } catch (e) { setFormError(message(e)) } finally {setSaving(false)}
  }
  const filtered=data.filter(t=>(queue!=='assigned'||t.canHandle)&&(!query||`${t.title} ${t.department?.name||''} ${t.assignedTo?.name||''}`.toLowerCase().includes(query.toLowerCase())))
  const columns = [
    { accessorKey:'id',header:'#',cell:({getValue})=><span className="font-mono text-xs">#{getValue()}</span> },
    { accessorKey:'title',header:'Subject' },
    { id:'department',header:'Department',cell:({row})=>row.original.department?.name||'General support' },
    { id:'assignee',header:'Assigned to',cell:({row})=>row.original.assignedTo?.name||(['RESOLVED','CLOSED'].includes(row.original.status)?'No assignee':'Awaiting assignment') },
    { accessorKey:'priority',header:'Priority',cell:({getValue})=><Badge label={getValue()||'MEDIUM'} variant={['HIGH','CRITICAL'].includes(getValue())?'danger':'warning'}/> },
    { accessorKey:'status',header:'Status',cell:({getValue})=><Badge label={getValue()||'OPEN'} variant={STATUS_COLORS[getValue()?.toLowerCase()]||'warning'}/> },
    { accessorKey:'createdAt',header:'Created',cell:({getValue})=>formatDate(getValue()) },
    { id:'actions',header:'',cell:({row})=><Button size="sm" variant="secondary" onClick={()=>navigate(`/helpdesk/${row.original.id}?companyId=${row.original.companyId || effectiveCompanyId}`)}>View</Button> },
  ]
  return <div className="support-workspace helpdesk-workspace">
    <PageHeader title="Helpdesk" subtitle="Raise a request for a department and track who is handling it." actions={<Button disabled={!user?.companyId} onClick={()=>{reset({priority:'MEDIUM'});setDepartmentId('');setFormError('');setModalOpen(true)}}>+ New Ticket</Button>}/>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="support-metrics">
      <div className="support-metric support-metric-open"><span>Open tickets</span><strong>{data.filter(t=>!['RESOLVED','CLOSED'].includes(t.status)).length}</strong></div>
      <div className="support-metric support-metric-urgent"><span>Awaiting assignment</span><strong>{data.filter(t=>!t.assignedTo&&!['RESOLVED','CLOSED'].includes(t.status)).length}</strong></div>
      <div className="support-metric support-metric-done"><span>Resolved / closed</span><strong>{data.filter(t=>['RESOLVED','CLOSED'].includes(t.status)).length}</strong></div>
    </div>
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <input aria-label="Search tickets" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search subject, department or manager" className="rounded-lg border border-gray-300 px-3 py-2 text-sm min-w-64"/>
      <select aria-label="Ticket queue" value={queue} onChange={e=>setQueue(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm"><option value="all">All visible tickets</option><option value="assigned">Tickets I can handle</option></select>
    </div>
    <div className="support-table"><DataTable columns={columns} data={filtered} loading={loading}/></div>
    <Modal open={modalOpen} onClose={()=>{if(!saving)setModalOpen(false)}} title="New Support Ticket" size="lg" panelClassName="support-form-modal" footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={saving} onClick={()=>setModalOpen(false)}>Cancel</Button><Button loading={saving} onClick={handleSubmit(onSubmit)}>Submit ticket</Button></div>}>
      <div className="support-form">
        <Input label="Subject" error={errors.subject?.message} {...register('subject',{required:'Enter a subject',maxLength:{value:255,message:'Maximum 255 characters'}})}/>
        <Combobox inlineOptions label="Support department" placeholder="Search departments by name" value={departmentId} onChange={setDepartmentId} options={[{value:'',label:'General support — manual assignment'},...departments.map(d=>({value:d.id,label:d.name}))]}/>
        <p className="text-xs text-slate-500">New tickets route to the department’s first active assigned manager with a login. If there is no active contact, Helpdesk handles assignment manually. Requests are raised in your employee company.</p>
        <Select label="Priority" options={['LOW','MEDIUM','HIGH','CRITICAL']} {...register('priority')}/>
        <label className="block text-sm font-medium text-gray-700">Description<textarea className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={4} {...register('description')}/></label>
        {formError&&<p role="alert" className="text-sm text-red-700">{formError}</p>}
      </div>
    </Modal>
  </div>
}
