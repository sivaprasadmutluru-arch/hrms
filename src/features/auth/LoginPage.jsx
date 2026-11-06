import { useForm } from 'react-hook-form'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { login, selectAuth, clearLoginError } from './authSlice'
import toast from 'react-hot-toast'
import LoginMarketing, { LoginBrand } from './LoginMarketing'
import './LoginMarketing.css'

export default function LoginPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const isCarrLogin = location.pathname === '/carr/login'
  const destination = location.state?.from || (isCarrLogin ? '/carr/dashboard' : '/dashboard')
  const { loading, error, isAuthenticated, user } = useSelector(selectAuth)
  const { register, handleSubmit, formState: { errors } } = useForm()
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => { dispatch(clearLoginError()) }, [dispatch])

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
    }
  }

  return (
    <div className="login-marketing" id="top">
    <header className="login-nav"><LoginBrand /><nav aria-label="Product navigation"><a href="#features">Features</a><a href="#plans">Pricing</a><a className="login-nav-signin" href="#signin">Sign in <ArrowRight size={15}/></a></nav></header>
    <main className="signin-page">
      <section className="login-product-hero" aria-labelledby="login-marketing-title">
        <span className="login-eyebrow">HR THAT GROWS WITH YOU</span>
        <h1 id="login-marketing-title">Great teams.<br/>Better workdays.<br/><em>One workspace.</em></h1>
        <p>Bring your people, attendance, payroll and hiring together with AccrueHRMS. Make space for the work that matters.</p>
        <a className="login-hero-cta" href="#plans">Explore plans <ArrowRight size={17}/></a>
        <span className="login-free-note">Free Forever · Up to 15 employees</span>
        <div className="login-hero-photo"><img src="/accrue-login-workplace.png" alt="A bright workspace with a laptop, city views and abstract wall art" width="1336" height="1177"/><span>Built around your people.</span></div>
      </section>
      <section className="signin-panel" id="signin" aria-labelledby="signin-title">
        <div className="signin-panel-inner">
          <span className="login-form-eyebrow">YOUR WORKSPACE AWAITS</span>
          <div className="signin-welcome"><h2 className="signin-product" id="signin-title">Welcome back</h2><p>Sign in to your account to continue your HR journey.</p></div>

        <form onSubmit={handleSubmit(onSubmit)} onChange={() => { if (error) dispatch(clearLoginError()) }} className="signin-form">
          <label className="signin-label" htmlFor="usernameOrEmail">Email or username</label>
          <div className={`signin-input ${errors.usernameOrEmail ? 'signin-input-error' : ''}`}><Mail /><input id="usernameOrEmail" {...register('usernameOrEmail', { required: 'Please enter your email or username', setValueAs: value => value.trim() })} type="text" autoComplete="username" placeholder="Enter your email or username" aria-describedby={error ? 'signin-auth-error' : undefined} /></div>
          {errors.usernameOrEmail && <p className="signin-error">{errors.usernameOrEmail.message}</p>}
          <div className="signin-password-heading"><label className="signin-label" htmlFor="password">Password</label><Link to="/forgot-password">Forgot password?</Link></div>
          <div className={`signin-input ${errors.password ? 'signin-input-error' : ''}`}><LockKeyhole /><input id="password" {...register('password', { required: 'Please enter your password' })} type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Enter your password" /><button type="button" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff /> : <Eye />}</button></div>
          {errors.password && <p className="signin-error">{errors.password.message}</p>}
          <label className="signin-remember"><input type="checkbox" /><span>Keep me signed in</span></label>
          {error && <div id="signin-auth-error" className="signin-auth-error" role="alert">{error}</div>}
          <button type="submit" className="signin-submit" disabled={loading}>{loading ? <><span className="signin-spinner" /> Signing in…</> : <>Sign in <ArrowRight /></>}</button>
        </form>

          <div className="signin-divider"><span />OR<span /></div>
          <button type="button" className="signin-sso" onClick={() => toast('Contact your administrator to enable single sign-on.') }><ShieldCheck /> Sign in with SSO</button>
          <div className="signin-assurance"><ShieldCheck /><span>Secure</span><i>·</i><span>Reliable</span><i>·</i><span>Intelligent</span></div>
          <div className="signin-legal-links flex items-center justify-center gap-2 mt-4 text-xs text-slate-400">
            <Link className="hover:text-slate-700 underline" to="/privacy-policy">Privacy Policy</Link>
            <span>·</span>
            <Link className="hover:text-slate-700 underline" to="/terms-and-conditions">Terms & Conditions</Link>
          </div>
        </div>
      </section>
    </main>
    <LoginMarketing />
    </div>
  )
}
