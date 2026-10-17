import { Link } from 'react-router-dom'
import {
  ArrowLeft, Bell, BriefcaseBusiness, Building2, CalendarCheck, CheckCircle2,
  Clock3, FileLock2, Gauge, Globe2, KeyRound, Laptop, LocateFixed, LockKeyhole,
  Mail, MapPin, Network, Phone, ShieldCheck, Smartphone, UserRound, UsersRound,
  Wrench,
} from 'lucide-react'
import brandLogo from '../../assets/the-greater-change-logo.png'

const personalInformation = [
  'Full name', 'Employee ID', 'Date of birth', 'Gender, where required by the organization',
  'Contact information', 'Email address', 'Phone number', 'Residential or correspondence address',
  'Department and designation', 'Employment details', 'Joining date', 'Reporting manager',
  'Work location', 'Employee profile photograph', 'Emergency contact information',
  'Documents uploaded or provided through the HRMS',
]

const workInformation = [
  'Attendance records', 'Check-in and check-out times', 'Working hours', 'Shift schedules',
  'Overtime records', 'Leave applications and approvals', 'Holiday schedules', 'Work assignments',
  'Attendance regularization requests',
  'Employee performance or workflow information, where enabled by the organization',
]

const technicalInformation = [
  ['Device type', Smartphone], ['Operating system and version', Gauge],
  ['Application version', BriefcaseBusiness], ['Device identifiers', Smartphone],
  ['IP address', Globe2], ['Network information', Network],
  ['Language and regional settings', Globe2], ['Crash reports', Gauge],
  ['Diagnostic information', Wrench], ['Login and security information', LockKeyhole],
]

const authenticationInformation = [
  ['Username or registered email address', UserRound], ['Authentication credentials', LockKeyhole],
  ['Authentication tokens', ShieldCheck], ['Session information', Clock3],
  ['Login history', Clock3], ['Security and access logs', CheckCircle2],
]

const uses = [
  ['Provide HRMS services and functionality', Gauge], ['Authenticate users', LockKeyhole],
  ['Manage employee profiles', UserRound], ['Process attendance and working hours', CalendarCheck],
  ['Manage leave and holiday requests', CalendarCheck], ['Support workforce management', UsersRound],
  ['Facilitate HR workflows', BriefcaseBusiness], ['Send application notifications and alerts', Bell],
  ['Provide administrative and reporting functionality', FileLock2], ['Maintain application security', ShieldCheck],
  ['Detect and prevent unauthorized access or misuse', LockKeyhole], ['Diagnose technical problems', Wrench],
  ['Improve application performance and functionality', Gauge], ['Provide customer and technical support', MapPin],
  ['Comply with applicable legal and regulatory requirements', ShieldCheck],
]

