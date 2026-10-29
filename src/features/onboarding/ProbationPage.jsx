import { useEffect, useRef, useState } from 'react'
import api from '../../services/api'
import useAuth from '../../hooks/useAuth'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import toast from 'react-hot-toast'
import { formatDate } from '../../utils/formatters'

const labels = {
  CONFIRMED: 'Confirmed', ON_PROBATION: 'On probation', AWAITING_PROCESSING: 'Awaiting automatic confirmation',
  JOINING_DATE_REQUIRED: 'Joining date required', NOT_COVERED: 'Not covered by this policy',
}

export default function ProbationPage() {
  const { effectiveCompanyId, isPlatformAdmin, isEnterpriseAdmin, isHRManager } = useAuth()
  const [policy, setPolicy] = useState(null)
  const [employees, setEmployees] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const selectedCompany = useRef(effectiveCompanyId)
  selectedCompany.current = effectiveCompanyId
  const canEdit = isPlatformAdmin() || isEnterpriseAdmin() || isHRManager()

  useEffect(() => {
    let active = true
    setPolicy(null); setEmployees([]); setError('')
    if (!effectiveCompanyId) return
    Promise.all([
      api.get(`/onboarding/probation/${effectiveCompanyId}/policy`),
      api.get(`/onboarding/probation/${effectiveCompanyId}/employees`),
    ]).then(([settings, staff]) => {
      if (active) { setPolicy(settings.data); setEmployees(staff.data) }
    }).catch(err => { if (active) setError(err.response?.data?.message || 'Unable to load probation settings') })
    return () => { active = false }
  }, [effectiveCompanyId])

  async function save() {
    if (!policy.effectiveFrom) { toast.error('Select the earliest joining date covered by this policy'); return }
    setSaving(true)
    const companyId = effectiveCompanyId
    try {
      const { data } = await api.put(`/onboarding/probation/${companyId}/policy`, policy)
      const staff = await api.get(`/onboarding/probation/${companyId}/employees`)
      if (selectedCompany.current !== companyId) return
      setPolicy(data); setEmployees(staff.data)
      toast.success('Probation policy saved')
    } catch (err) { toast.error(err.response?.data?.message || 'Unable to save probation policy') }
    finally { setSaving(false) }
  }

  if (!effectiveCompanyId) return <p className="p-5 text-gray-600">Select a company to view its probation policy.</p>
  if (error) return <p role="alert" className="p-5 text-red-600">{error}</p>
  if (!policy) return <p className="p-5 text-gray-500">Loading probation policy…</p>

  return <div className="space-y-5">
    <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
      <h2 className="text-lg font-semibold">Automatic probation confirmation</h2>
      <p className="text-sm text-gray-600">Employees complete probation six calendar months after their joining date. The system checks hourly and confirms eligible employees automatically, including after a server outage.</p>
      <label className="flex gap-2 items-center text-sm font-medium">
        <input type="checkbox" checked={policy.enabled} disabled={!canEdit || saving} onChange={e => setPolicy({ ...policy, enabled: e.target.checked })} />
        Enable automatic confirmation for this company
      </label>
      <div className="max-w-sm"><Input label="Apply to employees joining on or after" type="date" value={policy.effectiveFrom || ''}
        disabled={!canEdit || saving} onChange={e => setPolicy({ ...policy, effectiveFrom: e.target.value })} /></div>
      <p className="text-sm text-gray-600">Monthly leave starts accruing from confirmation, with the first partial month prorated. Upfront leave follows the leave type’s annual entitlement and proration settings. Existing balances are preserved. Earlier joiners keep their existing leave policy.</p>
      {canEdit && <Button disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save policy'}</Button>}
    </div>
    <Input placeholder="Search employee" aria-label="Search employee" value={search} onChange={e => setSearch(e.target.value)} />
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-50"><tr>{['Employee', 'Joining date', 'Probation completion', 'Status', 'Confirmed on'].map(h => <th className="p-3" key={h}>{h}</th>)}</tr></thead>
        <tbody>{employees.filter(e => e.employeeName.toLowerCase().includes(search.toLowerCase())).map(e => <tr key={e.employeeId} className="border-t border-gray-100">
          <td className="p-3 font-medium">{e.employeeName}</td><td className="p-3">{e.joiningDate ? formatDate(e.joiningDate) : '—'}</td>
          <td className="p-3">{e.probationEndsOn ? formatDate(e.probationEndsOn) : '—'}</td><td className="p-3">{labels[e.status] || e.status}</td>
          <td className="p-3">{e.confirmedOn ? formatDate(e.confirmedOn) : '—'}</td>
        </tr>)}</tbody>
      </table>
      {!employees.length && <p className="p-5 text-gray-500">No active employees in the selected company.</p>}
    </div>
  </div>
}
