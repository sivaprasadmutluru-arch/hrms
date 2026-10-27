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
    <div className="offboarding-workspace offboarding-settings-page">
      <PageHeader title="Offboarding Settings" subtitle="Configure module-wide offboarding behaviour" />
      <div className="offboarding-settings-panel">
        <section className="offboarding-notice-setting">
          <div className="offboarding-settings-kicker">DEFAULT POLICY</div>
          <h2>Notice period</h2>
          <p>Set the standard number of days employees should work after submitting a resignation.</p>
          <Input label="Notice period (days)" type="number" {...register('noticePeriodDays', { valueAsNumber: true })} />
        </section>

        <section className="offboarding-feature-setting">
          <div className="offboarding-settings-kicker">EXIT WORKFLOW</div>
          <h2>Offboarding checklist</h2>
          <p>Choose the steps your team should complete when an employee leaves.</p>
          <div className="offboarding-feature-list">
            {[
              { key: 'enableExitInterview', title: 'Exit interview', description: 'Capture feedback and the employee’s reason for leaving.' },
              { key: 'enableAssetReturnCheck', title: 'Asset return check', description: 'Track company equipment that must be returned.' },
              { key: 'enableKnowledgeTransfer', title: 'Knowledge transfer', description: 'Include a handover step before the final working day.' },
            ].map(({ key, title, description }) => (
              <label key={key} className="offboarding-feature-option">
                <input type="checkbox" {...register(key)} />
                <span className="offboarding-feature-copy"><strong>{title}</strong><small>{description}</small></span>
                <span className="offboarding-feature-chevron" aria-hidden="true">›</span>
              </label>
            ))}
          </div>
        </section>

        <div className="offboarding-settings-footer">
          <p>Changes apply to future offboarding cases.</p>
          <Button onClick={handleSubmit(onSubmit)} disabled={loading}>{loading ? 'Saving…' : 'Save settings'}</Button>
        </div>
      </div>
    </div>
  )
}
