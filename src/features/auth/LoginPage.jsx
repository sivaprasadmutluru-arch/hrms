import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { login, selectAuth } from './authSlice'
import toast from 'react-hot-toast'

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
    <main className="signin-page">
      <section className="signin-visual" aria-label="Accrue Technologies — smarter HR, brighter tomorrow">
        <img className="signin-backdrop" src="/accrue-login-hero-clean.png" alt="Bright modern workplace with a laptop and the message: Technology that brings people and work together." />
        <div className="signin-hero-copy">
          <h2>Technology that brings people and work <em>together.</em></h2>
          <p>Thoughtful HR technology for stronger teams and better workdays.</p>
        </div>
      </section>
      <section className="signin-panel" aria-labelledby="signin-title">
        <div className="signin-panel-inner">
          <div className="signin-brand"><img src="/accrue-mark.svg" alt="" /><span>ACCRUE<span className="signin-brand-dot">.</span></span><span className="signin-company">TECHNOLOGIES</span></div>
          <div className="signin-welcome"><h1 className="signin-product" id="signin-title">Welcome back</h1><p>Sign in to your account to continue your HR journey.</p></div>

        <form onSubmit={handleSubmit(onSubmit)} className="signin-form">
          <label className="signin-label" htmlFor="usernameOrEmail">Work email</label>
          <div className={`signin-input ${errors.usernameOrEmail ? 'signin-input-error' : ''}`}><Mail /><input id="usernameOrEmail" {...register('usernameOrEmail', { required: 'Please enter your work email' })} type="text" autoComplete="username" placeholder="you@company.com" /></div>
          {errors.usernameOrEmail && <p className="signin-error">{errors.usernameOrEmail.message}</p>}
          <div className="signin-password-heading"><label className="signin-label" htmlFor="password">Password</label><Link to="/forgot-password">Forgot password?</Link></div>
          <div className={`signin-input ${errors.password ? 'signin-input-error' : ''}`}><LockKeyhole /><input id="password" {...register('password', { required: 'Please enter your password' })} type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
          {errors.password && <p className="signin-error">{errors.password.message}</p>}
          <label className="signin-remember"><input type="checkbox" /><span>Keep me signed in</span></label>
          {error && <div className="signin-auth-error" role="alert">{error}</div>}
          <button type="submit" className="signin-submit" disabled={loading}>{loading ? <><span className="signin-spinner" /> Signing in…</> : <>Sign in <ArrowRight /></>}</button>
        </form>

          <div className="signin-divider"><span />OR<span /></div>
          <button type="button" className="signin-sso" onClick={() => toast('Contact your administrator to enable single sign-on.') }><ShieldCheck /> Sign in with SSO</button>
          <div className="signin-assurance"><ShieldCheck /><span>Secure</span><i>·</i><span>Reliable</span><i>·</i><span>Intelligent</span></div>
          <Link className="signin-privacy" to="/privacy-policy">Privacy policy</Link>
        </div>
      </section>
    </main>
  )
}
