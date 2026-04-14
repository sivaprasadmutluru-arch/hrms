import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { selectIsAuthenticated, selectRoles, selectUser, fetchMe } from '../../features/auth/authSlice'
import { fetchMyCompany } from '../../features/companies/companiesSlice'

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

  // Bootstrap current user's company so useCurrency works on any page after refresh.
  // Skip for platform admins — they use fetchAll() to load all companies, and fetchMyCompany
  // would overwrite state.data with a single company.
  useEffect(() => {
    const isPlatformAdmin = roles.includes('PLATFORM_SUPER_ADMIN')
    if (isAuthenticated && user?.companyId && !isPlatformAdmin) {
      dispatch(fetchMyCompany(user.companyId))
    }
  }, [isAuthenticated, user?.companyId, roles])

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
