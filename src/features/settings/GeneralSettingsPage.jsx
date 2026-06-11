import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchDateTimeFormat, saveDateTimeFormat,
  fetchDashboardComponents, bulkUpdateDashboardComponents,
  fetchWhiteLabel, saveWhiteLabel, toggleWhiteLabel,
  fetchHistoryTracking, saveHistoryTracking,
  fetchAccountBlockFeature, toggleAccountBlockFeature,
  fetchAuditTags, createAuditTag, updateAuditTag, deleteAuditTag,
  fetchHelpdeskTags, createHelpdeskTag, updateHelpdeskTag, deleteHelpdeskTag,
  selectGeneralSettings,
} from './generalSettingsSlice'
import useAuth from '../../hooks/useAuth'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Spinner from '../../components/common/Spinner'
import TagsSettingsSection from './TagsSettingsSection'

const TABS = ['Date/Time', 'White Label', 'Dashboard', 'History', 'Security', 'Tags']

const DATE_FORMATS = ['yyyy-MM-dd', 'dd/MM/yyyy', 'MM/dd/yyyy', 'dd MMM yyyy', 'MMM dd, yyyy']
const TIME_FORMATS = ['HH:mm', 'hh:mm a', 'HH:mm:ss']

function DateTimeTab({ companyId, settings }) {
  const dispatch = useDispatch()
  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      dateFormat: settings?.dateFormat || 'yyyy-MM-dd',
      timeFormat: settings?.timeFormat || 'HH:mm',
    },
  })

  const dateF = watch('dateFormat')
  const timeF = watch('timeFormat')

  const onSubmit = async (data) => {
    const res = await dispatch(saveDateTimeFormat({ companyId, data }))
    if (res.error) toast.error(res.payload)
    else toast.success('Date/time format saved')
  }

  const previewDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
        <select {...register('dateFormat')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {DATE_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Time Format</label>
        <select {...register('timeFormat')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {TIME_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div className="bg-indigo-50 rounded-lg p-3 text-sm">
        <span className="text-indigo-600 font-medium">Preview: </span>
        <span className="text-indigo-800">{previewDate} | {new Date().toLocaleTimeString()}</span>
      </div>
      <Button type="submit">Save Format</Button>
    </form>
  )
}

function WhiteLabelTab({ companyId, whiteLabel }) {
  const dispatch = useDispatch()
  const { register, handleSubmit, watch } = useForm({
    defaultValues: {
      brandName: whiteLabel?.brandName || '',
      logoUrl: whiteLabel?.logoUrl || '',
      faviconUrl: whiteLabel?.faviconUrl || '',
      primaryColor: whiteLabel?.primaryColor || '#6366f1',
      isEnabled: whiteLabel?.isEnabled ?? false,
    },
  })
  const logoUrl = watch('logoUrl')

  const onSubmit = async (data) => {
    const res = await dispatch(saveWhiteLabel({ companyId, data }))
    if (res.error) toast.error(res.payload)
    else toast.success('White label settings saved')
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Brand Name</label>
        <input {...register('brandName')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
        <input {...register('logoUrl')} placeholder="https://..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        {logoUrl && <img src={logoUrl} alt="Logo preview" className="mt-2 h-12 object-contain border border-gray-200 rounded" onError={e => e.target.style.display='none'} />}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Favicon URL</label>
        <input {...register('faviconUrl')} placeholder="https://..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
        <input type="color" {...register('primaryColor')} className="w-10 h-10 rounded border border-gray-300 cursor-pointer" />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" {...register('isEnabled')} className="rounded border-gray-300 text-indigo-600 h-4 w-4" id="wl-enabled" />
        <label htmlFor="wl-enabled" className="text-sm text-gray-700">Enable White Label</label>
      </div>
      <Button type="submit">Save Branding</Button>
    </form>
  )
}

function DashboardTab({ companyId, components }) {
  const dispatch = useDispatch()
  const [local, setLocal] = useState(components)

  useEffect(() => { setLocal(components) }, [components])

  const toggle = (key) => {
    setLocal(prev => prev.map(c => c.componentKey === key ? { ...c, isEnabled: !c.isEnabled } : c))
  }

  const handleSave = async () => {
    const res = await dispatch(bulkUpdateDashboardComponents({ companyId, components: local }))
    if (res.error) toast.error(res.payload)
    else toast.success('Dashboard components updated')
  }

  return (
    <div className="space-y-3 max-w-sm">
      {local.length === 0 && <p className="text-sm text-gray-400">No components configured.</p>}
      {local.map(c => (
        <div key={c.componentKey} className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm text-gray-700">{c.componentKey?.replace(/_/g, ' ')}</span>
          <button
            type="button"
            onClick={() => toggle(c.componentKey)}
            className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${c.isEnabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5 ${c.isEnabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>
      ))}
      <Button onClick={handleSave}>Save Changes</Button>
    </div>
  )
}

function HistoryTab({ companyId, historyTracking }) {
  const dispatch = useDispatch()
  const [enabled, setEnabled] = useState(historyTracking?.isEnabled ?? false)

  useEffect(() => { setEnabled(historyTracking?.isEnabled ?? false) }, [historyTracking])

  const handleSave = async () => {
    const res = await dispatch(saveHistoryTracking({ companyId, data: { isEnabled: enabled } }))
    if (res.error) toast.error(res.payload)
    else toast.success('History tracking updated')
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between max-w-sm">
        <div>
          <p className="text-sm font-medium text-gray-900">History Tracking</p>
          <p className="text-xs text-gray-500 mt-0.5">Track all data changes in audit log</p>
        </div>
        <button
          type="button"
          onClick={() => setEnabled(v => !v)}
          className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${enabled ? 'bg-indigo-600' : 'bg-gray-200'}`}
        >
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform mt-0.5 ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>
      <Button onClick={handleSave}>Save</Button>
    </div>
  )
}

function SecurityTab({ accountBlockFeature }) {
  const dispatch = useDispatch()
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    const res = await dispatch(toggleAccountBlockFeature())
    setLoading(false)
    if (res.error) toast.error(res.payload)
    else toast.success('Account block feature toggled')
  }

  return (
    <div className="max-w-sm">
      <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Account Block/Unblock Feature</p>
          <p className="text-xs text-gray-500 mt-0.5">Enable automatic account locking after failed attempts</p>
          <span className={`mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium ${accountBlockFeature?.isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {accountBlockFeature?.isEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        <Button size="sm" onClick={handleToggle} disabled={loading}>Toggle</Button>
      </div>
    </div>
  )
}

export default function GeneralSettingsPage() {
  const dispatch = useDispatch()
  const { user, effectiveCompanyId } = useAuth()
  const settings = useSelector(selectGeneralSettings)
  const [activeTab, setActiveTab] = useState('Date/Time')

  useEffect(() => {
    dispatch(fetchDateTimeFormat(effectiveCompanyId))
    dispatch(fetchDashboardComponents(effectiveCompanyId))
    dispatch(fetchWhiteLabel(effectiveCompanyId))
    dispatch(fetchHistoryTracking(effectiveCompanyId))
    dispatch(fetchAccountBlockFeature())
    dispatch(fetchAuditTags(effectiveCompanyId))
    dispatch(fetchHelpdeskTags(effectiveCompanyId))
  }, [dispatch, effectiveCompanyId])

  const companyId = effectiveCompanyId

  return (
    <div className="p-6">
      <PageHeader title="General Settings" subtitle="Configure company-wide settings and preferences" />

      <div className="mt-4 flex gap-1 bg-gray-100 rounded-lg p-1 w-fit flex-wrap">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab ? 'bg-white shadow text-gray-900' : 'text-gray-600'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
        {activeTab === 'Date/Time' && (
          <DateTimeTab companyId={companyId} settings={settings.dateTimeFormat} />
        )}
        {activeTab === 'White Label' && (
          <WhiteLabelTab companyId={companyId} whiteLabel={settings.whiteLabel} />
        )}
        {activeTab === 'Dashboard' && (
          <DashboardTab companyId={companyId} components={settings.dashboardComponents} />
        )}
        {activeTab === 'History' && (
          <HistoryTab companyId={companyId} historyTracking={settings.historyTracking} />
        )}
        {activeTab === 'Security' && (
          <SecurityTab accountBlockFeature={settings.accountBlockFeature} />
        )}
        {activeTab === 'Tags' && (
          <div className="space-y-8">
            <TagsSettingsSection
              title="Audit Tags"
              tags={settings.auditTags}
              companyId={companyId}
              onCreate={createAuditTag}
              onUpdate={updateAuditTag}
              onDelete={deleteAuditTag}
            />
            <div className="border-t border-gray-100 pt-6">
              <TagsSettingsSection
                title="Helpdesk Tags"
                tags={settings.helpdeskTags}
                companyId={companyId}
                onCreate={createHelpdeskTag}
                onUpdate={updateHelpdeskTag}
                onDelete={deleteHelpdeskTag}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
