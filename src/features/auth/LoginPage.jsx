import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowRight, Eye, EyeOff, Globe, Lock, Mail, ShieldCheck } from 'lucide-react'
import { login, selectAuth } from './authSlice'
import toast from 'react-hot-toast'
import loginBg from '../../assets/grecha-login-bg-clean.png'
import brandLogo from '../../assets/the-greater-change-logo.png'

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const isCarrLogin = location.pathname === '/carr/login'
  const destination = location.state?.from || (isCarrLogin ? '/carr/dashboard' : '/dashboard')
  const { loading, error, isAuthenticated, user } = useSelector(selectAuth)
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate(user?.mustChangePassword ? '/change-password-required' : destination, { replace: true })
  }, [isAuthenticated, user?.mustChangePassword, navigate, destination])

  const onSubmit = async (data) => {
    const result = await dispatch(login(data))
    if (login.fulfilled.match(result)) {
      toast.success('Welcome back!')
      navigate(result.payload.mustChangePassword ? '/change-password-required' : destination, { replace: true })
    } else if (result.payload === 'ORGANIZATION_SUSPENDED') {
      navigate('/suspended', { replace: true })
    } else {
      toast.error(result.payload || 'Login failed', { duration: 10000 })
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-[#F4F0FF] text-slate-950">
      <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-5 py-4 lg:justify-end lg:px-[4.5vw]">
        <img
          src={loginBg}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/0 to-white/10" />

        <section className="relative z-10 w-full max-w-[420px] rounded-[1.5rem] border border-white/80 bg-white/92 p-5 shadow-2xl shadow-[#5B2ECF]/18 backdrop-blur-xl sm:p-6 xl:max-w-[445px] xl:p-7">
          <div className="mb-5 text-center">
            <img
              src={brandLogo}
              alt="The Greater Change"
              className="mx-auto h-auto w-[260px] max-w-full object-contain [image-rendering:-webkit-optimize-contrast] xl:w-[300px]"
            />
            <h1 className="mt-5 text-4xl font-black tracking-tight xl:text-[44px]">
              {isCarrLogin ? 'CARR' : 'GRECHA'}<span className="text-[#5B2ECF]">{isCarrLogin ? ' Enterprise' : '.AI'}</span>
            </h1>
            <div className="mt-2 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <p className="text-sm font-semibold tracking-[0.28em] text-[#5B2ECF] xl:text-base">{isCarrLogin ? 'SECURE CARR PORTAL' : 'AI HRMS PORTAL'}</p>
              <div className="h-px flex-1 bg-slate-200" />
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            <div>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  {...register('usernameOrEmail', { required: 'Username is required' })}
                  type="text"
                  placeholder="Email Address"
                  className="block h-12 w-full rounded-lg border border-slate-300 bg-white pl-14 pr-4 text-base font-medium text-slate-900 outline-none transition focus:border-[#5B2ECF] focus:ring-4 focus:ring-[#5B2ECF]/15 xl:h-14"
                />
              </div>
              {errors.usernameOrEmail && <p className="mt-1 text-xs text-red-600">{errors.usernameOrEmail.message}</p>}
            </div>

            <div>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  {...register('password', { required: 'Password is required' })}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  className="block h-12 w-full rounded-lg border border-slate-300 bg-white pl-14 pr-14 text-base font-medium text-slate-900 outline-none transition focus:border-[#5B2ECF] focus:ring-4 focus:ring-[#5B2ECF]/15 xl:h-14"
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-[#5B2ECF] focus:outline-none focus:ring-2 focus:ring-[#5B2ECF]/30"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
            </div>

            <div className="flex items-center justify-between gap-4 text-sm">
              <label className="flex items-center gap-2 font-medium text-slate-700">
                <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-[#5B2ECF] focus:ring-[#5B2ECF]" />
                Remember Me
              </label>
              <Link to="/forgot-password" className="font-semibold text-[#5B2ECF] hover:text-[#43209E]">
                Forgot Password?
              </Link>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-12 w-full items-center justify-center gap-3 rounded-lg bg-[#5B2ECF] px-5 text-base font-black text-white shadow-xl shadow-[#5B2ECF]/25 transition hover:bg-[#43209E] focus:outline-none focus:ring-4 focus:ring-[#5B2ECF]/25 disabled:cursor-not-allowed disabled:opacity-50 xl:h-14"
            >
              {loading && <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>}
              {loading ? 'Signing in...' : 'Sign In'}
              {!loading && <ArrowRight className="h-5 w-5" />}
            </button>
          </form>

          <div className="my-4 flex items-center gap-4 text-sm font-medium text-slate-400 xl:my-5">
            <div className="h-px flex-1 bg-slate-200" />
            OR
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button className="flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-[#5B2ECF]/45 bg-white text-base font-black text-[#5B2ECF] transition hover:bg-[#5B2ECF]/5 xl:h-12">
            <ShieldCheck className="h-5 w-5" />
            Sign in with SSO
          </button>

          <div className="mt-4 text-center xl:mt-5">
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-[#5B2ECF]">
              <Lock className="h-4 w-4" />
              Secure <span>•</span> Reliable <span>•</span> Intelligent
            </p>
            <p className="mt-2 text-sm text-slate-500 xl:text-base">
              Powered by <span className="font-semibold text-slate-800">The Greater Change</span>
            </p>
            <Link
              to="/privacy-policy"
              className="mt-2 inline-flex text-sm font-semibold text-[#5B2ECF] underline-offset-4 hover:text-[#43209E] hover:underline"
            >
              Privacy Policy
            </Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 flex-shrink-0">
        <div className="bg-white/95 px-5 py-3 text-center backdrop-blur-sm">
          <p className="text-base font-bold text-slate-900 sm:text-lg">
            <span className="text-[#5B2ECF]">&ldquo;</span> Small Changes. Greater Impact. <span className="text-[#5B2ECF]">&rdquo;</span>
          </p>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            Building better workplaces. Creating a greater change.
          </p>
        </div>
        <div className="flex flex-col items-center justify-between gap-2 bg-[#0B1220] px-5 py-3 text-xs text-slate-300 sm:flex-row sm:text-sm">
          <p className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 flex-shrink-0 text-[#8B6BF0]" />
            Your trust is our priority. Experience HR excellence with{' '}
            <span className="font-semibold text-[#8B6BF0]">GRECHA.AI</span>
          </p>
          <p className="flex items-center gap-2">
            Crafted by{' '}
            <a href="https://prabhatech.com" target="_blank" rel="noreferrer" className="font-medium text-[#8B6BF0] hover:text-white">
              Prabha Technologies Est
            </a>
            {' '}|{' '}
            <a href="https://prabhatech.com" target="_blank" rel="noreferrer" className="font-medium text-[#8B6BF0] hover:text-white">
              prabhatech.com
            </a>
            <Globe className="h-4 w-4 flex-shrink-0" />
          </p>
        </div>
      </footer>
    </div>
  )
}
