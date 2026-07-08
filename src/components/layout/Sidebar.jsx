import { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import {
  Home, Building2, Building, Users, Clock, CalendarDays,
  Banknote, Archive, Folder, UserPlus, BarChart3,
  LogIn, LogOut, Ticket, FileText, ShieldCheck, PieChart,
  Bell, ChevronLeft, ChevronRight, Settings, Receipt,
  ChevronDown, Megaphone, ScanFace, Fingerprint, MapPinHouse,
} from 'lucide-react'
import { useSelector } from 'react-redux'
import useAuth from '../../hooks/useAuth'
import Avatar from '../common/Avatar'
import ConfirmModal from '../common/ConfirmModal'
import { APP_NAME, API_BASE_URL } from '../../config/constants'
import { selectPlatformCompanies } from '../../features/platform/platformSlice'

// ─── Collapsible nav groups ────────────────────────────────────────────────────

const EMPLOYEE_GROUP = {
  label: 'Employee',
  icon: Users,
  group: 'employee',
  children: [
    { label: 'My Profile',           to: '/employees/me' },
    { label: 'Employees',            to: '/employees' },
    { label: 'Document Requests',    to: '/documents/requests' },
    { label: 'Disciplinary Actions', to: '/disciplinary-actions' },
    { label: 'Bonus Points',         to: '/bonus-points' },
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
  icon: Building2,
  group: 'company',
  children: [
    { label: 'Settings',         to: '/companies/settings' },
    { label: 'Email Templates',  to: '/companies/email-templates' },
    { label: 'Email Logs',       to: '/companies/email-logs' },
  ],
}

const ATTENDANCE_GROUP = {
  label: 'Attendance',
  icon: Clock,
  group: 'attendance',
  children: [
    { label: 'Dashboard',          to: '/attendance/dashboard' },
    { label: 'Attendance',         to: '/attendance' },
    { label: 'Calendar',           to: '/attendance/calendar' },
    { label: 'Register',           to: '/attendance/register' },
    { label: 'Work Records',       to: '/attendance/work-records' },
    { label: 'Regularisation',     to: '/attendance/regularisation' },
    { label: 'Shift Allocations',  to: '/attendance/shift-allocations' },
    { label: 'Rotating Shifts',    to: '/attendance/rotating-shifts' },
    { label: 'Settings',           to: '/attendance/settings' },
  ],
}

// For roles that don't have Work Records access
const ATTENDANCE_GROUP_BASIC = {
  ...ATTENDANCE_GROUP,
  children: ATTENDANCE_GROUP.children.filter(c =>
    ['Dashboard', 'Attendance', 'Calendar'].includes(c.label)
  ),
}

const LEAVE_GROUP = {
  label: 'Leave',
  icon: CalendarDays,
  group: 'leave',
  children: [
    { label: 'Dashboard',       to: '/leave/dashboard' },
    { label: 'Leave Requests',  to: '/leave' },
    { label: 'Leave Balance',   to: '/leave/balance' },
    { label: 'Allocations',     to: '/leave/allocations' },
    { label: 'Leave Types',          to: '/leave/types' },
    { label: 'Restrictions',         to: '/leave/restrictions' },
    { label: 'Holidays',             to: '/leave/holidays' },
    { label: 'Holiday Allocations',  to: '/leave/holiday-allocations' },
    { label: 'Company Leaves',       to: '/leave/company-leaves' },
  ],
}

// Leave group without Restrictions (for roles that cannot manage restrictions)
const LEAVE_GROUP_BASIC = {
  ...LEAVE_GROUP,
  children: LEAVE_GROUP.children.slice(0, 3),
}

const PAYROLL_GROUP = {
  label: 'Payroll',
  icon: Banknote,
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
    { label: 'Gratuity / EOSB',   to: '/payroll/gratuity' },
    { label: 'Batch Groups',       to: '/payroll/batch-groups' },
    { label: 'Import',             to: '/payroll/import' },
    { label: 'Settings',           to: '/payroll/settings' },
  ],
}

// HR Manager payroll: no manual/batch processing, only settings & configuration
const PAYROLL_GROUP_HR = {
  label: 'Payroll',
  icon: Banknote,
  group: 'payroll',
  children: [
    { label: 'Automated Payroll', to: '/payroll/automated' },
    { label: 'Allowances',        to: '/payroll/allowances' },
    { label: 'Deductions',        to: '/payroll/deductions' },
    { label: 'Tax Settings',      to: '/payroll/tax-settings' },
    { label: 'Reimbursements',    to: '/payroll/reimbursements' },
    { label: 'Gratuity / EOSB',  to: '/payroll/gratuity' },
    { label: 'Loans',             to: '/payroll/loans' },
    { label: 'Settings',          to: '/payroll/settings' },
  ],
}

const RECRUITMENT_GROUP = {
  label: 'Recruitment',
  icon: UserPlus,
  group: 'recruitment',
  children: [
    { label: 'Dashboard',      to: '/recruitment/dashboard' },
    { label: 'Job Posts',      to: '/recruitment/posts' },
    { label: 'Pipeline',       to: '/recruitment/pipeline' },
    { label: 'Applicants',     to: '/recruitment/applicants' },
    { label: 'Interviews',     to: '/recruitment/interviews' },
    { label: 'Skill Zones',    to: '/recruitment/skill-zones' },
    { label: 'Skills',         to: '/recruitment/skills' },
    { label: 'Reject Reasons', to: '/recruitment/reject-reasons' },
    { label: 'Surveys',        to: '/recruitment/surveys' },
    { label: 'Candidate Docs', to: '/recruitment/candidate-docs' },
  ],
}

const OFFBOARDING_GROUP = {
  label: 'Offboarding',
  icon: LogOut,
  group: 'offboarding',
  children: [
    { label: 'Offboarding',  to: '/offboarding' },
    { label: 'Plans',        to: '/offboarding/plans' },
    { label: 'Exit Reasons', to: '/offboarding/exit-reasons' },
    { label: 'Resignations', to: '/offboarding/resignations' },
    { label: 'Settings',     to: '/offboarding/settings' },
  ],
}

const PERFORMANCE_GROUP = {
  label: 'Performance',
  icon: BarChart3,
  group: 'performance',
  children: [
    { label: 'Review Cycles',        to: '/performance/cycles' },
    { label: 'Objectives',           to: '/performance/objectives' },
    { label: 'Feedback',             to: '/performance/feedback' },
    { label: 'Anonymous Feedback',   to: '/performance/anonymous-feedback' },
    { label: 'Meetings',             to: '/performance/meetings' },
    { label: 'Question Templates',   to: '/performance/question-templates' },
    { label: 'Bonus Settings',       to: '/performance/bonus-settings' },
  ],
}

const BIOMETRIC_GROUP = {
  label: 'Biometric & Hardware',
  icon: Fingerprint,
  group: 'biometric',
  children: [
    { label: 'Biometric Devices',   to: '/biometric/devices',     icon: Fingerprint },
    { label: 'Biometric Employees', to: '/biometric/employees',    icon: Users },
    { label: 'Geo Fencing',         to: '/geofencing',             icon: MapPinHouse },
    { label: 'Face Detection',      to: '/face-detection',         icon: ScanFace },
  ],
}

const ORG_SETUP_GROUP = {
  label: 'Setup',
  icon: Building,
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
  icon: Archive,
  group: 'assets',
  children: [
    { label: 'All Assets',  to: '/assets' },
    { label: 'Categories',  to: '/assets/categories' },
    { label: 'Requests',    to: '/assets/requests' },
  ],
}

const SETTINGS_GROUP = {
  label: 'Settings',
  icon: Settings,
  group: 'settings',
  children: [
    { label: 'General',              to: '/settings/general' },
    { label: 'Account',              to: '/settings/account' },
    { label: 'Approval Conditions',  to: '/settings/approval-conditions' },
    { label: 'Mail Automation',      to: '/settings/mail-automation' },
    { label: 'LDAP / AD',            to: '/settings/ldap' },
    { label: 'Backup',               to: '/settings/backup' },
    { label: 'Outlook Auth',         to: '/settings/outlook-auth' },
    { label: 'Accessibility',        to: '/settings/accessibility' },
    { label: 'Dynamic Fields',       to: '/settings/dynamic-fields' },
    { label: 'LinkedIn',             to: '/settings/linkedin' },
  ],
}

// ─── Navigation definitions per role ─────────────────────────────────────────

function getNavSections(auth) {
  const { isPlatformAdmin, isEnterpriseAdmin, isBranchAdmin, isHRManager, isAccountant, isDeptManager, isTeamLead } = auth

  // Platform Super Admin — full access to everything
  if (isPlatformAdmin()) {
    return [
      {
        title: 'Overview',
        items: [{ label: 'Dashboard', to: '/dashboard', icon: Home }],
      },
      {
        title: 'Platform',
        items: [
          { label: 'Organizations',    to: '/organizations',    icon: ShieldCheck },
          { label: 'Platform Monitor', to: '/platform/monitor', icon: PieChart },
        ],
      },
      {
        title: 'Organization',
        items: [
          { label: 'Companies', to: '/companies', icon: Building2 },
          COMPANY_GROUP,
          ORG_SETUP_GROUP,
        ],
      },
      {
        title: 'Workforce',
        items: [
          ADMIN_EMPLOYEE_GROUP,
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
          { label: 'Onboarding', to: '/onboarding', icon: LogIn },
          OFFBOARDING_GROUP,
          PERFORMANCE_GROUP,
        ],
      },
      {
        title: 'Projects',
        items: [{ label: 'Projects', to: '/projects', icon: Folder }],
      },
      {
        title: 'Support',
        items: [
          { label: 'Helpdesk',      to: '/helpdesk',                        icon: Ticket },
          { label: 'Dept Managers', to: '/helpdesk/department-managers',    icon: UserPlus },
          { label: 'Announcements', to: '/announcements',                   icon: Megaphone },
        ],
      },
      {
        title: 'Admin Settings',
        items: [
          { label: 'Roles & Access', to: '/roles',             icon: Settings },
          { label: 'User Groups',    to: '/roles/user-groups', icon: Users },
          { label: 'Audit Logs',     to: '/audit/logs',        icon: FileText },
          BIOMETRIC_GROUP,
        ],
      },
      {
        title: 'Settings',
        items: [SETTINGS_GROUP],
      },
      {
        title: 'Reports',
        items: [{ label: 'Reports', to: '/reports', icon: PieChart }],
      },
    ]
  }

  // Enterprise / Head Office Admin — full visibility across all branches
  if (isEnterpriseAdmin()) {
    return [
      {
        title: 'Overview',
        items: [{ label: 'Dashboard', to: '/dashboard', icon: Home }],
      },
      {
        title: 'Organization',
        items: [
          { label: 'Companies', to: '/companies', icon: Building2 },
          COMPANY_GROUP,
          ORG_SETUP_GROUP,
        ],
      },
      {
        title: 'Workforce',
        items: [
          ADMIN_EMPLOYEE_GROUP,
          ATTENDANCE_GROUP,
          LEAVE_GROUP,
          PAYROLL_GROUP,
          { label: 'Assets',   to: '/assets', icon: Archive },
        ],
      },
      {
        title: 'Talent',
        items: [
          RECRUITMENT_GROUP,
          { label: 'Onboarding', to: '/onboarding', icon: LogIn },
          OFFBOARDING_GROUP,
          PERFORMANCE_GROUP,
        ],
      },
      {
        title: 'Projects',
        items: [{ label: 'Projects', to: '/projects', icon: Folder }],
      },
      {
        title: 'Support',
        items: [
          { label: 'Helpdesk',      to: '/helpdesk',       icon: Ticket },
          { label: 'Announcements', to: '/announcements',  icon: Megaphone },
        ],
      },
      {
        title: 'Admin Settings',
        items: [
          { label: 'Roles & Access', to: '/roles',       icon: Settings },
          { label: 'Audit Logs',     to: '/audit/logs',  icon: FileText },
          BIOMETRIC_GROUP,
        ],
      },
      {
        title: 'Settings',
        items: [SETTINGS_GROUP],
      },
      {
        title: 'Reports',
        items: [{ label: 'Reports', to: '/reports', icon: PieChart }],
      },
    ]
  }

  // Branch Admin — manages their branch only; cannot create companies or change enterprise settings
  if (isBranchAdmin()) {
    return [
      {
        title: 'Overview',
        items: [{ label: 'Dashboard', to: '/dashboard', icon: Home }],
      },
      {
        title: 'Organization',
        items: [
          COMPANY_GROUP,
          ORG_SETUP_GROUP,
        ],
      },
      {
        title: 'Workforce',
        items: [
          ADMIN_EMPLOYEE_GROUP,
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
          { label: 'Onboarding', to: '/onboarding', icon: LogIn },
          OFFBOARDING_GROUP,
          PERFORMANCE_GROUP,
        ],
      },
      {
        title: 'Projects',
        items: [{ label: 'Projects', to: '/projects', icon: Folder }],
      },
      {
        title: 'Support',
        items: [
          { label: 'Helpdesk',      to: '/helpdesk',                     icon: Ticket },
          { label: 'Dept Managers', to: '/helpdesk/department-managers', icon: UserPlus },
          { label: 'Announcements', to: '/announcements',                icon: Megaphone },
        ],
      },
      {
        title: 'Admin Settings',
        items: [
          { label: 'Audit Logs', to: '/audit/logs', icon: FileText },
          BIOMETRIC_GROUP,
        ],
      },
      {
        title: 'Settings',
        items: [SETTINGS_GROUP],
      },
      {
        title: 'Reports',
        items: [{ label: 'Reports', to: '/reports', icon: PieChart }],
      },
    ]
  }

  // HR Manager — HR operations at their scope level (head office or branch)
  if (isHRManager()) {
    return [
      {
        title: 'Overview',
        items: [{ label: 'Dashboard', to: '/dashboard', icon: Home }],
      },
      {
        title: 'Organization',
        items: [
          COMPANY_GROUP,
          ORG_SETUP_GROUP,
        ],
      },
      {
        title: 'Workforce',
        items: [
          ADMIN_EMPLOYEE_GROUP,
          ATTENDANCE_GROUP,
          LEAVE_GROUP,
          PAYROLL_GROUP_HR,
          { label: 'Assets',  to: '/assets', icon: Archive },
        ],
      },
      {
        title: 'Talent',
        items: [
          RECRUITMENT_GROUP,
          { label: 'Onboarding', to: '/onboarding', icon: LogIn },
          OFFBOARDING_GROUP,
          PERFORMANCE_GROUP,
        ],
      },
      {
        title: 'Support',
        items: [
          { label: 'Helpdesk',      to: '/helpdesk',                     icon: Ticket },
          { label: 'Dept Managers', to: '/helpdesk/department-managers', icon: UserPlus },
          { label: 'Announcements', to: '/announcements',                icon: Megaphone },
        ],
      },
      {
        title: 'Admin',
        items: [
          BIOMETRIC_GROUP,
          { label: 'Approval Conditions', to: '/settings/approval-conditions', icon: Settings },
          { label: 'Dynamic Fields',      to: '/settings/dynamic-fields',      icon: FileText },
        ],
      },
      {
        title: 'Reports',
        items: [{ label: 'Reports', to: '/reports', icon: PieChart }],
      },
    ]
  }

  // Accountant / Payroll Manager — finance operations at their scope level
  if (isAccountant()) {
    return [
      {
        title: 'Overview',
        items: [{ label: 'Dashboard', to: '/dashboard', icon: Home }],
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
        items: [{ label: 'Reports', to: '/reports', icon: PieChart }],
      },
    ]
  }

  // Department Manager — team-level view within a branch
  if (isDeptManager()) {
    return [
      {
        title: 'Overview',
        items: [{ label: 'Dashboard', to: '/dashboard', icon: Home }],
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
        items: [PERFORMANCE_GROUP],
      },
      {
        title: 'Projects',
        items: [{ label: 'Projects', to: '/projects', icon: Folder }],
      },
      {
        title: 'Support',
        items: [
          { label: 'Helpdesk',      to: '/helpdesk',      icon: Ticket },
          { label: 'Announcements', to: '/announcements', icon: Megaphone },
        ],
      },
    ]
  }

  // Team Lead — limited team visibility and approvals
  if (isTeamLead()) {
    return [
      {
        title: 'Overview',
        items: [{ label: 'Dashboard', to: '/dashboard', icon: Home }],
      },
      {
        title: 'My Work',
        items: [
          { label: 'My Profile',     to: '/employees/me',        icon: Users },
          ATTENDANCE_GROUP_BASIC,
          LEAVE_GROUP_BASIC,
          { label: 'My Documents',   to: '/documents/my',        icon: FileText },
        ],
      },
      {
        title: 'Talent',
        items: [
          { label: 'Performance', to: '/performance/cycles', icon: BarChart3 },
          { label: 'Projects',    to: '/projects',           icon: Folder },
        ],
      },
      {
        title: 'Support',
        items: [
          { label: 'Helpdesk',      to: '/helpdesk',      icon: Ticket },
          { label: 'Announcements', to: '/announcements', icon: Megaphone },
        ],
      },
    ]
  }

  // Employee (ESS) — self-service only
  return [
    {
      title: 'Overview',
      items: [{ label: 'Dashboard', to: '/dashboard', icon: Home }],
    },
    {
      title: 'My Work',
      items: [
        { label: 'My Profile', to: '/employees/me', icon: Users },
        ATTENDANCE_GROUP_BASIC,
        LEAVE_GROUP_BASIC,
        { label: 'Payslips', to: '/payroll/payslips', icon: Receipt },
        { label: 'Reimbursements', to: '/payroll/reimbursements', icon: Receipt },
        { label: 'Loans', to: '/payroll/loans', icon: Banknote },
        { label: 'My Documents', to: '/documents/my', icon: FileText },
      ],
    },
    {
      title: 'Support',
      items: [{ label: 'Helpdesk', to: '/helpdesk', icon: Ticket }],
    },
    {
      title: 'Account',
      items: [{ label: 'Notifications', to: '/notifications', icon: Bell }],
    },
  ]
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)
  const [openGroups, setOpenGroups] = useState(new Set())
  const location = useLocation()
  const auth = useAuth()
  const { user, logout, isPlatformAdmin } = auth
  const unreadCount = useSelector(s => s.notifications?.unreadCount || 0)
  const selectedCompanyId = useSelector(s => s.auth.selectedCompanyId)
  const platformCompanies = useSelector(selectPlatformCompanies)
  const companiesData = useSelector(s => s.companies.data)

  // Compute profile photo URL from user.photoPath
  const userPhotoUrl = user?.photoPath
    ? (user.photoPath.startsWith('http')
        ? user.photoPath
        : `${API_BASE_URL.replace('/api', '')}/media/${user.photoPath.replace(/^\//, '')}`)
    : null

  // Look up selected company in both slices (platformCompanies has logoUrl after scope fetch;
  // companiesData has logoPath from full entity fetches — use whichever is available)
  const selectedCompanyScope = selectedCompanyId
    ? platformCompanies.find(c => String(c.id) === String(selectedCompanyId))
    : null
  const selectedCompanyFull = selectedCompanyId
    ? companiesData.find(c => String(c.id) === String(selectedCompanyId))
    : null
  const displayName = isPlatformAdmin()
    ? (selectedCompanyScope?.name || selectedCompanyFull?.name || APP_NAME)
    : (user?.companyName || APP_NAME)
  const displayLogoUrl = isPlatformAdmin()
    ? (selectedCompanyScope?.logoUrl
        || (selectedCompanyFull?.logoPath ? `/api/files/${selectedCompanyFull.logoPath}` : null))
    : (user?.companyLogoUrl || null)

  const [logoLoadError, setLogoLoadError] = useState(false)
  useEffect(() => { setLogoLoadError(false) }, [displayLogoUrl])

  const sections = getNavSections(auth)

  // Auto-expand groups whose child route is active
  useEffect(() => {
    const activeGroups = new Set()
    sections.forEach(section => {
      section.items.forEach(item => {
        if (item.group && item.children) {
          if (item.children.some(child => location.pathname.startsWith(child.to))) {
            activeGroups.add(item.group)
          }
        }
      })
    })
    if (activeGroups.size > 0) {
      setOpenGroups(prev => new Set([...prev, ...activeGroups]))
    }
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleGroup = (key) => {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  // Check whether any child of a group is the active route
  const isGroupActive = (item) =>
    item.children?.some(child => location.pathname.startsWith(child.to)) ?? false

  // Shared NavLink class builder — floating pill active indicator + rounded hover
  const navItemClass = (isActive, extra = '') =>
    [
      'group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium',
      'transition-all duration-300 ease-out',
      isActive
        ? 'sidebar-active text-white'
        : 'text-white/[0.85] hover:bg-white/[0.08] hover:text-white',
      extra,
    ].join(' ')

  return (
    <>
      {/* Scoped styles: 4px thin scrollbar + active item gradient for sidebar only */}
      <style>{`
        .sidebar-scroll { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.20) transparent; }
        .sidebar-scroll::-webkit-scrollbar { width: 4px; height: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(255,255,255,0.20);
          border-radius: 9999px;
        }
        .sidebar-scroll:hover::-webkit-scrollbar-thumb { background-color: rgba(255,255,255,0.35); }
        @media (prefers-reduced-motion: reduce) {
          .sidebar-scroll { scrollbar-color: rgba(255,255,255,0.30) transparent; }
        }
        .sidebar-active {
          background: linear-gradient(90deg, #6B4EFF 0%, #5B3FFF 100%);
          box-shadow: 0 6px 18px rgba(107,78,255,0.28);
          color: #FFFFFF;
        }
        .sidebar-active svg { color: #FFFFFF; }
        .sidebar-child-active {
          background: linear-gradient(90deg, #6B4EFF 0%, #5B3FFF 100%);
          color: #FFFFFF;
        }
      `}</style>
    <aside
      className={`group/sidebar relative flex h-screen flex-shrink-0 flex-col overflow-hidden border-r border-white/[0.08] text-white transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        collapsed ? 'w-[72px]' : 'w-60'
      }`}
      style={{
        // Premium sidebar background — subtle vertical gradient (#241E4D → #2B255A)
        background:
          'linear-gradient(180deg, #241E4D 0%, #2B255A 100%)',
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
      }}
    >
      {/* Subtle top accent glow */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-40"
        style={{ background: 'radial-gradient(60% 100% at 50% 0%, rgba(107,78,255,0.18), transparent)' }}
      />

      {/* ── Logo / Brand ─────────────────────────────────────────────── */}
      <div className={`relative flex items-center border-b border-white/[0.08] ${collapsed ? 'justify-center px-3' : 'justify-between px-4'} h-16 flex-shrink-0`}>
        <div className={`flex items-center ${collapsed ? '' : 'gap-2.5'} min-w-0`}>
          {displayLogoUrl && !logoLoadError ? (
            <img
              src={displayLogoUrl}
              alt="Company logo"
              className="h-8 w-8 rounded-lg object-contain flex-shrink-0 bg-white/10 p-1"
              onError={() => setLogoLoadError(true)}
            />
          ) : (
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#6B4EFF] to-[#5B3FFF] shadow-lg shadow-[#6B4EFF]/30">
              <Building2 className="h-4 w-4 text-white" strokeWidth={2.2} />
            </div>
          )}
          {!collapsed && (
            <span className="truncate text-[15px] font-semibold tracking-tight text-white">
              {displayName}
            </span>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(c => !c)}
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-white/[0.55] transition-all duration-300 hover:bg-white/[0.08] hover:text-white"
            title="Collapse sidebar"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.2} />
          </button>
        )}
      </div>

      {/* Collapse toggle when collapsed (floating) */}
      {collapsed && (
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute right-2 top-5 z-20 flex h-6 w-6 items-center justify-center rounded-md bg-white/5 text-white/[0.55] opacity-0 transition-all duration-300 hover:bg-white/[0.08] hover:text-white group-hover/sidebar:opacity-100"
          title="Expand sidebar"
          aria-label="Expand sidebar"
        >
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={2.2} />
        </button>
      )}

      {/* ── Nav (4px thin scrollbar) ─────────────────────────────────── */}
      <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          {sections.map(section => (
            <div key={section.title}>
              {!collapsed && (
                <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/[0.45]">
                  {section.title}
                </p>
              )}
              {collapsed && (
                <div className="mx-auto mb-1.5 h-px w-6 bg-white/[0.08]" />
              )}
              <div className="space-y-0.5">
                {section.items.map(item => {
                  if (item.group) {
                    const isOpen = openGroups.has(item.group)
                    const groupActive = isGroupActive(item)
                    return (
                      <div key={item.group}>
                        <button
                          onClick={() => !collapsed && toggleGroup(item.group)}
                          title={collapsed ? item.label : undefined}
                          className={navItemClass(groupActive, 'w-full')}
                        >
                          <item.icon className={`h-[18px] w-[18px] flex-shrink-0 transition-colors ${groupActive ? 'text-white' : ''}`} strokeWidth={2} />
                          {!collapsed && (
                            <>
                              <span className="flex-1 text-left">{item.label}</span>
                              <ChevronDown
                                className={`h-4 w-4 flex-shrink-0 text-white/[0.40] transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : ''}`}
                                strokeWidth={2.2}
                              />
                            </>
                          )}
                        </button>
                        {/* Smooth collapsible children */}
                        <div
                          className={`grid transition-all duration-300 ease-out ${
                            isOpen && !collapsed ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                          }`}
                        >
                          <div className="overflow-hidden">
                            <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/[0.08] pl-2">
                              {item.children.map(child => (
                                <NavLink
                                  key={child.to}
                                  to={child.to}
                                  end
                                  className={({ isActive }) =>
                                    `flex items-center rounded-lg px-3 py-1.5 text-[13px] transition-all duration-200 ${
                                      isActive
                                        ? 'sidebar-child-active font-medium text-white'
                                        : 'text-white/[0.85] hover:bg-white/[0.08] hover:text-white'
                                    }`
                                  }
                                >
                                  {child.label}
                                </NavLink>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  }
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) => navItemClass(isActive)}
                    >
                      <item.icon className="h-[18px] w-[18px] flex-shrink-0" strokeWidth={2} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Notifications — always shown */}
        <div className="mt-5">
          {!collapsed && (
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/[0.45]">
              Account
            </p>
          )}
          {collapsed && <div className="mx-auto mb-1.5 h-px w-6 bg-white/[0.06]" />}
          <NavLink
            to="/notifications"
            end
            title={collapsed ? 'Notifications' : undefined}
            className={({ isActive }) => navItemClass(isActive)}
          >
            <div className="relative flex-shrink-0">
              <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
              {unreadCount > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm shadow-rose-500/50">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </div>
            {!collapsed && (
              <>
                <span className="truncate">Notifications</span>
                {unreadCount > 0 && (
                  <span className="ml-auto rounded-full bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-300">
                    {unreadCount}
                  </span>
                )}
              </>
            )}
          </NavLink>
        </div>
      </nav>

      {/* ── User footer ──────────────────────────────────────────────── */}
      <div className="border-t border-white/[0.08] p-3">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <Avatar name={user?.name || user?.username || 'User'} src={userPhotoUrl} size="sm" />
          {!collapsed && (
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{user?.name || user?.username}</p>
                <p className="truncate text-xs capitalize text-white/[0.60]">{user?.role?.replace(/_/g, ' ')}</p>
              </div>
              <button
                onClick={() => setLogoutConfirmOpen(true)}
                className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg text-white/[0.60] transition-all duration-300 hover:bg-white/[0.08] hover:text-white"
                title="Logout"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          )}
          {collapsed && (
            <button
              onClick={() => setLogoutConfirmOpen(true)}
              className="absolute bottom-3 left-1/2 flex h-7 w-7 -translate-x-1/2 translate-y-8 items-center justify-center rounded-lg text-white/[0.60] opacity-0 transition-all duration-300 hover:bg-white/[0.08] hover:text-white group-hover/sidebar:opacity-100"
              title="Logout"
              aria-label="Logout"
            >
              <LogOut className="h-4 w-4" strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </aside>
      <ConfirmModal
        open={logoutConfirmOpen}
        onClose={() => setLogoutConfirmOpen(false)}
        onConfirm={logout}
        title="Log out?"
        message="Do you want to log out?"
        confirmLabel="Log out"
      />
    </>
  )
}
