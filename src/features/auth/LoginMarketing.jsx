import { useState } from 'react'
import { Check, Users, Clock3, BriefcaseBusiness, ArrowUpRight } from 'lucide-react'

export function LoginBrand() {
  return (
    <a className="login-brand" href="#top" aria-label="AccrueHRMS home">
      <img src="/accrue-mark.svg" alt="" width="40" height="40" />
      <span>Accrue<span className="login-brand-hr">HRMS</span><small>PEOPLE. WORK. TOGETHER.</small></span>
    </a>
  )
}

const PLAN_DATA = [
  {
    id: 'FREE',
    name: 'Free / Starter',
    kicker: 'EARLY STARTUPS & MICRO TEAMS',
    monthlyPrice: 0,
    yearlyPrice: 0,
    limits: 'Up to 15 employees · 1 branch',
    keyPitch: 'Core HR, Employee directory, Attendance, Leave, Basic Payslips',
    features: [
      'Core HR & Employee directory',
      'Attendance & Leave management',
      'Basic payslip generation',
      '1 branch included',
      'Free Forever · No card required',
    ],
    cta: 'Get Started Free',
    ctaLink: '#signin',
  },
  {
    id: 'BASIC',
    name: 'Basic (Growth)',
    kicker: 'GROWING STARTUPS (15–50 STAFF)',
    monthlyPrice: 999,
    yearlyPrice: 9990,
    yearlySavings: 1998,
    gstMonthly: 179.82,
    gstYearly: 1798.20,
    totalMonthly: 1178.82,
    totalYearly: 11788.20,
    limits: 'Up to 50 employees · 2 branches',
    keyPitch: 'India Statutory Compliance (PF, ESI, PT, TDS), Biometric sync, Document generation',
    features: [
      'Everything in Free',
      'India Statutory Compliance (PF, ESI, PT, TDS)',
      'Biometric sync & web punches',
      'Document & letter generation',
      '2 branches included',
    ],
    cta: 'Choose Basic',
    ctaLink: '#signin',
  },
  {
    id: 'STANDARD',
    name: 'Standard (Scale)',
    kicker: 'MID-SIZED COMPANIES (50–200 STAFF)',
    monthlyPrice: 2999,
    yearlyPrice: 29990,
    yearlySavings: 5998,
    gstMonthly: 539.82,
    gstYearly: 5398.20,
    totalMonthly: 3538.82,
    totalYearly: 35388.20,
    limits: 'Up to 200 employees · 5 branches',
    keyPitch: 'Cross-branch access, Multi-entity accounting, Audit logs, Shift & roster management',
    features: [
      'Everything in Basic',
      'Cross-branch access & admin control',
      'Multi-entity accounting & ledger',
      'Audit logs, Shift & roster management',
      '5 branches included',
    ],
    cta: 'Choose Standard',
    ctaLink: '#signin',
  },
  {
    id: 'ENTERPRISE',
    name: 'Enterprise',
    kicker: 'LARGE ORGS & MULTI-BRANCH',
    monthlyPrice: 6999,
    yearlyPrice: 69990,
    yearlySavings: 13998,
    gstMonthly: 1259.82,
    gstYearly: 12598.20,
    totalMonthly: 8258.82,
    totalYearly: 82588.20,
    limits: 'Unlimited employees & branches',
    keyPitch: 'Unlimited scale, Custom roles, Dedicated support, Priority assistance',
    features: [
      'Everything in Standard',
      'Unlimited scale & branches',
      'Custom roles & granular permissions',
      'Dedicated support & priority assistance',
    ],
    cta: 'Contact Sales',
    ctaLink: 'mailto:hr@accruetechnologies.com?subject=AccrueHRMS%20Enterprise%20Enquiry',
  },
]

