import { formatOrganizationId } from '../../utils/organizationId'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { useParams, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, Minus, Sparkles, Building2, Users, ShieldCheck, RefreshCw, ExternalLink } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../services/api'
import Modal from '../../components/common/Modal'
import Button from '../../components/common/Button'
import './SubscriptionPage.css'

const COPY = {
  FREE: { description: 'Free starter plan for micro teams and early startups.', features: ['Up to 15 active employees', '1 branch included', 'Employee records & directory', 'Attendance & leave tracking', 'Basic payslip generation', 'Free starter · No credit card required'] },
  BASIC: { description: 'Essential compliance and payroll for growing teams.', features: ['Up to 50 employees', '2 branches included', 'India Statutory Payroll (PF, ESI, PT, TDS)', 'Biometric & web attendance integration', 'Document & letter generation', 'Salary register & accounting ledger'] },
  STANDARD: { description: 'Multi-branch operations and advanced workforce management.', features: ['Up to 200 employees', '5 branches included', 'Everything in Basic', 'Cross-branch admin access', 'Department rosters & rotating shifts', 'Statutory compliance review & audit logs'] },
  ENTERPRISE: { description: 'Full-scale platform for unlimited growth and customization.', features: ['Unlimited employees & branches', 'Everything in Standard', 'Custom roles & granular permissions', 'Multi-entity accounting & consolidation', 'Priority onboarding & dedicated support'] },
}
const money = (minor, currency = 'INR') => new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: minor % 100 ? 2 : 0 }).format(minor / 100)
const date = value => value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date(value)) : 'Not recorded'
const billingDate = value => value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }).format(new Date(value)) : 'Not recorded'
const included = value => value ? <Check size={17} aria-label="Included" /> : <Minus size={17} aria-label="Not included" />
function redirectToRazorpay(url) {
  const target = new URL(url)
  if (target.protocol !== 'https:' || !['rzp.io', 'razorpay.com'].includes(target.hostname)) throw new Error('Invalid payment destination')
  window.location.assign(target.href)
}

export default function SubscriptionPage() {
  const { id: organizationId } = useParams()
  const selectedCompanyId = useSelector(state => state.auth.selectedCompanyId)
  const user = useSelector(state => state.auth.user)
  const roles = useSelector(state => state.auth.roles)
  const branchFilter = useSelector(state => state.auth.enterpriseBranchFilter)
  const companies = useSelector(state => state.platform.companies)
  const companyId = selectedCompanyId || (!roles.includes('PLATFORM_SUPER_ADMIN') ? branchFilter || user?.companyId : null)
  const company = companies.find(item => String(item.id) === String(companyId))
  if (!roles.some(role => ['PLATFORM_SUPER_ADMIN', 'PLATFORM_BILLING', 'ENTERPRISE_ADMIN'].includes(role))) return <div className="subscription-page"><h1 className="text-2xl font-bold">Subscription required</h1><p className="billing-notice">Your organization administrator can review billing and renew workspace access. Contact them for help.</p></div>
  return <CompanySubscription key={organizationId ? `org-${organizationId}` : companyId || 'none'} companyId={companyId} organizationId={organizationId} companyName={company?.name} />
}

