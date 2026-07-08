import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchGeoFencing, saveGeoFencing, deleteGeoFencing, checkLocation, clearCheckResult,
  selectGeoFencingConfig, selectCheckResult, selectGeoFencingLoading
} from './geofencingSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'

export default function GeoFencingPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const config = useSelector(selectGeoFencingConfig)
  const checkResult = useSelector(selectCheckResult)
  const loading = useSelector(selectGeoFencingLoading)

  const [confirmModal, setConfirmModal] = useState({ open: false })
  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const { register: registerCheck, handleSubmit: handleCheckSubmit } = useForm()

  useEffect(() => {
    dispatch(fetchGeoFencing())
    return () => { dispatch(clearCheckResult()) }
  }, [dispatch])

  useEffect(() => {
    if (config) {
      reset({
        latitude: config.latitude,
        longitude: config.longitude,
        radiusInMeters: config.radiusInMeters,
        start: config.start,
        enforceGeofence: config.enforceGeofence,
      })
    }
  }, [config, reset])

  const onSubmit = async (data) => {
    try {
      await dispatch(saveGeoFencing({
        ...data,
        latitude: parseFloat(data.latitude),
        longitude: parseFloat(data.longitude),
        radiusInMeters: parseInt(data.radiusInMeters),
        start: data.start === true || data.start === 'true',
        enforceGeofence: data.enforceGeofence === true || data.enforceGeofence === 'true',
        company: { id: user?.companyId },
      })).unwrap()
      toast.success('Geofencing configuration saved')
    } catch (e) { toast.error(e || 'Failed to save') }
  }

  const handleDelete = () => { if (config?.id) setConfirmModal({ open: true }) }
  const onConfirmDelete = async () => {
    try { await dispatch(deleteGeoFencing(config.id)).unwrap(); toast.success('Deleted'); reset({}) }
    catch (e) { toast.error(e || 'Failed') }
    finally { setConfirmModal({ open: false }) }
  }

  const onCheckLocation = async (data) => {
    try {
      await dispatch(checkLocation({
        latitude: parseFloat(data.checkLat),
        longitude: parseFloat(data.checkLng),
        employeeId: data.checkEmployeeId ? parseInt(data.checkEmployeeId) : null,
      })).unwrap()
    } catch (e) { toast.error(e || 'Check failed') }
  }

  return (
    <div>
      <PageHeader title="Geo Fencing" subtitle="Configure attendance location boundaries" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Geofencing Configuration</h2>
          <div className="space-y-4">
            <Input label="Latitude" type="number" step="any" error={errors.latitude?.message}
              {...register('latitude', { required: 'Required' })} />
            <Input label="Longitude" type="number" step="any" error={errors.longitude?.message}
              {...register('longitude', { required: 'Required' })} />
            <Input label="Radius (meters)" type="number" error={errors.radiusInMeters?.message}
              {...register('radiusInMeters', { required: 'Required' })} />
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" {...register('start')} className="rounded" />
              Enable Geofencing
            </label>
            <label className="flex items-start gap-2 text-sm font-medium text-gray-700">
              <input type="checkbox" {...register('enforceGeofence')} className="rounded mt-0.5" />
              <span>
                Block clock-in/out outside the fence
                <span className="block text-xs font-normal text-gray-400 mt-0.5">
                  When on, employees clocking in/out from the web without location access, or from
                  outside the radius above, will be rejected. Admin-entered attendance is never blocked.
                </span>
              </span>
            </label>
            <div className="flex gap-3">
              <Button onClick={handleSubmit(onSubmit)} disabled={loading}>Save Configuration</Button>
              {config && (
                <Button variant="danger" onClick={handleDelete}>Delete</Button>
              )}
            </div>
          </div>

          {config && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
              <p><span className="font-medium">Status:</span> {config.start ? 'Active' : 'Inactive'}</p>
              <p><span className="font-medium">Location:</span> {config.latitude}, {config.longitude}</p>
              <p><span className="font-medium">Radius:</span> {config.radiusInMeters}m</p>
              <p><span className="font-medium">Enforcement:</span> {config.enforceGeofence ? 'Blocking' : 'Flag only'}</p>
            </div>
          )}
        </div>

        {/* Location Check */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Test Location Check</h2>
          <div className="space-y-4">
            <Input label="Latitude" type="number" step="any" {...registerCheck('checkLat')} />
            <Input label="Longitude" type="number" step="any" {...registerCheck('checkLng')} />
            <Input label="Employee ID (optional)" type="number" {...registerCheck('checkEmployeeId')} />
            <Button onClick={handleCheckSubmit(onCheckLocation)} disabled={loading}>Check Location</Button>
          </div>

          {checkResult && (
            <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${checkResult.withinFence ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {checkResult.withinFence ? '✓ Within geofence boundary' : '✗ Outside geofence boundary'}
              {checkResult.distance != null && (
                <p className="font-normal mt-1">Distance: {Math.round(checkResult.distance)}m from center</p>
              )}
            </div>
          )}
        </div>
      </div>
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false })}
        onConfirm={onConfirmDelete}
        title="Delete Geofencing Configuration"
        message="Are you sure you want to delete the geofencing configuration? This action cannot be undone."
        confirmLabel="Delete"
        loading={loading}
      />
    </div>
  )
}
