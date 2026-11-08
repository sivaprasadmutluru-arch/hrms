import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import {
  BuildingOffice2Icon,
  UserGroupIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  CheckCircleIcon,
  XMarkIcon,
  SparklesIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline'
import api from '../../services/api'
import { setTourCompleted } from '../../features/auth/authSlice'

const STEPS = [
  {
    step: 1,
    title: 'Company Profile & Workweek',
    description: 'Upload company logo, configure office hours, weekend rules, and public holidays.',
    link: '/companies',
    linkText: 'Company Settings',
    icon: BuildingOffice2Icon,
    accent: 'border-blue-200 bg-blue-50/50 text-blue-700',
    iconBg: 'bg-blue-100 text-blue-700',
  },
  {
    step: 2,
    title: 'Add or Import Employees',
    description: 'Add your team members individually or upload in bulk using standard Excel/CSV templates.',
    link: '/employees',
    linkText: 'Employee Directory',
    icon: UserGroupIcon,
    accent: 'border-emerald-200 bg-emerald-50/50 text-emerald-700',
    iconBg: 'bg-emerald-100 text-emerald-700',
  },
  {
    step: 3,
    title: 'Configure Leave & Attendance',
    description: 'Set annual leave quotas, assign rotating or fixed shifts, and set check-in grace periods.',
    link: '/attendance/settings',
    linkText: 'Attendance Settings',
    icon: CalendarDaysIcon,
    accent: 'border-amber-200 bg-amber-50/50 text-amber-700',
    iconBg: 'bg-amber-100 text-amber-700',
  },
  {
    step: 4,
    title: 'Payroll & Compliance',
    description: 'Configure salary structures, compute statutory deductions (PF, ESI, TDS), and issue payslips.',
    link: '/payroll',
    linkText: 'Payroll Hub',
    icon: BanknotesIcon,
    accent: 'border-indigo-200 bg-indigo-50/50 text-indigo-700',
    iconBg: 'bg-indigo-100 text-indigo-700',
  },
]

export default function GettingStartedChecklist({ onDismiss }) {
  const dispatch = useDispatch()
  const [collapsed, setCollapsed] = useState(false)
  const [dismissing, setDismissing] = useState(false)

  const handleDismiss = async () => {
    setDismissing(true)
    try {
      await api.post('/auth/quick-start-tour/complete')
    } catch {
      // ignore
    } finally {
      dispatch(setTourCompleted())
      if (onDismiss) onDismiss()
      setDismissing(false)
    }
  }

  return (
    <div className="relative mb-6 overflow-hidden rounded-2xl border border-[#DCE7F2] bg-gradient-to-br from-[#F8FAFD] via-white to-[#F0F6FC] p-5 shadow-[0_8px_24px_rgba(30,65,96,0.05)] sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#E7EEF5]">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#286CB2] to-[#4389D2] text-white shadow-sm">
            <SparklesIcon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#EBF3FB] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#286CB2]">
                Zoho-Style Setup
              </span>
              <h2 className="text-lg font-bold text-[#17324F]">Getting Started with AccrueHRMS</h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Follow these 4 essential steps to configure and launch your organization workspace.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {collapsed ? (
              <>
                <span>Expand</span>
                <ChevronDownIcon className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span>Collapse</span>
                <ChevronUpIcon className="h-3.5 w-3.5" />
              </>
            )}
          </button>
          <button
            onClick={handleDismiss}
            disabled={dismissing}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50"
            title="Mark setup as completed and hide this card"
          >
            <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
            <span>{dismissing ? 'Completing…' : 'Got it, hide this'}</span>
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.step}
                className="group relative flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 transition hover:border-[#286CB2]/50 hover:shadow-sm"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Step {item.step}
                    </span>
                    <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${item.iconBg}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <h3 className="text-sm font-bold text-[#17324F] group-hover:text-[#286CB2] transition-colors">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <Link
                    to={item.link}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#286CB2] hover:text-[#173858] transition-colors"
                  >
                    <span>{item.linkText}</span>
                    <ArrowRightIcon className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
