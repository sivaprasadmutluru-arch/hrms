import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { setupLinkedIn, syncLinkedIn } from './recruitmentSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'

export default function LinkedInSettingsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const companyId = user?.companyId
  const [syncing, setSyncing] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    try { await dispatch(setupLinkedIn(data)).unwrap(); toast.success('LinkedIn account saved') }
    catch (e) { toast.error(e || 'Failed to save settings') }
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      const res = await dispatch(syncLinkedIn({ companyId })).unwrap()
      toast.success(`Synced ${res.synced ?? 0} candidates`)
    } catch (e) { toast.error(e || 'Failed to sync') }
    finally { setSyncing(false) }
  }

  return (
    <div>
      <PageHeader title="LinkedIn Integration" subtitle="Configure LinkedIn recruitment integration" />
      <div className="max-w-lg p-4">
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h3 className="font-semibold text-gray-900">Account Settings</h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Client ID" {...register('clientId', { required: 'Required' })} error={errors.clientId?.message} />
            <Input label="Client Secret" type="password" {...register('clientSecret', { required: 'Required' })} error={errors.clientSecret?.message} />
            <Input label="Redirect URI" {...register('redirectUri')} />
            <div className="flex gap-2">
              <Button type="submit">Save Settings</Button>
              <Button type="button" variant="outline" onClick={handleSync} disabled={syncing}>
                {syncing ? 'Syncing...' : 'Sync Candidates'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
