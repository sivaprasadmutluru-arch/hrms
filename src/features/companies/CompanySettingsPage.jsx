import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Settings2, Mail, Tags as TagsIcon, ShieldAlert, CircleDollarSign, Eye, Landmark, LockKeyhole, Send, Sparkles } from 'lucide-react'
import {
  fetchEmailConfig, saveEmailConfig,
  fetchTags, createTag, updateTag, deleteTag,
  fetchPenaltyAccounts, createPenaltyAccount, updatePenaltyAccount, deletePenaltyAccount,
  selectEmailConfig, selectTags, selectPenaltyAccounts, selectBaseExtrasLoading,
} from '../base/baseExtrasSlice'
import { fetchById, updateCurrency } from './companiesSlice'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'
import useCurrency from '../../hooks/useCurrency'
import api from '../../services/api'

const TABS = ['Email Config', 'Tags', 'Penalty Accounts', 'Currency', 'Module Visibility']
const TAB_META = {
  'Email Config': { icon: Mail, note: 'SMTP delivery' },
  Tags: { icon: TagsIcon, note: 'People labels' },
  'Penalty Accounts': { icon: ShieldAlert, note: 'Deductions' },
  Currency: { icon: CircleDollarSign, note: 'Payroll display' },
  'Module Visibility': { icon: Eye, note: 'Workspace access' },
}
const DEDUCT_FROM = ['SALARY', 'LEAVE', 'BONUS']

const COMMON_CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'QAR', name: 'Qatari Riyal' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
  { code: 'BHD', name: 'Bahraini Dinar' },
  { code: 'OMR', name: 'Omani Rial' },
  { code: 'SGD', name: 'Singapore Dollar' },
  { code: 'MYR', name: 'Malaysian Ringgit' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'CAD', name: 'Canadian Dollar' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', name: 'Chinese Yuan' },
  { code: 'PKR', name: 'Pakistani Rupee' },
  { code: 'BDT', name: 'Bangladeshi Taka' },
  { code: 'LKR', name: 'Sri Lankan Rupee' },
  { code: 'NGN', name: 'Nigerian Naira' },
  { code: 'KES', name: 'Kenyan Shilling' },
  { code: 'ZAR', name: 'South African Rand' },
  { code: 'BRL', name: 'Brazilian Real' },
  { code: 'MXN', name: 'Mexican Peso' },
  { code: 'IDR', name: 'Indonesian Rupiah' },
  { code: 'PHP', name: 'Philippine Peso' },
  { code: 'THB', name: 'Thai Baht' },
  { code: 'VND', name: 'Vietnamese Dong' },
  { code: 'EGP', name: 'Egyptian Pound' },
]

function currencyPreview(code) {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: code }).format(1234.56)
  } catch {
    return `${code} 1,234.56`
  }
}

