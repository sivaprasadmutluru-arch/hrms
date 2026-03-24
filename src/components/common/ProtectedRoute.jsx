import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectRoles } from '../../features/auth/authSlice'

/**
 * Wraps a route element and redirects to /forbidden if the current user
 * does not have at least one of the required roles.
 *
 * Usage:
 *   <ProtectedRoute roles={['PLATFORM_SUPER_ADMIN']} element={<OrganizationsPage />} />
 */
export default function ProtectedRoute({ roles = [], element }) {
  const userRoles = useSelector(selectRoles)
  const hasAccess = roles.some(r => userRoles.includes(r))
  if (!hasAccess) return <Navigate to="/forbidden" replace />
  return element
}
