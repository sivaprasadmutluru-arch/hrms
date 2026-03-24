import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchBonusPointSettings, upsertBonusPointSettings, selectBonusPointSettings, selectLoading } from './performanceSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'

export default function BonusSettingsPage() {
  const dispatch = useDispatch()
  const loading = useSelector(selectLoading)
  const settings = useSelector(selectBonusPointSettings)
  const { register, handleSubmit, reset } = useForm()

  useEffect(() => { dispatch(fetchBonusPointSettings()) }, [dispatch])

  useEffect(() => {
    if (settings && Object.keys(settings).length > 0) reset(settings)
  }, [settings, reset])

  const onSubmit = async (formData) => {
    try {
      await dispatch(upsertBonusPointSettings(formData)).unwrap()
      toast.success('Bonus settings saved')
    } catch (e) { toast.error(e || 'Failed to save') }
  }

  return (
    <div>
      <PageHeader title="Bonus Point Settings" subtitle="Configure the bonus point system for your organisation" />
      <div className="max-w-lg bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div className="flex items-center gap-3">
          <input type="checkbox" id="enableBonusPoints" {...register('enableBonusPoints')} className="rounded" />
          <label htmlFor="enableBonusPoints" className="text-sm font-medium text-gray-700">Enable Bonus Points</label>
        </div>
        <Input label="Points per Completion" type="number" {...register('pointsPerCompletion', { valueAsNumber: true })} />
        <Input label="Max Redeemable Points" type="number" {...register('maxRedeemablePoints', { valueAsNumber: true })} />
        <Input label="Redemption Rate (points → currency)" type="number" step="0.01" {...register('redemptionRate', { valueAsNumber: true })} />
        <div className="flex justify-end">
          <Button onClick={handleSubmit(onSubmit)} disabled={loading}>Save Settings</Button>
        </div>
      </div>
    </div>
  )
}
