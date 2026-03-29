import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import { selectIsAuthenticated, selectRoles, fetchMe } from '../../features/auth/authSlice'

export default function AppLayout() {
  const dispatch = useDispatch()
  const isAuthenticated = useSelector(selectIsAuthenticated)
  const roles = useSelector(selectRoles)

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchMe())
    }
  }, [isAuthenticated])

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
