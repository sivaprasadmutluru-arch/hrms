import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import Button from '../../components/common/Button'

export default function OrganizationTemplatePanel({ companyId, onApplied }) {
  const [data, setData] = useState(null)
  const [choice, setChoice] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!companyId) return
    let active = true
    api.get(`/companies/${companyId}/organization-template`).then(({ data: result }) => {
      if (active) { setData(result); setChoice(result.industry) }
    }).catch(err => { if (active) setError(err.response?.data?.message || 'Could not load organization templates') })
    return () => { active = false }
  }, [companyId])
  const apply = async () => {
    if (!data || saving) return
    setSaving(true)
    try {
      const { data: result } = await api.put(`/companies/${companyId}/organization-template`, { industry: choice, expectedIndustry: data.industry })
      setData(result)
      setError('')
      onApplied()
      toast.success('Organization template applied to head office and branches')
    } catch (err) { setError(err.response?.data?.message || 'Could not apply template') }
    finally { setSaving(false) }
  }
  if (!companyId) return <p className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-slate-600">Select a company in the top bar to choose its organization type and view the matching standard catalog.</p>
  const selected = data?.templates.find(item => item.id === choice)
  return <section className="space-y-3 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm" aria-label="Organization industry template">
    <div><h2 className="font-semibold text-slate-800">Organization type & standard catalog</h2><p className="mt-1 text-sm text-slate-500">{data?.organizationName || 'Your organization'} · Select the industry that fits your business.</p></div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {!data && !error && <p className="text-sm text-slate-500">Loading templates…</p>}
    {data && <>
      <div className="flex flex-wrap items-end gap-3"><label className="min-w-56 flex-1 text-sm font-medium text-slate-700">Organization type<select value={choice} disabled={saving || !data.canChange} onChange={event => setChoice(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-200 bg-white px-3 py-2">{data.templates.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>{data.canChange && <Button disabled={saving || choice === data.industry} loading={saving} onClick={apply}>Apply template</Button>}</div>
      {selected && <div className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600"><strong>{selected.departmentCount} standard departments · {selected.positionCount} standard positions</strong><p className="mt-1 text-xs leading-relaxed">{selected.departments.map(item => item.name).join(' · ')}</p></div>}
      <p className="text-xs leading-relaxed text-slate-500">All industry templates are maintained in the master catalog. Only the selected industry’s standard entries and your custom entries appear in setup and employee selection. Switching type keeps employee records and previous templates in storage. Add custom departments and positions at any time.</p>
    </>}
  </section>
}
