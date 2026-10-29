import { useEffect, useRef, useState } from 'react'
import api from '../../../services/api'

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dubai' }).format(new Date())

export default function AttendancePolicySettings({ employeeId, companyId }) {
  const [policy, setPolicy] = useState(null)
  const [required, setRequired] = useState(true)
  const [effectiveFrom, setEffectiveFrom] = useState(today)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const version = useRef(0)
  const url = `/employees/${employeeId}/attendance-policy`
  const cfg = { headers: { 'X-Company-Id': companyId, 'X-Filter-Company-Id': companyId } }
  useEffect(() => {
    const request = ++version.current
    setPolicy(null); setError(''); setSaved(false); setReason(''); setEffectiveFrom(today())
    api.get(url, { headers: { 'X-Company-Id': companyId, 'X-Filter-Company-Id': companyId } })
      .then(({ data }) => { if (version.current === request) { setPolicy(data); setRequired(data.attendanceRequired) } })
      .catch(err => { if (version.current === request) setError(err.response?.data?.message || 'Unable to load attendance policy. Please retry.') })
    return () => { ++version.current }
  }, [url, companyId])
  async function save(event) {
    event.preventDefault()
    if (saving || !policy) return
    const request = version.current
    setSaving(true); setError(''); setSaved(false)
    try {
      const { data } = await api.post(url, { attendanceRequired: required, effectiveFrom, reason }, cfg)
      if (request === version.current) { setPolicy(data); setReason(''); setSaved(true) }
    } catch (err) {
      if (request === version.current) setError(err.response?.data?.message || 'Unable to save attendance policy')
    } finally { if (request === version.current) setSaving(false) }
  }
  return <section className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
    <h4 className="text-sm font-semibold text-gray-900">Attendance requirement</h4>
    <p className="mt-1 text-sm text-gray-600">Use an exemption for flexible or meeting-only roles. Job title and access role do not automatically grant an exemption. No artificial attendance or working hours are created; leave rules remain unchanged.</p>
    <p className="mt-2 text-xs text-amber-800">Hourly pay and attendance-based earnings still depend on actual recorded hours or attendance. Review the employee’s contract before granting an exemption.</p>
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    {!policy ? <p className="mt-2 text-sm text-gray-500">{error ? 'Reopen this tab to retry.' : 'Loading policy…'}</p> : <>
      <p className="mt-3 text-sm font-medium">Current: {policy.attendanceRequired ? 'Attendance required' : 'Attendance exempt — no daily check-in required'}</p>
      <form onSubmit={save} className="mt-3 space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">New requirement<select disabled={saving} value={String(required)} onChange={e => setRequired(e.target.value === 'true')} className="mt-1 block w-full rounded-lg border bg-white p-2">
            <option value="true">Attendance required</option><option value="false">Attendance exempt</option>
          </select></label>
          <label className="text-sm">Effective from<input required disabled={saving} type="date" min={today()} value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} className="mt-1 block w-full rounded-lg border bg-white p-2" /></label>
        </div>
        <label className="block text-sm">Reason (required)<textarea required disabled={saving} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} placeholder="For example: meeting-only executive role" className="mt-1 block w-full rounded-lg border bg-white p-2" /></label>
        <button disabled={saving || !reason.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save attendance policy'}</button>
        {saved && <p role="status" className="text-sm text-green-700">Policy saved. Future-dated changes apply from their effective date.</p>}
      </form>
      {!!policy.history?.length && <details className="mt-4 text-sm"><summary className="cursor-pointer font-medium">Policy change history</summary><ul className="mt-2 space-y-2">{policy.history.map(entry => <li key={entry.id} className="rounded-lg border bg-white p-2"><strong>{entry.effectiveFrom}: {entry.attendanceRequired ? 'Required' : 'Exempt'}</strong><p>{entry.reason}</p><p className="text-xs text-gray-500">Recorded {entry.createdAt || 'just now'} · user #{entry.changedByUserId}</p></li>)}</ul></details>}
    </>}
  </section>
}
