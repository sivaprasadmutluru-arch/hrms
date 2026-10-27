import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { changeUsername, changePassword } from './authSlice'
import { fetch2FAStatus, setup2FA, verify2FA, disable2FA, resetSetup, selectTwoFactor } from './twoFactorSlice'
import useAuth from '../../hooks/useAuth'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'

function ChangeUsernameForm() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    const res = await dispatch(changeUsername(data))
    if (res.error) { toast.error(res.payload); return }
    toast.success('Username updated')
    reset()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Change Username</h3>
      <p className="text-sm text-gray-500 mb-4">Current username: <span className="font-medium text-gray-700">{user?.username}</span></p>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Username</label>
          <input
            {...register('newUsername', { required: 'Required' })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter new username"
          />
          {errors.newUsername && <p className="text-xs text-red-500 mt-1">{errors.newUsername.message}</p>}
        </div>
        <Button type="submit">Update Username</Button>
      </form>
    </div>
  )
}

function ChangePasswordForm() {
  const dispatch = useDispatch()
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    const res = await dispatch(changePassword({ currentPassword: data.currentPassword, newPassword: data.newPassword }))
    if (res.error) { toast.error(res.payload); return }
    toast.success('Password updated')
    reset()
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-base font-semibold text-gray-900 mb-4">Change Password</h3>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-sm">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
          <input
            type="password"
            {...register('currentPassword', { required: 'Required' })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.currentPassword && <p className="text-xs text-red-500 mt-1">{errors.currentPassword.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <input
            type="password"
            {...register('newPassword', { required: 'Required', minLength: { value: 6, message: 'Min 6 characters' } })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.newPassword && <p className="text-xs text-red-500 mt-1">{errors.newPassword.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
          <input
            type="password"
            {...register('confirmPassword', {
              required: 'Required',
              validate: (v) => v === watch('newPassword') || 'Passwords do not match',
            })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {errors.confirmPassword && <p className="text-xs text-red-500 mt-1">{errors.confirmPassword.message}</p>}
        </div>
        <Button type="submit">Update Password</Button>
      </form>
    </div>
  )
}

function TwoFactorCard() {
  const dispatch = useDispatch()
  const { isEnabled, setupStep, otp, loading, error } = useSelector(selectTwoFactor)
  const [otpInput, setOtpInput] = useState('')

  useEffect(() => {
    dispatch(fetch2FAStatus())
    return () => { dispatch(resetSetup()) }
  }, [dispatch])

  const handleEnable = async () => {
    const res = await dispatch(setup2FA())
    if (res.error) toast.error(res.payload)
  }

  const handleVerify = async () => {
    const res = await dispatch(verify2FA(otpInput))
    if (res.error) { toast.error(res.payload); return }
    toast.success('2FA enabled successfully')
    setOtpInput('')
  }

  const handleDisable = async () => {
    const res = await dispatch(disable2FA(otpInput))
    if (res.error) { toast.error(res.payload); return }
    toast.success('2FA disabled')
    setOtpInput('')
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900">Two-Factor Authentication</h3>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {isEnabled ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      {!isEnabled && setupStep === 'idle' && (
        <Button onClick={handleEnable} disabled={loading}>Enable 2FA</Button>
      )}

      {!isEnabled && setupStep === 'pending-otp' && (
        <div className="space-y-3 max-w-xs">
          {otp && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-xs text-yellow-700 font-medium">Dev mode OTP: <span className="font-mono text-lg">{otp}</span></p>
            </div>
          )}
          <p className="text-sm text-gray-600">Enter the OTP sent to your email:</p>
          <input
            value={otpInput}
            onChange={e => setOtpInput(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono tracking-widest"
            placeholder="Enter OTP"
            maxLength={6}
          />
          <Button onClick={handleVerify} disabled={loading || !otpInput}>Verify & Enable</Button>
        </div>
      )}

      {setupStep === 'verified' && (
        <p className="text-sm text-green-600 font-medium">2FA is now active on your account.</p>
      )}

      {isEnabled && setupStep !== 'verified' && (
        <div className="space-y-3 max-w-xs">
          <p className="text-sm text-gray-600">Enter your OTP to disable 2FA:</p>
          <input
            value={otpInput}
            onChange={e => setOtpInput(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono tracking-widest"
            placeholder="Enter OTP"
            maxLength={6}
          />
          <Button variant="danger" onClick={handleDisable} disabled={loading || !otpInput}>Disable 2FA</Button>
        </div>
      )}

      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
    </div>
  )
}

export default function AccountSettingsPage() {
  return (
    <div className="admin-settings-workspace account-settings-workspace p-6 space-y-6">
      <PageHeader title="Account Settings" subtitle="Manage your credentials and security settings" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChangeUsernameForm />
        <ChangePasswordForm />
      </div>
      <TwoFactorCard />
    </div>
  )
}
