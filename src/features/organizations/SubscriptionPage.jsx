import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { fetchById, fetchPlanLimits, update, selectSelected, selectPlanLimits, selectLoading } from './organizationsSlice'
import Spinner from '../../components/common/Spinner'
import toast from 'react-hot-toast'
import { BuildingOffice2Icon, UsersIcon, GlobeAltIcon, CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline'

const PLANS = ['BASIC', 'STANDARD', 'ENTERPRISE']

const PLAN_COLORS = {
  BASIC: 'border-[#DCE7F2] bg-[#F3F7FB] text-[#49627C]',
  STANDARD: 'border-[#CFE0F2] bg-[#EDF5FD] text-[#2D6FB4]',
  ENTERPRISE: 'border-[#F0E2B7] bg-[#FFF8E3] text-[#8E6A13]',
}

const PLAN_DETAILS = {
  BASIC:      { maxBranches: 2,   maxEmployees: 50,  crossBranch: false },
  STANDARD:   { maxBranches: 5,   maxEmployees: 200, crossBranch: true  },
  ENTERPRISE: { maxBranches: null, maxEmployees: null, crossBranch: true },
}

function UsageBar({ current, max, label }) {
  const count = Number(current) || 0
  const pct = max == null || !Number(max) ? 0 : Math.min(100, Math.round((count / Number(max)) * 100))
  const color = pct >= 90 ? 'from-[#D98667] to-[#C95E55]' : pct >= 70 ? 'from-[#E7C65B] to-[#D5A83C]' : 'from-[#4D8FD1] to-[#2F70B3]'
  return (
    <div className="rounded-2xl border border-[#E5ECF3] bg-[#FBFCFE] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-[#35516E]">{label}</span>
        <span className="text-sm font-bold tabular-nums text-[#17324F]">{count}<span className="font-medium text-slate-400"> / {max == null ? 'Unlimited' : max}</span></span>
      </div>
      {max != null && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-[#EAF0F6]">
          <div className={`h-full rounded-full bg-gradient-to-r ${color} transition-all`} style={{ width: `${pct}%` }} />
        </div>
      )}
      {max != null && <p className="mt-2 text-[11px] font-medium text-slate-400">{pct}% of plan limit</p>}
    </div>
  )
}

export default function SubscriptionPage() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const org = useSelector(selectSelected)
  const limits = useSelector(selectPlanLimits)
  const loading = useSelector(selectLoading)

  useEffect(() => {
    dispatch(fetchById(id))
    dispatch(fetchPlanLimits(id))
  }, [dispatch, id])

  const handlePlanChange = async (e) => {
    const newPlan = e.target.value
    try {
      await dispatch(update({ id, data: { ...org, subscriptionPlan: newPlan } })).unwrap()
      dispatch(fetchPlanLimits(id))
      toast.success(`Plan changed to ${newPlan}`)
    } catch (err) {
      toast.error(err || 'Failed to change plan')
    }
  }

  if (loading || !limits) return <Spinner className="py-16" />

  const currentPlan = limits.plan || 'STANDARD'
  const details = PLAN_DETAILS[currentPlan] || PLAN_DETAILS.STANDARD

  return (
    <div className="space-y-5 pb-6">
      <div className="relative overflow-hidden rounded-2xl border border-[#DCE7F2] bg-gradient-to-r from-white via-white to-[#F0F6FC] px-5 py-5 shadow-[0_8px_24px_rgba(30,65,96,0.045)] sm:px-6">
        <div className="pointer-events-none absolute -right-8 -top-16 h-48 w-48 rounded-full bg-[#E8F1FB]/70" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF2FC] text-[#2D6FB4] ring-1 ring-inset ring-[#D7E6F7]"><BuildingOffice2Icon className="h-6 w-6" /></div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A6B19]">Organization · Plan & usage</p>
            <h1 className="mt-0.5 truncate text-2xl font-bold tracking-tight text-[#17324F]">{org?.name || 'Subscription'}</h1>
            <p className="mt-1 text-sm text-slate-500">Manage the plan tier and monitor organization limits.</p>
          </div>
        </div>
      </div>

      <div className="grid max-w-5xl grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Current plan */}
        <section className="overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white shadow-[0_8px_26px_rgba(30,65,96,0.05)]">
          <div className="border-b border-[#E7EEF5] bg-gradient-to-r from-[#F8FAFD] to-white px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF8E3] text-[#98751D] ring-1 ring-inset ring-[#F4E7B8]"><SparklesIcon className="h-5 w-5" /></div>
              <div><h3 className="text-sm font-bold text-[#17324F]">Current plan</h3><p className="mt-0.5 text-xs text-slate-500">Features and organization limits</p></div>
            </div>
          </div>
          <div className="space-y-5 p-5">
          <div className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-bold ${PLAN_COLORS[currentPlan] || PLAN_COLORS.STANDARD}`}>
            <span className="h-2 w-2 rounded-full bg-current opacity-70" />
            {currentPlan}
          </div>
          <div className="mb-4">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">Change plan</label>
            <select
              value={currentPlan}
              onChange={handlePlanChange}
              className="w-full rounded-xl border border-[#DCE7F2] bg-[#F8FAFC] px-3.5 py-3 text-sm font-semibold text-[#294766] outline-none transition focus:border-[#77A9D9] focus:ring-4 focus:ring-[#E6F0FA]"
            >
              {PLANS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="space-y-3 border-t border-[#E7EEF5] pt-4">
            <div className="flex items-center justify-between gap-4 rounded-xl bg-[#F8FAFC] px-3.5 py-3">
              <span className="flex items-center gap-2 text-sm text-slate-500"><BuildingOffice2Icon className="h-4 w-4 text-[#5B86AE]" />Max branches</span>
              <span className="text-sm font-bold text-[#17324F]">{details.maxBranches == null ? 'Unlimited' : details.maxBranches}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl bg-[#F8FAFC] px-3.5 py-3">
              <span className="flex items-center gap-2 text-sm text-slate-500"><UsersIcon className="h-4 w-4 text-[#5B86AE]" />Max employees</span>
              <span className="text-sm font-bold text-[#17324F]">{details.maxEmployees == null ? 'Unlimited' : details.maxEmployees}</span>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl bg-[#F8FAFC] px-3.5 py-3">
              <span className="flex items-center gap-2 text-sm text-slate-500"><GlobeAltIcon className="h-4 w-4 text-[#5B86AE]" />Cross-branch access</span>
              <span className={`flex items-center gap-1.5 text-sm font-bold ${details.crossBranch ? 'text-[#318367]' : 'text-slate-400'}`}><CheckCircleIcon className="h-4 w-4" />{details.crossBranch ? 'Enabled' : 'Not included'}</span>
            </div>
          </div>
          </div>
        </section>

        {/* Usage */}
        <section className="overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white shadow-[0_8px_26px_rgba(30,65,96,0.05)]">
          <div className="border-b border-[#E7EEF5] bg-gradient-to-r from-[#F8FAFD] to-white px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EDF5FD] text-[#3479BC] ring-1 ring-inset ring-[#DCEBFA]"><CheckCircleIcon className="h-5 w-5" /></div>
              <div><h3 className="text-sm font-bold text-[#17324F]">Current usage</h3><p className="mt-0.5 text-xs text-slate-500">Live usage against your plan</p></div>
            </div>
          </div>
          <div className="space-y-4 p-5">
            <UsageBar
              label="Branches"
              current={limits.currentBranches}
              max={limits.maxBranches}
            />
            <UsageBar
              label="Employees"
              current={limits.currentEmployees}
              max={limits.maxEmployees}
            />
            <div className="flex items-center justify-between border-t border-[#E7EEF5] pt-4 text-sm">
              <span className="text-slate-500">Cross-branch access</span>
              <span className={`flex items-center gap-1.5 font-semibold ${limits.crossBranchAccessAllowed ? 'text-[#318367]' : 'text-slate-400'}`}>
                <CheckCircleIcon className="h-4 w-4" />{limits.crossBranchAccessAllowed ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