function CompanySubscription({ companyId, organizationId, companyName }) {
  const [searchParams] = useSearchParams()
  const returned = searchParams.get('checkout')
  const [yearly, setYearly] = useState(false)
  const [catalog, setCatalog] = useState(null)
  const [snapshot, setSnapshot] = useState(null)
  const [error, setError] = useState('')
  const [catalogError, setCatalogError] = useState('')
  const [pendingPlan, setPendingPlan] = useState(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [revision, setRevision] = useState(0)
  const [invoicePage, setInvoicePage] = useState(0)

  useEffect(() => {
    let cancelled = false
    api.get('/billing/catalog').then(({ data }) => { if (!cancelled) setCatalog(data) })
      .catch(err => { if (!cancelled) setCatalogError(err.response?.data?.message || 'Could not load pricing. Refresh to try again.') })
    return () => { cancelled = true }
  }, [revision])

  useEffect(() => {
    if (!companyId && !organizationId) return
    let cancelled = false
    api.get(organizationId ? `/billing/organizations/${organizationId}` : `/billing/companies/${companyId}`, { params: { page: invoicePage } }).then(({ data }) => {
      if (!cancelled) { setSnapshot(data); setError('') }
    }).catch(err => { if (!cancelled) setError(err.response?.data?.message || 'Could not load the subscription. Try refreshing.') })
    return () => { cancelled = true }
  }, [companyId, organizationId, revision, invoicePage])

  useEffect(() => {
    if (returned !== 'success' || !snapshot?.organizationId) return
    let cancelled = false
    let attempts = 0
    const timer = setInterval(() => {
      if (++attempts > 10) { clearInterval(timer); return }
      api.post(`/billing/organizations/${snapshot.organizationId}/refresh`).then(({ data }) => {
        if (!cancelled) {
          setSnapshot(previous => ({ ...previous, ...data }))
          if (!data.legacyAccess && data.accessAllowed) clearInterval(timer)
        }
      }).catch(() => { /* Retry briefly; manual refresh remains available. */ })
    }, 3000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [returned, snapshot?.organizationId])


  const ready = !!snapshot && !error
  const plans = (catalog?.plans || []).map(plan => ({ ...plan, ...COPY[plan.id] }))
  const manual = !!catalog?.manualAvailable && !snapshot?.portalAvailable
  const currentPlan = snapshot?.plan
  const refresh = async () => {
    if (!snapshot?.organizationId) { setRevision(value => value + 1); return }
    setRefreshing(true)
    try {
      if (snapshot.checkoutAvailable) await api.post(`/billing/organizations/${snapshot.organizationId}/refresh`)
      setRevision(value => value + 1)
    } catch (err) { toast.error(err.response?.data?.message || 'Could not refresh billing') }
    finally { setRefreshing(false) }
  }
  const openPortal = async () => {
    if (!ready || saving) return
    setSaving(true)
    try {
      const { data } = await api.post(`/billing/organizations/${snapshot.organizationId}/cancel`)
      setSnapshot(previous => ({ ...previous, ...data }))
      setConfirmCancel(false)
      toast.success(data.cancelAtPeriodEnd ? 'Renewal will stop at the end of the paid period' : 'Subscription cancelled')
    } catch (err) { toast.error(err.response?.data?.message || 'Could not cancel renewal') }
    finally { setSaving(false) }
  }
  const checkout = async () => {
    if (!pendingPlan || !ready || saving) return
    setSaving(true)
    try {
      if (pendingPlan.id === 'FREE') {
        const { data } = await api.post(`/billing/organizations/${snapshot.organizationId}/free-activation`)
        setSnapshot(previous => ({ ...previous, ...data }))
        setPendingPlan(null)
        toast.success(`Free plan active until ${date(data.paidUntil)}`)
        return
      }
      if (manual) {
        const { data } = await api.post(`/billing/organizations/${snapshot.organizationId}/manual-activation`, { plan: pendingPlan.id, cycle: yearly ? 'YEARLY' : 'MONTHLY', requestId: pendingPlan.requestId, reason: 'Temporary payment bypass requested by platform administrator' })
        setSnapshot(previous => ({ ...previous, ...data }))
        setPendingPlan(null)
        toast.success(`Access activated until ${date(data.paidUntil)}`)
        return
      }
      const { data } = await api.post(`/billing/organizations/${snapshot.organizationId}/checkout`, { plan: pendingPlan.id, cycle: yearly ? 'YEARLY' : 'MONTHLY' })
      redirectToRazorpay(data.url)
    } catch (err) { toast.error(err.response?.data?.message || err.message || 'Could not start checkout'); setSaving(false) }
    finally { setSaving(false) }
  }

  return <div className="subscription-page">
    <header className="pricing-heading">
      <span className="pricing-eyebrow"><Sparkles size={14} /> PLANS & PRICING</span>
      <h1>A little investment.<br /><span>A better workday.</span></h1>
      <p>Simple plans for your people, your branches, and whatever comes next.</p>
      <div className="pricing-billing" role="group" aria-label="Compare billing periods">
        <button type="button" aria-pressed={!yearly} onClick={() => setYearly(false)} disabled={saving || !!pendingPlan}>Monthly</button>
        <button type="button" aria-pressed={yearly} onClick={() => setYearly(true)} disabled={saving || !!pendingPlan}>Yearly · Save 2 months</button>
      </div>
      <small>{manual ? 'Fixed package pricing in INR · temporary manual activation collects no payment' : catalog?.checkoutAvailable ? 'Prices in INR (excl. 18% GST) · per organization · 18% GST added at checkout' : 'Fixed package pricing in INR · paid checkout is being configured'}</small>
    </header>
    <div className="pricing-organization">
      <div><Building2 size={19} /><span>Subscription for</span></div>
      <strong className="pricing-organization-name">{organizationId ? snapshot?.organizationName || 'Loading organization…' : snapshot?.companyName || companyName || (companyId ? 'Loading selected company…' : 'No company selected')}</strong>
      {snapshot?.organizationId && <span className="whitespace-nowrap rounded-md border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-600" aria-label="Organization ID">{formatOrganizationId(snapshot.organizationId)}</span>}
      {ready && <span className="pricing-current"><span />{snapshot.legacyAccess ? 'Legacy access · choose a plan' : `${currentPlan}${snapshot.cycle ? ` · ${snapshot.cycle.toLowerCase()}` : ''}`}</span>}
      <p className="pricing-organization-hint">{companyId || organizationId ? `One subscription covers ${snapshot?.organizationName || 'this organization'}, its head office, and all branches.` : 'Select a company in the top bar to view and manage its subscription.'}</p>
    </div>
    {(error || catalogError) && <div role="alert" className="pricing-error">{error || catalogError} <button type="button" onClick={refresh}>Retry</button></div>}
    {manual && <div className="billing-notice">Temporary payment bypass enabled. Activate or renew a plan without payment. Each activation is recorded and expires at the end of the selected term.</div>}
    {catalog && !catalog.checkoutAvailable && !manual && <div className="billing-notice">Free is available without payment. Paid checkout requires the platform administrator to finish Razorpay setup.</div>}
    {returned === 'cancelled' && <p className="billing-notice">Checkout was cancelled. Your current subscription has not changed.</p>}
    {returned === 'success' && <p className="billing-notice" role="status">{ready && !snapshot.legacyAccess && snapshot.accessAllowed ? 'Payment confirmed. Your subscription is active.' : 'Waiting for Razorpay payment confirmation. Access updates after a paid invoice is verified; use Refresh if confirmation is delayed.'}</p>}

    {ready && <section className="billing-summary" aria-label="Subscription dates and renewal">
      <div className="billing-summary-title"><div><span className="pricing-section-label">YOUR SUBSCRIPTION</span><h2>{snapshot.organizationName}</h2></div><span className={`billing-status ${snapshot.accessAllowed ? 'is-active' : 'is-inactive'}`}>{snapshot.status.replaceAll('_', ' ')}</span></div>
      {snapshot.legacyAccess && <p className="billing-notice">Your organization has legacy access with no subscription selected. Choose Free access for up to 15 active employees, or a monthly or yearly paid plan below. Start and expiry dates are recorded when the plan is activated; legacy access continues until then.</p>}
      {!snapshot.accessAllowed && <p className="pricing-error">{snapshot.plan === 'FREE' ? 'Your Free access has ended. Choose a paid plan to continue using this organization’s workspace.' : snapshot.status === 'PAST_DUE' || snapshot.status === 'UNPAID' ? 'Payment is overdue. Open the Razorpay payment link or contact support to update your payment method.' : 'An active paid subscription is required to use this organization’s workspace.'}</p>}
      {snapshot.plan === 'FREE' && !snapshot.legacyAccess && <p className="billing-notice">Free plan · up to 15 active employees and 1 branch. Upgrade anytime to unlock additional capacity and features.</p>}
      {snapshot.manualAccess && <p className="billing-notice">Manual access · no payment collected. Renew manually before access expires; no automatic charges.</p>}
      {snapshot.cancelAtPeriodEnd && !snapshot.manualAccess && <p className="billing-notice">Renewal is cancelled. Paid access continues until {date(snapshot.paidUntil)}.</p>}
      {snapshot.syncWarning && <p className="billing-notice">The last Razorpay synchronization failed. Refresh billing or contact the platform administrator.</p>}
      <dl className="billing-dates">
        {[['Subscription started', snapshot.startedAt], ['Current period starts', snapshot.periodStart], [snapshot.manualAccess || snapshot.plan === 'FREE' ? 'Access until' : 'Paid through', snapshot.paidUntil], [snapshot.plan === 'FREE' ? 'Automatic renewal' : snapshot.manualAccess ? 'Renewal due' : 'Next renewal', snapshot.nextRenewalAt]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{snapshot.plan === 'FREE' && label === 'Automatic renewal' ? 'No · choose a paid plan' : label === 'Next renewal' && snapshot.cancelAtPeriodEnd ? 'Not renewing' : billingDate(value)}</dd></div>)}
      </dl>
      {snapshot.pricingModel === 'EXISTING_PER_USER' && <p className="billing-notice">Your current subscription retains its existing user capacity and expiry. The fixed package and its full included-user limit apply at your next activation or renewal.</p>}
      <div className="billing-summary-actions"><small>Dates shown in IST. {snapshot.manualAccess ? 'No payment collected. Manual renewal required.' : snapshot.amountMinor != null ? `${money(snapshot.amountMinor, snapshot.currency)} / ${snapshot.cycle === 'YEARLY' ? 'year' : 'month'}.` : ''}{snapshot.hasPaidSubscription && !snapshot.cancelAtPeriodEnd ? ' Renews automatically through Razorpay.' : ''}</small>
        <div><Button variant="secondary" size="sm" onClick={refresh} disabled={refreshing || saving}><RefreshCw size={14} className={refreshing ? 'mr-2 animate-spin' : 'mr-2'} />Refresh</Button>
          {snapshot.hasPaidSubscription && !snapshot.cancelAtPeriodEnd && <Button size="sm" loading={saving} onClick={() => setConfirmCancel(true)}>Cancel renewal</Button>}</div></div>
    </section>}

    {!catalog && !catalogError && <p role="status" className="billing-notice">Loading subscription plans…</p>}
    <div className="pricing-cards">
      {plans.map(plan => {
        const current = currentPlan === plan.id && !snapshot?.legacyAccess && (plan.id === 'FREE' || snapshot?.hasPaidSubscription || snapshot?.manualAccess)
        const freeUsed = plan.id === 'FREE' && snapshot?.freeUsed
        const exceedsUsage = ready && ((plan.maxEmployees != null && snapshot.usage.currentEmployees > plan.maxEmployees) || (plan.maxBranches != null && snapshot.usage.currentBranches > plan.maxBranches))
        const amount = yearly ? plan.yearlyAmountMinor : plan.monthlyAmountMinor
        return <article key={plan.id} className={`pricing-card ${plan.id === 'STANDARD' ? 'pricing-featured' : ''}`}>
          {plan.id === 'STANDARD' && <div className="pricing-popular"><Sparkles size={13} /> THE GROWING TEAM FAVORITE</div>}
          <div className="pricing-card-title"><h2>{plan.name}</h2>{current && <span>Current plan</span>}</div>
          <p className="pricing-description">{plan.description}</p>
          <div className="pricing-price"><strong>{money(yearly ? Math.round(amount / 12) : amount)}</strong><span>{plan.id === 'FREE' ? '/ free starter' : yearly ? '/ mo (billed yearly)' : '/ month'}</span></div>
          {plan.id !== 'FREE' && <p className="mt-0.5 text-xs text-slate-500 font-medium">+ 18% GST applicable</p>}
          <p className="pricing-cadence">{plan.id === 'FREE' ? 'Free starter plan · up to 15 employees · no card needed' : yearly ? `${money(amount)} billed yearly (Save 2 months) + GST` : 'Fixed package, billed monthly + GST'}</p>
          <button className="pricing-plan-button" type="button" disabled={!ready || (plan.id !== 'FREE' && !catalog.checkoutAvailable && !manual) || freeUsed || exceedsUsage || saving || snapshot?.hasPaidSubscription}
            onClick={() => !snapshot.hasPaidSubscription && setPendingPlan({ ...plan, requestId: crypto.randomUUID() })}>{freeUsed ? current && snapshot.accessAllowed ? 'Current plan' : 'Free month already used' : exceedsUsage ? 'Current usage exceeds this plan' : snapshot?.hasPaidSubscription ? 'Current subscription active' : plan.id === 'FREE' ? 'Choose Free' : manual ? `${current && snapshot?.cycle === (yearly ? 'YEARLY' : 'MONTHLY') ? 'Renew' : 'Activate'} ${plan.name}` : `Checkout ${plan.name}`}<ArrowRight size={16} /></button>
          <div className="pricing-features-heading">{plan.id === 'FREE' ? 'Your team’s first workspace' : plan.id === 'BASIC' ? 'The essentials, together' : plan.id === 'STANDARD' ? 'Space to do more' : 'Room for every team'}</div>
          <ul>{plan.features.map(feature => <li key={feature}><Check size={17} /><span>{feature}</span></li>)}</ul>
        </article>
      })}
    </div>
    <p className="pricing-payment-note"><ShieldCheck size={16} />{manual ? 'Payment bypass is temporary and available to platform administrators. No card or Razorpay account is required for manual activation.' : 'Secure hosted checkout and automatic renewals through Razorpay. Card details are not stored in AccrueHR. Cancel renewal from this page.'}</p>
    {ready && <section className="pricing-usage" aria-label="Current organization usage">
      <div><span className="pricing-section-label">YOUR WORKSPACE TODAY</span><h2>{snapshot.organizationName}</h2></div>
      {[{ label: 'Employees', count: snapshot.usage.currentEmployees, max: snapshot.usage.maxEmployees, icon: <Users size={19} /> }, { label: 'Branches', count: snapshot.usage.currentBranches, max: snapshot.usage.maxBranches, icon: <Building2 size={19} /> }].map(({ label, count, max, icon }) => <div className="pricing-usage-metric" key={label}>{icon}<div><strong>{count ?? 0} <span>/ {max == null ? 'Unlimited' : max}</span></strong><small>{label}</small></div></div>)}
    </section>}

    {ready && <section className="billing-history"><span className="pricing-section-label">BILLING HISTORY</span><h2>Invoices & payments</h2>
      {!snapshot.invoices.length ? <p className="billing-empty">No payment invoices yet. Your first invoice appears here after a successful charge.</p> : <div className="pricing-table-scroll"><table><thead><tr><th>Date</th><th>Invoice</th><th>Status</th><th>Paid</th><th>Receipt</th></tr></thead><tbody>{snapshot.invoices.map(invoice => <tr key={invoice.id}><td>{date(invoice.createdAt)}</td><td>{invoice.number || invoice.id}</td><td>{invoice.status}</td><td>{money(invoice.amountPaid, invoice.currency)}</td><td>{invoice.hostedInvoiceUrl ? <a href={invoice.hostedInvoiceUrl} target="_blank" rel="noopener noreferrer">View invoice <ExternalLink size={12} /></a> : 'Not available'}</td></tr>)}</tbody></table></div>}
      {snapshot.invoicePages > 1 && <div className="billing-pagination"><Button size="sm" variant="secondary" disabled={!invoicePage} onClick={() => setInvoicePage(page => page - 1)}>Previous</Button><span>Page {invoicePage + 1} of {snapshot.invoicePages}</span><Button size="sm" variant="secondary" disabled={invoicePage + 1 >= snapshot.invoicePages} onClick={() => setInvoicePage(page => page + 1)}>Next</Button></div>}
    </section>}
    {!!snapshot?.manualActivations?.length && <section className="billing-history"><span className="pricing-section-label">ACCESS HISTORY</span><h2>Manual activations</h2><div className="pricing-table-scroll"><table><thead><tr><th>Activated</th><th>Administrator</th><th>Plan & term</th><th>Access until</th><th>Collected</th></tr></thead><tbody>{snapshot.manualActivations.map(event => { const details = JSON.parse(event.details); return <tr key={event.id}><td>{billingDate(event.processedAt)}</td><td>{event.actor}</td><td>{details.plan} · {details.cycle.toLowerCase()}</td><td>{billingDate(details.endsAt)}</td><td>No payment</td></tr> })}</tbody></table></div></section>}
    {!!plans.length && <section className="pricing-comparison"><span className="pricing-section-label">THE DETAILS, SIDE BY SIDE</span><h2>Find your fit.</h2><div className="pricing-table-scroll"><table><caption className="sr-only">Compare HRMS subscription plan limits and features</caption><thead><tr><th scope="col">What’s included</th>{plans.map(plan => <th scope="col" key={plan.id}>{plan.name}</th>)}</tr></thead><tbody>{[
      ['Maximum users per plan', ...plans.map(plan => plan.maxEmployees ?? 'Unlimited')],
      ['Branches', ...plans.map(plan => plan.maxBranches ?? 'Unlimited')],
      ['Employee records & documents', ...plans.map(() => true)],
      ['Attendance & leave tracking', ...plans.map(() => true)],
      ['India Statutory Payroll (PF, ESI, PT, TDS)', ...plans.map(plan => plan.id !== 'FREE')],
      ['Biometric attendance integration', ...plans.map(plan => plan.id !== 'FREE')],
      ['Cross-branch access', ...plans.map(plan => plan.crossBranch)],
      ['Multi-entity consolidation', ...plans.map(plan => plan.id === 'ENTERPRISE')],
      ['Dedicated onboarding & support', ...plans.map(plan => plan.id === 'ENTERPRISE')]
    ].map(([label, ...values]) => <tr key={label}><th scope="row">{label}</th>{values.map((value, index) => <td key={index}>{typeof value === 'boolean' ? included(value) : value}</td>)}</tr>)}</tbody></table></div></section>}
    <section className="pricing-faq"><div><span className="pricing-section-label">GOOD TO KNOW</span><h2>A few helpful answers.</h2></div><div>
      <details><summary>How do renewal dates work?</summary><p>Razorpay sets the monthly or yearly billing period. AccrueHRMS records the paid-through date only after a paid invoice is verified. A failed payment does not extend access.</p></details>
      <details><summary>What happens if I cancel?</summary><p>Use Cancel renewal to stop future charges. Paid access continues until the paid-through date. Your employee records are retained after expiry.</p></details>
      <details><summary>Can I change plans?</summary><p>Cancel the current subscription before selecting another package. Access to a new package starts after payment is verified. If your usage exceeds a lower plan’s limits, you cannot add more employees or branches until usage fits the plan.</p></details>
      <details><summary>How does package pricing and GST work?</summary><p>Each organization selects one package with included user and branch limits. Prices are subject to 18% GST (SAC: 998313). A tax invoice with GSTIN is issued upon payment. Annual billing includes a 2-month discount (pay for 10 months, get 12 months).</p></details>
    </div></section>
    <Modal open={confirmCancel} onClose={() => { if (!saving) setConfirmCancel(false) }} title="Cancel automatic renewal?" size="sm"
      footer={<div className="flex justify-end gap-3"><Button variant="secondary" disabled={saving} onClick={() => setConfirmCancel(false)}>Keep renewal</Button><Button loading={saving} onClick={openPortal}>Cancel renewal</Button></div>}>
      <p className="text-sm text-slate-600">Razorpay will stop future charges for this subscription. Your organization keeps its paid access until {billingDate(snapshot?.paidUntil)}.</p>
    </Modal>
    <Modal open={!!pendingPlan} onClose={() => { if (!saving) setPendingPlan(null) }} title={`${pendingPlan?.id === 'FREE' || manual ? 'Activate' : 'Checkout'} ${pendingPlan?.name || ''}`} size="md"
      footer={<div className="flex justify-end gap-3"><Button variant="secondary" disabled={saving} onClick={() => setPendingPlan(null)}>Cancel</Button><Button loading={saving} onClick={checkout}>{pendingPlan?.id === 'FREE' ? 'Activate Free' : manual ? 'Activate without payment' : 'Continue to Razorpay payment'}</Button></div>}>
      {(() => {
        const baseAmount = pendingPlan ? (yearly ? pendingPlan.yearlyAmountMinor : pendingPlan.monthlyAmountMinor) : 0
        const gstAmount = Math.round(baseAmount * 0.18)
        const totalAmount = baseAmount + gstAmount
        const isFree = pendingPlan?.id === 'FREE' || manual

        return <div className="space-y-4">
          <p className="text-sm text-slate-600">
            <strong>{snapshot?.organizationName}</strong> · {pendingPlan?.name} · {pendingPlan?.id === 'FREE' ? 'Free Starter plan' : `${yearly ? 'Yearly' : 'Monthly'} package`}
          </p>
          {!isFree && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Base Subscription ({yearly ? 'Annual' : 'Monthly'})</span>
                <span className="font-medium text-slate-800">{money(baseAmount)}</span>
              </div>
              {yearly && (
                <div className="flex justify-between text-xs text-emerald-700 font-medium">
                  <span>Annual Billing Discount</span>
                  <span>2 Months Free Applied</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>GST (18%)</span>
                <span className="font-medium text-slate-800">{money(gstAmount)}</span>
              </div>
              <div className="border-t border-slate-200 pt-2.5 flex justify-between items-baseline">
                <div>
                  <span className="font-semibold text-slate-900 block">Total Amount Payable</span>
                  <span className="text-[11px] text-slate-500">Includes 18% GST (SAC: 998313)</span>
                </div>
                <span className="text-xl font-bold text-slate-900">{money(totalAmount)}</span>
              </div>
            </div>
          )}
          {isFree && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-lg font-semibold text-emerald-900">₹0 · Free Starter Plan</p>
              <p className="text-xs text-emerald-700 mt-1">Up to 15 active employees and 1 branch included. No credit card or payment required.</p>
            </div>
          )}
          <p className="text-xs text-slate-500">
            {pendingPlan?.id === 'FREE'
              ? 'Activate the Free plan for up to 15 active employees and 1 branch. Upgrade anytime to unlock statutory payroll, biometric attendance, and additional capacity.'
              : manual
                ? `Activate ${yearly ? 'one year' : 'one month'} of manual access. Renewing extends current expiry. This action is recorded against your admin account.`
                : 'You will be redirected to Razorpay to complete your payment securely. Razorpay supports UPI, NetBanking, Credit/Debit cards and EMI. A GST-compliant invoice is generated upon payment.'}
          </p>
        </div>
      })()}
    </Modal>
  </div>
}
