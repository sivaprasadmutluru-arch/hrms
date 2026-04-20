import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  BuildingOffice2Icon, UsersIcon, BuildingOfficeIcon,
  CheckCircleIcon, ExclamationCircleIcon,
} from '@heroicons/react/24/outline'
import { fetchPlatformStats, selectPlatformStats, selectPlatformStatsLoading } from './platformSlice'
import PageHeader from '../../components/common/PageHeader'
import Spinner from '../../components/common/Spinner'

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value ?? '—'}</p>
        <p className="text-sm font-medium text-gray-600">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function StatusRow({ label, active, suspended, inactive }) {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600 w-32">{label}</span>
      <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
        <CheckCircleIcon className="h-4 w-4" />{active ?? 0} Active
      </span>
      {suspended !== undefined && (
        <span className="flex items-center gap-1.5 text-sm text-orange-500 font-medium">
          <ExclamationCircleIcon className="h-4 w-4" />{suspended ?? 0} Suspended
        </span>
      )}
      {inactive !== undefined && (
        <span className="text-sm text-gray-400 font-medium">{inactive ?? 0} Inactive</span>
      )}
    </div>
  )
}

export default function PlatformMonitorPage() {
  const dispatch = useDispatch()
  const stats = useSelector(selectPlatformStats)
  const loading = useSelector(selectPlatformStatsLoading)

  useEffect(() => {
    dispatch(fetchPlatformStats())
  }, [dispatch])

  return (
    <div>
      <PageHeader
        title="Platform Monitor"
        subtitle="Real-time overview of all organizations, companies, and employees across the platform"
      />

      {loading && !stats ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
              icon={BuildingOffice2Icon}
              label="Organizations"
              value={stats?.organizations?.total}
              sub={`${stats?.organizations?.active ?? 0} active`}
              color="bg-indigo-500"
            />
            <StatCard
              icon={BuildingOfficeIcon}
              label="Head Offices"
              value={stats?.companies?.headOffices}
              sub="Top-level companies"
              color="bg-violet-500"
            />
            <StatCard
              icon={BuildingOfficeIcon}
              label="Branches"
              value={stats?.companies?.branches}
              sub="Branch offices"
              color="bg-blue-500"
            />
            <StatCard
              icon={BuildingOffice2Icon}
              label="Total Companies"
              value={stats?.companies?.total}
              sub={`${stats?.companies?.active ?? 0} active`}
              color="bg-cyan-500"
            />
            <StatCard
              icon={UsersIcon}
              label="Employees"
              value={stats?.employees?.total}
              sub={`${stats?.employees?.active ?? 0} active`}
              color="bg-green-500"
            />
          </div>

          {/* Status breakdown */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Status Breakdown</h3>
            <StatusRow
              label="Organizations"
              active={stats?.organizations?.active}
              suspended={stats?.organizations?.suspended}
              inactive={(stats?.organizations?.total ?? 0) - (stats?.organizations?.active ?? 0) - (stats?.organizations?.suspended ?? 0)}
            />
            <StatusRow
              label="Companies"
              active={stats?.companies?.active}
              inactive={(stats?.companies?.total ?? 0) - (stats?.companies?.active ?? 0)}
            />
            <StatusRow
              label="Employees"
              active={stats?.employees?.active}
              inactive={(stats?.employees?.total ?? 0) - (stats?.employees?.active ?? 0)}
            />
          </div>
        </>
      )}
    </div>
  )
}
