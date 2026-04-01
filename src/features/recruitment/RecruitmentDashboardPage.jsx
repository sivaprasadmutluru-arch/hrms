import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchRecruitmentDashboard } from './recruitmentSlice'
import PageHeader from '../../components/common/PageHeader'
import useAuth from '../../hooks/useAuth'

export default function RecruitmentDashboardPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const companyId = user?.companyId
  const dashboard = useSelector(s => s.recruitment.recruitmentDashboard)

  useEffect(() => {
    if (companyId) dispatch(fetchRecruitmentDashboard({ companyId }))
  }, [dispatch, companyId])

  const stats = [
    { label: 'Total Posts', value: dashboard?.totalPosts ?? 0, color: 'text-blue-600' },
    { label: 'Active Posts', value: dashboard?.activePosts ?? 0, color: 'text-green-600' },
    { label: 'Total Applicants', value: dashboard?.totalApplicants ?? 0, color: 'text-indigo-600' },
    { label: 'Shortlisted', value: dashboard?.shortlistedApplicants ?? 0, color: 'text-yellow-600' },
    { label: 'Rejected', value: dashboard?.rejectedApplicants ?? 0, color: 'text-red-600' },
  ]

  return (
    <div>
      <PageHeader title="Recruitment Dashboard" subtitle="Hiring pipeline overview" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-lg border p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
