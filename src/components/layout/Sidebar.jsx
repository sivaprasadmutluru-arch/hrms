import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  HomeIcon, BuildingOffice2Icon, BuildingOfficeIcon, UsersIcon,
  ClockIcon, CalendarDaysIcon, BanknotesIcon, ArchiveBoxIcon,
  FolderIcon, UserPlusIcon, ChartBarIcon, ArrowRightStartOnRectangleIcon,
  ArrowLeftStartOnRectangleIcon, TicketIcon, DocumentTextIcon,
  ShieldCheckIcon, ChartPieIcon, BellIcon, ChevronLeftIcon, ChevronRightIcon,
  Cog6ToothIcon, ReceiptPercentIcon, ChevronDownIcon,
} from '@heroicons/react/24/outline'
import { useSelector } from 'react-redux'
import useAuth from '../../hooks/useAuth'
import Avatar from '../common/Avatar'
import { APP_NAME } from '../../config/constants'

// ─── Collapsible nav groups ────────────────────────────────────────────────────

const EMPLOYEE_GROUP = {
  label: 'Employee',
  icon: UsersIcon,
  group: 'employee',
  children: [
    { label: 'My Profile',           to: '/employees/me' },
    { label: 'Employees',            to: '/employees' },
    { label: 'Document Requests',    to: '/documents/requests' },
    { label: 'Disciplinary Actions', to: '/disciplinary-actions' },
    { label: 'Employee Notes',       to: '/employee-notes' },
    { label: 'Employee Settings',    to: '/employee-settings' },
    { label: 'Policies',             to: '/policies' },
    { label: 'Org Chart',            to: '/org-chart' },
  ],
}

// Admin roles may not have an employee record — profile points to account page
const ADMIN_EMPLOYEE_GROUP = {
  ...EMPLOYEE_GROUP,
  children: [
    { label: 'My Profile',           to: '/admin/profile' },
    ...EMPLOYEE_GROUP.children.slice(1),
  ],
}

const COMPANY_GROUP = {
  label: 'Company',
  icon: BuildingOffice2Icon,
  group: 'company',
  children: [
    { label: 'Settings',         to: '/companies/settings' },
    { label: 'Email Templates',  to: '/companies/email-templates' },
    { label: 'Email Logs',       to: '/companies/email-logs' },
  ],
}

const ATTENDANCE_GROUP = {
  label: 'Attendance',
  icon: ClockIcon,
  group: 'attendance',
  children: [
    { label: 'Dashboard',          to: '/attendance/dashboard' },
    { label: 'Attendance',         to: '/attendance' },
    { label: 'Calendar',           to: '/attendance/calendar' },
    { label: 'Register',           to: '/attendance/register' },
    { label: 'Work Records',       to: '/attendance/work-records' },
    { label: 'Shift Allocations',  to: '/attendance/shift-allocations' },
    { label: 'Rotating Shifts',    to: '/attendance/rotating-shifts' },
    { label: 'Rotating Work Types',to: '/attendance/rotating-work-types' },
    { label: 'Settings',           to: '/attendance/settings' },
  ],
}

// For roles that don't have Work Records access
const ATTENDANCE_GROUP_BASIC = {
  ...ATTENDANCE_GROUP,
  children: ATTENDANCE_GROUP.children.slice(0, 2),
}

const LEAVE_GROUP = {
  label: 'Leave',
  icon: CalendarDaysIcon,
  group: 'leave',
  children: [
    { label: 'Dashboard',       to: '/leave/dashboard' },
    { label: 'Leave Requests',  to: '/leave' },
    { label: 'Leave Balance',   to: '/leave/balance' },
    { label: 'Allocations',     to: '/leave/allocations' },
    { label: 'Restrictions',    to: '/leave/restrictions' },
    { label: 'Holidays',        to: '/leave/holidays' },
    { label: 'Company Leaves', to: '/leave/company-leaves' },
  ],
}

// Leave group without Restrictions (for roles that cannot manage restrictions)
const LEAVE_GROUP_BASIC = {
  ...LEAVE_GROUP,
  children: LEAVE_GROUP.children.slice(0, 3),
}

