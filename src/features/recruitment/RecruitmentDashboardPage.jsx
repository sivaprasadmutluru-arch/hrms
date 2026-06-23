import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  BarChart, Bar, FunnelChart, Funnel, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  Cell, PieChart, Pie,
} from 'recharts'
import {
  BriefcaseIcon, UserGroupIcon, CheckCircleIcon,
  XCircleIcon, ChartBarIcon, SparklesIcon,
} from '@heroicons/react/24/outline'
import { fetchRecruitmentDashboard, fetchAll as fetchPosts, fetchApplicants } from './recruitmentSlice'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Avatar from '../../components/common/Avatar'
import useAuth from '../../hooks/useAuth'

const FUNNEL_COLORS = ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444']
const PIE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

export default function RecruitmentDashboardPage() {
  const dispatch = useDispatch()
  const { user, effectiveCompanyId } = useAuth()
  const companyId = effectiveCompanyId

  const dashboard = useSelector(s => s.recruitment.recruitmentDashboard)
  const posts = useSelector(s => s.recruitment.data || [])
  const applicants = useSelector(s => s.recruitment.applicants || [])
  const loading = useSelector(s => s.recruitment.loading)

  useEffect(() => {
    if (companyId) {
      dispatch(fetchRecruitmentDashboard({ companyId }))
      dispatch(fetchPosts({ companyId, page: 0, size: 20 }))
      dispatch(fetchApplicants({ companyId, page: 0, size: 30 }))
    }
  }, [dispatch, companyId])

  const totalPosts = dashboard?.totalPosts ?? 0
  const activePosts = dashboard?.activePosts ?? 0
  const totalApplicants = dashboard?.totalApplicants ?? 0
  const shortlisted = dashboard?.shortlistedApplicants ?? 0
  const rejected = dashboard?.rejectedApplicants ?? 0
  const hired = dashboard?.hiredApplicants ?? 0

  const conversionRate = totalApplicants > 0
    ? Math.round((hired / totalApplicants) * 100)
    : 0

  const offerAcceptanceRate = hired > 0
    ? Math.round((hired / (hired + rejected)) * 100)
    : 0

  // Funnel data
  const funnelData = [
    { name: 'Total Applicants', value: totalApplicants },
    { name: 'Shortlisted', value: shortlisted },
    { name: 'Hired', value: hired },
  ].filter(d => d.value > 0)

  // Stage breakdown from applicants
  const stageMap = {}
  ;(applicants || []).forEach(a => {
    const s = a.stage || a.status || 'Applied'
    stageMap[s] = (stageMap[s] || 0) + 1
  })
  const stageData = Object.entries(stageMap).map(([name, count]) => ({ name, count }))

  // Posts by department
  const deptMap = {}
  ;(posts || []).forEach(p => {
    const d = p.department || 'General'
    deptMap[d] = (deptMap[d] || 0) + 1
  })
  const deptData = Object.entries(deptMap).map(([dept, count]) => ({ dept, count }))

  return (
    <div>
      <PageHeader title="Recruitment Dashboard" subtitle="Hiring pipeline, conversion rates, and applicant overview" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-3 gap-4 mb-4">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Total Vacancies</p>
              <p className="text-2xl font-bold text-indigo-600">{loading ? '—' : totalPosts}</p>
              <p className="text-xs text-gray-400 mt-1">{activePosts} active</p>
            </div>
            <BriefcaseIcon className="h-6 w-6 text-indigo-400" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Total Applicants</p>
              <p className="text-2xl font-bold text-blue-600">{loading ? '—' : totalApplicants}</p>
              <p className="text-xs text-gray-400 mt-1">{shortlisted} shortlisted</p>
            </div>
            <UserGroupIcon className="h-6 w-6 text-blue-400" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Hired</p>
              <p className="text-2xl font-bold text-green-600">{loading ? '—' : hired}</p>
              <p className="text-xs text-gray-400 mt-1">Offer accepted</p>
            </div>
            <CheckCircleIcon className="h-6 w-6 text-green-400" />
          </div>
        </div>
      </div>

      {/* Conversion rates row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <ChartBarIcon className="h-5 w-5 text-purple-500" />
            <h3 className="text-sm font-semibold text-gray-700">Conversion Rate</h3>
            <span className="text-xs text-gray-400 ml-1">(Hired / Total Applicants)</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-purple-600">{conversionRate}%</span>
          </div>
          <div className="mt-3 bg-gray-100 rounded-full h-2">
            <div
              className="bg-purple-500 h-2 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(conversionRate, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <SparklesIcon className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-semibold text-gray-700">Offer Acceptance Rate</h3>
            <span className="text-xs text-gray-400 ml-1">(OAR)</span>
          </div>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-bold text-emerald-600">{offerAcceptanceRate}%</span>
          </div>
          <div className="mt-3 bg-gray-100 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all duration-700"
              style={{ width: `${Math.min(offerAcceptanceRate, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Applicant Stage Breakdown</h3>
          {stageData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={stageData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {stageData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <div className="text-center">
                <div className="flex justify-center gap-4 text-sm text-gray-600">
                  {[
                    { label: 'Applied', value: totalApplicants, color: 'bg-indigo-500' },
                    { label: 'Shortlisted', value: shortlisted, color: 'bg-purple-500' },
                    { label: 'Hired', value: hired, color: 'bg-green-500' },
                    { label: 'Rejected', value: rejected, color: 'bg-red-500' },
                  ].map(s => (
                    <div key={s.label} className="flex flex-col items-center gap-1">
                      <span className={`${s.color} text-white text-lg font-bold rounded-lg px-3 py-1`}>{s.value}</span>
                      <span className="text-xs text-gray-500">{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Job Posts by Department</h3>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={deptData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="dept" tick={{ fontSize: 11 }} width={90} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366F1" radius={[0, 4, 4, 0]} name="Posts" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No post data</div>
          )}
        </Card>
      </div>

      {/* Recent applicants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Applicants</h3>
          <div className="space-y-3 max-h-[260px] overflow-y-auto">
            {(applicants || []).slice(0, 8).map(a => (
              <div key={a.id} className="flex items-center gap-3 text-sm border-b border-gray-50 pb-2 last:border-0">
                <Avatar name={a.name || a.candidateName || a.firstName || 'A'} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">
                    {a.name || a.candidateName || `${a.firstName || ''} ${a.lastName || ''}`.trim() || '—'}
                  </p>
                  <p className="text-xs text-gray-400">{a.jobTitle || a.position || a.post || '—'}</p>
                </div>
                <Badge
                  label={a.stage || a.status || 'Applied'}
                  variant={
                    a.stage === 'HIRED' || a.status === 'HIRED' ? 'success' :
                    a.stage === 'REJECTED' || a.status === 'REJECTED' ? 'danger' :
                    'default'
                  }
                />
              </div>
            ))}
            {(applicants || []).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No applicants yet</p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Active Job Posts</h3>
          <div className="space-y-3 max-h-[260px] overflow-y-auto">
            {(posts || []).filter(p => p.status === 'ACTIVE' || p.published).slice(0, 8).map(p => (
              <div key={p.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{p.title || p.jobTitle || '—'}</p>
                  <p className="text-xs text-gray-400">{p.department || '—'} · {p.location || 'On-site'}</p>
                </div>
                <div className="ml-3 text-right flex-shrink-0">
                  <p className="text-xs font-semibold text-indigo-600">{p.applicantCount ?? 0} applicants</p>
                  <Badge label="Active" variant="success" />
                </div>
              </div>
            ))}
            {(posts || []).filter(p => p.status === 'ACTIVE' || p.published).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No active job posts</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
