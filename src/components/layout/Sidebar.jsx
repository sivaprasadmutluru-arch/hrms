import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  HomeIcon, BuildingOffice2Icon, BuildingOfficeIcon, UsersIcon,
  ClockIcon, CalendarDaysIcon, BanknotesIcon, ArchiveBoxIcon,
  FolderIcon, UserPlusIcon, ChartBarIcon, ArrowRightStartOnRectangleIcon,
  ArrowLeftStartOnRectangleIcon, TicketIcon, DocumentTextIcon,
  ShieldCheckIcon, ChartPieIcon, BellIcon, ChevronLeftIcon, ChevronRightIcon,
  Cog6ToothIcon, ReceiptPercentIcon,
} from '@heroicons/react/24/outline'
import { useSelector } from 'react-redux'
import useAuth from '../../hooks/useAuth'
import Avatar from '../common/Avatar'
import { APP_NAME } from '../../config/constants'

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
          { label: 'Companies',         to: '/companies',           icon: BuildingOffice2Icon },
          { label: 'Company Settings',  to: '/companies/settings',  icon: Cog6ToothIcon },
          { label: 'Email Templates',   to: '/companies/email-templates', icon: DocumentTextIcon },
          { label: 'Email Logs',        to: '/companies/email-logs', icon: DocumentTextIcon },
          { label: 'Departments',       to: '/departments',         icon: BuildingOfficeIcon },
          { label: 'Employees',         to: '/employees',           icon: UsersIcon },
          { label: 'Employee Notes',    to: '/employee-notes',      icon: DocumentTextIcon },
          { label: 'Employee Settings', to: '/employee-settings',   icon: Cog6ToothIcon },
        ],
      },
      {
        title: 'Workforce',
        items: [
          { label: 'Attendance',   to: '/attendance',              icon: ClockIcon },
          { label: 'Work Records', to: '/attendance/work-records', icon: ClockIcon },
          { label: 'Leave',        to: '/leave',                   icon: CalendarDaysIcon },
          { label: 'Payroll',      to: '/payroll/contracts',       icon: BanknotesIcon },
          { label: 'Assets',       to: '/assets',                  icon: ArchiveBoxIcon },
        ],
      },
      {
        title: 'Talent',
        items: [
          { label: 'Recruitment',      to: '/recruitment/posts',          icon: UserPlusIcon },
          { label: 'Skills',           to: '/recruitment/skills',         icon: UserPlusIcon },
          { label: 'Surveys',          to: '/recruitment/surveys',        icon: DocumentTextIcon },
          { label: 'Candidate Docs',   to: '/recruitment/candidate-docs', icon: DocumentTextIcon },
          { label: 'Onboarding',  to: '/onboarding',         icon: ArrowRightStartOnRectangleIcon },
          { label: 'Offboarding', to: '/offboarding',        icon: ArrowLeftStartOnRectangleIcon },
          { label: 'Offboarding Plans', to: '/offboarding/plans', icon: ArrowLeftStartOnRectangleIcon },
          { label: 'Offboarding Settings', to: '/offboarding/settings', icon: ArrowLeftStartOnRectangleIcon },
          { label: 'Performance', to: '/performance/cycles', icon: ChartBarIcon },
          { label: 'Question Templates', to: '/performance/question-templates', icon: DocumentTextIcon },
          { label: 'Bonus Settings', to: '/performance/bonus-settings', icon: ChartBarIcon },
        ],
      },
      {
        title: 'Projects',
        items: [{ label: 'Projects', to: '/projects', icon: FolderIcon }],
      },
      {
        title: 'Support',
        items: [
          { label: 'Helpdesk',    to: '/helpdesk', icon: TicketIcon },
          { label: 'Dept Managers', to: '/helpdesk/department-managers', icon: UserPlusIcon },
          { label: 'HR Policies', to: '/policies', icon: DocumentTextIcon },
        ],
      },
      {
        title: 'Admin',
        items: [{ label: 'Roles & Access', to: '/roles', icon: Cog6ToothIcon }],
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
          { label: 'Companies',         to: '/companies',                 icon: BuildingOffice2Icon },
          { label: 'Company Settings',  to: '/companies/settings',        icon: Cog6ToothIcon },
          { label: 'Email Templates',   to: '/companies/email-templates', icon: DocumentTextIcon },
          { label: 'Email Logs',        to: '/companies/email-logs',      icon: DocumentTextIcon },
          { label: 'Departments',       to: '/departments',               icon: BuildingOfficeIcon },
          { label: 'Employees',         to: '/employees',                 icon: UsersIcon },
          { label: 'Employee Notes',    to: '/employee-notes',            icon: DocumentTextIcon },
          { label: 'Employee Settings', to: '/employee-settings',         icon: Cog6ToothIcon },
        ],
      },
      {
        title: 'Workforce',
        items: [
          { label: 'Attendance',   to: '/attendance',              icon: ClockIcon },
          { label: 'Work Records', to: '/attendance/work-records', icon: ClockIcon },
          { label: 'Leave',        to: '/leave',                   icon: CalendarDaysIcon },
          { label: 'Payroll',      to: '/payroll/contracts',       icon: BanknotesIcon },
          { label: 'Assets',       to: '/assets',                  icon: ArchiveBoxIcon },
        ],
      },
      {
        title: 'Talent',
        items: [
          { label: 'Recruitment',    to: '/recruitment/posts',          icon: UserPlusIcon },
          { label: 'Skills',         to: '/recruitment/skills',         icon: UserPlusIcon },
          { label: 'Surveys',        to: '/recruitment/surveys',        icon: DocumentTextIcon },
          { label: 'Candidate Docs', to: '/recruitment/candidate-docs', icon: DocumentTextIcon },
          { label: 'Onboarding',   to: '/onboarding',        icon: ArrowRightStartOnRectangleIcon },
          { label: 'Offboarding',  to: '/offboarding',       icon: ArrowLeftStartOnRectangleIcon },
          { label: 'Offboarding Plans', to: '/offboarding/plans', icon: ArrowLeftStartOnRectangleIcon },
          { label: 'Offboarding Settings', to: '/offboarding/settings', icon: ArrowLeftStartOnRectangleIcon },
          { label: 'Performance',  to: '/performance/cycles', icon: ChartBarIcon },
          { label: 'Question Templates', to: '/performance/question-templates', icon: DocumentTextIcon },
          { label: 'Bonus Settings', to: '/performance/bonus-settings', icon: ChartBarIcon },
        ],
      },
      {
        title: 'Projects',
        items: [{ label: 'Projects', to: '/projects', icon: FolderIcon }],
      },
      {
        title: 'Support',
        items: [
          { label: 'Helpdesk',    to: '/helpdesk',  icon: TicketIcon },
          { label: 'HR Policies', to: '/policies',  icon: DocumentTextIcon },
        ],
      },
      {
        title: 'Management',
        items: [{ label: 'Roles & Access', to: '/roles', icon: Cog6ToothIcon }],
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
          { label: 'Company Settings',  to: '/companies/settings',        icon: Cog6ToothIcon },
          { label: 'Email Templates',   to: '/companies/email-templates', icon: DocumentTextIcon },
          { label: 'Email Logs',        to: '/companies/email-logs',      icon: DocumentTextIcon },
          { label: 'Departments',       to: '/departments',               icon: BuildingOfficeIcon },
          { label: 'Employees',         to: '/employees',                 icon: UsersIcon },
          { label: 'Employee Notes',    to: '/employee-notes',            icon: DocumentTextIcon },
          { label: 'Employee Settings', to: '/employee-settings',         icon: Cog6ToothIcon },
        ],
      },
      {
        title: 'Workforce',
        items: [
          { label: 'Attendance',   to: '/attendance',              icon: ClockIcon },
          { label: 'Work Records', to: '/attendance/work-records', icon: ClockIcon },
          { label: 'Leave',        to: '/leave',                   icon: CalendarDaysIcon },
          { label: 'Payroll',      to: '/payroll/contracts',       icon: BanknotesIcon },
          { label: 'Assets',       to: '/assets',                  icon: ArchiveBoxIcon },
        ],
      },
      {
        title: 'Talent',
        items: [
          { label: 'Recruitment',    to: '/recruitment/posts',          icon: UserPlusIcon },
          { label: 'Skills',         to: '/recruitment/skills',         icon: UserPlusIcon },
          { label: 'Surveys',        to: '/recruitment/surveys',        icon: DocumentTextIcon },
          { label: 'Candidate Docs', to: '/recruitment/candidate-docs', icon: DocumentTextIcon },
          { label: 'Onboarding',  to: '/onboarding',         icon: ArrowRightStartOnRectangleIcon },
          { label: 'Offboarding', to: '/offboarding',        icon: ArrowLeftStartOnRectangleIcon },
          { label: 'Offboarding Plans', to: '/offboarding/plans', icon: ArrowLeftStartOnRectangleIcon },
          { label: 'Offboarding Settings', to: '/offboarding/settings', icon: ArrowLeftStartOnRectangleIcon },
          { label: 'Performance', to: '/performance/cycles', icon: ChartBarIcon },
          { label: 'Question Templates', to: '/performance/question-templates', icon: DocumentTextIcon },
          { label: 'Bonus Settings', to: '/performance/bonus-settings', icon: ChartBarIcon },
        ],
      },
      {
        title: 'Projects',
        items: [{ label: 'Projects', to: '/projects', icon: FolderIcon }],
      },
      {
        title: 'Support',
        items: [
          { label: 'Helpdesk',    to: '/helpdesk', icon: TicketIcon },
          { label: 'Dept Managers', to: '/helpdesk/department-managers', icon: UserPlusIcon },
          { label: 'HR Policies', to: '/policies', icon: DocumentTextIcon },
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
          { label: 'Company Settings',  to: '/companies/settings',        icon: Cog6ToothIcon },
          { label: 'Email Templates',   to: '/companies/email-templates', icon: DocumentTextIcon },
          { label: 'Email Logs',        to: '/companies/email-logs',      icon: DocumentTextIcon },
          { label: 'Departments',       to: '/departments',               icon: BuildingOfficeIcon },
          { label: 'Employees',         to: '/employees',                 icon: UsersIcon },
          { label: 'Employee Notes',    to: '/employee-notes',            icon: DocumentTextIcon },
          { label: 'Employee Settings', to: '/employee-settings',         icon: Cog6ToothIcon },
        ],
      },
      {
        title: 'Workforce',
        items: [
          { label: 'Attendance',   to: '/attendance',              icon: ClockIcon },
          { label: 'Work Records', to: '/attendance/work-records', icon: ClockIcon },
          { label: 'Leave',        to: '/leave',                   icon: CalendarDaysIcon },
          { label: 'Assets',       to: '/assets',                  icon: ArchiveBoxIcon },
        ],
      },
      {
        title: 'Talent',
        items: [
          { label: 'Recruitment',    to: '/recruitment/posts',          icon: UserPlusIcon },
          { label: 'Skills',         to: '/recruitment/skills',         icon: UserPlusIcon },
          { label: 'Surveys',        to: '/recruitment/surveys',        icon: DocumentTextIcon },
          { label: 'Candidate Docs', to: '/recruitment/candidate-docs', icon: DocumentTextIcon },
          { label: 'Onboarding',  to: '/onboarding',         icon: ArrowRightStartOnRectangleIcon },
          { label: 'Offboarding', to: '/offboarding',        icon: ArrowLeftStartOnRectangleIcon },
          { label: 'Offboarding Plans', to: '/offboarding/plans', icon: ArrowLeftStartOnRectangleIcon },
          { label: 'Offboarding Settings', to: '/offboarding/settings', icon: ArrowLeftStartOnRectangleIcon },
          { label: 'Performance', to: '/performance/cycles', icon: ChartBarIcon },
          { label: 'Question Templates', to: '/performance/question-templates', icon: DocumentTextIcon },
          { label: 'Bonus Settings', to: '/performance/bonus-settings', icon: ChartBarIcon },
        ],
      },
      {
        title: 'Support',
        items: [
          { label: 'Helpdesk',    to: '/helpdesk', icon: TicketIcon },
          { label: 'Dept Managers', to: '/helpdesk/department-managers', icon: UserPlusIcon },
          { label: 'HR Policies', to: '/policies', icon: DocumentTextIcon },
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
          { label: 'Contracts',        to: '/payroll/contracts', icon: BanknotesIcon },
          { label: 'Payslips',         to: '/payroll/payslips',  icon: ReceiptPercentIcon },
          { label: 'Reimbursements',   to: '/payroll/reimbursements', icon: BanknotesIcon },
          { label: 'Payroll Settings', to: '/payroll/settings',  icon: Cog6ToothIcon },
          { label: 'Assets',           to: '/assets',            icon: ArchiveBoxIcon },
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
          { label: 'Attendance', to: '/attendance', icon: ClockIcon },
          { label: 'Leave',      to: '/leave',      icon: CalendarDaysIcon },
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
        { label: 'Attendance', to: '/attendance',        icon: ClockIcon },
        { label: 'Leave',      to: '/leave',             icon: CalendarDaysIcon },
        { label: 'Payslips',   to: '/payroll/payslips',  icon: ReceiptPercentIcon },
      ],
    },
    {
      title: 'Support',
      items: [{ label: 'Helpdesk', to: '/helpdesk', icon: TicketIcon }],
    },
  ]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const auth = useAuth()
  const { user, logout } = auth
  const unreadCount = useSelector(s => s.notifications?.unreadCount || 0)

  const sections = getNavSections(auth)

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
            {section.items.map(item => (
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
            ))}
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
