export const ROLES = {
  PLATFORM_SUPER_ADMIN: 'PLATFORM_SUPER_ADMIN',
  ENTERPRISE_ADMIN: 'ENTERPRISE_ADMIN',
  BRANCH_ADMIN: 'BRANCH_ADMIN',
  HR_MANAGER: 'HR_MANAGER',
  ACCOUNTANT: 'ACCOUNTANT',
  DEPARTMENT_MANAGER: 'DEPARTMENT_MANAGER',
  TEAM_LEAD: 'TEAM_LEAD',
  EMPLOYEE: 'EMPLOYEE',
} as const;

export function userRoles(user: any, profile?: any) {
  const roles = user?.roles || profile?.roles || [];
  return Array.isArray(roles) ? roles : [];
}

export function hasRole(roles: string[], allowed: string[]) {
  return roles.includes(ROLES.PLATFORM_SUPER_ADMIN) || allowed.some(role => roles.includes(role));
}

export function isAdminRole(roles: string[]) {
  return hasRole(roles, [
    ROLES.ENTERPRISE_ADMIN,
    ROLES.BRANCH_ADMIN,
    ROLES.HR_MANAGER,
    ROLES.ACCOUNTANT,
    ROLES.DEPARTMENT_MANAGER,
    ROLES.TEAM_LEAD,
  ]);
}

export const ACCESS_SCOPES = ['SELF', 'DEPARTMENT', 'BRANCH', 'HEAD_OFFICE', 'ENTERPRISE'] as const;

export function roleLabel(role: string) {
  return role
    .toLowerCase()
    .split('_')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
