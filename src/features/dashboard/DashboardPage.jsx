import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { UsersIcon, CalendarDaysIcon, TicketIcon, FolderIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline'
import StatCard from '../../components/common/StatCard'
import Card from '../../components/common/Card'
import PageHeader from '../../components/common/PageHeader'
import Badge from '../../components/common/Badge'
import Spinner from '../../components/common/Spinner'
import { fetchAll as fetchLeave } from '../leave/leaveSlice'
import { fetchAll as fetchTickets } from '../helpdesk/helpdeskSlice'
import { fetchAll as fetchProjects } from '../projects/projectsSlice'
import { fetchAll as fetchOrganizations } from '../organizations/organizationsSlice'
import { fetchAll as fetchCompanies } from '../companies/companiesSlice'
import { fetchHeadcount as fetchHeadcountReport, fetchAttendanceReport } from '../reports/reportsSlice'
import { formatDate } from '../../utils/formatters'
import { STATUS_COLORS } from '../../config/constants'
import useAuth from '../../hooks/useAuth'

export default function DashboardPage() {
  const dispatch = useDispatch()
  const { isPlatformAdmin, isEnterpriseAdmin, isBranchAdmin, isHRManager, isAccountant, isDeptManager, user } = useAuth()
  const leave = useSelector(s => s.leave)
  const helpdesk = useSelector(s => s.helpdesk)
  const projects = useSelector(s => s.projects)
  const organizations = useSelector(s => s.organizations)
  const companies = useSelector(s => s.companies)
  const headcount = useSelector(s => s.reports.headcount)
  const attendanceReport = useSelector(s => s.reports.attendance)

  const isSuperAdmin = isPlatformAdmin()
  const isEntAdmin = isEnterpriseAdmin()
  const isBranchMgr = isBranchAdmin()

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  useEffect(() => {
    dispatch(fetchLeave({ page: 0, size: 5 }))
    dispatch(fetchTickets({ page: 0, size: 5 }))
    dispatch(fetchProjects({ page: 0, size: 5 }))
    dispatch(fetchHeadcountReport({}))
    dispatch(fetchAttendanceReport({ from: weekAgo, to: today }))
    if (isSuperAdmin) dispatch(fetchOrganizations({ page: 0, size: 100 }))
    if (isEntAdmin) dispatch(fetchCompanies({ page: 0, size: 50 }))
  }, [dispatch, isSuperAdmin, isEntAdmin])

  // Map attendance daily data — last 7 days with day labels
  const attendanceChartData = (attendanceReport?.daily || []).slice(-7).map(d => ({
    day: new Date(d.date).toLocaleDateString('en', { weekday: 'short' }),
    present: d.present,
    absent: d.absent,
  }))

  const pendingLeaves = (leave.data || []).filter(l => l.status === 'PENDING')
  const openTickets = (helpdesk.data || []).filter(t => t.status === 'OPEN')
  const activeProjects = (projects.data || []).filter(p => p.status === 'ACTIVE')
  const activeOrgs = (organizations?.data || []).filter(o => o.status === 'ACTIVE')
  const branches = (companies?.data || []).filter(c => c.companyType === 'BRANCH')

  const subtitle = isSuperAdmin
    ? 'Platform overview — all client organizations'
    : isEntAdmin
      ? `Head office overview — ${user?.enterpriseName || 'your enterprise'} (${branches.length} branch${branches.length !== 1 ? 'es' : ''})`
      : isBranchMgr
        ? `Branch overview — ${user?.companyName || 'your branch'}`
        : "Welcome back — here's what's happening today."

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={subtitle} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {isSuperAdmin && (
          <StatCard title="Active Organizations" value={activeOrgs.length || '—'} icon={BuildingOffice2Icon} color="indigo" />
        )}
        {isEntAdmin && (
          <StatCard title="Branch Companies" value={branches.length || '—'} icon={BuildingOffice2Icon} color="indigo" />
        )}
        {!isSuperAdmin && !isEntAdmin && (
          <StatCard title="Total Employees" value={headcount?.active ?? '—'} icon={UsersIcon} color="indigo" />
        )}
        <StatCard title="Pending Leaves" value={pendingLeaves.length} icon={CalendarDaysIcon} color="amber" />
        <StatCard title="Open Tickets" value={openTickets.length} icon={TicketIcon} color="red" />
        <StatCard title="Active Projects" value={activeProjects.length} icon={FolderIcon} color="violet" />
      </div>

      {/* Platform-level org table — super admin only */}
      {isSuperAdmin && (
        <Card className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">All Client Organizations</h3>
          {organizations?.loading ? <Spinner size="sm" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="pb-2 text-left">Name</th>
                  <th className="pb-2 text-left">Email</th>
                  <th className="pb-2 text-left">Plan</th>
                  <th className="pb-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {(organizations?.data || []).slice(0, 8).map(org => (
                  <tr key={org.id} className="border-b border-gray-50">
                    <td className="py-2 font-medium text-gray-800">{org.name || '—'}</td>
                    <td className="py-2 text-gray-600">{org.contactEmail || '—'}</td>
                    <td className="py-2 text-gray-600">{org.subscriptionPlan || '—'}</td>
                    <td className="py-2"><Badge label={org.status || 'Active'} variant={STATUS_COLORS[org.status?.toLowerCase()] || 'success'} /></td>
                  </tr>
                ))}
                {(organizations?.data || []).length === 0 && (
                  <tr><td colSpan="4" className="py-4 text-center text-gray-400">No organizations found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {/* Enterprise Admin — branch companies summary */}
      {isEntAdmin && (
        <Card className="mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Branch Companies ({branches.length}/5)</h3>
          {companies?.loading ? <Spinner size="sm" /> : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="pb-2 text-left">Branch Name</th>
                  <th className="pb-2 text-left">Email</th>
                  <th className="pb-2 text-left">Location</th>
                  <th className="pb-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {branches.slice(0, 5).map(branch => (
                  <tr key={branch.id} className="border-b border-gray-50">
                    <td className="py-2 font-medium text-gray-800">{branch.name || '—'}</td>
                    <td className="py-2 text-gray-600">{branch.email || '—'}</td>
                    <td className="py-2 text-gray-600">{branch.location || branch.address || '—'}</td>
                    <td className="py-2"><Badge label={branch.status || 'Active'} variant={STATUS_COLORS[branch.status?.toLowerCase()] || 'success'} /></td>
                  </tr>
                ))}
                {branches.length === 0 && (
                  <tr><td colSpan="4" className="py-4 text-center text-gray-400">No branches yet. Go to Companies to add branches.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Attendance Overview (This Week)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={attendanceChartData.length > 0 ? attendanceChartData : [{ day: 'No data', present: 0, absent: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" fill="#6366F1" radius={[4, 4, 0, 0]} name="Present" />
              <Bar dataKey="absent" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Absent" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Pending Approvals</h3>
          {leave.loading ? <Spinner size="sm" /> : (
            <div className="space-y-3">
              {pendingLeaves.slice(0, 5).map(l => (
                <div key={l.id} className="flex items-center justify-between text-sm">
                  <div>
                    <p className="font-medium text-gray-800">{l.employeeName || l.employee?.name || 'Employee'}</p>
                    <p className="text-xs text-gray-500">{formatDate(l.startDate)} – {formatDate(l.endDate)}</p>
                  </div>
                  <Badge label="Pending" variant="warning" />
                </div>
              ))}
              {pendingLeaves.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No pending approvals</p>}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Leave Requests</h3>
          {leave.loading ? <Spinner size="sm" /> : (
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-500 border-b"><th className="pb-2 text-left">Employee</th><th className="pb-2 text-left">Type</th><th className="pb-2 text-left">Status</th></tr></thead>
              <tbody>
                {(leave.data || []).slice(0, 5).map(l => (
                  <tr key={l.id} className="border-b border-gray-50">
                    <td className="py-2 font-medium text-gray-800">{l.employee ? `${l.employee.firstName || ''} ${l.employee.lastName || ''}`.trim() || l.employee.employeeCode || '—' : '—'}</td>
                    <td className="py-2 text-gray-600">{l.leaveType?.name || l.type || '—'}</td>
                    <td className="py-2"><Badge label={l.status} variant={STATUS_COLORS[l.status?.toLowerCase()] || 'default'} /></td>
                  </tr>
                ))}
                {(leave.data || []).length === 0 && <tr><td colSpan="3" className="py-4 text-center text-gray-400">No leave requests</td></tr>}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Tickets</h3>
          {helpdesk.loading ? <Spinner size="sm" /> : (
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-500 border-b"><th className="pb-2 text-left">Subject</th><th className="pb-2 text-left">Priority</th><th className="pb-2 text-left">Status</th></tr></thead>
              <tbody>
                {(helpdesk.data || []).slice(0, 5).map(t => (
                  <tr key={t.id} className="border-b border-gray-50">
                    <td className="py-2 font-medium text-gray-800 max-w-[150px] truncate">{t.subject || t.title || '—'}</td>
                    <td className="py-2"><Badge label={t.priority} variant={t.priority === 'HIGH' || t.priority === 'URGENT' ? 'danger' : 'warning'} /></td>
                    <td className="py-2"><Badge label={t.status} variant={STATUS_COLORS[t.status?.toLowerCase()] || 'default'} /></td>
                  </tr>
                ))}
                {(helpdesk.data || []).length === 0 && <tr><td colSpan="3" className="py-4 text-center text-gray-400">No tickets</td></tr>}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  )
}
