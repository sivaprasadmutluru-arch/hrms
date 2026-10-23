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
  const roles = profile?.roles ?? user?.roles ?? [];
  if (!Array.isArray(roles)) return [];
  const aliases: Record<string, string> = {
    SUPER_ADMIN: ROLES.ENTERPRISE_ADMIN, ACCOUNT_MANAGER: ROLES.ENTERPRISE_ADMIN,
    COMPANY_ADMIN: ROLES.ENTERPRISE_ADMIN, CEO: ROLES.ENTERPRISE_ADMIN,
    COMPANY_MANAGER: ROLES.BRANCH_ADMIN, ACCOUNTS_MANAGER: ROLES.ACCOUNTANT,
  };
  return [...new Set(roles.flatMap(role => aliases[role] ? [role, aliases[role]] : [role]))];
}

export function canAccessAdmin(user: any, profile?: any) {
  return isAdminRole(userRoles(user, profile)) || profile?.isReportingManager === true;
}

export function canReviewLeave(item: any) {
  return item?.canReview === true && ['REQUESTED', 'PENDING'].includes(String(item?.status || '').toUpperCase());
}

export function usesDirectReportAttendance(user: any, profile?: any) {
  const roles = userRoles(user, profile);
  return canAccessAdmin(user, profile) && !hasRole(roles, [ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER]);
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