const PAYROLL_GROUP = {
  label: 'Payroll',
  icon: BanknotesIcon,
  group: 'payroll',
  children: [
    { label: 'Dashboard',          to: '/payroll/dashboard' },
    { label: 'Manual Payroll',     to: '/payroll/manual' },
    { label: 'Automated Payroll',  to: '/payroll/automated' },
    { label: 'Contracts',          to: '/payroll/contracts' },
    { label: 'Payslips',           to: '/payroll/payslips' },
    { label: 'Allowances',         to: '/payroll/allowances' },
    { label: 'Deductions',         to: '/payroll/deductions' },
    { label: 'Loans',              to: '/payroll/loans' },
    { label: 'Tax Settings',       to: '/payroll/tax-settings' },
    { label: 'Reimbursements',     to: '/payroll/reimbursements' },
    { label: 'Batch Groups',       to: '/payroll/batch-groups' },
    { label: 'Settings',           to: '/payroll/settings' },
  ],
}

const RECRUITMENT_GROUP = {
  label: 'Recruitment',
  icon: UserPlusIcon,
  group: 'recruitment',
  children: [
    { label: 'Dashboard',      to: '/recruitment/dashboard' },
    { label: 'Job Posts',      to: '/recruitment/posts' },
    { label: 'Pipeline',       to: '/recruitment/pipeline' },
    { label: 'Skills',         to: '/recruitment/skills' },
    { label: 'Surveys',        to: '/recruitment/surveys' },
    { label: 'Candidate Docs', to: '/recruitment/candidate-docs' },
  ],
}

const OFFBOARDING_GROUP = {
  label: 'Offboarding',
  icon: ArrowLeftStartOnRectangleIcon,
  group: 'offboarding',
  children: [
    { label: 'Offboarding', to: '/offboarding' },
    { label: 'Plans',       to: '/offboarding/plans' },
    { label: 'Settings',    to: '/offboarding/settings' },
  ],
}

const PERFORMANCE_GROUP = {
  label: 'Performance',
  icon: ChartBarIcon,
  group: 'performance',
  children: [
    { label: 'Review Cycles',        to: '/performance/cycles' },
    { label: 'Question Templates',   to: '/performance/question-templates' },
    { label: 'Bonus Settings',       to: '/performance/bonus-settings' },
  ],
}

const BIOMETRIC_GROUP = {
  label: 'Biometric & Hardware',
  icon: Cog6ToothIcon,
  group: 'biometric',
  children: [
    { label: 'Biometric Devices',   to: '/biometric/devices' },
    { label: 'Biometric Employees', to: '/biometric/employees' },
    { label: 'Geo Fencing',         to: '/geofencing' },
    { label: 'Face Detection',      to: '/face-detection' },
  ],
}

const ORG_SETUP_GROUP = {
  label: 'Setup',
  icon: BuildingOfficeIcon,
  group: 'org-setup',
  children: [
    { label: 'Departments',     to: '/departments' },
    { label: 'Job Positions',   to: '/job-positions' },
    { label: 'Job Roles',       to: '/job-roles' },
    { label: 'Work Types',      to: '/work-types' },
    { label: 'Shift Schedules', to: '/shift-schedules' },
  ],
}

const ASSETS_GROUP = {
  label: 'Assets',
  icon: ArchiveBoxIcon,
  group: 'assets',
  children: [
    { label: 'All Assets',  to: '/assets' },
    { label: 'Categories',  to: '/assets/categories' },
    { label: 'Requests',    to: '/assets/requests' },
  ],
}

const SETTINGS_GROUP = {
  label: 'Settings',
  icon: Cog6ToothIcon,
  group: 'settings',
  children: [
    { label: 'General',        to: '/settings/general' },
    { label: 'Account',        to: '/settings/account' },
    { label: 'LDAP / AD',      to: '/settings/ldap' },
    { label: 'Backup',         to: '/settings/backup' },
    { label: 'Outlook Auth',   to: '/settings/outlook-auth' },
    { label: 'Accessibility',  to: '/settings/accessibility' },
    { label: 'Dynamic Fields', to: '/settings/dynamic-fields' },
    { label: 'LinkedIn',       to: '/settings/linkedin' },
  ],
}

