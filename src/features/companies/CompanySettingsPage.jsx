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
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'

const TABS = ['Email Config', 'Tags', 'Penalty Accounts']
const DEDUCT_FROM = ['SALARY', 'LEAVE', 'BONUS']

export default function CompanySettingsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const companyId = user?.companyId
  const loading = useSelector(selectBaseExtrasLoading)
  const emailConfig = useSelector(selectEmailConfig)
  const tags = useSelector(selectTags)
  const penaltyAccounts = useSelector(selectPenaltyAccounts)

  const [tab, setTab] = useState('Email Config')
  const [tagModal, setTagModal] = useState(false)
  const [editingTag, setEditingTag] = useState(null)
  const [penaltyModal, setPenaltyModal] = useState(false)
  const [editingPenalty, setEditingPenalty] = useState(null)

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

  const onSaveEmailConfig = async (data) => {
    try {
      await dispatch(saveEmailConfig({
        companyId,
        data: { ...data, useTls: data.useTls === 'true', useSsl: data.useSsl === 'true', isActive: data.isActive === 'true' }
      })).unwrap()
      toast.success('Email config saved')
    } catch (e) { toast.error(e || 'Error') }
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
  const handleDeleteTag = async (id) => {
    if (!window.confirm('Delete tag?')) return
    try { await dispatch(deleteTag(id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Error') }
  }

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
  const handleDeletePenalty = async (id) => {
    if (!window.confirm('Delete penalty account?')) return
    try { await dispatch(deletePenaltyAccount(id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Error') }
  }

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
    { accessorKey: 'deductionAmount', header: 'Amount', cell: ({ getValue }) => getValue() ? `$${getValue()}` : '—' },
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
    </div>
  )
}
