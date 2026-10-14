import {allocationItems} from './leaveAllocations';

export type RoleMember = {
  key: string;
  userId: number | string | null;
  employeeId?: number | string;
  name: string;
  email: string;
  photoPath?: string;
  companyId: number | string;
  employmentCompanyId?: number | string;
  departmentName?: string;
  assignments: any[];
};

export const COMPANY_ROLE_PAGES = ['User Roles', 'Assign Role'];
const PLATFORM_ROLES = ['SUPER_ADMIN', 'ACCOUNT_MANAGER', 'COMPANY_ADMIN', 'COMPANY_MANAGER', 'DEPARTMENT_MANAGER', 'HR_MANAGER', 'ACCOUNTS_MANAGER', 'EMPLOYEE'];
const ENTERPRISE_ROLES = ['COMPANY_ADMIN', 'COMPANY_MANAGER', 'HR_MANAGER', 'ACCOUNTS_MANAGER', 'DEPARTMENT_MANAGER', 'EMPLOYEE'];

export function assignableCompanyRoles(callerRoles: string[], company: any, targetUserId?: number | string | null, callerUserId?: number | string) {
  if (callerRoles.includes('COMPANY_MANAGER')) return [];
  const roles = callerRoles.some(role => ['PLATFORM_SUPER_ADMIN', 'SUPER_ADMIN'].includes(role)) ? PLATFORM_ROLES
    : callerRoles.some(role => ['ENTERPRISE_ADMIN', 'COMPANY_ADMIN'].includes(role)) ? ENTERPRISE_ROLES
      : callerRoles.includes('BRANCH_ADMIN') ? ['DEPARTMENT_MANAGER', 'EMPLOYEE'] : [];
  return roles.filter(role => {
    if (company.companyType === 'BRANCH' && ['COMPANY_ADMIN', 'COMPANY_MANAGER'].includes(role)) return false;
    return !(callerUserId != null && String(targetUserId) === String(callerUserId) && ['SUPER_ADMIN', 'ACCOUNT_MANAGER'].includes(role));
  });
}

export function roleScopes(role: string, company: any): string[] {
  if (role === 'EMPLOYEE') return ['SELF'];
  if (role === 'DEPARTMENT_MANAGER') return ['DEPARTMENT'];
  if (['COMPANY_ADMIN', 'COMPANY_MANAGER'].includes(role)) return company.companyType === 'BRANCH' ? [] : ['ENTERPRISE'];
  if (company.companyType === 'BRANCH') return ['BRANCH'];
  return ['BRANCH', 'HEAD_OFFICE', 'ENTERPRISE'];
}

export function companyRoleAssignments(result: any, companyId: number | string) {
  return allocationItems(result).filter(item => item && String(item.companyId ?? item.company?.id) === String(companyId));
}

function personName(item: any) {
  return item.fullName?.trim() || [item.firstName, item.lastName].filter(Boolean).join(' ') || item.username || item.email || 'User';
}

export function companyRoleMembers(employees: any[], usersResult: any, assignmentsResult: any, companyId: number | string): RoleMember[] {
  const assignments = companyRoleAssignments(assignmentsResult, companyId);
  const allUsers = allocationItems(usersResult);
  const users = allUsers.filter(item => String(item.companyId) === String(companyId));
  const members = new Map<string, RoleMember>();
  for (const employee of employees) {
    if (String(employee.companyId ?? employee.company?.id) !== String(companyId) || employee.isActive === false) continue;
    let userId = employee.userId ?? employee.user?.id ?? null;
    // Employee IDs are tenant-local; only link an account by an explicit user ID
    // or a unique email inside this company's authoritative account list.
    if (userId == null && employee.email) {
      const matching = new Set([...users, ...assignments].filter(item => String(item.email).toLowerCase() === String(employee.email).toLowerCase()).map(item => item.userId ?? item.id));
      if (matching.size === 1) userId = Array.from(matching)[0];
    }
    const account = allUsers.find(item => userId != null && String(item.id) === String(userId));
    const key = userId == null ? `employee:${employee.id}` : `user:${userId}`;
    members.set(key, {
      key, userId, employeeId: employee.id, name: personName(employee), email: employee.email || account?.email || '',
      photoPath: employee.photoPath, companyId, employmentCompanyId: account?.companyId ?? companyId,
      departmentName: employee.departmentName,
      assignments: assignments.filter(item => userId != null && String(item.userId) === String(userId)),
    });
  }
  for (const item of [...users, ...assignments]) {
    const userId = item.userId ?? item.id;
    const key = `user:${userId}`;
    if (members.has(key)) continue;
    const account = allUsers.find(user => String(user.id) === String(userId));
    const companyAssignments = assignments.filter(assignment => String(assignment.userId) === String(userId));
    const employmentCompanyId = account?.companyId ?? (companyAssignments.some(assignment => assignment.roleName === 'EMPLOYEE' && (assignment.assignmentStatus || 'ACTIVE') === 'ACTIVE') ? companyId : undefined);
    members.set(key, {key, userId, name: personName(account || item), email: account?.email || item.email || '', companyId, employmentCompanyId, assignments: companyAssignments});
  }
  return Array.from(members.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export function companyRolePayload(company: any, member: RoleMember, values: {roleName: string; accessScope: string; departmentId: string; accessLevel: string; reason: string}, callerRoles: string[], callerUserId: number | string | undefined, departments: any[]) {
  const companyId = Number(company.id);
  const userId = Number(member.userId);
  if (!Number.isSafeInteger(companyId) || companyId <= 0 || String(member.companyId) !== String(company.id)) throw new Error('Select an employee from this company.');
  if (member.userId == null || !Number.isSafeInteger(userId) || userId <= 0) throw new Error('This employee has no linked login account.');
  if (!assignableCompanyRoles(callerRoles, company, userId, callerUserId).includes(values.roleName)) throw new Error('You cannot assign this role to this user.');
  if (!roleScopes(values.roleName, company).includes(values.accessScope)) throw new Error('Select a valid access scope for this role.');
  if (!['SUPER_ADMIN', 'ACCOUNT_MANAGER'].includes(values.roleName) && String(member.employmentCompanyId) !== String(company.id)) throw new Error("This role must use the employee's employment company.");
  const reason = values.reason.trim();
  if (reason.length < 3 || reason.length > 500) throw new Error('Enter an assignment reason between 3 and 500 characters.');
  if (member.assignments.some(item => item.roleName === values.roleName && (item.assignmentStatus || 'ACTIVE') === 'ACTIVE' && item.isActive !== false)) throw new Error('This user already has this role in the selected company.');
  let departmentId: number | undefined;
  if (values.accessScope === 'DEPARTMENT') {
    departmentId = Number(values.departmentId);
    if (!Number.isSafeInteger(departmentId) || departmentId <= 0 || !departments.some(item => String(item.id) === values.departmentId && String(item.companyId ?? item.company?.id) === String(company.id))) throw new Error('Select a department from this company.');
  }
  if (values.roleName === 'ACCOUNT_MANAGER' && !['FULL', 'PARTIAL'].includes(values.accessLevel)) throw new Error('Select full or partial company access.');
  return {companyId, userId, roleName: values.roleName, accessScope: values.accessScope, reason, accessLevel: values.roleName === 'ACCOUNT_MANAGER' ? values.accessLevel : 'FULL', ...(departmentId != null ? {departmentId} : {})};
}