export default function CompanySettingsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const { currency: activeCurrency } = useCurrency()
  const selectedCompanyId = useSelector(s => s.auth.selectedCompanyId)
  const companyId = selectedCompanyId ?? user?.companyId
  const loading = useSelector(selectBaseExtrasLoading)
  const emailConfig = useSelector(selectEmailConfig)
  const tags = useSelector(selectTags)
  const penaltyAccounts = useSelector(selectPenaltyAccounts)

  const [tab, setTab] = useState('Email Config')
  const [tagModal, setTagModal] = useState(false)
  const [editingTag, setEditingTag] = useState(null)
  const [penaltyModal, setPenaltyModal] = useState(false)
  const [editingPenalty, setEditingPenalty] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, action: null })

  // Currency tab state
  const [currencyInput, setCurrencyInput] = useState(activeCurrency)
  const [currencySaving, setCurrencySaving] = useState(false)
  const [moduleVisibility, setModuleVisibility] = useState(null)
  const [modulesLoading, setModulesLoading] = useState(false)
  const [modulesSaving, setModulesSaving] = useState(false)

  const emailForm = useForm()
  const { register: regTag, handleSubmit: handleTagSubmit, reset: resetTag, formState: { errors: errTag } } = useForm()
  const { register: regPenalty, handleSubmit: handlePenaltySubmit, reset: resetPenalty, formState: { errors: errPenalty } } = useForm()

  useEffect(() => {
    if (!companyId) return
    dispatch(fetchEmailConfig(companyId))
    dispatch(fetchTags())
    dispatch(fetchPenaltyAccounts())
  }, [dispatch, companyId])

  useEffect(() => {
    if (emailConfig) {
      emailForm.reset({
        host: emailConfig.host || '',
        port: emailConfig.port || '',
        username: emailConfig.username || '',
        fromEmail: emailConfig.fromEmail || '',
        fromName: emailConfig.fromName || '',
        useTls: emailConfig.useTls ? 'true' : 'false',
        useSsl: emailConfig.useSsl ? 'true' : 'false',
        isActive: emailConfig.isActive ? 'true' : 'false',
      })
    }
  }, [emailConfig])

  // Sync currency input when active company changes
  useEffect(() => {
    setCurrencyInput(activeCurrency)
  }, [activeCurrency])

  useEffect(() => {
    if (tab !== 'Module Visibility' || !companyId) return
    let active = true
    setModuleVisibility(null)
    setModulesLoading(true)
    api.get('/settings/module-visibility', { params: { companyId } })
      .then(({ data }) => { if (active) setModuleVisibility(data) })
      .catch(err => { if (active) toast.error(err.response?.data?.message || 'Failed to load module visibility') })
      .finally(() => { if (active) setModulesLoading(false) })
    return () => { active = false }
  }, [tab, companyId])

  const onSaveEmailConfig = async (data) => {
    try {
      await dispatch(saveEmailConfig({
        companyId,
        data: { ...data, useTls: data.useTls === 'true', useSsl: data.useSsl === 'true', isActive: data.isActive === 'true' }
      })).unwrap()
      toast.success('Email config saved')
    } catch (e) { toast.error(e || 'Error') }
  }

  const onSaveCurrency = async () => {
    const code = currencyInput.trim().toUpperCase()
    if (!code) return toast.error('Enter a currency code')
    try {
      setCurrencySaving(true)
      await dispatch(updateCurrency({ id: companyId, currency: code })).unwrap()
      // Refresh company list so useCurrency hook picks up the new value
      dispatch(fetchById(companyId))
      toast.success(`Currency updated to ${code}`)
    } catch (e) {
      toast.error(e || 'Failed to save currency')
    } finally {
      setCurrencySaving(false)
    }
  }

  const onSaveModuleVisibility = async () => {
    if (!companyId || !moduleVisibility) return
    try {
      setModulesSaving(true)
      const { data } = await api.post('/settings/module-visibility', moduleVisibility, { params: { companyId } })
      setModuleVisibility(data)
      toast.success('Module visibility saved')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save module visibility')
    } finally {
      setModulesSaving(false)
    }
  }

  const openCreateTag = () => { setEditingTag(null); resetTag({}); setTagModal(true) }
  const openEditTag = (t) => { setEditingTag(t); resetTag({ name: t.name, color: t.color }); setTagModal(true) }
  const onSubmitTag = async (data) => {
    try {
      if (editingTag) {
        await dispatch(updateTag({ id: editingTag.id, data })).unwrap()
        toast.success('Tag updated')
      } else {
        await dispatch(createTag({ ...data, company: { id: companyId } })).unwrap()
        toast.success('Tag created')
      }
      setTagModal(false)
    } catch (e) { toast.error(e || 'Error') }
  }
  const handleDeleteTag = (id) => setConfirmModal({ open: true, id, action: 'tag' })

  const openCreatePenalty = () => { setEditingPenalty(null); resetPenalty({}); setPenaltyModal(true) }
  const openEditPenalty = (p) => { setEditingPenalty(p); resetPenalty({ title: p.title, deductFrom: p.deductFrom, deductionAmount: p.deductionAmount, description: p.description }); setPenaltyModal(true) }
  const onSubmitPenalty = async (data) => {
    try {
      if (editingPenalty) {
        await dispatch(updatePenaltyAccount({ id: editingPenalty.id, data })).unwrap()
        toast.success('Penalty account updated')
      } else {
        await dispatch(createPenaltyAccount({ ...data, company: { id: companyId } })).unwrap()
        toast.success('Penalty account created')
      }
      setPenaltyModal(false)
    } catch (e) { toast.error(e || 'Error') }
  }
  const handleDeletePenalty = (id) => setConfirmModal({ open: true, id, action: 'penalty' })
  const onConfirmDelete = async () => {
    const { id, action } = confirmModal
    try {
      if (action === 'tag') { await dispatch(deleteTag(id)).unwrap(); toast.success('Deleted') }
      else if (action === 'penalty') { await dispatch(deletePenaltyAccount(id)).unwrap(); toast.success('Deleted') }
    } catch (e) { toast.error(e || 'Error') }
    finally { setConfirmModal({ open: false, id: null, action: null }) }
  }

  const { format } = useCurrency()

  const tagColumns = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'color', header: 'Color', cell: ({ getValue }) => getValue()
      ? <span className="inline-flex items-center gap-2"><span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: getValue() }} />{getValue()}</span>
      : '—' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEditTag(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDeleteTag(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  const penaltyColumns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'deductFrom', header: 'Deduct From' },
    { accessorKey: 'deductionAmount', header: 'Amount', cell: ({ getValue }) => getValue() ? format(getValue()) : '—' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEditPenalty(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDeletePenalty(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6 pb-8">
      <section className="relative isolate overflow-hidden rounded-[26px] border border-[#D8E8F7] bg-gradient-to-br from-[#FFFFFF] via-[#F3F9FF] to-[#FFF9E5] p-6 shadow-[0_14px_34px_rgba(43,91,139,0.08)] sm:p-8">
        <div aria-hidden="true" className="absolute -right-12 -top-20 -z-10 h-64 w-64 rounded-full bg-[#D9EBFF]/70 blur-3xl" />
        <div aria-hidden="true" className="absolute -bottom-24 right-1/3 -z-10 h-48 w-48 rounded-full bg-[#FFE9A8]/55 blur-3xl" />
        <div className="flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2F73B7] to-[#5AA3E6] text-white shadow-lg shadow-blue-900/15 ring-4 ring-white/70">
              <Settings2 className="h-6 w-6" />
            </span>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[.2em] text-[#B18A2B]">Company workspace</p>
              <h1 className="text-2xl font-bold tracking-tight text-[#173858] sm:text-[28px]">Company settings</h1>
              <p className="mt-1 max-w-2xl text-sm text-[#647B95]">Configure delivery, payroll preferences and the tools available to your team.</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white bg-white/85 px-3.5 py-2 text-xs font-semibold text-[#45627F] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" /> Workspace controls
          </div>
        </div>
      </section>

      <div role="tablist" aria-label="Company settings sections" className="flex gap-2 overflow-x-auto rounded-2xl border border-[#DDE9F4] bg-white/90 p-2 shadow-[0_6px_18px_rgba(39,87,138,0.05)]">
        {TABS.map(t => {
          const Icon = TAB_META[t].icon
          const selected = tab === t
          return (
            <button key={t} role="tab" aria-selected={selected} onClick={() => setTab(t)}
              className={`group flex min-w-fit items-center gap-3 rounded-xl px-4 py-3 text-left transition-all ${selected ? 'bg-gradient-to-r from-[#2367A8] to-[#438DD1] text-white shadow-md shadow-blue-900/15' : 'text-[#506B86] hover:bg-[#F0F7FF] hover:text-[#1F5E99]'}`}>
              <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${selected ? 'bg-white/15 text-[#FFE28E]' : 'bg-[#EDF5FF] text-[#3479BC] group-hover:bg-[#E4F0FF]'}`}><Icon className="h-[18px] w-[18px]" /></span>
              <span className="grid gap-0.5"><span className="text-sm font-semibold">{t}</span><span className={`text-[10px] ${selected ? 'text-blue-100' : 'text-[#8A9BAE]'}`}>{TAB_META[t].note}</span></span>
            </button>
          )
        })}
      </div>

      {tab === 'Email Config' && (
        <section className="mx-auto w-full max-w-[1480px] overflow-hidden rounded-2xl border border-[#DCE8F4] bg-white shadow-[0_12px_30px_rgba(39,87,138,0.07)]">
          <div className="flex items-start gap-3 border-b border-[#E7EFF7] bg-gradient-to-r from-[#F3F9FF] via-white to-[#FFFAE9] px-6 py-5 sm:px-7">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F3FF] text-[#2F73B7]"><Mail className="h-5 w-5" /></span>
            <div><h2 className="text-base font-bold text-[#173858]">SMTP email configuration</h2><p className="mt-1 text-sm text-[#71869C]">Set the sender and secure delivery details for company email.</p></div>
          </div>
          <form onSubmit={emailForm.handleSubmit(onSaveEmailConfig)} className="grid grid-cols-1 gap-6 p-6 sm:p-7 xl:grid-cols-[minmax(0,1.6fr)_minmax(290px,.8fr)]">
            <div className="space-y-6">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input label="SMTP host" {...emailForm.register('host')} />
              <Input label="Port" type="number" {...emailForm.register('port')} />
              <Input label="Username" {...emailForm.register('username')} />
              <Input label="Password" type="password" placeholder="Leave blank to keep existing" {...emailForm.register('password')} />
              <Input label="From email" {...emailForm.register('fromEmail')} />
              <Input label="From name" {...emailForm.register('fromName')} />
            </div>
            <div className="rounded-2xl border border-[#E4EDF6] bg-[#F8FBFF] p-4 sm:p-5">
              <div className="mb-4 flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-[#3479BC]" /><h3 className="text-sm font-semibold text-[#2C4968]">Connection security</h3></div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[['useTls', 'Use TLS'], ['useSsl', 'Use SSL'], ['isActive', 'Active']].map(([field, label]) => (
                <label key={field} className="block rounded-xl border border-[#E2EBF4] bg-white p-3">
                  <span className="mb-1.5 block text-xs font-semibold text-[#526A83]">{label}</span>
                  <select className="block w-full rounded-lg border border-[#D7E3EF] bg-[#FBFDFF] px-3 py-2 text-sm text-[#304D69] focus:border-[#438DD1] focus:outline-none focus:ring-2 focus:ring-[#438DD1]/15" {...emailForm.register(field)}>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </label>
              ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EAF0F6] pt-5">
              <p className="text-xs text-[#8495A8]">Your SMTP password is kept private.</p>
              <Button type="submit" disabled={loading}><span className="inline-flex items-center gap-2"><Send className="h-4 w-4" />Save email settings</span></Button>
            </div>
            </div>
            <aside className="flex flex-col rounded-2xl border border-[#DCE9F5] bg-gradient-to-br from-[#F1F8FF] via-white to-[#FFF9E5] p-5 sm:p-6">
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-white text-[#3479BC] shadow-sm ring-1 ring-[#DCE9F5]"><Mail className="h-5 w-5" /></span>
              <h3 className="text-base font-bold text-[#244664]">SMTP setup guide</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#71869C]">Have these details ready from your email provider before saving.</p>
              <ol className="mt-5 space-y-4">
                {[
                  ['Mail server', 'Enter the SMTP host and port provided by your email service.'],
                  ['Sign-in details', 'Use the mail account credentials allowed to send company email.'],
                  ['Sender identity', 'Choose a from address your provider has verified.'],
                ].map(([title, detail], index) => (
                  <li key={title} className="flex gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-[#3479BC] shadow-sm ring-1 ring-[#D8E7F5]">{index + 1}</span>
                    <span><strong className="block text-xs font-semibold text-[#3D5873]">{title}</strong><span className="mt-0.5 block text-xs leading-relaxed text-[#7D90A4]">{detail}</span></span>
                  </li>
                ))}
              </ol>
              <div className="mt-auto flex items-center gap-2 border-t border-[#DCE8F4] pt-4 text-xs text-[#6C8299]"><LockKeyhole className="h-4 w-4 shrink-0 text-[#3479BC]" />Credentials are stored securely.</div>
            </aside>
          </form>
        </section>
      )}

      {tab === 'Module Visibility' && (
        <section className="mx-auto w-full max-w-[1480px] overflow-hidden rounded-2xl border border-[#DCE8F4] bg-white shadow-[0_12px_30px_rgba(39,87,138,0.07)]">
          <div className="border-b border-[#E7EFF7] bg-gradient-to-r from-[#F3F9FF] via-white to-[#FFFAE9] px-6 py-5 sm:px-7">
            <div className="flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E8F3FF] text-[#2F73B7]"><Eye className="h-5 w-5" /></span><div><h2 className="text-base font-bold text-[#173858]">Visible modules</h2><p className="mt-1 text-sm text-[#71869C]">Choose which tools appear in this company’s web and mobile navigation.</p></div></div>
          </div>
          <div className="grid gap-3 p-6 sm:grid-cols-2 sm:p-7 lg:grid-cols-3">
            {[
              ['payslips', 'Payslips', 'Employee access to monthly pay statements', Landmark],
              ['loans', 'Loans', 'Loan balances and repayment tools', CircleDollarSign],
              ['reimbursements', 'Reimbursements', 'Employee expense claims and tracking', Sparkles],
            ].map(([key, label, description, Icon]) => (
              <label key={key} className="flex min-h-36 cursor-pointer flex-col justify-between rounded-2xl border border-[#DDE9F5] bg-gradient-to-br from-white to-[#F5F9FF] p-4 transition hover:-translate-y-0.5 hover:border-[#B9D5EF] hover:shadow-md">
                <span className="flex items-start justify-between gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EAF4FF] text-[#3479BC]"><Icon className="h-5 w-5" /></span><input type="checkbox" checked={moduleVisibility?.[key] !== false} disabled={modulesLoading || modulesSaving || !moduleVisibility} onChange={e => setModuleVisibility(value => ({ ...value, [key]: e.target.checked }))} className="mt-1 h-4 w-4 accent-[#2F73B7]" /></span>
                <span><span className="block text-sm font-semibold text-[#294762]">{label}</span><span className="mt-1 block text-xs leading-relaxed text-[#7A8EA3]">{description}</span></span>
              </label>
            ))}
          </div>
          <div className="flex justify-end border-t border-[#EAF0F6] bg-[#FBFDFF] px-6 py-4 sm:px-7"><Button onClick={onSaveModuleVisibility} disabled={modulesLoading || modulesSaving || !moduleVisibility}>{modulesSaving ? 'Saving…' : 'Save visibility'}</Button></div>
        </section>
      )}

      {tab === 'Tags' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#DCE8F4] bg-gradient-to-r from-white via-[#F5FAFF] to-[#FFFBEA] p-5 shadow-sm">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F3FF] text-[#3479BC]"><TagsIcon className="h-5 w-5" /></span><div><h2 className="text-base font-bold text-[#173858]">People tags</h2><p className="mt-0.5 text-sm text-[#71869C]">Create consistent labels for organizing your workforce.</p></div></div>
            <Button onClick={openCreateTag}>+ Add tag</Button>
          </div>
          <div className="rounded-2xl border border-[#DCE8F4] bg-white p-4 shadow-[0_10px_26px_rgba(39,87,138,0.06)] sm:p-5"><DataTable columns={tagColumns} data={tags} loading={loading} /></div>
          <Modal open={tagModal} onClose={() => setTagModal(false)} title={editingTag ? 'Edit Tag' : 'Add Tag'}
            footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setTagModal(false)}>Cancel</Button><Button onClick={handleTagSubmit(onSubmitTag)}>{editingTag ? 'Update' : 'Create'}</Button></div>}>
            <div className="space-y-4">
              <Input label="Name" error={errTag.name?.message} {...regTag('name', { required: 'Required' })} />
              <Input label="Color (hex)" placeholder="#4f46e5" {...regTag('color')} />
            </div>
          </Modal>
        </div>
      )}

      {tab === 'Penalty Accounts' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#DCE8F4] bg-gradient-to-r from-white via-[#F5FAFF] to-[#FFFBEA] p-5 shadow-sm">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF3D1] text-[#A87B17]"><ShieldAlert className="h-5 w-5" /></span><div><h2 className="text-base font-bold text-[#173858]">Penalty accounts</h2><p className="mt-0.5 text-sm text-[#71869C]">Manage policy-based deductions and their amounts.</p></div></div>
            <Button onClick={openCreatePenalty}>+ Add penalty account</Button>
          </div>
          <div className="rounded-2xl border border-[#DCE8F4] bg-white p-4 shadow-[0_10px_26px_rgba(39,87,138,0.06)] sm:p-5"><DataTable columns={penaltyColumns} data={penaltyAccounts} loading={loading} /></div>
          <Modal open={penaltyModal} onClose={() => setPenaltyModal(false)} title={editingPenalty ? 'Edit Penalty Account' : 'Add Penalty Account'}
            footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setPenaltyModal(false)}>Cancel</Button><Button onClick={handlePenaltySubmit(onSubmitPenalty)}>{editingPenalty ? 'Update' : 'Create'}</Button></div>}>
            <div className="space-y-4">
              <Input label="Title" error={errPenalty.title?.message} {...regPenalty('title', { required: 'Required' })} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Deduct From</label>
                <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  {...regPenalty('deductFrom')}>
                  {DEDUCT_FROM.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <Input label="Deduction Amount" type="number" step="0.01" {...regPenalty('deductionAmount')} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3} {...regPenalty('description')} />
              </div>
            </div>
          </Modal>
        </div>
      )}

      {tab === 'Currency' && (
        <section className="mx-auto w-full max-w-[1480px] overflow-hidden rounded-2xl border border-[#DCE8F4] bg-white shadow-[0_12px_30px_rgba(39,87,138,0.07)]">
          <div className="flex items-start gap-3 border-b border-[#E7EFF7] bg-gradient-to-r from-[#F3F9FF] via-white to-[#FFFAE9] px-6 py-5 sm:px-7">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF3D1] text-[#A87B17]"><CircleDollarSign className="h-5 w-5" /></span>
            <div><h2 className="text-base font-bold text-[#173858]">Branch currency</h2><p className="mt-1 text-sm text-[#71869C]">Choose how payroll amounts are formatted for this company.</p></div>
          </div>
          <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_minmax(260px,.75fr)] sm:p-7">
          <div className="space-y-5">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-[#35516E]">Currency code</label>
            <input
              list="currency-list"
              value={currencyInput}
              onChange={e => setCurrencyInput(e.target.value.toUpperCase())}
              placeholder="e.g. USD, INR, EUR"
              className="block w-full rounded-xl border border-[#D7E3EF] bg-[#FBFDFF] px-4 py-3 text-sm font-mono uppercase text-[#294762] shadow-sm focus:border-[#438DD1] focus:outline-none focus:ring-2 focus:ring-[#438DD1]/15"
            />
            <datalist id="currency-list">
              {COMMON_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </datalist>
            <p className="text-xs text-[#8495A8]">Start typing to filter, or enter any valid ISO 4217 code.</p>
          </div>
          <div className="rounded-2xl border border-[#DCE9F5] bg-gradient-to-br from-[#F0F7FF] via-white to-[#FFF8DE] p-5">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-[#A78329]">Payroll preview</p>
            <p className="mt-2 text-3xl font-bold tracking-tight text-[#1C4E7D]">{currencyInput ? currencyPreview(currencyInput.trim()) : '—'}</p>
            <p className="mt-1 text-xs text-[#71869C]">Example formatting across payroll</p>
          </div>
          </div>
          <aside className="flex flex-col justify-between gap-5 rounded-2xl border border-[#E3ECF5] bg-[#FBFDFF] p-5">
            <div><div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#E9F3FF] text-[#3479BC]"><Landmark className="h-5 w-5" /></div><h3 className="text-sm font-bold text-[#294762]">One currency, clear records</h3><p className="mt-1 text-sm leading-relaxed text-[#71869C]">Currency changes apply to amount displays across payroll for this company.</p></div>
            <Button onClick={onSaveCurrency} disabled={currencySaving}>{currencySaving ? 'Saving...' : 'Save currency'}</Button>
          </aside>
          </div>
        </section>
      )}


      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null, action: null })}
        onConfirm={onConfirmDelete}
        title={confirmModal.action === 'tag' ? 'Delete Tag' : 'Delete Penalty Account'}
        message={confirmModal.action === 'tag' ? 'Are you sure you want to delete this tag?' : 'Are you sure you want to delete this penalty account?'}
        confirmLabel="Delete"
        loading={loading}
      />
    </div>
  )
}
