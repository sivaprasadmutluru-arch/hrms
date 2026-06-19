import { useEffect, Suspense } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { PageSkeleton } from '../common/Skeleton'
import { selectIsAuthenticated, selectRoles, selectUser, fetchMe } from '../../features/auth/authSlice'
import { fetchMyCompany, fetchMyCompanyInfo } from '../../features/companies/companiesSlice'
import { fetchUnreadCount } from '../../features/notifications/notificationsSlice'

export default function AppLayout() {
  const dispatch = useDispatch()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const roles = useSelector(selectRoles)
  const user = useSelector(selectUser)

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchMe())
    }
  }, [isAuthenticated])

  // Poll unread notification count every 30 seconds so the bell badge stays current.
  useEffect(() => {
    if (!isAuthenticated) return
    dispatch(fetchUnreadCount())
    const interval = setInterval(() => dispatch(fetchUnreadCount()), 120000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  // Bootstrap current user's company so useCurrency works on any page after refresh.
  // Skip for platform admins — they use fetchAll() to load all companies.
  // Employees/HR managers use /companies/mine (no role restriction).
  // Enterprise/Branch admins use /companies/{id} (requires admin role).
  useEffect(() => {
    const isPlatformAdmin = roles.includes('PLATFORM_SUPER_ADMIN')
    const isAdminRole = roles.some(r => ['ENTERPRISE_ADMIN', 'BRANCH_ADMIN'].includes(r))
    if (!isAuthenticated || isPlatformAdmin) return
    if (isAdminRole && user?.companyId) {
      dispatch(fetchMyCompany(user.companyId))
    } else if (user?.companyId) {
      dispatch(fetchMyCompanyInfo())
    }
  }, [isAuthenticated, user?.companyId, roles])

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          <Suspense fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
