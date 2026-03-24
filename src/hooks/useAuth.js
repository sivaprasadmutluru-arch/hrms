import { useDispatch, useSelector } from 'react-redux'
import { selectUser, selectRoles, selectIsAuthenticated, logout } from '../features/auth/authSlice'
import { ROLES } from '../config/constants'

export default function useAuth() {
  const dispatch = useDispatch()
  const user = useSelector(selectUser)
  const roles = useSelector(selectRoles)
  const isAuthenticated = useSelector(selectIsAuthenticated)

  const hasRole = (...checkRoles) => checkRoles.some(r => roles.includes(r))

  // Role predicates — ordered by hierarchy
  const isPlatformAdmin    = () => hasRole(ROLES.PLATFORM_SUPER_ADMIN)
  const isEnterpriseAdmin  = () => hasRole(ROLES.ENTERPRISE_ADMIN)
  const isBranchAdmin      = () => hasRole(ROLES.BRANCH_ADMIN)
  const isHRManager        = () => hasRole(ROLES.HR_MANAGER)
  const isAccountant       = () => hasRole(ROLES.ACCOUNTANT)
  const isDeptManager      = () => hasRole(ROLES.DEPARTMENT_MANAGER)
  const isTeamLead         = () => hasRole(ROLES.TEAM_LEAD)
  const isEmployee         = () => hasRole(ROLES.EMPLOYEE)

  // Convenience groupings
  const isHeadOfficeLevel  = () => isPlatformAdmin() || isEnterpriseAdmin()
  const isBranchLevel      = () => isBranchAdmin() || isHRManager() || isAccountant()
  const isManagement       = () => isHeadOfficeLevel() || isBranchAdmin()

  // The user's access scope comes from the backend; fall back to role-based defaults
  const getScope = () => {
    if (user?.accessScope) return user.accessScope
    if (isPlatformAdmin())   return 'ENTERPRISE'
    if (isEnterpriseAdmin()) return 'ENTERPRISE'
    if (isBranchAdmin())     return 'BRANCH'
    if (isHRManager())       return 'BRANCH'
    if (isAccountant())      return 'BRANCH'
    if (isDeptManager())     return 'DEPARTMENT'
    if (isTeamLead())        return 'DEPARTMENT'
    return 'SELF'
  }

  const handleLogout = () => dispatch(logout())

  return {
    user,
    roles,
    isAuthenticated,
    hasRole,
    isPlatformAdmin,
    isEnterpriseAdmin,
    isBranchAdmin,
    isHRManager,
    isAccountant,
    isDeptManager,
    isTeamLead,
    isEmployee,
    isHeadOfficeLevel,
    isBranchLevel,
    isManagement,
    getScope,
    logout: handleLogout,
  }
}
