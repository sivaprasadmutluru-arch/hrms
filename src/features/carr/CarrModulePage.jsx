import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { LayoutDashboard, Users, Library, FileText, ListChecks, Network, Target, Gift, CheckCircle2, CalendarCheck, BarChart3, Bot, FileBarChart, Settings, ArrowLeft, Search, Bell, Sparkles, UserCircle, Building2 } from 'lucide-react'
import api from '../../services/api'
import CarrPage from './CarrPage'
import CarrDashboardPage from './CarrDashboardPage'
import CarrJobDescriptionsPage from './CarrJobDescriptionsPage'
import CarrAccountabilityPage from './CarrAccountabilityPage'
import CarrResponsibilitiesPage from './CarrResponsibilitiesPage'
import CarrKpiPage from './CarrKpiPage'
import NotificationsPage from '../notifications/NotificationsPage'
import CompanySwitcher from '../../components/layout/CompanySwitcher'
import { selectPlatformCompanies } from '../platform/platformSlice'

const nav = [
  ['Dashboard','dashboard',LayoutDashboard], ['Employee CARR','employees',Users], ['Role Library','roles',Library],
  ['Job Descriptions','job-descriptions',FileText], ['Responsibilities','responsibilities',ListChecks],
  ['Clarity & Accountability','accountability',Network], ['KPI / OKR','kpis',Target], ['Rewards Framework','rewards',Gift],
  ['Approvals','approvals',CheckCircle2], ['Reviews','reviews',CalendarCheck], ['Analytics','analytics',BarChart3],
  ['AI Assistant','ai',Bot], ['Reports','reports',FileBarChart], ['Configuration','configuration',Settings],
  ['My Profile','profile',UserCircle],
]
const list = d => Array.isArray(d) ? d : d?.content || []

