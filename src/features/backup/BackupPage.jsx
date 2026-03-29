import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchLocalBackup, saveLocalBackup, fetchGdriveBackup, saveGdriveBackup,
  selectLocalBackup, selectGdriveBackup, selectBackupLoading
} from './backupSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'

const INTERVALS = ['daily', 'weekly', 'monthly']

function BackupForm({ title, defaultValues, onSave, loading }) {
  const { register, handleSubmit, reset } = useForm({ defaultValues })

  useEffect(() => { if (defaultValues) reset(defaultValues) }, [defaultValues, reset])

  const onSubmit = (data) => onSave({
    ...data,
    seconds: data.seconds ? parseInt(data.seconds) : null,
    hour: data.hour ? parseInt(data.hour) : null,
    minute: data.minute ? parseInt(data.minute) : null,
    backupMedia: data.backupMedia === true || data.backupMedia === 'true',
    backupDb: data.backupDb === true || data.backupDb === 'true',
    fixed: data.fixed === true || data.fixed === 'true',
    active: data.active === true || data.active === 'true',
  })

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="space-y-4">
        {title.includes('Local') && (
          <Input label="Backup Path" placeholder="/var/backups/hrms" {...register('backupPath')} />
        )}
        {title.includes('Google') && (
          <>
            <Input label="Service Account File Path" {...register('serviceAccountFile')} />
            <Input label="Google Drive Folder ID" {...register('gdriveFolderId')} />
          </>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Interval</label>
          <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" {...register('interval')}>
            <option value="">Select interval</option>
            {INTERVALS.map(i => <option key={i} value={i}>{i.charAt(0).toUpperCase() + i.slice(1)}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Hour (0-23)" type="number" min="0" max="23" {...register('hour')} />
          <Input label="Minute (0-59)" type="number" min="0" max="59" {...register('minute')} />
          <Input label="Seconds" type="number" {...register('seconds')} />
        </div>
        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('backupMedia')} className="rounded" /> Backup Media
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('backupDb')} className="rounded" /> Backup Database
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('fixed')} className="rounded" /> Fixed Time
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...register('active')} className="rounded" /> Active
          </label>
        </div>
        <Button onClick={handleSubmit(onSubmit)} disabled={loading}>Save</Button>
      </div>
    </div>
  )
}

export default function BackupPage() {
  const dispatch = useDispatch()
  const localBackup = useSelector(selectLocalBackup)
  const gdriveBackup = useSelector(selectGdriveBackup)
  const loading = useSelector(selectBackupLoading)

  useEffect(() => {
    dispatch(fetchLocalBackup())
    dispatch(fetchGdriveBackup())
  }, [dispatch])

  const handleSaveLocal = async (data) => {
    try { await dispatch(saveLocalBackup(data)).unwrap(); toast.success('Local backup settings saved') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const handleSaveGdrive = async (data) => {
    try { await dispatch(saveGdriveBackup(data)).unwrap(); toast.success('Google Drive backup settings saved') }
    catch (e) { toast.error(e || 'Failed') }
  }

  return (
    <div>
      <PageHeader title="Backup Settings" subtitle="Configure automated data backup schedules" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BackupForm
          title="Local Backup"
          defaultValues={localBackup}
          onSave={handleSaveLocal}
          loading={loading}
        />
        <BackupForm
          title="Google Drive Backup"
          defaultValues={gdriveBackup}
          onSave={handleSaveGdrive}
          loading={loading}
        />
      </div>
    </div>
  )
}
