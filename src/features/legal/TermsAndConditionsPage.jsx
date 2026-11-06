import { Link } from 'react-router-dom'
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Gavel,
  Globe2,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  Receipt,
  Scale,
  Server,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UsersRound,
} from 'lucide-react'

function SectionTitle({ number, title, icon: Icon, color = 'text-[#0B3D91]' }) {
  return (
    <div className={`mb-4 flex items-center gap-3 border-b border-slate-200 pb-3 ${color}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50">
        <Icon className="h-6 w-6" />
      </span>
      <h2 className="text-[21px] font-bold tracking-tight text-[#062B74] sm:text-[24px]">
        {number}. {title}
      </h2>
    </div>
  )
}

function Subsection({ number, title, icon: Icon, children }) {
  return (
    <section className="mb-7 max-w-6xl">
      <div className="mb-3 flex items-center gap-3 border-b border-slate-200 pb-2.5 text-[#0B3D91]">
        <Icon className="h-6 w-6 shrink-0" />
        <h3 className="text-[18px] font-bold tracking-tight sm:text-[21px]">
          {number} &nbsp;{title}
        </h3>
      </div>
      {children}
    </section>
  )
}

function BulletList({ items }) {
  return (
    <ul className="grid gap-x-10 gap-y-2.5 pl-1 text-sm font-medium leading-[1.6] text-slate-600 sm:text-base">
      {items.map((item) => (
        <li key={item} className="flex gap-3">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0B3D91]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

export default function TermsAndConditionsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-3 sm:px-10 lg:px-16">
          <Link to="/login" aria-label="Accrue Technologies login" className="flex items-center gap-3">
            <img src="/accrue-mark.svg" alt="" className="h-10 w-10 object-contain sm:h-12 sm:w-12" />
            <span className="text-lg font-black tracking-[0.12em] text-[#102a43] sm:text-xl">
              ACCRUE<span className="text-[#347fc8]">.</span>
            </span>
            <span className="text-[9px] font-bold tracking-[0.2em] text-[#52708e] sm:text-[10px]">
              TECHNOLOGIES
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/privacy-policy"
              className="hidden sm:inline-flex text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[#0B3D91] transition hover:bg-blue-50"
            >
              <ArrowLeft className="h-4 w-4" /> Back to login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full">
        {/* Hero Section */}
        <section className="w-full bg-gradient-to-r from-[#062B74] via-[#0B3D91] to-[#1769D1] py-10 text-white sm:py-12">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-6 sm:px-10 lg:grid-cols-[1fr_auto] lg:px-16">
            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-blue-200">
                Accrue Technologies · Legal Terms
              </p>
              <h1 className="text-[28px] font-black tracking-tight sm:text-[40px]">
                Terms & Conditions
              </h1>
              <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3 sm:text-base">
                <p>
                  <strong>Effective Date:</strong>
                  <br />
                  6 November 2026
                </p>
                <p>
                  <strong>Platform:</strong>
                  <br />
                  AccrueHRMS
                </p>
                <p>
                  <strong>Entity:</strong>
                  <br />
                  Accrue Technologies
                </p>
              </div>
            </div>
            <Scale className="hidden h-36 w-36 text-blue-100/90 md:block" strokeWidth={1.4} />
          </div>
        </section>

        {/* Legal Text Body */}
        <article className="mx-auto w-full max-w-7xl bg-white px-6 py-8 sm:px-10 sm:py-9 lg:px-16">
          <div className="mb-8 max-w-6xl border-b border-slate-200 pb-6 text-[15px] font-medium leading-[1.6] text-slate-600 sm:text-base">
            <p className="text-[17px] font-bold leading-7 text-[#062B74] sm:text-lg">
              These Terms & Conditions constitute a legally binding agreement between you and Accrue Technologies.
            </p>
            <p className="mt-3">
              By accessing, browsing, subscribing to, or using the AccrueHRMS cloud software application (&ldquo;the Platform&rdquo;, &ldquo;the Service&rdquo;), you acknowledge that you have read, understood, and agree to be bound by all provisions set forth in this document.
            </p>
            <p className="mt-3">
              If you register an account on behalf of a company, organization, or employer, you confirm that you hold the legal authority to bind that entity to these Terms. If you do not agree with any part of these Terms, you must discontinue use of the platform immediately.
            </p>
          </div>

          {/* 1. Service Scope */}
          <SectionTitle number="1" title="Service Scope & License Grant" icon={Globe2} />
          <p className="mb-4 text-[15px] font-medium text-slate-600 sm:text-base">
            Accrue Technologies grants your organization a non-exclusive, non-transferable, revocable license to access and utilize AccrueHRMS for internal human resource, payroll, attendance, workforce management, and organizational administration.
          </p>
          <BulletList
            items={[
              'Core workforce features include Employee Directory, Department and Branch Management, and Role-Based Access Control.',
              'Time and attendance features include Shift Scheduling, Biometric Device Integration (ZKTeco ADMS), Punch Logs, and Regularisation Workflows.',
              'Payroll operations include Salary Component Setup, Automated Payslip Generation, Statutory Compliance (PF, ESI, PT, TDS), and Deductions.',
              'Talent operations include Job Postings, Candidate Pipeline Management, Interview Tracking, and Onboarding/Offboarding workflows.',
              'Enterprise modules include Document Generation, Helpdesk Tickets, Asset Tracking, and Project Work Records.',
            ]}
          />

          <div className="my-7 border-t border-slate-200" />

          {/* 2. User Accounts */}
          <SectionTitle number="2" title="User Accounts & Security" icon={LockKeyhole} />
          <Subsection number="2.1" title="Authentication & Credential Protection" icon={UserCheck}>
            <p className="text-[15px] font-medium leading-[1.6] text-slate-600 sm:text-base">
              Each user accesses the platform through individual login credentials. You are strictly responsible for maintaining the confidentiality of your password and authentication tokens. Any action performed through your authenticated account is attributed directly to you. In the event of unauthorized access or security breach, you must notify Accrue Technologies administrators immediately.
            </p>
          </Subsection>
          <Subsection number="2.2" title="Organizational Administrator Controls" icon={Building2}>
            <p className="text-[15px] font-medium leading-[1.6] text-slate-600 sm:text-base">
              Administrators hold exclusive authority to provision user accounts, allocate permissions, assign management tiers, adjust company configurations, and revoke employee access. Accrue Technologies executes account modifications only upon verified instruction from authorized administrators.
            </p>
          </Subsection>

          <div className="my-7 border-t border-slate-200" />

          {/* 3. Subscriptions, Invoicing & GST */}
          <SectionTitle number="3" title="Subscription Plans, Billing & India GST" icon={Receipt} />
          <Subsection number="3.1" title="Tier Limits & Free Forever Plan" icon={CheckCircle2}>
            <p className="mb-3 text-[15px] font-medium text-slate-600 sm:text-base">
              AccrueHRMS offers transparent, fixed-tier subscription plans:
            </p>
            <BulletList
              items={[
                'Free Starter: Supports up to 15 active employees and 1 company branch. Free forever with no credit card required.',
                'Basic (Growth): Supports up to 50 active employees and 2 company branches at ₹999/month or ₹9,990/year (2 months free).',
                'Standard (Scale): Supports up to 200 active employees and 5 company branches at ₹2,999/month or ₹29,990/year (2 months free).',
                'Enterprise: Supports unlimited active employees and unlimited branches at ₹6,999/month or ₹69,990/year (2 months free).',
              ]}
            />
          </Subsection>
          <Subsection number="3.2" title="18% Goods and Services Tax (GST)" icon={CreditCard}>
            <div className="my-3 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-sm leading-6 text-indigo-950 sm:text-base">
              In full compliance with the statutory taxation regulations of the Government of India, an 18% Goods and Services Tax (GST) is added directly to commercial subscription invoices at checkout. Organizations provide their valid GSTIN during checkout to receive compliant GST tax invoices for input tax credit claims.
            </div>
          </Subsection>
          <Subsection number="3.3" title="Payment Gateway & Automated Renewals" icon={Receipt}>
            <p className="text-[15px] font-medium leading-[1.6] text-slate-600 sm:text-base">
              All payment transactions are processed securely through certified payment gateways including Razorpay. Paid subscriptions renew automatically at the expiration of the chosen billing cycle (monthly or annually) unless explicitly cancelled by the organization before the renewal date.
            </p>
          </Subsection>

          <div className="my-7 border-t border-slate-200" />

          {/* 4. Customer Data Ownership */}
          <SectionTitle number="4" title="Customer Data Ownership & Protection" icon={ShieldCheck} />
          <p className="mb-4 text-[15px] font-medium leading-[1.6] text-slate-600 sm:text-base">
            Your organization retains 100% exclusive ownership of all employee records, attendance punches, payroll computations, letters, documents, and corporate data uploaded to or generated within the platform.
          </p>
          <BulletList
            items={[
              'Accrue Technologies acts strictly as a Data Processor on behalf of your organization (the Data Controller).',
              'We never sell, rent, lease, or monetize customer data to third-party advertisers or data brokers.',
              'Data is stored in isolated PostgreSQL tenant schemas with encryption in transit (HTTPS / TLS 1.3) and encryption at rest.',
              'Automated database backups run on structured daily schedules to prevent data loss.',
              'Organizations export their full attendance, payroll, employee, and ticket data at any time in standard formats (Excel, CSV, PDF).',
            ]}
          />

          <div className="my-7 border-t border-slate-200" />

          {/* 5. Attendance & Geofencing */}
          <SectionTitle number="5" title="Attendance Tracking & Location Policies" icon={MapPin} />
          <p className="text-[15px] font-medium leading-[1.6] text-slate-600 sm:text-base">
            Where your organization activates location-based attendance verification or geofencing, the platform captures geographical coordinates exclusively during check-in and check-out events. The platform does not engage in continuous background tracking. Captured coordinates serve strictly to verify that the employee is physically present at the authorized company branch or designated job site.
          </p>

          <div className="my-7 border-t border-slate-200" />

          {/* 6. Prohibited Activities */}
          <SectionTitle number="6" title="Acceptable Use & Prohibited Conduct" icon={ShieldAlert} />
          <p className="mb-4 text-[15px] font-medium text-slate-600 sm:text-base">
            Users agree not to engage in any of the following prohibited actions:
          </p>
          <BulletList
            items={[
              'Reverse engineering, decompiling, disassembling, or copying source code, algorithms, or database architectures.',
              'Attempting to bypass security safeguards, access controls, tenant isolation boundaries, or rate limits.',
              'Introducing viruses, worms, malware, automated scraping bots, or disruptive network loads.',
              'Impersonating another person or utilizing fraudulent corporate credentials.',
              'Uploading unlawful, defamatory, or infringing material into document repositories or communication channels.',
            ]}
          />

          <div className="my-7 border-t border-slate-200" />

          {/* 7. SLA & Availability */}
          <SectionTitle number="7" title="Service Availability & Maintenance" icon={Server} />
          <p className="text-[15px] font-medium leading-[1.6] text-slate-600 sm:text-base">
            Accrue Technologies targets 99.9% service availability for cloud-hosted environments. Scheduled maintenance is conducted during off-peak hours with advance notice posted to platform administrators. Emergency security updates and network maintenance are executed as required to safeguard system integrity.
          </p>

          <div className="my-7 border-t border-slate-200" />

          {/* 8. Cancellation & Termination */}
          <SectionTitle number="8" title="Cancellation, Suspension & Termination" icon={Clock3} />
          <p className="text-[15px] font-medium leading-[1.6] text-slate-600 sm:text-base">
            Organizations cancel subscriptions at any time directly through the Organization Billing portal. Upon cancellation, paid features remain active until the conclusion of the current prepaid billing period. Accrue Technologies reserves the right to suspend or terminate accounts that breach these Terms, engage in fraud, or fail to settle outstanding subscription invoices following formal reminder notices.
          </p>

          <div className="my-7 border-t border-slate-200" />

          {/* 9. Limitation of Liability */}
          <SectionTitle number="9" title="Limitation of Liability & Disclaimer" icon={Gavel} />
          <div className="my-3 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700 sm:text-base">
            The platform is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo; basis. Accrue Technologies expressly disclaims all warranties, express or implied, including warranties of merchantability and fitness for a particular purpose. To the maximum extent permitted by applicable Indian law, Accrue Technologies is not liable for indirect, incidental, special, punitive, or consequential damages resulting from platform downtime, data errors, or third-party service interruptions.
          </div>

          <div className="my-7 border-t border-slate-200" />

          {/* 10. Governing Law */}
          <SectionTitle number="10" title="Governing Law & Legal Jurisdiction" icon={Building2} />
          <p className="text-[15px] font-medium leading-[1.6] text-slate-600 sm:text-base">
            These Terms & Conditions are governed by and construed in accordance with the laws of India. Any legal disputes, controversies, or claims arising out of or related to these Terms or the use of AccrueHRMS fall under the exclusive jurisdiction of the competent courts located in Hyderabad, Telangana / Andhra Pradesh, India.
          </p>
        </article>
      </main>

      {/* Footer */}
      <footer className="bg-[#062B74] text-white">
        <div className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-16">
          <h2 className="text-xl font-black">11. Legal Contact & Inquiries</h2>
          <p className="mt-2 text-sm text-blue-100">
            For contractual inquiries, legal notices, or formal correspondence regarding these Terms & Conditions, contact Accrue Technologies:
          </p>
          <div className="mt-5 flex flex-col gap-3 text-sm sm:flex-row sm:gap-8">
            <a href="mailto:siva@accruetechnologies.com" className="flex items-center gap-2 font-semibold hover:text-blue-200">
              <Mail className="h-5 w-5" />
              siva@accruetechnologies.com
            </a>
            <a href="tel:+919381934911" className="flex items-center gap-2 font-semibold hover:text-blue-200">
              <Phone className="h-5 w-5" />
              +91 9381934911
            </a>
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/15 pt-5 text-xs text-blue-200">
            <span>© 2026 Accrue Technologies · AccrueHRMS. All rights reserved.</span>
            <div className="flex gap-4">
              <Link to="/privacy-policy" className="hover:underline">
                Privacy Policy
              </Link>
              <Link to="/terms-and-conditions" className="hover:underline">
                Terms & Conditions
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