// ─── Navigation definitions per role ─────────────────────────────────────────

function getNavSections(auth) {
  const { isPlatformAdmin, isEnterpriseAdmin, isBranchAdmin, isHRManager, isAccountant, isDeptManager } = auth

  // Platform Super Admin — full access to everything
  if (isPlatformAdmin()) {
    return [
      {
        title: 'Overview',
        items: [{ label: 'Dashboard', to: '/dashboard', icon: HomeIcon }],
      },
      {
        title: 'Platform',
        items: [
          { label: 'Organizations', to: '/organizations', icon: ShieldCheckIcon },
        ],
      },
      {
        title: 'Organization',
        items: [
          { label: 'Companies', to: '/companies', icon: BuildingOffice2Icon },
          COMPANY_GROUP,
          ORG_SETUP_GROUP,
          ADMIN_EMPLOYEE_GROUP,
        ],
      },
      {
        title: 'Workforce',
        items: [
          ATTENDANCE_GROUP,
          LEAVE_GROUP,
          PAYROLL_GROUP,
          ASSETS_GROUP,
        ],
      },
      {
        title: 'Talent',
        items: [
          RECRUITMENT_GROUP,
          { label: 'Onboarding', to: '/onboarding', icon: ArrowRightStartOnRectangleIcon },
          OFFBOARDING_GROUP,
          PERFORMANCE_GROUP,
        ],
      },
      {
        title: 'Projects',
        items: [{ label: 'Projects', to: '/projects', icon: FolderIcon }],
      },
      {
        title: 'Support',
        items: [
          { label: 'Helpdesk',      to: '/helpdesk',                        icon: TicketIcon },
          { label: 'Dept Managers', to: '/helpdesk/department-managers',    icon: UserPlusIcon },
        ],
      },
      {
        title: 'Admin',
        items: [
          { label: 'Roles & Access', to: '/roles', icon: Cog6ToothIcon },
          { label: 'User Groups',    to: '/roles/user-groups', icon: UsersIcon },
          BIOMETRIC_GROUP,
          SETTINGS_GROUP,
        ],
      },
      {
        title: 'Reports',
        items: [{ label: 'Reports', to: '/reports', icon: ChartPieIcon }],
      },
    ]
  }

  // Enterprise / Head Office Admin — full visibility across all branches
  if (isEnterpriseAdmin()) {
    return [
      {
        title: 'Overview',
        items: [{ label: 'Dashboard', to: '/dashboard', icon: HomeIcon }],
      },
      {
        title: 'Organization',
        items: [
          { label: 'Companies', to: '/companies', icon: BuildingOffice2Icon },
          COMPANY_GROUP,
          ORG_SETUP_GROUP,
          ADMIN_EMPLOYEE_GROUP,
        ],
      },
      {
        title: 'Workforce',
        items: [
          ATTENDANCE_GROUP,
          LEAVE_GROUP,
          PAYROLL_GROUP,
          { label: 'Assets',   to: '/assets', icon: ArchiveBoxIcon },
        ],
      },
      {
        title: 'Talent',
        items: [
          RECRUITMENT_GROUP,
          { label: 'Onboarding', to: '/onboarding', icon: ArrowRightStartOnRectangleIcon },
          OFFBOARDING_GROUP,
          PERFORMANCE_GROUP,
        ],
      },
      {
        title: 'Projects',
        items: [{ label: 'Projects', to: '/projects', icon: FolderIcon }],
      },
      {
        title: 'Support',
        items: [
          { label: 'Helpdesk', to: '/helpdesk', icon: TicketIcon },
        ],
      },
      {
        title: 'Management',
        items: [
          { label: 'Roles & Access', to: '/roles', icon: Cog6ToothIcon },
          BIOMETRIC_GROUP,
          SETTINGS_GROUP,
        ],
      },
      {
        title: 'Reports',
        items: [{ label: 'Reports', to: '/reports', icon: ChartPieIcon }],
      },
    ]
  }

  // Branch Admin — manages their branch only; cannot create companies or change enterprise settings
  if (isBranchAdmin()) {
    return [
      {
        title: 'Overview',
        items: [{ label: 'Dashboard', to: '/dashboard', icon: HomeIcon }],
      },
      {
        title: 'Organization',
        items: [
          COMPANY_GROUP,
          ORG_SETUP_GROUP,
          ADMIN_EMPLOYEE_GROUP,
        ],
      },
      {
        title: 'Workforce',
        items: [
          ATTENDANCE_GROUP,
          LEAVE_GROUP,
          PAYROLL_GROUP,
          ASSETS_GROUP,
        ],
      },
      {
        title: 'Talent',
        items: [
          RECRUITMENT_GROUP,
          { label: 'Onboarding', to: '/onboarding', icon: ArrowRightStartOnRectangleIcon },
          OFFBOARDING_GROUP,
          PERFORMANCE_GROUP,
        ],
      },
      {
        title: 'Projects',
        items: [{ label: 'Projects', to: '/projects', icon: FolderIcon }],
      },
      {
        title: 'Support',
        items: [
          { label: 'Helpdesk',      to: '/helpdesk',                     icon: TicketIcon },
          { label: 'Dept Managers', to: '/helpdesk/department-managers', icon: UserPlusIcon },
        ],
      },
      {
        title: 'Admin',
        items: [
          BIOMETRIC_GROUP,
          SETTINGS_GROUP,
        ],
      },
      {
        title: 'Reports',
        items: [{ label: 'Reports', to: '/reports', icon: ChartPieIcon }],
      },
    ]
  }

  // HR Manager — HR operations at their scope level (head office or branch)
  if (isHRManager()) {
    return [
      {
        title: 'Overview',
        items: [{ label: 'Dashboard', to: '/dashboard', icon: HomeIcon }],
      },
      {
        title: 'Organization',
        items: [
          COMPANY_GROUP,
          ORG_SETUP_GROUP,
          ADMIN_EMPLOYEE_GROUP,
        ],
      },
      {
        title: 'Workforce',
        items: [
          ATTENDANCE_GROUP,
          LEAVE_GROUP,
          { label: 'Assets',  to: '/assets', icon: ArchiveBoxIcon },
        ],
      },
      {
        title: 'Talent',
        items: [
          RECRUITMENT_GROUP,
          { label: 'Onboarding', to: '/onboarding', icon: ArrowRightStartOnRectangleIcon },
          OFFBOARDING_GROUP,
          PERFORMANCE_GROUP,
        ],
      },
      {
        title: 'Support',
        items: [
          { label: 'Helpdesk',      to: '/helpdesk',                     icon: TicketIcon },
          { label: 'Dept Managers', to: '/helpdesk/department-managers', icon: UserPlusIcon },
        ],
      },
      {
        title: 'Admin',
        items: [
          BIOMETRIC_GROUP,
          { label: 'Dynamic Fields', to: '/settings/dynamic-fields', icon: DocumentTextIcon },
        ],
      },
      {
        title: 'Reports',
        items: [{ label: 'Reports', to: '/reports', icon: ChartPieIcon }],
      },
    ]
  }

  // Accountant / Payroll Manager — finance operations at their scope level
  if (isAccountant()) {
    return [
      {
        title: 'Overview',
        items: [{ label: 'Dashboard', to: '/dashboard', icon: HomeIcon }],
      },
      {
        title: 'Finance',
        items: [
          PAYROLL_GROUP,
          ASSETS_GROUP,
        ],
      },
      {
        title: 'Reports',
        items: [{ label: 'Reports', to: '/reports', icon: ChartPieIcon }],
      },
    ]
  }

  // Department Manager — team-level view within a branch
  if (isDeptManager()) {
    return [
      {
        title: 'Overview',
        items: [{ label: 'Dashboard', to: '/dashboard', icon: HomeIcon }],
      },
      {
        title: 'Workforce',
        items: [
          ATTENDANCE_GROUP_BASIC,
          LEAVE_GROUP_BASIC,
        ],
      },
      {
        title: 'Talent',
        items: [
          { label: 'Performance', to: '/performance/cycles', icon: ChartBarIcon },
        ],
      },
      {
        title: 'Support',
        items: [{ label: 'Helpdesk', to: '/helpdesk', icon: TicketIcon }],
      },
    ]
  }

  // Employee (ESS) — self-service only
  return [
    {
      title: 'Overview',
      items: [{ label: 'Dashboard', to: '/dashboard', icon: HomeIcon }],
    },
    {
      title: 'My Work',
      items: [
        { label: 'My Profile', to: '/employees/me', icon: UsersIcon },
        ATTENDANCE_GROUP_BASIC,
        LEAVE_GROUP,
        { label: 'Payslips', to: '/payroll/payslips', icon: ReceiptPercentIcon },
        { label: 'Reimbursements', to: '/payroll/reimbursements', icon: ReceiptPercentIcon },
        { label: 'Loans', to: '/payroll/loans', icon: BanknotesIcon },
        { label: 'My Documents', to: '/documents/my', icon: DocumentTextIcon },
      ],
    },
    {
      title: 'Support',
      items: [{ label: 'Helpdesk', to: '/helpdesk', icon: TicketIcon }],
    },
    {
      title: 'Account',
      items: [{ label: 'Notifications', to: '/notifications', icon: BellIcon }],
    },
  ]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [openGroups, setOpenGroups] = useState(new Set())
  const auth = useAuth()
  const { user, logout } = auth
  const unreadCount = useSelector(s => s.notifications?.unreadCount || 0)

  const sections = getNavSections(auth)

  const toggleGroup = (key) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <aside className={`flex flex-col h-screen bg-[#1E1B4B] text-white transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'} flex-shrink-0`}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        {!collapsed && <span className="font-bold text-lg tracking-tight text-white">{APP_NAME}</span>}
        <button onClick={() => setCollapsed(c => !c)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors ml-auto">
          {collapsed ? <ChevronRightIcon className="h-4 w-4" /> : <ChevronLeftIcon className="h-4 w-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {sections.map(section => (
          <div key={section.title}>
            {!collapsed && (
              <p className="px-2 mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">
                {section.title}
              </p>
            )}
            {section.items.map(item => {
              if (item.group) {
                const isOpen = openGroups.has(item.group)
                return (
                  <div key={item.group}>
                    <button
                      onClick={() => !collapsed && toggleGroup(item.group)}
                      className={`w-full flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors mt-0.5 text-white/70 hover:bg-white/10 hover:text-white ${isOpen ? 'bg-white/5 text-white' : ''}`}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          <ChevronDownIcon className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                        </>
                      )}
                    </button>
                    {isOpen && !collapsed && (
                      <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-2">
                        {item.children.map(child => (
                          <NavLink
                            key={child.to}
                            to={child.to}
                            className={({ isActive }) =>
                              `flex items-center px-2 py-1.5 rounded-lg text-sm transition-colors ${
                                isActive ? 'bg-indigo-600 text-white' : 'text-white/60 hover:bg-white/10 hover:text-white'
                              }`
                            }
                          >
                            {child.label}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors mt-0.5 ${
                      isActive ? 'bg-indigo-600 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              )
            })}
          </div>
        ))}

        {/* Notifications — always shown */}
        <div>
          {!collapsed && (
            <p className="px-2 mb-1 text-xs font-semibold uppercase tracking-wider text-white/40">Account</p>
          )}
          <NavLink
            to="/notifications"
            className={({ isActive }) =>
              `flex items-center gap-3 px-2 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-indigo-600 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <div className="relative flex-shrink-0">
              <BellIcon className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 rounded-full flex items-center justify-center text-xs font-bold">
                  {unreadCount}
                </span>
              )}
            </div>
            {!collapsed && <span>Notifications</span>}
            {!collapsed && unreadCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{unreadCount}</span>
            )}
          </NavLink>
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 p-3">
        <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
          <Avatar name={user?.name || user?.username || 'User'} size="sm" />
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.name || user?.username}</p>
              <p className="text-xs text-white/50 truncate">{user?.role?.replace(/_/g, ' ')}</p>
            </div>
          )}
          {!collapsed && (
            <button
              onClick={logout}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              title="Logout"
            >
              <ArrowLeftStartOnRectangleIcon className="h-4 w-4 text-white/60" />
            </button>
          )}
        </div>
      </div>
    </aside>
  )
}
