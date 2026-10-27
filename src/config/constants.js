export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export const APP_NAME = 'Accrue Technologies'

export const ROLES = {
  PLATFORM_SUPER_ADMIN: 'PLATFORM_SUPER_ADMIN',  // Prabha Tech internal
  SUPER_ADMIN: 'SUPER_ADMIN',                    // Assigned company-wide access
  ACCOUNT_MANAGER: 'ACCOUNT_MANAGER',            // May be assigned to multiple companies
  ENTERPRISE_ADMIN: 'ENTERPRISE_ADMIN',            // Head Office / Company Admin
  BRANCH_ADMIN: 'BRANCH_ADMIN',                   // Branch-level admin
  HR_MANAGER: 'HR_MANAGER',                        // HR at head office or branch
  ACCOUNTANT: 'ACCOUNTANT',                        // Payroll/finance at head office or branch
  DEPARTMENT_MANAGER: 'DEPARTMENT_MANAGER',        // Within a branch
  TEAM_LEAD: 'TEAM_LEAD',                          // Within a department
  EMPLOYEE: 'EMPLOYEE',                            // ESS
}

// Scope controls what data a user can see within their role
export const SCOPES = {
  SELF: 'SELF',                // Own data only (Employee)
  DEPARTMENT: 'DEPARTMENT',    // Their department (Department Manager)
  BRANCH: 'BRANCH',            // Their branch (Branch Admin, Branch HR, Branch Accountant)
  HEAD_OFFICE: 'HEAD_OFFICE',  // Head office + all branches (Enterprise Admin)
  ENTERPRISE: 'ENTERPRISE',    // Full enterprise view (Enterprise Admin)
}

export const STATUS_COLORS = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  active: 'success',
  inactive: 'danger',
  suspended: 'danger',
  open: 'warning',
  resolved: 'success',
  closed: 'success',
  in_progress: 'primary',
}

export const LEAVE_TYPES = ['ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'UNPAID', 'OTHER']

export const TICKET_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

export const TASK_STAGES = ['TODO', 'IN_PROGRESS', 'TESTING', 'DONE']

export const PERMISSIONS = [
  'attendance:view', 'attendance:manage',
  'leave:view', 'leave:approve',
  'payroll:view', 'payroll:manage',
  'recruitment:view', 'recruitment:manage',
  'employee:view', 'employee:manage',
  'helpdesk:view', 'helpdesk:manage',
  'report:view',
  'asset:view', 'asset:manage',
  'project:view', 'project:manage',
  'pms:view', 'pms:manage',
]