export default function CarrModulePage(){
  const location=useLocation()
  const navigate=useNavigate()
  const[globalSearch,setGlobalSearch]=useState('')
  const user=useSelector(s=>s.auth.user)||{}
  const unreadCount=useSelector(s=>s.notifications?.unreadCount||0)
  const roles=useSelector(s=>s.auth.roles)||[]
  const isPlatformAdmin=roles.includes('PLATFORM_SUPER_ADMIN')
  const selectedCompanyId=useSelector(s=>s.auth.selectedCompanyId)
  const platformCompanies=useSelector(selectPlatformCompanies)
  const companiesData=useSelector(s=>s.companies.data)||[]
  const[companyDetails,setCompanyDetails]=useState(null)
  const effectiveCompanyId=selectedCompanyId||user.companyId
  useEffect(()=>{if(!effectiveCompanyId){setCompanyDetails(null);return}api.get(`/companies/${effectiveCompanyId}`).then(r=>setCompanyDetails(r.data||null)).catch(()=>setCompanyDetails(null))},[effectiveCompanyId])
  const selectedCompany=platformCompanies.find(c=>String(c.id)===String(selectedCompanyId))
  const selectedCompanyFull=companyDetails||companiesData.find(c=>String(c.id)===String(effectiveCompanyId))
  const companyName=selectedCompany?.name||selectedCompanyFull?.name||user.companyName||'GRECHA.ai'
  const companyLogo=selectedCompany?.logoUrl||(selectedCompanyFull?.logoPath?`/api/files/${selectedCompanyFull.logoPath}`:null)||user.companyLogoUrl||null
  const[companyLogoError,setCompanyLogoError]=useState(false)
  useEffect(()=>setCompanyLogoError(false),[companyLogo])
  const userName=user.fullName||[user.firstName,user.lastName].filter(Boolean).join(' ')||user.name||user.username||user.email||'User'
  const userInitial=userName.trim().slice(0,1).toUpperCase()||'U'
  const submitGlobalSearch=e=>{e.preventDefault();const query=globalSearch.trim();navigate(query?`/carr/employees?q=${encodeURIComponent(query)}`:'/carr/employees')}
  return <div className="flex min-h-screen bg-[#f7f8ff] text-slate-900">
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col overflow-hidden bg-gradient-to-b from-[#4f46e5] via-[#635bff] to-[#7c69f2] text-white">
      <div className="border-b border-white/15 px-4 py-4"><div className="flex items-center gap-3"><span className="grid h-11 w-11 flex-shrink-0 place-items-center overflow-hidden rounded-xl bg-white shadow-lg shadow-indigo-950/15">{companyLogo&&!companyLogoError?<img src={companyLogo} alt={`${companyName} logo`} className="h-full w-full object-contain p-1" onError={()=>setCompanyLogoError(true)}/>:<Building2 size={21} className="text-indigo-600"/>}</span><div className="min-w-0"><div className="text-xl font-black tracking-tight">CARR</div><div className="truncate text-xs font-semibold text-indigo-100" title={companyName}>{companyName}</div></div></div><div className="mt-2 pl-14 text-[9px] font-medium text-indigo-100">Clarity · Accountability · Results · Rewards</div></div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">{nav.map(([label,path,Icon])=><NavLink key={path} to={`/carr/${path}`} className={({isActive})=>`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition ${isActive?'bg-white/20 text-white shadow-sm':'text-indigo-50 hover:bg-white/10'}`}><Icon size={18}/><span>{label}</span></NavLink>)}</nav>
      <div className="p-4"><Link to="/dashboard" className="flex items-center gap-3 rounded-xl border border-white/25 bg-white/10 px-4 py-3 text-sm font-semibold hover:bg-white/20"><ArrowLeft size={18}/>Back to GRECHA HRMS</Link><p className="mt-4 px-2 text-[10px] text-indigo-100">© 2026 GRECHA.ai</p></div>
    </aside>
    <div className="min-w-0 flex-1 pl-64">
      <header className="sticky top-0 z-20 flex h-16 items-center border-b border-slate-200 bg-white/95 px-7 backdrop-blur"><div className="flex gap-6 text-sm font-semibold">{[['Dashboard','dashboard'],['Workflows','approvals'],['Analytics','analytics'],['Reports','reports'],['AI Assistant','ai']].map(([x,p])=><Link key={p} to={`/carr/${p}`} className={location.pathname.endsWith(p)?'text-indigo-600':'text-slate-600 hover:text-indigo-600'}>{x}</Link>)}</div><div className="ml-auto flex items-center gap-3"><form onSubmit={submitGlobalSearch} role="search" className="hidden items-center gap-2 rounded-xl border bg-slate-50 px-3 lg:flex"><Search size={16} className="text-slate-400"/><input value={globalSearch} onChange={e=>setGlobalSearch(e.target.value)} aria-label="Search CARR" placeholder="Search employee, role, KPI, CARR…" className="w-56 bg-transparent py-2 text-xs text-slate-700 outline-none placeholder:text-slate-400"/><button type="submit" className="text-[10px] font-bold uppercase tracking-wide text-indigo-600">Search</button></form>{isPlatformAdmin&&<CompanySwitcher/>}<Link to="/carr/notifications" title="CARR Notifications" aria-label={unreadCount?`CARR Notifications, ${unreadCount} unread`:'CARR Notifications'} className={`relative rounded-lg p-2 transition hover:bg-slate-100 hover:text-indigo-600 ${location.pathname==='/carr/notifications'?'bg-indigo-50 text-indigo-600':'text-slate-500'}`}><Bell size={19}/>{unreadCount>0&&<span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white">{unreadCount>99?'99+':unreadCount}</span>}</Link><Link to="/carr/profile" title={userName} aria-label={`${userName} profile`} className="grid h-9 w-9 place-items-center rounded-full bg-indigo-600 text-sm font-bold text-white ring-2 ring-indigo-100 transition hover:bg-indigo-700">{userInitial}</Link></div></header>
      <main className="min-h-[calc(100vh-4rem)]"><Routes><Route index element={<Navigate to="dashboard" replace/>}/><Route path="dashboard" element={<CarrDashboardPage/>}/><Route path="employees" element={<CarrPage initialTab="employees"/>}/><Route path="job-descriptions" element={<CarrJobDescriptionsPage/>}/><Route path="responsibilities" element={<CarrResponsibilitiesPage/>}/><Route path="accountability" element={<CarrAccountabilityPage/>}/><Route path="kpis" element={<CarrKpiPage/>}/><Route path="notifications" element={<div className="p-6 lg:p-8"><NotificationsPage/></div>}/><Route path="profile" element={<CarrProfile/>}/><Route path=":section" element={<LiveSection/>}/></Routes></main>
    </div>
  </div>
}

function CarrProfile(){
  const user=useSelector(s=>s.auth.user)||{}
  const roles=useSelector(s=>s.auth.roles)||[]
  const name=user.fullName||[user.firstName,user.lastName].filter(Boolean).join(' ')||user.name||user.username||user.email||'CARR User'
  const fields=[['Email',user.email||user.username||'—'],['Employee ID',user.employeeId||user.badgeId||'—'],['Company',user.companyName||'Current organization'],['Access roles',roles.join(', ')||'—']]
  return <Shell title="My Profile" subtitle="Your authenticated CARR identity and access scope."><div className="grid gap-6 lg:grid-cols-[280px_1fr]"><div className="rounded-2xl border bg-white p-7 text-center"><div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-indigo-100 text-3xl font-black text-indigo-600">{name.slice(0,1).toUpperCase()}</div><h2 className="mt-4 text-xl font-black">{name}</h2><p className="mt-1 text-sm text-slate-500">Secure GRECHA.ai account</p></div><div className="rounded-2xl border bg-white p-6"><h3 className="font-bold">Account information</h3><div className="mt-4 divide-y">{fields.map(([k,v])=><div key={k} className="grid grid-cols-[150px_1fr] py-4 text-sm"><span className="font-medium text-slate-500">{k}</span><span className="font-semibold text-slate-800">{v}</span></div>)}</div><Link to="/settings/account" className="mt-5 inline-flex rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white">Manage account security</Link></div></div></Shell>
}

function LiveSection(){
  const section=useLocation().pathname.split('/').pop()
  const meta={roles:['Role Library','Reusable role definitions and CARR templates.'], 'job-descriptions':['Job Descriptions','Role purpose and scope from the live role library.'], responsibilities:['Responsibilities','Accountabilities assigned across employee CARRs.'], accountability:['Clarity & Accountability','Ownership clarity across current CARR records.'], kpis:['KPI / OKR','Live result measures, targets and actual performance.'], rewards:['Rewards Framework','Published results eligible for reward review.'], approvals:['Approvals','CARR records currently moving through governance.'], reviews:['Reviews','Published CARRs and upcoming review dates.'], analytics:['Analytics','Live coverage, result and governance metrics.'], ai:['AI Assistant','AI-assisted CARR generation and quality checks.'], reports:['Reports','Current CARR operational report.'], configuration:['Configuration','CARR workflow and scoring rules.']}[section]||['CARR','']
  const [data,setData]=useState({records:[],templates:[],jobRoles:[],employees:[],dashboard:{}}),[loading,setLoading]=useState(true)
  useEffect(()=>{Promise.all([api.get('/carr/records'),api.get('/carr/templates'),api.get('/job-roles'),api.get('/employees',{params:{page:0,size:1000}}),api.get('/carr/dashboard')]).then(([r,t,j,e,d])=>setData({records:list(r.data),templates:list(t.data),jobRoles:list(j.data),employees:list(e.data),dashboard:d.data||{}})).finally(()=>setLoading(false))},[])
  const rows=useMemo(()=>{
    if(section==='roles') return data.templates.map(t=>({primary:t.title,secondary:t.purpose||'Purpose not defined',detail:t.jobRoleName||'Any role',status:`Version ${t.version||1}`}))
    if(section==='job-descriptions') {
      const descriptions=new Map()
      data.templates.forEach(t=>descriptions.set(`template-${t.id}`,{primary:t.jobRoleName||t.title,secondary:t.purpose||'Purpose not defined',detail:t.scope||t.title,status:`Template v${t.version||1}`}))
      data.records.forEach(r=>{const employee=data.employees.find(e=>String(e.id)===String(r.employeeId)),role=r.jobRoleName||employee?.jobRoleName||employee?.jobPositionName||employee?.designation||r.title;if(!role)return;const key=`role-${role.toLowerCase()}`;if(!descriptions.has(key))descriptions.set(key,{primary:role,secondary:r.purpose||`CARR responsibilities for ${r.employeeName||'assigned employees'}`,detail:r.employeeName||'Employee CARR',status:r.status||'DRAFT'})})
      data.jobRoles.forEach(role=>{const name=role.name||role.title;if(!name)return;const key=`role-${name.toLowerCase()}`;if(!descriptions.has(key))descriptions.set(key,{primary:name,secondary:role.description||'Job description is ready to be defined in the CARR role library.',detail:role.jobPosition?.name||role.jobPositionName||'Company role',status:'Role'})})
      return [...descriptions.values()]
    }
    if(section==='responsibilities'||section==='accountability') return data.records.flatMap(r=>(r.responsibilities||[]).map(x=>({primary:x.statement,secondary:r.employeeName,detail:x.frequency||'—',status:x.priority||'—'})))
    if(section==='kpis') return data.records.flatMap(r=>(r.kpis||[]).map(x=>({primary:x.name,secondary:r.employeeName,detail:`${x.actualValue??0} / ${x.targetValue??0} ${x.unit||''}`,status:x.riskStatus||'ON TRACK'})))
    let records=data.records
    if(section==='approvals') records=records.filter(r=>['SUBMITTED','MANAGER_REVIEW','DEPT_HEAD_REVIEW','HR_REVIEW','APPROVED'].includes(r.status))
    if(section==='reviews'||section==='rewards') records=records.filter(r=>r.status==='PUBLISHED')
    return records.map(r=>({primary:r.employeeName,secondary:r.title,detail:section==='reviews'?(r.nextReviewDate||'No review date'):`Result ${r.resultScore??0}%`,status:r.status}))
  },[data,section])
  const paged=usePagedRows(rows)
  if(section==='ai') return <Shell title={meta[0]} subtitle={meta[1]}><div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-10 text-center"><Sparkles className="mx-auto text-indigo-600" size={40}/><h3 className="mt-4 text-xl font-bold">AI provider not configured</h3><p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">This screen is intentionally not using demo responses. Connect an approved AI provider in Configuration before enabling generated CARR content.</p></div></Shell>
  return <Shell title={meta[0]} subtitle={meta[1]}>{loading?<div className="py-20 text-center text-slate-400">Loading live CARR data…</div>:<><div className="mb-5 grid gap-4 md:grid-cols-4"><Metric label="Employees" value={data.dashboard.totalActiveEmployees}/><Metric label="Published" value={data.dashboard.published}/><Metric label="Pending approval" value={data.dashboard.pendingApproval}/><Metric label="Coverage" value={`${data.dashboard.coveragePercent||0}%`}/></div><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Name</th><th>Context</th><th>Measure / date</th><th>Status</th></tr></thead><tbody>{paged.items.map((r,i)=><tr key={i} className="border-t"><td className="px-5 py-4 font-semibold">{r.primary}</td><td className="text-slate-500">{r.secondary}</td><td>{r.detail}</td><td><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{r.status}</span></td></tr>)}{!rows.length&&<tr><td colSpan="4" className="py-16 text-center text-slate-400">No live records are available for this view yet.</td></tr>}</tbody></table><ModulePager {...paged} total={rows.length}/></div></>}</Shell>
}
function usePagedRows(rows){const[page,setPage]=useState(1),[size,setSize]=useState(25),pages=Math.max(1,Math.ceil(rows.length/size));useEffect(()=>{if(page>pages)setPage(pages)},[page,pages]);const start=(page-1)*size;return{page,size,pages,setPage,setSize,start,items:rows.slice(start,start+size)}}
function ModulePager({page,size,pages,setPage,setSize,total,start}){if(!total)return null;return <div className="flex flex-wrap items-center justify-between gap-3 border-t px-5 py-3 text-xs text-slate-500"><span>Showing {start+1}–{Math.min(start+size,total)} of {total}</span><div className="flex items-center gap-2"><select value={size} onChange={e=>{setSize(Number(e.target.value));setPage(1)}} className="rounded border px-2 py-1">{[10,25,50,100].map(n=><option key={n} value={n}>{n} rows</option>)}</select><button disabled={page===1} onClick={()=>setPage(page-1)} className="rounded border px-2 py-1 disabled:opacity-40">Previous</button><span>Page {page} of {pages}</span><button disabled={page===pages} onClick={()=>setPage(page+1)} className="rounded border px-2 py-1 disabled:opacity-40">Next</button></div></div>}
const Shell=({title,subtitle,children})=><div className="p-7 lg:p-9"><div className="mb-7"><h1 className="text-3xl font-black tracking-tight">{title}</h1><p className="mt-1 text-sm text-slate-500">{subtitle}</p></div>{children}</div>
const Metric=({label,value})=><div className="rounded-2xl border border-slate-200 bg-white p-5"><div className="text-2xl font-black">{value??0}</div><div className="mt-1 text-xs font-medium text-slate-500">{label}</div></div>
