import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { forgotPassword, resetPassword } from './authSlice'
import { APP_NAME } from '../../config/constants'
import toast from 'react-hot-toast'

export default function ForgotPasswordPage() {
  const dispatch = useDispatch()
  const [step, setStep] = useState('request') // 'request' | 'reset'
  const [loading, setLoading] = useState(false)

  const requestForm = useForm()
  const resetForm = useForm()

  const onRequestSubmit = async (data) => {
    setLoading(true)
    try {
      await dispatch(forgotPassword(data)).unwrap()
      toast.success('Reset instructions sent to your email')
      setStep('reset')
    } catch (err) {
      toast.error(err || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  const onResetSubmit = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await dispatch(resetPassword({ token: data.token, newPassword: data.newPassword })).unwrap()
      toast.success('Password reset successfully')
      window.location.href = '/login'
    } catch (err) {
      toast.error(err || 'Failed to reset password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-indigo-900 to-violet-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">{APP_NAME}</h1>
          <p className="text-indigo-300 mt-1">Password Recovery</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {step === 'request' ? (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Forgot your password?</h2>
              <p className="text-sm text-gray-500 mb-6">Enter your email and we'll send reset instructions.</p>
              <form onSubmit={requestForm.handleSubmit(onRequestSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    {...requestForm.register('email', { required: 'Email is required' })}
                    type="email"
                    placeholder="you@company.com"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  {requestForm.formState.errors.email && (
                    <p className="mt-1 text-xs text-red-600">{requestForm.formState.errors.email.message}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white font-medium py-2.5 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  {loading ? 'Sending...' : 'Send Reset Instructions'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Reset your password</h2>
              <p className="text-sm text-gray-500 mb-6">Enter the token from your email and choose a new password.</p>
              <form onSubmit={resetForm.handleSubmit(onResetSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reset Token</label>
                  <input
                    {...resetForm.register('token', { required: 'Token is required' })}
                    type="text"
                    placeholder="Paste your reset token"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  {resetForm.formState.errors.token && (
                    <p className="mt-1 text-xs text-red-600">{resetForm.formState.errors.token.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <input
                    {...resetForm.register('newPassword', { required: 'Password is required', minLength: { value: 8, message: 'Minimum 8 characters' } })}
                    type="password"
                    placeholder="New password"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  {resetForm.formState.errors.newPassword && (
                    <p className="mt-1 text-xs text-red-600">{resetForm.formState.errors.newPassword.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                  <input
                    {...resetForm.register('confirmPassword', { required: 'Please confirm your password' })}
                    type="password"
                    placeholder="Confirm new password"
                    className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                  {resetForm.formState.errors.confirmPassword && (
                    <p className="mt-1 text-xs text-red-600">{resetForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 text-white font-medium py-2.5 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            </>
          )}

          <div className="text-center mt-6">
            <Link to="/login" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
