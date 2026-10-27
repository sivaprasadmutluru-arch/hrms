import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  BuildingOffice2Icon, UsersIcon, BuildingOfficeIcon,
  CheckCircleIcon, ExclamationCircleIcon, ChartBarSquareIcon,
} from '@heroicons/react/24/outline'
import { fetchPlatformStats, selectPlatformStats, selectPlatformStatsLoading } from './platformSlice'
import Spinner from '../../components/common/Spinner'

function StatCard({ icon: Icon, label, value, sub, color }) {
  const tones = {
    blue: 'bg-[#EDF5FD] text-[#3479BC] ring-[#DCEBFA]',
    gold: 'bg-[#FFF8DF] text-[#98751D] ring-[#F4E7B8]',
    teal: 'bg-[#ECF8F3] text-[#318367] ring-[#D8EFE5]',
  }
  return (
    <div className="flex min-h-[128px] items-center gap-4 rounded-2xl border border-[#DCE7F2] bg-white p-5 shadow-[0_7px_22px_rgba(30,65,96,0.045)] transition hover:-translate-y-0.5 hover:border-[#C9D9E8] hover:shadow-[0_10px_28px_rgba(30,65,96,0.085)]">
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ring-1 ring-inset ${tones[color] || tones.blue}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[28px] font-semibold leading-none tracking-[-0.04em] text-[#17324F]">{value ?? '—'}</p>
        <p className="mt-1.5 text-sm font-semibold text-[#35516E]">{label}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}

function StatusRow({ label, active, suspended, inactive }) {
  return (
    <div className="grid grid-cols-1 gap-3 border-b border-[#E9EFF5] py-4 last:border-0 sm:grid-cols-[minmax(130px,1fr)_repeat(3,minmax(120px,auto))] sm:items-center sm:gap-4">
      <span className="text-sm font-semibold text-[#294766]">{label}</span>
      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#ECF8F3] px-3 py-1.5 text-xs font-semibold text-[#318367]">
        <CheckCircleIcon className="h-4 w-4" />{active ?? 0} Active
      </span>
      {suspended !== undefined && (
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-[#FFF8E3] px-3 py-1.5 text-xs font-semibold text-[#98751D]">
          <ExclamationCircleIcon className="h-4 w-4" />{suspended ?? 0} Suspended
        </span>
      )}
      {inactive !== undefined && (
        <span className="inline-flex w-fit items-center rounded-full bg-[#F2F5F8] px-3 py-1.5 text-xs font-semibold text-slate-500">{inactive ?? 0} Inactive</span>
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
    <div className="space-y-5 pb-6">
      <div className="relative overflow-hidden rounded-2xl border border-[#DCE7F2] bg-gradient-to-r from-white via-white to-[#F0F6FC] px-5 py-5 shadow-[0_8px_24px_rgba(30,65,96,0.045)] sm:px-6">
        <div className="pointer-events-none absolute -right-8 -top-16 h-48 w-48 rounded-full bg-[#E8F1FB]/70" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF2FC] text-[#2D6FB4] ring-1 ring-inset ring-[#D7E6F7"><ChartBarSquareIcon className="h-6 w-6" /></div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A6B19]">Platform · Overview</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-[#17324F]">Platform Monitor</h1>
            <p className="mt-1 text-sm text-slate-500">A live overview of organizations, companies, and employees across the platform.</p>
          </div>
        </div>
      </div>

      {loading && !stats ? (
        <div className="flex justify-center py-20"><Spinner /></div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard
              icon={BuildingOffice2Icon}
              label="Organizations"
              value={stats?.organizations?.total}
              sub={`${stats?.organizations?.active ?? 0} active`}
              color="blue"
            />
            <StatCard
              icon={BuildingOfficeIcon}
              label="Head Offices"
              value={stats?.companies?.headOffices}
              sub="Top-level companies"
              color="gold"
            />
            <StatCard
              icon={BuildingOfficeIcon}
              label="Branches"
              value={stats?.companies?.branches}
              sub="Branch offices"
              color="blue"
            />
            <StatCard
              icon={BuildingOffice2Icon}
              label="Total Companies"
              value={stats?.companies?.total}
              sub={`${stats?.companies?.active ?? 0} active`}
              color="teal"
            />
            <StatCard
              icon={UsersIcon}
              label="Employees"
              value={stats?.employees?.total}
              sub={`${stats?.employees?.active ?? 0} active`}
              color="teal"
            />
          </div>

          {/* Status breakdown */}
          <div className="overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white shadow-[0_8px_26px_rgba(30,65,96,0.05)]">
            <div className="border-b border-[#E7EEF5] bg-gradient-to-r from-[#F8FAFD] to-white px-5 py-4">
              <h3 className="text-sm font-bold text-[#17324F]">Status breakdown</h3>
              <p className="mt-0.5 text-xs text-slate-500">Current activity across the platform</p>
            </div>
            <div className="px-5">
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
          </div>
        </>
      )}
    </div>
  )
}
