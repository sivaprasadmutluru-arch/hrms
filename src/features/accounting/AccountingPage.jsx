import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import api from '../../services/api'
import useAuth from '../../hooks/useAuth'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'

const US_TAX_FIELDS = [['federal','Federal income tax'],['state','State income tax'],['local','Local income tax'],['social_security','Employee Social Security'],['medicare','Employee Medicare'],['employer_social_security','Employer Social Security'],['employer_medicare','Employer Medicare']]
const UK_TAX_FIELDS = [['paye','PAYE income tax'],['national_insurance','Employee National Insurance'],['student_loan','Student loan'],['postgraduate_loan','Postgraduate loan'],['employer_national_insurance','Employer National Insurance'],['apprenticeship_levy','Apprenticeship Levy']]
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}` }
const money = value => value === null || value === undefined ? '—' : Number(value).toLocaleString(undefined, {minimumFractionDigits:2, maximumFractionDigits:2})
const number = value => Number(value || 0)
const key = row => `${row.company_id}:${row.employee_id}`
const Field = ({label, children}) => <label className="block text-sm font-medium text-slate-700">{label}<div className="mt-1">{children}</div></label>
const inputClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500'
const Panel = ({children, className=''}) => <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>
const Table = ({headers, children}) => <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{headers.map((name,index) => <th key={index} className="whitespace-nowrap px-3 py-3 font-semibold">{name}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{children}</tbody></table></div>
const TD = ({children, className=''}) => <td className={`px-3 py-3 align-top ${className}`}>{children}</td>
const Empty = ({columns, children}) => <tr><td colSpan={columns} className="p-8 text-center text-slate-500">{children}</td></tr>
const requestKey = () => crypto.randomUUID()
async function errorMessage(error) { if (error.response?.data instanceof Blob) { try { return JSON.parse(await error.response.data.text()).message || 'Export failed' } catch {} } return error.response?.data?.message || 'Unable to complete the accounting request' }

export default function AccountingPage() {
  const navigate = useNavigate()
  const { user, effectiveCompanyId, isPlatformAdmin } = useAuth()
  const selectedCompanyId = useSelector(s => s.auth.selectedCompanyId)
  const companyId = isPlatformAdmin() ? selectedCompanyId : effectiveCompanyId
  const canWrite = isPlatformAdmin() || user?.permissions?.includes('payroll:approve')
  const [month, setMonth] = useState(today().slice(0,7))
  const [organization, setOrganization] = useState(false)
  const [tab, setTab] = useState('Salary sheet')
  const [salary, setSalary] = useState(null)
  const [ledger, setLedger] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [mappings, setMappings] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [page, setPage] = useState(0)
  const [salaryPage, setSalaryPage] = useState(0)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(new Set())
  const [dialog, setDialog] = useState(null)
  const mutating = useRef(false)
  const epoch = useRef(0)
  const scopeRef = useRef('')
  const scope = `${companyId}:${month}:${organization}`
  scopeRef.current = scope
  const load = useCallback(async () => {
    if (!companyId || scopeRef.current !== scope) return
    const id = ++epoch.current
    setLoading(true); setError('')
    const headers = { 'X-Company-Id': companyId }
    const results = await Promise.allSettled([
      api.get('/accounting/salary', {headers, params:{month, organization}}),
      api.get('/accounting/ledger', {headers, params:{month, organization, page, size:50}}),
      api.get('/accounting/accounts', {headers}), api.get('/accounting/deduction-mappings', {headers}),
    ])
    if (scopeRef.current !== scope || id !== epoch.current) return
    const failed = results.find(result => result.status === 'rejected')
    if (failed) { setError(await errorMessage(failed.reason)); setSalary(null); setLedger(null) }
    else { setSalary(results[0].value.data); setLedger(results[1].value.data); setAccounts(results[2].value.data); setMappings(results[3].value.data) }
    setLoading(false)
  }, [companyId, month, organization, page, scope])
  useEffect(() => { setSalary(null); setLedger(null); setSelected(new Set()); setSalaryPage(0); setDialog(null); setPage(0) }, [scope])
  useEffect(() => { load(); return () => { epoch.current++ } }, [load])
  const profile = salary?.country_profile
  const india = profile?.code === 'IN'
  const uae = profile?.code === 'AE'
  const usa = profile?.code === 'US'
  const uk = profile?.code === 'GB'
  const payrollTaxFields = uk ? UK_TAX_FIELDS : US_TAX_FIELDS
  const employeeTaxCount = uk ? 4 : 5
  const taxPrefix = uk ? 'uk' : 'us'
  const rows = salary?.rows || []
  const legacyIndia = !india && rows.some(row => number(row.pf) || number(row.tds) || number(row.employer_pf))
  const contributionField = india ? 'pf' : 'pension'
  const employerField = india ? 'employer_pf' : 'employer_pension'
  const contributionLabel = india ? 'Employee PF' : uae ? 'Employee pension (eligible staff)' : usa ? 'Employee retirement contributions' : uk ? 'Employee workplace pension' : 'Employee contributions'
  const employerLabel = india ? 'Employer PF' : uae ? 'Employer pension (eligible staff)' : usa ? 'Employer retirement / taxes' : uk ? 'Employer pension / NI / levy' : 'Employer contributions'
  const classificationOptions = india ? [['PF','Employee PF'],['TDS','TDS'],['IN_ESI','ESI (Employee State Insurance)'],['IN_PT','Professional Tax (PT)'],['IN_LWF','Labour Welfare Fund (LWF)']] : [['PENSION',uk?'Workplace pension':usa?'Retirement contributions':uae?'Pension (eligible staff)':'Local pension / contributions'],...(usa || uk ? payrollTaxFields.slice(0,employeeTaxCount).map(([key,label])=>[`${taxPrefix.toUpperCase()}_${key.toUpperCase()}`,label]) : []),...(uk ? [['UK_APPRENTICESHIP_LEVY','Apprenticeship Levy (employer cost)']] : [])]

  const filtered = useMemo(() => rows.filter(row => `${row.employee_name} ${row.badge_id} ${row.department || ''} ${row.company}`.toLowerCase().includes(search.toLowerCase())), [rows, search])
  const targetRows = selected.size ? rows.filter(row => selected.has(key(row))) : rows
  const approved = targetRows.filter(row => row.payslip_id && ['CONFIRMED','PAID'].includes(row.status))
  const reviewCount = rows.filter(row => row.payslip_id && (!row.classified || row.review_notes?.length)).length
  const missingCount = rows.filter(row => !row.payslip_id).length
  const moneyGroups = Object.entries(salary?.totals || {})
  const open = (type, target=null) => {
    const defaults = {type, target, requestKey:requestKey(), date:today(), reference:'', description:'', amount:'', account:'BANK', category:'GENERAL_EXPENSE', reason:'', code:'', name:'', accountType:'EXPENSE', lines:[{account:'BANK',debit:'',credit:''},{account:'INCOME',debit:'',credit:''}]}
    if (type === 'Review') Object.assign(defaults, {pf:india ? target.pf || 0 : 0, tds:india ? target.tds || 0 : 0, employerPf:india ? target.employer_pf || 0 : 0, esi:india ? target.esi || 0 : 0, employerEsi:india ? target.employer_esi || 0 : 0, professionalTax:india ? target.professional_tax || 0 : 0, lwf:india ? target.lwf || 0 : 0, employerLwf:india ? target.employer_lwf || 0 : 0, gratuityProvision:india ? target.gratuity_provision || 0 : 0, pension:india ? 0 : target.pension || 0, employerPension:india ? 0 : target.employer_pension || 0, ukTaxes:uk ? {...target.uk_taxes} : {}, usTaxes:usa ? {...target.us_taxes} : {}, employerOther:target.employer_other || 0, loans:target.loan_recovery || 0, lop:target.loss_of_pay || 0, attendance:target.attendance_deduction || 0})
    setDialog(defaults)
  }
  const patch = (name, value) => setDialog(current => ({...current, [name]:value}))
  const download = async (kind, selectedOnly=false) => {
    if (mutating.current || !companyId) return
    if (selectedOnly && !selected.size) { toast.error('Select employees first'); return }
    mutating.current = true; setBusy(true)
    try {
      const params = {month, organization}
      if (selectedOnly) params.employeeIds = [...new Set(targetRows.map(row => row.employee_id))].join(',')
      const {data} = await api.get(`/accounting/${kind}.xlsx`, {params, headers:{'X-Company-Id':companyId}, responseType:'blob', timeout:120000})
      const url=URL.createObjectURL(data); const a=document.createElement('a'); a.href=url; a.download=`${kind === 'salary' ? 'salary-sheet' : 'accounting-ledger'}-${month}.xlsx`; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000)
    } catch (error) { toast.error(await errorMessage(error)) }
    finally { mutating.current=false; setBusy(false) }
  }
  const submit = async event => {
    event.preventDefault()
    if (mutating.current || !dialog || !companyId) return
    mutating.current=true; setBusy(true)
    try {
      const d=dialog, headers={'X-Company-Id':d.target?.company_id || companyId}
      if (d.type === 'Post payroll') await api.post('/accounting/payroll/post', {month, organization, payslipIds:[...new Set(approved.map(row => row.payslip_id))], requestKey:d.requestKey, paymentAccount:d.account}, {headers, timeout:120000})
      else if (d.type === 'Payment') await api.post('/accounting/payroll/payment', {payslipId:d.target.payslip_id, reference:d.reference, date:d.date, account:d.account, requestKey:d.requestKey}, {headers})
      else if (d.type === 'Review') await api.put(`/accounting/payroll/${d.target.payslip_id}/review`, {pf:d.pf,tds:d.tds,employerPf:d.employerPf,esi:d.esi||0,employerEsi:d.employerEsi||0,professionalTax:d.professionalTax||0,lwf:d.lwf||0,employerLwf:d.employerLwf||0,gratuityProvision:d.gratuityProvision||0,employerOther:d.employerOther,loans:d.loans,lop:d.lop,attendance:d.attendance,reason:d.reason,pension:d.pension || 0,employerPension:d.employerPension || 0,usTaxes:d.usTaxes || {},ukTaxes:d.ukTaxes || {}}, {headers})
      else if (d.type === 'Reverse') await api.post(`/accounting/journals/${d.target.id}/reverse`, {reason:d.reason,date:d.date,requestKey:d.requestKey}, {headers})
      else if (d.type === 'Account') await api.post('/accounting/accounts', {code:d.code,name:d.name,type:d.accountType}, {headers})
      else {
        let lines=d.lines.map(line => ({account:line.account,debit:number(line.debit),credit:number(line.credit)}))
        if (d.type === 'Income') lines=[{account:d.account,debit:number(d.amount),credit:0},{account:d.category,debit:0,credit:number(d.amount)}]
        if (d.type === 'Expense') lines=[{account:d.category,debit:number(d.amount),credit:0},{account:d.account,debit:0,credit:number(d.amount)}]
        await api.post('/accounting/journals', {requestKey:d.requestKey,date:d.date,type:d.type.toUpperCase(),description:d.description,reference:d.reference,lines}, {headers})
      }
      toast.success(d.type === 'Payment' ? 'Salary payment recorded' : 'Accounting record saved')
      setDialog(null); await load()
    } catch (error) { toast.error(await errorMessage(error)) }
    finally { mutating.current=false; setBusy(false) }
  }
  const saveMapping = async (id, category) => {
    if (mutating.current) return
    mutating.current=true; setBusy(true)
    try { await api.put('/accounting/deduction-mappings',{deductionId:id,category},{headers:{'X-Company-Id':companyId}}); toast.success('Classification saved'); await load() }
    catch(error) { toast.error(await errorMessage(error)) }
    finally {mutating.current=false;setBusy(false)}
  }
  const accountOptions = items => items.map(account => <option key={account.code} value={account.code}>{account.name} ({account.code})</option>)
  const balance = dialog?.lines.reduce((sum,line) => sum + number(line.debit) - number(line.credit),0) || 0
  return <div className="space-y-5">
    <PageHeader title="Accounting" subtitle="Salary registers, payment records and organization bookkeeping" actions={<div className="flex gap-2"><Button variant="secondary" onClick={()=>navigate('/accounting/staffing')}>Staffing & contracts</Button><Button variant="secondary" onClick={load} disabled={loading || busy || !companyId}>Refresh</Button></div>} />
    <Panel><div className="flex flex-wrap items-end gap-4">
      <Field label="Month"><input aria-label="Accounting month" type="month" min="2000-01" max="2100-12" value={month} disabled={busy} onChange={e => {if(e.target.value)setMonth(e.target.value)}} className={inputClass} /></Field>
      <Field label="Report scope"><select value={organization ? 'organization' : 'company'} disabled={busy} onChange={e => setOrganization(e.target.value === 'organization')} className={inputClass}><option value="company">Selected company</option><option value="organization">Whole organization</option></select></Field>
      <span className="pb-2 text-sm text-slate-500">{salary?.organization || 'Select a company in the header'} · amounts grouped by currency</span>
    </div>{profile && <div className={`mt-3 rounded-lg p-3 text-sm ${profile.country?'bg-blue-50 text-blue-900':'bg-amber-50 text-amber-900'}`}><p className="font-semibold">{profile.name}{profile.country ? ` · ${profile.country}` : ''}</p><p className="mt-1 text-xs">{profile.guidance}</p>{!profile.country && isPlatformAdmin() && <button className="mt-2 text-xs font-semibold underline" onClick={()=>navigate('/companies/settings')}>Open Company Settings</button>}{uae && <button className="mt-2 text-xs font-semibold underline" onClick={()=>navigate('/payroll/gratuity')}>Gratuity / end-of-service benefits</button>}</div>}</Panel>
    {!companyId && <Panel><p className="text-sm text-slate-600">Select a company in the header to open its accounting records.</p></Panel>}
    {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {companyId && <>
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">{['Salary sheet','Income & expenses','Reports','Accounts & payroll'].map(name => <button key={name} onClick={() => setTab(name)} className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium ${tab === name ? 'border-blue-600 text-blue-700':'border-transparent text-slate-500'}`}>{name}</button>)}</div>
      {loading && <p role="status" className="text-sm text-slate-500">Loading accounting records…</p>}
      {tab === 'Salary sheet' && <>
        {moneyGroups.map(([currency,total]) => <div key={currency} className="grid grid-cols-2 gap-3 lg:grid-cols-5">{[['Gross salary','gross_pay'],['Net salary','net_pay'],['Recorded paid','paid'],['Outstanding','outstanding'],['Employer cost','total_cost']].map(([label,field]) => <Panel key={field}><p className="text-xs text-slate-500">{label} · {currency}</p><p className="mt-2 text-xl font-semibold text-slate-800">{money(total[field])}</p></Panel>)}</div>)}
        <Panel><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold text-slate-800">Monthly salary register</h2><p className="mt-1 text-xs text-slate-500">Pay periods beginning in {month}. Recorded paid status is separate from ledger posting.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => navigate('/payroll/manual')}>Prepare payroll</Button><Button variant="secondary" disabled={busy || loading || !rows.length} onClick={() => download('salary')}>Excel · all employees</Button><Button variant="secondary" disabled={busy || loading || !selected.size} onClick={() => download('salary',true)}>Excel · selected ({selected.size})</Button>{canWrite && <Button disabled={busy || loading || !approved.length} onClick={() => open('Post payroll')}>Post {selected.size ? 'selected' : 'approved'} payroll</Button>}</div></div>
          {(missingCount > 0 || reviewCount > 0) && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{missingCount} employees without a payslip. {reviewCount} payslips need review. Amounts shown as “—” need classification; they do not mean zero liability.</p>}
        </Panel>
        <div className="flex flex-wrap items-center gap-3"><input aria-label="Search salary register" placeholder="Search employee, ID, department or company" value={search} onChange={e => {setSearch(e.target.value);setSalaryPage(0)}} className={`${inputClass} max-w-md`} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={filtered.length>0 && filtered.every(row => selected.has(key(row)))} onChange={e => setSelected(e.target.checked ? new Set(filtered.map(key)) : new Set())} />Select all matching employees</label></div>
        <Table headers={['','Employee','Company / currency','Basic','Gross',contributionLabel,...(india ? ['TDS','ESI','PT','LWF'] : legacyIndia ? ['Legacy India PF / TDS'] : []),...(usa || uk ? [uk ? 'UK payroll deductions' : 'US withholding'] : []),'Other / LOP / loans','Net',employerLabel,'Status / payment','Review / ledger','Actions']}>
          {!filtered.length && <Empty columns={(india ? 16 : legacyIndia ? 13 : 12)+(usa||uk?1:0)}>{loading ? 'Loading…' : 'No employees or payslips in this scope. Create employees and prepare payroll first.'}</Empty>}
          {filtered.slice(salaryPage*50,salaryPage*50+50).map((row,index) => <tr key={`${key(row)}:${row.payslip_id || 'missing'}:${index}`}>
            <TD><input aria-label={`Select ${row.employee_name}`} type="checkbox" checked={selected.has(key(row))} onChange={e => setSelected(previous => {const next=new Set(previous);if(e.target.checked)next.add(key(row));else next.delete(key(row));return next})} /></TD>
            <TD><p className="font-medium">{row.employee_name}</p><p className="text-xs text-slate-500">{row.badge_id || row.employee_id} · {row.department || 'No department'}</p></TD>
            <TD>{row.company}<p className="text-xs text-slate-500">{row.currency}</p></TD><TD>{money(row.basic_pay)}</TD><TD>{money(row.gross_pay)}</TD>
            <TD>{row.pf_known ? money(row[contributionField]):'—'}</TD>{india ? <>
              <TD>{row.pf_known ? money(row.tds):'—'}</TD>
              <TD>{row.pf_known ? money(row.esi):'—'}</TD>
              <TD>{row.pf_known ? money(row.professional_tax):'—'}</TD>
              <TD>{row.pf_known ? money(row.lwf):'—'}</TD>
            </> : legacyIndia && <TD><p>PF: {money(row.pf)}</p><p>TDS: {money(row.tds)}</p><p>Employer PF: {money(row.employer_pf)}</p></TD>}
            {(usa||uk) && <TD>{payrollTaxFields.slice(0,employeeTaxCount).map(([field,label])=><p key={field} className="whitespace-nowrap text-xs">{label}: {row.pf_known ? money(row[`${taxPrefix}_taxes`]?.[field] || 0):'—'}</p>)}</TD>}
            <TD>{row.payslip_id ? money(number(row.deduction)-number(row.pf)-number(row.tds)-number(row.pension)-number(row.esi)-number(row.professional_tax)-number(row.lwf)-number(row.us_employee_taxes)-number(row.uk_employee_taxes)):'—'}<p className="text-xs text-slate-500">Total: {money(row.deduction)}</p></TD><TD className="font-semibold">{money(row.net_pay)}</TD><TD>{row.pf_known ? money(row[employerField]):'—'}{(usa||uk) && payrollTaxFields.slice(employeeTaxCount).map(([field,label])=><p key={field} className="whitespace-nowrap text-xs">{label}: {row.pf_known ? money(row[`${taxPrefix}_taxes`]?.[field] || 0):'—'}</p>)}{india && (number(row.employer_esi)>0 || number(row.employer_lwf)>0 || number(row.gratuity_provision)>0) && <div className="mt-1 space-y-0.5 text-xs text-slate-500">{number(row.employer_esi)>0 && <p>ESI: {money(row.employer_esi)}</p>}{number(row.employer_lwf)>0 && <p>LWF: {money(row.employer_lwf)}</p>}{number(row.gratuity_provision)>0 && <p>Gratuity: {money(row.gratuity_provision)}</p>}</div>}</TD>
            <TD><span className={`rounded-full px-2 py-1 text-xs ${row.status==='PAID'?'bg-emerald-50 text-emerald-700':'bg-slate-100 text-slate-600'}`}>{row.status || 'Unknown'}</span><p className="mt-2 text-xs text-slate-500">{row.payment_date || ''} {row.payment_reference || ''}</p></TD>
            <TD><p className="text-xs">{row.payroll_posted ? 'Payroll posted' : 'Payroll not posted'}{row.payment_posted ? ' · Payment posted':''}</p>{row.review_notes?.map(note => <p key={note} className="mt-1 max-w-xs text-xs text-amber-700">{note}</p>)}</TD>
            <TD>{canWrite && row.payslip_id && <div className="flex flex-col gap-2"><Button size="sm" variant="secondary" disabled={busy || row.payroll_posted} onClick={() => open('Review',row)}>Review deductions</Button>{row.status==='CONFIRMED' && <Button size="sm" disabled={busy} onClick={() => open('Payment',row)}>Record payment</Button>}</div>}</TD>
          </tr>)}
        </Table>
        <div className="flex items-center justify-between text-sm text-slate-500"><span>{filtered.length} rows · {selected.size} employees selected</span><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={!salaryPage} onClick={() => setSalaryPage(p=>p-1)}>Previous</Button><Button size="sm" variant="secondary" disabled={(salaryPage+1)*50>=filtered.length} onClick={() => setSalaryPage(p=>p+1)}>Next</Button></div></div>
      </>}
      {tab === 'Income & expenses' && <>
        <Panel><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Journal and payment records</h2><p className="mt-1 text-xs text-slate-500">Post balanced bookkeeping entries. Correct a posted entry with a reversal and a new entry.</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => download('ledger')} disabled={busy}>Export ledger</Button>{canWrite && <><Button onClick={() => {open('Income');setDialog(d=>({...d,category:'INCOME'}))}}>Record income</Button><Button onClick={() => open('Expense')}>Record expense</Button><Button variant="secondary" onClick={() => open('Journal')}>New journal</Button></>}</div></div></Panel>
        <Table headers={['Entry / date','Company','Type / description','Reference','Amount','Audit / lines','Action']}>
          {!ledger?.entries?.length && <Empty columns={7}>No entries for this month. Record income/expenses or post approved payroll.</Empty>}
          {ledger?.entries?.map(entry => <tr key={entry.id}><TD>#{entry.id}<p className="text-xs text-slate-500">{entry.entry_date}</p></TD><TD>{entry.company}</TD><TD><p className="text-xs font-semibold text-blue-700">{entry.type}</p>{entry.description}</TD><TD>{entry.reference || '—'}</TD><TD>{entry.currency} {money(entry.amount)}</TD><TD><p className="text-xs text-slate-500">{entry.created_by} · {entry.reversal_of ? `Reversal of #${entry.reversal_of}` : entry.reversed_by ? `Reversed by #${entry.reversed_by}`:'Posted'}</p><details className="mt-2"><summary className="cursor-pointer text-xs text-blue-700">View debit / credit lines</summary>{entry.lines?.map(line => <p key={line.id} className="mt-1 text-xs">{line.account_name}: Dr {money(line.debit)} · Cr {money(line.credit)}</p>)}</details></TD><TD>{canWrite && !entry.reversal_of && !entry.reversed_by && <Button size="sm" variant="secondary" disabled={busy} onClick={() => open('Reverse',entry)}>Reverse</Button>}</TD></tr>)}
        </Table>
        <div className="flex items-center justify-between text-sm text-slate-500"><span>{ledger?.total || 0} entries · page {page+1}</span><div className="flex gap-2"><Button size="sm" variant="secondary" disabled={!page || loading} onClick={() => setPage(p=>p-1)}>Previous</Button><Button size="sm" variant="secondary" disabled={loading || (page+1)*50>=(ledger?.total || 0)} onClick={() => setPage(p=>p+1)}>Next</Button></div></div>
      </>}
      {tab === 'Reports' && <>
        <Panel><div className="flex items-center justify-between"><div><h2 className="font-semibold">Profit and loss · {month}</h2><p className="mt-1 text-xs text-slate-500">Posted ledger entries only, including reversals. Unposted payslips are excluded.</p></div><Button variant="secondary" disabled={busy} onClick={() => download('ledger')}>Export reports</Button></div></Panel>
        <Table headers={['Currency','Income','Expenses','Profit / loss']}>
          {!ledger?.profit_loss?.length && <Empty columns={4}>No posted income or expenses for this month.</Empty>}
          {ledger?.profit_loss?.map(row => <tr key={row.currency}><TD>{row.currency}</TD><TD>{money(row.income)}</TD><TD>{money(row.expenses)}</TD><TD className="font-semibold">{money(number(row.income)-number(row.expenses))}</TD></tr>)}
        </Table>
        <Panel><h2 className="font-semibold">Trial balance · through {month}</h2><p className="mt-1 text-xs text-slate-500">Cumulative posted debits and credits, separated by currency.</p></Panel>
        <Table headers={['Currency','Account','Type','Debits','Credits','Debit balance']}>
          {!ledger?.trial_balance?.length && <Empty columns={6}>No posted balances yet.</Empty>}
          {ledger?.trial_balance?.map(row => <tr key={`${row.currency}:${row.code}`}><TD>{row.currency}</TD><TD>{row.name}<p className="text-xs text-slate-500">{row.code}</p></TD><TD>{row.type}</TD><TD>{money(row.debit)}</TD><TD>{money(row.credit)}</TD><TD>{money(row.balance)}</TD></tr>)}
        </Table>
      </>}
      {tab === 'Accounts & payroll' && <>
        <Panel><h2 className="font-semibold">Payroll deduction classifications</h2><p className="mt-1 text-sm text-slate-600">Map configured deductions to {india ? 'Employee PF, TDS, ESI, Professional Tax (PT), Labour Welfare Fund (LWF)' : usa ? 'retirement, federal/state/local tax, Social Security and Medicare' : uk ? 'workplace pension, PAYE, National Insurance and loan deductions' : 'eligible pension / local contributions'}, loan recovery or Other. Employer contributions are read from the payslip snapshot. Use Review deductions on a salary row for imported or incomplete breakdowns.</p><p className="mt-2 text-xs text-amber-700">Review the applicable payroll policy before posting. This page records amounts; country and employee eligibility determine the applicable payroll policy. No rates or deductions are applied automatically.</p></Panel>
        <Table headers={['Deduction','Accounting classification']}>
          {mappings.map(mapping => <tr key={mapping.id}><TD>{mapping.title}</TD><TD><select aria-label={`Classification for ${mapping.title}`} className={inputClass} value={mapping.category} disabled={busy || !canWrite} onChange={e => saveMapping(mapping.id,e.target.value)}><option value="UNCLASSIFIED" disabled>Not classified</option>{!india && ['PF','TDS','IN_ESI','IN_PT','IN_LWF'].includes(mapping.category) && <option value={mapping.category} disabled>Legacy India {mapping.category} — reclassify</option>}{india && mapping.category==='PENSION' && <option value="PENSION" disabled>Legacy pension — reclassify</option>}{(Number(mapping.id)===0 ? [...(india ? [['TDS','TDS']] : usa ? [['US_FEDERAL','Federal income tax']] : uk ? [['UK_PAYE','PAYE income tax']] : []),['OTHER','Other withholding / deductions']] : [...classificationOptions,['LOAN','Loan recovery'],['OTHER','Other deductions']]).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></TD></tr>)}
        </Table>
        <Panel><div className="flex items-center justify-between"><h2 className="font-semibold">Chart of accounts</h2>{canWrite && <Button onClick={() => open('Account')}>Add account</Button>}</div></Panel>
        <Table headers={['Code','Account','Type']}>{accounts.map(account => <tr key={account.code}><TD>{account.code}</TD><TD>{account.name}</TD><TD>{account.type}</TD></tr>)}</Table>
      </>}
    </>}
    <Modal open={!!dialog} onClose={() => {if(!mutating.current)setDialog(null)}} title={dialog?.type === 'Review' ? 'Review salary deductions' : dialog?.type === 'Payment' ? 'Record salary payment' : dialog?.type || ''} size={dialog?.type==='Journal'?'xl':'md'} busy={busy}>
      {dialog && <form onSubmit={submit} className="space-y-4"><fieldset disabled={busy} className="space-y-4">
        {dialog.target && <p className="text-sm font-medium text-slate-700">{dialog.target.employee_name || `Journal #${dialog.target.id}`} {dialog.target.net_pay !== undefined ? `· ${dialog.target.currency} ${money(dialog.target.net_pay)}`:''}</p>}
        {dialog.type === 'Post payroll' && <><p className="text-sm text-slate-600">Post {approved.length} approved/paid payslips from the {selected.size?'selected employees':'current report'} to the ledger. Existing matching postings are preserved. Review deductions and any net additions first.</p><Field label="Account used for already-recorded salary payments"><select value={dialog.account} onChange={e=>patch('account',e.target.value)} className={inputClass}><option value="BANK">Bank</option><option value="CASH">Cash</option></select></Field></>}
        {dialog.type === 'Review' && <><p className="text-sm text-slate-600">Classify the recorded total deductions of {money(dialog.target.deduction)}. The remaining amount becomes Other deductions. This does not change the employee's payslip or net salary. {!india && 'Classify eligible pension and local contributions only. Any legacy Indian PF/TDS must be explicitly reclassified; it is not automatically treated as pension.'}</p><div className="grid grid-cols-2 gap-3">{[...(india ? [['pf','Employee PF'],['employerPf','Employer PF'],['tds','TDS'],['esi','Employee ESI'],['employerEsi','Employer ESI'],['professionalTax','Professional Tax (PT)'],['lwf','Employee LWF'],['employerLwf','Employer LWF'],['gratuityProvision','Gratuity Provision (monthly)']] : [['pension',contributionLabel],['employerPension',employerLabel]]),['employerOther','Other employer contributions'],['loans','Loan recovery'],['lop','Loss of pay'],['attendance','Attendance deductions']].map(([name,label])=><Field key={name} label={label}><input required type="number" min="0" step="0.01" value={dialog[name]} onChange={e=>patch(name,e.target.value)} className={inputClass} /></Field>)}</div>{(usa||uk) && <div className="space-y-3"><h3 className="font-semibold text-sm">{uk?'UK payroll deductions and employer costs':'US payroll taxes'} · recorded amounts</h3><p className="text-xs text-slate-500">{uk?'Verify tax code, NI category, tax year, loan plan and pension treatment. Employer NI and levy are employer costs, separate from employee deductions.':'Verify W-4 elections and applicable state/local rules. Employer unemployment and other costs can be recorded under Other employer contributions.'} Enter zero only when confirmed not applicable.</p><div className="grid grid-cols-2 gap-3">{payrollTaxFields.map(([name,label])=><Field key={name} label={label}><input required type="number" min="0" step="0.01" value={dialog[`${taxPrefix}Taxes`]?.[name] ?? ''} onChange={e=>patch(`${taxPrefix}Taxes`,{...dialog[`${taxPrefix}Taxes`],[name]:e.target.value})} className={inputClass}/></Field>)}</div></div>}<Field label="Review reason / supporting reference"><textarea required maxLength={500} value={dialog.reason} onChange={e=>patch('reason',e.target.value)} className={inputClass} /></Field></>}
        {['Income','Expense','Journal','Payment','Reverse'].includes(dialog.type) && <Field label={dialog.type==='Reverse'?'Reversal date':'Record date'}><input required type="date" min="2000-01-01" max={today()} value={dialog.date} onChange={e=>patch('date',e.target.value)} className={inputClass} /></Field>}
        {['Income','Expense','Journal','Payment'].includes(dialog.type) && <Field label={dialog.type==='Payment'?'Payment reference *':'Invoice / transaction reference'}><input required={dialog.type==='Payment'} maxLength={160} value={dialog.reference} onChange={e=>patch('reference',e.target.value)} className={inputClass} /></Field>}
        {['Income','Expense','Journal'].includes(dialog.type) && <Field label="Description *"><input required maxLength={500} value={dialog.description} onChange={e=>patch('description',e.target.value)} className={inputClass} /></Field>}
        {['Income','Expense'].includes(dialog.type) && <><Field label="Amount *"><input required type="number" min="0.01" step="0.01" value={dialog.amount} onChange={e=>patch('amount',e.target.value)} className={inputClass} /></Field><Field label={dialog.type==='Income'?'Received into / receivable':'Paid from / payable'}><select value={dialog.account} onChange={e=>patch('account',e.target.value)} className={inputClass}>{accountOptions(accounts.filter(account => (dialog.type==='Income'?['BANK','CASH','RECEIVABLES']:['BANK','CASH','PAYABLES']).includes(account.code)))}</select></Field><Field label={dialog.type==='Income'?'Income account':'Expense account'}><select value={dialog.category} onChange={e=>patch('category',e.target.value)} className={inputClass}>{accountOptions(accounts.filter(account => account.type === (dialog.type==='Income'?'INCOME':'EXPENSE')))}</select></Field></>}
        {dialog.type === 'Journal' && <><p className="text-xs text-slate-500">Enter equal debits and credits. Use a journal for transfers, opening balances, receivable/payable settlement or recorded statutory contribution remittances.</p>{dialog.lines.map((line,index)=><div key={index} className="grid grid-cols-3 gap-2"><select aria-label={`Account line ${index+1}`} value={line.account} onChange={e=>patch('lines',dialog.lines.map((l,i)=>i===index?{...l,account:e.target.value}:l))} className={inputClass}>{accountOptions(accounts)}</select>{['debit','credit'].map(side=><input key={side} aria-label={`${side} line ${index+1}`} placeholder={side} type="number" min="0" step="0.01" value={line[side]} onChange={e=>patch('lines',dialog.lines.map((l,i)=>i===index?{...l,[side]:e.target.value}:l))} className={inputClass} />)}</div>)}<Button type="button" variant="secondary" onClick={()=>patch('lines',[...dialog.lines,{account:'GENERAL_EXPENSE',debit:'',credit:''}])}>Add line</Button><p className={Math.abs(balance)>0.005?'text-sm text-red-600':'text-sm text-emerald-700'}>Debit minus credit: {money(balance)}</p></>}
        {dialog.type === 'Payment' && <><Field label="Recorded payment account"><select value={dialog.account} onChange={e=>patch('account',e.target.value)} className={inputClass}><option value="BANK">Bank</option><option value="CASH">Cash</option></select></Field><p className="text-sm text-slate-600">Record a completed payment of the payslip's net amount. This marks the approved payslip Paid and posts salary/payment journals. No bank transfer is initiated.</p></>}
        {dialog.type === 'Reverse' && <><p className="text-sm text-slate-600">Create an opposite journal while retaining the original history. Payslip payment status remains a record of the actual payment.</p><Field label="Reason *"><textarea required maxLength={400} value={dialog.reason} onChange={e=>patch('reason',e.target.value)} className={inputClass} /></Field></>}
        {dialog.type === 'Account' && <><Field label="Account code *"><input required pattern="[A-Z][A-Z0-9_]{1,39}" maxLength={40} placeholder="OFFICE_RENT" value={dialog.code} onChange={e=>patch('code',e.target.value.toUpperCase())} className={inputClass} /></Field><Field label="Account name *"><input required maxLength={120} value={dialog.name} onChange={e=>patch('name',e.target.value)} className={inputClass} /></Field><Field label="Account type"><select value={dialog.accountType} onChange={e=>patch('accountType',e.target.value)} className={inputClass}>{['ASSET','LIABILITY','EQUITY','INCOME','EXPENSE'].map(type=><option key={type}>{type}</option>)}</select></Field></>}
        <div className="flex justify-end gap-2">{!busy && <Button type="button" variant="secondary" onClick={()=>setDialog(null)}>Cancel</Button>}<Button type="submit" disabled={busy || (dialog.type==='Journal' && Math.abs(balance)>0.005)}>{busy?'Saving…':dialog.type==='Payment'?'Record payment':dialog.type==='Post payroll'?'Post to ledger':'Save'}</Button></div>
      </fieldset></form>}
    </Modal>
  </div>
}
