import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams } from 'react-router-dom'
import { fetchById, fetchPlanLimits, update, selectSelected, selectPlanLimits, selectLoading } from './organizationsSlice'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Spinner from '../../components/common/Spinner'
import Button from '../../components/common/Button'
import toast from 'react-hot-toast'

const PLANS = ['BASIC', 'STANDARD', 'ENTERPRISE']

const PLAN_COLORS = {
  BASIC: 'bg-gray-100 text-gray-700',
  STANDARD: 'bg-indigo-100 text-indigo-700',
  ENTERPRISE: 'bg-amber-100 text-amber-700',
}

const PLAN_DETAILS = {
  BASIC:      { maxBranches: 2,   maxEmployees: 50,  crossBranch: false },
  STANDARD:   { maxBranches: 5,   maxEmployees: 200, crossBranch: true  },
  ENTERPRISE: { maxBranches: null, maxEmployees: null, crossBranch: true },
}

function UsageBar({ current, max, label }) {
  const pct = max == null ? 0 : Math.min(100, Math.round((current / max) * 100))
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-indigo-500'
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{label}</span>
        <span>{current} / {max == null ? 'Unlimited' : max}</span>
      </div>
      {max != null && (
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
      )}
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
    <div>
      <PageHeader
        title={`Subscription — ${org?.name || ''}`}
        subtitle="Manage plan tier and view usage limits"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-3xl">
        {/* Current plan */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Current Plan</h3>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold mb-4 ${PLAN_COLORS[currentPlan]}`}>
            {currentPlan}
          </div>
          <div className="mb-4">
            <label className="block text-xs text-gray-500 mb-1">Change Plan</label>
            <select
              value={currentPlan}
              onChange={handlePlanChange}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {PLANS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="text-xs text-gray-500 space-y-1">
            <div className="flex justify-between">
              <span>Max Branches</span>
              <span className="font-medium">{details.maxBranches == null ? 'Unlimited' : details.maxBranches}</span>
            </div>
            <div className="flex justify-between">
              <span>Max Employees</span>
              <span className="font-medium">{details.maxEmployees == null ? 'Unlimited' : details.maxEmployees}</span>
            </div>
            <div className="flex justify-between">
              <span>Cross-Branch Access</span>
              <span className="font-medium">{details.crossBranch ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </Card>

        {/* Usage */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Current Usage</h3>
          <div className="space-y-4">
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
            <div className="flex justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
              <span>Cross-Branch Access</span>
              <span className={`font-medium ${limits.crossBranchAccessAllowed ? 'text-emerald-600' : 'text-gray-400'}`}>
                {limits.crossBranchAccessAllowed ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
