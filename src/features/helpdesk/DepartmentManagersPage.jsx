import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuth from '../../hooks/useAuth'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import ConfirmModal from '../../components/common/ConfirmModal'
import Combobox from '../../components/common/Combobox'

export default function DepartmentManagersPage() {
  const { effectiveCompanyId } = useAuth()
  const [managers,setManagers]=useState([]),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false)
  const [modalOpen,setModalOpen]=useState(false),[removeId,setRemoveId]=useState(null),[error,setError]=useState('')
  const [options,setOptions]=useState(null),[optionsLoading,setOptionsLoading]=useState(false),[search,setSearch]=useState('')
  const [departmentId,setDepartmentId]=useState(''),[managerId,setManagerId]=useState(''),[selectedManager,setSelectedManager]=useState(null)
  const headers={'X-Company-Id':effectiveCompanyId}
  const message=e=>e.response?.data?.message||'Unable to update department managers. Please try again.'
  const load=useCallback(async()=>{const r=await api.get('/helpdesk/department-managers',{headers:{'X-Company-Id':effectiveCompanyId}});return r.data},[effectiveCompanyId])
  useEffect(()=>{let active=true;setManagers([]);setError('');setModalOpen(false);setRemoveId(null);if(!effectiveCompanyId){setLoading(false);return}setLoading(true);load().then(data=>{if(active)setManagers(data)}).catch(e=>{if(active)setError(message(e))}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[load,effectiveCompanyId])
  useEffect(()=>{
    if(!modalOpen||!effectiveCompanyId)return
    let active=true;setOptionsLoading(true)
    const timer=setTimeout(()=>{api.get('/helpdesk/department-manager-options',{params:{companyId:effectiveCompanyId,search},headers:{'X-Company-Id':effectiveCompanyId}}).then(r=>{if(active)setOptions(r.data)}).catch(e=>{if(active){setOptions(null);setError(message(e))}}).finally(()=>{if(active)setOptionsLoading(false)})},250)
    return()=>{active=false;clearTimeout(timer)}
  },[modalOpen,effectiveCompanyId,search])
  function open(){setDepartmentId('');setManagerId('');setSelectedManager(null);setSearch('');setOptions(null);setError('');setModalOpen(true)}
  async function assign(){
    if(!departmentId||!managerId){setError('Choose a department and an employee by name.');return}
    setSaving(true);setError('')
    try{
      const r=await api.post('/helpdesk/department-managers',{department:{id:Number(departmentId)},manager:{id:Number(managerId)}},{headers})
      setManagers(previous=>[...previous.filter(m=>m.id!==r.data.id),r.data]);setModalOpen(false);toast.success('Department support contact assigned')
    }catch(e){setError(message(e))}finally{setSaving(false)}
  }
  async function remove(){setSaving(true);try{await api.delete(`/helpdesk/department-managers/${removeId}`,{headers});setManagers(previous=>previous.filter(m=>m.id!==removeId));setRemoveId(null);toast.success('Assignment removed')}catch(e){toast.error(message(e))}finally{setSaving(false)}}
  const employeeOptions=options?.employees||[]
  const choices=selectedManager&&!employeeOptions.some(e=>e.id===selectedManager.id)?[selectedManager,...employeeOptions]:employeeOptions
  const departmentCount=new Set(managers.map(item=>item.department.id)).size
  return <div className="support-workspace support-managers-workspace">
    <PageHeader title="Helpdesk Department Managers" subtitle="Choose who receives new helpdesk tickets for each department." actions={<Button disabled={!effectiveCompanyId} onClick={open}>+ Assign Manager</Button>}/>
    {!effectiveCompanyId&&<p role="status" className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">Select a company in the header to manage its department support contacts.</p>}
    {error&&!modalOpen&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="support-metrics"><div className="support-metric support-metric-open"><span>Manager assignments</span><strong>{managers.length}</strong></div><div className="support-metric support-metric-done"><span>Departments covered</span><strong>{departmentCount}</strong></div></div>
    {loading?<div className="support-table-loading">Loading department managers…</div>:managers.length===0?<div className="announcement-empty"><span className="announcement-empty-icon">↗</span><h2>No department support contacts assigned</h2><p>Select a department and an active employee from the same company.</p><Button disabled={!effectiveCompanyId} onClick={open}>Assign manager</Button></div>:<div className="department-manager-list">{managers.map(item=>{const name=[item.manager.firstName,item.manager.lastName].filter(Boolean).join(' ')||item.manager.email||'Unnamed employee';return <article className="department-manager-card" key={item.id}><div className="manager-avatar">{name.split(/\s+/).map(part=>part[0]).slice(0,2).join('').toUpperCase()}</div><div className="manager-identity"><span>DEPARTMENT SUPPORT CONTACT</span><h2>{name}</h2><p>{item.manager.email||'Support point of contact'}</p></div><div className="manager-department"><span>ASSIGNED DEPARTMENT</span><strong>{item.department.name}</strong></div><Button size="sm" variant="danger" onClick={()=>setRemoveId(item.id)}>Remove assignment</Button></article>})}</div>}
    <ConfirmModal open={removeId!=null} onClose={()=>{if(!saving)setRemoveId(null)}} onConfirm={remove} title="Remove manager assignment" message="Remove this employee as a department support contact? Their account permissions will stay the same." confirmLabel="Remove" loading={saving}/>
    <Modal open={modalOpen} onClose={()=>{if(!saving)setModalOpen(false)}} title="Assign Department Manager" panelClassName="support-form-modal" footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={saving} onClick={()=>setModalOpen(false)}>Cancel</Button><Button loading={saving} disabled={optionsLoading||!departmentId||!managerId} onClick={assign}>Assign</Button></div>}>
      <div className="support-form">
        <Combobox inlineOptions label="Department" placeholder="Search departments by name" options={(options?.departments||[]).map(d=>({value:d.id,label:d.name}))} value={departmentId} onChange={setDepartmentId} disabled={optionsLoading&&!options}/>
        <Combobox inlineOptions label="Manager" placeholder="Search employee name or email" options={choices.map(e=>({value:e.id,label:e.name||e.email||'Unnamed employee',sublabel:e.email}))} value={managerId} onSearchChange={setSearch} onChange={value=>{setManagerId(value);setSelectedManager(choices.find(e=>String(e.id)===String(value))||null)}} disabled={!options}/>
        {optionsLoading&&<p role="status" className="text-xs text-slate-500">Loading matching employees…</p>}
        {options?.employeeTotal>50&&<p className="text-xs text-slate-500">Showing the first 50 matches. Type a name or email to narrow the search.</p>}
        <p className="text-xs text-slate-500">New tickets route to the oldest active manager assignment with a working login in the selected department. Other contacts act as backups. Existing tickets keep their assignee; removing a contact affects new tickets only. This does not grant account roles.</p>
        {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
      </div>
    </Modal>
  </div>
}
