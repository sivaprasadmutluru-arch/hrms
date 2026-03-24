import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchOffboardingSettings, upsertOffboardingSettings, selectOffboardingSettings, selectLoading } from './offboardingSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'

export default function OffboardingSettingsPage() {
  const dispatch = useDispatch()
  const loading = useSelector(selectLoading)
  const settings = useSelector(selectOffboardingSettings)
  const { register, handleSubmit, reset } = useForm()

  useEffect(() => { dispatch(fetchOffboardingSettings()) }, [dispatch])

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) reset(settings)
  }, [settings, reset])

  const onSubmit = async (formData) => {
    try {
      await dispatch(upsertOffboardingSettings(formData)).unwrap()
      toast.success('Settings saved')
    } catch (e) { toast.error(e || 'Failed to save') }
  }

  return (
    <div>
      <PageHeader title="Offboarding Settings" subtitle="Configure module-wide offboarding behaviour" />
      <div className="max-w-lg bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <Input label="Notice Period (days)" type="number" {...register('noticePeriodDays', { valueAsNumber: true })} />

        <div className="space-y-3">
          <label className="block text-sm font-semibold text-gray-700">Features</label>
          {[
            { key: 'enableExitInterview', label: 'Enable Exit Interview' },
            { key: 'enableAssetReturnCheck', label: 'Enable Asset Return Check' },
            { key: 'enableKnowledgeTransfer', label: 'Enable Knowledge Transfer' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" {...register(key)} className="rounded" />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSubmit(onSubmit)} disabled={loading}>Save Settings</Button>
        </div>
      </div>
    </div>
  )
}
