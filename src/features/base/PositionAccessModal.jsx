import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import toast from 'react-hot-toast'
import { ShieldCheck } from 'lucide-react'
import api from '../../services/api'
import { fetchMe } from '../auth/authSlice'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'
import Spinner from '../../components/common/Spinner'
import './PositionAccessModal.css'

const LABELS = { NONE: 'Existing roles only', CEO: 'CEO · full organization access', COO: 'COO · operations access', EMPLOYEE: 'Employee · self service' }
const date = value => new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })

export default function PositionAccessModal({ position, onClose }) {
  const dispatch = useDispatch()
  const [data, setData] = useState(null)
  const [profile, setProfile] = useState('NONE')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const companyId = position.company?.id
  const path = `/companies/${companyId}/job-positions/${position.id}/access`
  useEffect(() => {
    let active = true
    api.get(path).then(({ data: result }) => { if (active) { setData(result); setProfile(result.policy.profile) } })
      .catch(err => { if (active) setError(err.response?.data?.message || 'Could not load position access') })
    return () => { active = false }
  }, [path])
  const save = async () => {
    if (!data || saving || !confirmed) return
    setSaving(true)
    try {
      await api.put(path, { profile, version: data.policy.version })
      await dispatch(fetchMe())
      toast.success('Position access updated')
      onClose()
    } catch (err) { setError(err.response?.data?.message || 'Could not save position access') }
    finally { setSaving(false) }
  }
  const choice = data?.profiles.find(item => item.id === profile)
  const changed = data && data.policy.profile !== profile
  return <Modal open onClose={() => { if (!saving) onClose() }} title={`Access · ${position.name}`} size="lg" panelClassName="position-access-modal" footer={<div className="flex justify-end gap-2"><Button variant="secondary" disabled={saving} onClick={onClose}>Cancel</Button><Button disabled={!changed || !confirmed || saving} loading={saving} onClick={save}>Save access</Button></div>}>
    <div className="space-y-5">
      <p className="text-sm text-slate-600">Choose the access granted to employees assigned to this position. A title alone grants no permissions.</p>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!data && !error && <Spinner />}
      {data && <>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-700"><strong>{data.employeesAffected} active employee{data.employeesAffected === 1 ? '' : 's'} affected</strong><p className="mt-1">{position.company?.name || `Company ${companyId}`} · Changes take effect on subsequent requests.</p></div>
        <fieldset className="space-y-2"><legend className="mb-2 text-sm font-semibold text-slate-800">Position access profile</legend>{data.profiles.map(item => <label key={item.id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${profile === item.id ? 'border-blue-500 bg-blue-50/60' : 'border-slate-200'}`}><input type="radio" name="positionAccess" value={item.id} checked={profile === item.id} onChange={() => { setProfile(item.id); setConfirmed(false) }} disabled={saving} className="mt-1" /><span><strong className="block text-sm text-slate-800">{LABELS[item.id]}</strong><span className="mt-1 block text-xs leading-relaxed text-slate-600">{item.description}</span><span className="mt-1 block text-xs text-slate-500">Scope: {item.id === 'NONE' ? 'unchanged' : item.scope === 'ENTERPRISE' ? 'head office and all branches in the employee’s organization' : 'own records only'}</span></span></label>)}</fieldset>
        <div className="flex gap-2 rounded-xl bg-amber-50 p-4 text-xs leading-relaxed text-amber-900"><ShieldCheck size={18} className="shrink-0" /><p>Position permissions supplement existing roles. Broader explicit administrator or finance roles remain effective. Only explicitly assigned company or platform administrators can change profiles or assign an access-bearing position.</p></div>
        {changed && <label className="flex gap-3 text-sm text-slate-700"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} disabled={saving} className="mt-1" /><span>Apply <strong>{LABELS[profile]}</strong> to this position and its {data.employeesAffected} active employee{data.employeesAffected === 1 ? '' : 's'}. {choice?.scope === 'ENTERPRISE' && 'This grants access across their organization.'}</span></label>}
        {!!data.history.length && <section className="border-t border-slate-100 pt-4"><h3 className="mb-2 text-sm font-semibold">Recent access changes</h3><ul className="space-y-2 text-xs text-slate-600">{data.history.map((item, index) => <li key={index}>{item.actor}: {item.old_profile} → {item.new_profile}<span className="block text-slate-400">{date(item.changed_at)} IST</span></li>)}</ul></section>}
      </>}
    </div>
  </Modal>
}