function SectionTitle({ number, title, icon: Icon, color = 'text-[#0B3D91]' }) {
  return (
    <div className={`mb-4 flex items-center gap-3 border-b border-slate-200 pb-3 ${color}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50">
        <Icon className="h-6 w-6" />
      </span>
      <h2 className="text-[21px] font-bold tracking-tight text-[#062B74] sm:text-[24px]">{number}. {title}</h2>
    </div>
  )
}

function Subsection({ number, title, icon: Icon, children }) {
  return (
    <section className="mb-7 max-w-6xl">
      <div className="mb-3 flex items-center gap-3 border-b border-slate-200 pb-2.5 text-[#0B3D91]">
        <Icon className="h-6 w-6 shrink-0" />
        <h3 className="text-[18px] font-bold tracking-tight sm:text-[21px]">{number} &nbsp;{title}</h3>
      </div>
      {children}
    </section>
  )
}

function BulletGrid({ items }) {
  return (
    <ul className="grid gap-x-10 gap-y-2 pl-1 text-sm font-medium leading-[1.55] text-slate-600 sm:grid-cols-2 sm:text-base">
      {items.map((item) => <li key={item} className="flex gap-3"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#0B3D91]" />{item}</li>)}
    </ul>
  )
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-6 py-3 sm:px-10 lg:px-16">
          <img src={brandLogo} alt="Grecha.ai HRMS" className="h-10 w-auto object-contain sm:h-12" />
          <Link to="/login" className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[#0B3D91] transition hover:bg-blue-50">
            <ArrowLeft className="h-4 w-4" /> Back to login
          </Link>
        </div>
      </header>

      <main className="w-full">
        <section className="w-full bg-gradient-to-r from-[#062B74] via-[#0B3D91] to-[#1769D1] py-10 text-white sm:py-12">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-8 px-6 sm:px-10 lg:grid-cols-[1fr_auto] lg:px-16">
            <div>
              <p className="mb-3 text-sm font-bold uppercase tracking-[0.24em] text-blue-200">Grecha.ai HRMS</p>
              <h1 className="text-[28px] font-black tracking-tight sm:text-[40px]">Privacy Policy</h1>
              <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3 sm:text-base">
                <p><strong>Effective Date:</strong><br />16 August 2026</p>
                <p><strong>Application:</strong><br />Grecha.ai HRMS Mobile Application</p>
                <p><strong>Website:</strong><br />Grecha.ai</p>
              </div>
            </div>
            <ShieldCheck className="hidden h-36 w-36 text-blue-100/90 md:block" strokeWidth={1.4} />
          </div>
        </section>

        <article className="mx-auto w-full max-w-7xl bg-white px-6 py-8 sm:px-10 sm:py-9 lg:px-16">
          <div className="mb-8 max-w-6xl border-b border-slate-200 pb-6 text-[15px] font-medium leading-[1.55] text-slate-600 sm:text-base">
            <p className="text-[17px] font-bold leading-7 text-[#062B74] sm:text-lg">Grecha.ai respects your privacy and is committed to protecting your personal information.</p>
            <p className="mt-3">Grecha.ai (&ldquo;Grecha&rdquo;, &ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) protects the personal information of employees, users, administrators, and organizations using our Human Resource Management System (&ldquo;HRMS&rdquo;) mobile application.</p>
            <p className="mt-3">This Privacy Policy explains what information we collect, how we use and protect it, and the choices and rights available to you when using the Grecha.ai HRMS mobile application and related services.</p>
            <p className="mt-3">By accessing or using the application, you acknowledge that you have read and understood this Privacy Policy.</p>
          </div>

          <SectionTitle number="1" title="Information We Collect" icon={FileLock2} />
          <p className="mb-6 max-w-6xl text-[15px] font-medium leading-[1.55] text-slate-600 sm:text-base">Depending on how the HRMS application is configured and used by your organization, we may collect the following categories of information.</p>

          <Subsection number="1.1" title="Personal and Employee Information" icon={UserRound}>
            <p className="mb-3 text-[15px] font-medium text-slate-600 sm:text-base">This may include:</p><BulletGrid items={personalInformation} />
          </Subsection>
          <Subsection number="1.2" title="Attendance and Work Information" icon={CalendarCheck}>
            <p className="mb-3 text-[15px] font-medium text-slate-600 sm:text-base">The application may process information relating to:</p><BulletGrid items={workInformation} />
          </Subsection>
          <Subsection number="1.3" title="Location Information" icon={MapPin}>
            <p className="text-[15px] font-medium leading-[1.55] text-slate-600 sm:text-base">Where location-based attendance or workforce management features are enabled by your organization, the application may collect location information during relevant attendance or work-related activities.</p>
            <div className="my-4 flex gap-3 rounded-2xl bg-blue-50 p-4 text-sm leading-6 text-[#0B3D91] sm:text-base"><LocateFixed className="mt-1 h-6 w-6 shrink-0" />Location information is used for legitimate HR and workforce management purposes, such as verifying attendance at an authorized workplace or work location.</div>
            <p className="text-[15px] font-medium leading-[1.55] text-slate-600 sm:text-base">The application does not continuously track your location unless such functionality is specifically enabled, disclosed, and permitted by the applicable configuration and law.</p>
          </Subsection>
          <Subsection number="1.4" title="Device and Technical Information" icon={Laptop}>
            <p className="mb-4 text-slate-600">We may automatically collect certain technical information, including:</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{technicalInformation.map(([label, Icon]) => <div key={label} className="rounded-xl border border-slate-200 p-3 text-center text-xs font-semibold text-slate-700"><Icon className="mx-auto mb-2 h-6 w-6 text-[#1769D1]" />{label}</div>)}</div>
            <p className="mt-4 leading-7 text-slate-700">This information helps us maintain application security, troubleshoot technical issues, and improve application performance.</p>
          </Subsection>
          <Subsection number="1.5" title="Login and Authentication Information" icon={LockKeyhole}>
            <p className="mb-4 text-slate-600">To provide secure access, we may process:</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{authenticationInformation.map(([label, Icon]) => <div key={label} className="rounded-xl border border-slate-200 p-3 text-center text-xs font-semibold text-slate-700"><Icon className="mx-auto mb-2 h-6 w-6 text-[#0B3D91]" />{label}</div>)}</div>
            <div className="mt-4 flex gap-3 rounded-2xl bg-blue-50 p-4 text-sm text-[#0B3D91]"><ShieldCheck className="h-5 w-5 shrink-0" />Passwords are not stored in plain text, and appropriate security measures are applied to protect authentication information.</div>
          </Subsection>

          <div className="my-7 border-t border-slate-200" />
          <SectionTitle number="2" title="How We Use Your Information" icon={Wrench} />
          <p className="mb-5 text-[15px] font-medium leading-[1.55] text-slate-600 sm:text-base">We may use information collected through the HRMS application to:</p>
          <div className="grid gap-1.5 sm:grid-cols-2">{uses.map(([label, Icon]) => <div key={label} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 text-[15px] font-semibold text-slate-600 sm:text-base"><Icon className="h-5 w-5 shrink-0 text-[#1769D1]" />{label}</div>)}</div>
          <p className="mt-5 font-semibold text-slate-700">We do not use employee information for unrelated purposes without an appropriate legal basis or authorization.</p>

          <div className="my-7 border-t border-slate-200" />
          <SectionTitle number="3" title="Organization-Controlled Data" icon={Building2} color="text-emerald-700" />
          <p className="max-w-6xl text-[15px] font-medium leading-[1.55] text-slate-600 sm:text-base">Grecha.ai HRMS may be provided to organizations, employers, or other authorized entities. Your organization controls what employee information is collected, which HRMS features are enabled, who can access employee information, how employee information is used within the organization, and how long information is retained.</p>
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-950 sm:text-base">Your employer or organization may therefore have its own privacy policies and internal procedures governing employee information. If you have questions about information collected specifically by your employer, you should also contact your organization&apos;s HR or privacy administrator.</div>

          <div className="my-7 border-t border-slate-200" />
          <SectionTitle number="4" title="Location-Based Attendance" icon={MapPin} color="text-violet-700" />
          <p className="mb-4 text-[15px] font-medium leading-[1.55] text-slate-600 sm:text-base">Some organizations may enable GPS or location-based attendance functionality. Where enabled, location data may be used to:</p>
          <BulletGrid items={['Verify attendance at an approved workplace', 'Confirm check-in or check-out locations', 'Ensure compliance with organizational attendance policies', 'Support workforce operations and safety']} />
          <div className="mt-5 flex gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-5 text-sm leading-6 text-violet-950 sm:text-base"><ShieldCheck className="h-6 w-6 shrink-0" />Location data is collected only when required for attendance or workforce activities and is not used for continuous tracking without your consent and applicable legal basis.</div>
        </article>
      </main>

      <footer className="bg-[#062B74] text-white">
        <div className="mx-auto w-full max-w-7xl px-6 py-8 sm:px-10 lg:px-16">
          <h2 className="text-xl font-black">5. Contact Us</h2>
          <p className="mt-2 text-sm text-blue-100">For any questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact us:</p>
          <div className="mt-5 flex flex-col gap-3 text-sm sm:flex-row sm:gap-8">
            <a href="mailto:info@thegreaterchange.com" className="flex items-center gap-2 font-semibold hover:text-blue-200"><Mail className="h-5 w-5" />info@thegreaterchange.com</a>
            <a href="tel:+971501619355" className="flex items-center gap-2 font-semibold hover:text-blue-200"><Phone className="h-5 w-5" />+971 50 161 9355</a>
            <a href="https://grecha.ai" className="flex items-center gap-2 font-semibold hover:text-blue-200"><Globe2 className="h-5 w-5" />Grecha.ai</a>
          </div>
          <p className="mt-7 border-t border-white/15 pt-5 text-xs text-blue-200">© 2026 Grecha.ai HRMS. Your privacy. Our responsibility.</p>
        </div>
      </footer>
    </div>
  )
}
