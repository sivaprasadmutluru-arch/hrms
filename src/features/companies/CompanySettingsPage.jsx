import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchEmailConfig, saveEmailConfig,
  fetchTags, createTag, updateTag, deleteTag,
  fetchPenaltyAccounts, createPenaltyAccount, updatePenaltyAccount, deletePenaltyAccount,
  selectEmailConfig, selectTags, selectPenaltyAccounts, selectBaseExtrasLoading,
} from '../base/baseExtrasSlice'
import { fetchById, updateCurrency } from './companiesSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'
import useCurrency from '../../hooks/useCurrency'

const TABS = ['Email Config', 'Tags', 'Penalty Accounts', 'Currency']
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
    <div className="space-y-6">
      <PageHeader title="Company Settings" subtitle="Email configuration, tags, and penalty accounts" />

      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Email Config' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
          <h3 className="text-base font-semibold text-gray-800 mb-4">SMTP Email Configuration</h3>
          <form onSubmit={emailForm.handleSubmit(onSaveEmailConfig)} className="space-y-4">
            <Input label="Host" {...emailForm.register('host')} />
            <Input label="Port" type="number" {...emailForm.register('port')} />
            <Input label="Username" {...emailForm.register('username')} />
            <Input label="Password" type="password" placeholder="Leave blank to keep existing" {...emailForm.register('password')} />
            <Input label="From Email" {...emailForm.register('fromEmail')} />
            <Input label="From Name" {...emailForm.register('fromName')} />
            <div className="grid grid-cols-3 gap-4">
              {[['useTls', 'Use TLS'], ['useSsl', 'Use SSL'], ['isActive', 'Active']].map(([field, label]) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" {...emailForm.register(field)}>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                </div>
              ))}
            </div>
            <div className="flex justify-end"><Button type="submit" disabled={loading}>Save Config</Button></div>
          </form>
        </div>
      )}

      {tab === 'Tags' && (
        <div className="space-y-4">
          <div className="flex justify-end"><Button onClick={openCreateTag}>+ Add Tag</Button></div>
          <DataTable columns={tagColumns} data={tags} loading={loading} />
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
          <div className="flex justify-end"><Button onClick={openCreatePenalty}>+ Add Penalty Account</Button></div>
          <DataTable columns={penaltyColumns} data={penaltyAccounts} loading={loading} />
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
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-6">
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-1">Branch Currency</h3>
            <p className="text-sm text-gray-500">
              Set the currency for this branch. Select from the list or type any valid ISO 4217 currency code (e.g. <span className="font-mono">OMR</span>, <span className="font-mono">XOF</span>).
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Currency Code</label>
            <input
              list="currency-list"
              value={currencyInput}
              onChange={e => setCurrencyInput(e.target.value.toUpperCase())}
              placeholder="e.g. USD, INR, EUR"
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono uppercase"
            />
            <datalist id="currency-list">
              {COMMON_CURRENCIES.map(c => (
                <option key={c.code} value={c.code}>{c.code} — {c.name}</option>
              ))}
            </datalist>
            <p className="text-xs text-gray-400">Start typing to filter, or enter any ISO 4217 code directly.</p>
          </div>

          {currencyInput && (
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 p-4">
              <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wide mb-1">Preview</p>
              <p className="text-2xl font-bold text-indigo-800">{currencyPreview(currencyInput.trim())}</p>
              <p className="text-xs text-indigo-400 mt-1">How amounts will appear across payroll</p>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={onSaveCurrency} disabled={currencySaving}>
              {currencySaving ? 'Saving...' : 'Save Currency'}
            </Button>
          </div>
        </div>
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