export default function LoginMarketing() {
  const [yearly, setYearly] = useState(false)

  return (
    <>
      <section className="login-benefits" id="features" aria-label="What you can do with AccrueHRMS">
        <div className="login-section-heading">
          <span className="login-eyebrow">LESS ADMIN. MORE HUMAN.</span>
          <h2>One place for your people and their work.</h2>
        </div>
        <div className="login-benefit-grid">
          {[
            { icon: Users, title: 'Know your people', copy: 'Keep employee records, documents and organization details together.' },
            { icon: Clock3, title: 'Make every day simpler', copy: 'Manage attendance, leave requests and payroll in one workspace.' },
            { icon: BriefcaseBusiness, title: 'Grow your team', copy: 'Publish openings, receive applications and guide people through onboarding.' },
          ].map(({ icon: Icon, title, copy }) => (
            <article key={title}>
              <span className="login-feature-icon"><Icon size={22} /></span>
              <h3>{title}</h3>
              <p>{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="login-pricing" id="plans" aria-labelledby="login-plans-title">
        <div className="login-section-heading">
          <span className="login-eyebrow">ROOM TO GROW</span>
          <h2 id="login-plans-title">A plan for every stage of your team.</h2>
          <p>Get started Free Forever for up to 15 employees. Upgrade anytime as your team grows.</p>
          <div className="login-billing-toggle" role="group" aria-label="Billing cycle">
            <button
              type="button"
              className={!yearly ? 'active' : ''}
              onClick={() => setYearly(false)}
            >
              Monthly billing
            </button>
            <button
              type="button"
              className={yearly ? 'active' : ''}
              onClick={() => setYearly(true)}
            >
              Annual billing
              <span className="badge-save">Save 2 Months</span>
            </button>
          </div>
        </div>

        <div className="login-plan-grid">
          {PLAN_DATA.map((plan) => {
            const isFree = plan.id === 'FREE'
            const baseAmount = yearly ? plan.yearlyPrice : plan.monthlyPrice
            const formattedPrice = isFree
              ? '₹0'
              : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(baseAmount)

            const formattedTotal = isFree
              ? '₹0 (No card required)'
              : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(yearly ? plan.totalYearly : plan.totalMonthly)

            return (
              <article key={plan.id} className={`login-plan ${isFree ? 'login-plan-free' : ''}`}>
                <span className="login-plan-kicker">{plan.kicker}</span>
                <h3>{plan.name}</h3>

                <div className="login-plan-price">
                  {formattedPrice}
                  <span>{isFree ? ' (Free Forever)' : yearly ? ' / year' : ' / mo'}</span>
                </div>

                {yearly && !isFree && plan.yearlySavings && (
                  <div className="login-plan-savings">
                    Save ₹{plan.yearlySavings.toLocaleString('en-IN')} (2 months free)
                  </div>
                )}

                <p className="login-plan-limits">{plan.limits}</p>

                <div className="login-plan-gst">
                  {isFree ? (
                    <span>₹0 · No card required</span>
                  ) : (
                    <span>+ 18% GST Added at Checkout (Total: {formattedTotal})</span>
                  )}
                </div>

                <ul>
                  {plan.features.map((feat) => (
                    <li key={feat}>
                      <Check size={15} />
                      {feat}
                    </li>
                  ))}
                </ul>

                <a href={plan.ctaLink}>
                  {plan.cta}
                  <ArrowUpRight size={16} />
                </a>
              </article>
            )
          })}
        </div>

        <p className="login-pricing-note">
          Prices in INR (excl. 18% GST). Razorpay subscription charges the exact GST-inclusive amount automatically at checkout.
          Already have a workspace? <a href="#signin">Sign in to manage your plan.</a>
        </p>
      </section>

      <footer className="login-footer">
        <span>© {new Date().getFullYear()} Accrue Technologies · AccrueHRMS</span>
        <a href="mailto:hr@accruetechnologies.com">Contact us</a>
        <a href="/privacy-policy">Privacy policy</a>
        <a href="/terms-and-conditions">Terms & conditions</a>
        <a href="#signin">Sign in ↑</a>
      </footer>
    </>
  )
}
