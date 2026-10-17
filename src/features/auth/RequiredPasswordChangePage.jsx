import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { Navigate, useNavigate } from 'react-router-dom'
import { KeyRound, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { changePassword, selectAuth } from './authSlice'

export default function RequiredPasswordChangePage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isAuthenticated, user } = useSelector(selectAuth)
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm()

  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!user?.mustChangePassword) return <Navigate to="/dashboard" replace />

  const onSubmit = async (data) => {
    const result = await dispatch(changePassword({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    }))
    if (changePassword.rejected.match(result)) {
      toast.error(result.payload || 'Unable to change password')
      return
    }
    toast.success('Password changed successfully')
    navigate('/dashboard', { replace: true })
  }

  const fieldClass = 'h-12 w-full rounded-lg border border-slate-300 px-4 text-sm outline-none transition focus:border-[#5B2ECF] focus:ring-4 focus:ring-[#5B2ECF]/15'

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F0FF] px-4 py-8">
      <section className="w-full max-w-md rounded-2xl border border-white bg-white p-7 shadow-xl shadow-[#5B2ECF]/10">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#5B2ECF] text-white">
          <KeyRound className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Create a new password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This is your first sign-in. Change the temporary password before continuing to HRMS.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Temporary password</label>
            <input type="password" autoComplete="current-password" className={fieldClass}
              {...register('currentPassword', { required: 'Temporary password is required' })} />
            {errors.currentPassword && <p className="mt-1 text-xs text-red-600">{errors.currentPassword.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">New password</label>
            <input type="password" autoComplete="new-password" className={fieldClass}
              {...register('newPassword', { required: 'New password is required', minLength: { value: 8, message: 'Use at least 8 characters' } })} />
            {errors.newPassword && <p className="mt-1 text-xs text-red-600">{errors.newPassword.message}</p>}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Confirm new password</label>
            <input type="password" autoComplete="new-password" className={fieldClass}
              {...register('confirmPassword', {
                required: 'Please confirm the new password',
                validate: (value) => value === watch('newPassword') || 'Passwords do not match',
              })} />
            {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword.message}</p>}
          </div>
          <button type="submit" disabled={isSubmitting}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#5B2ECF] font-bold text-white transition hover:bg-[#43209E] disabled:opacity-60">
            <Lock className="h-4 w-4" />
            {isSubmitting ? 'Updating password…' : 'Change password and continue'}
          </button>
        </form>
      </section>
    </main>
  )
}
