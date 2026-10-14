import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Image, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Card from '../components/Card';
import Icon from '../components/Icon';
import {API_BASE_URL, api} from '../api/client';
import {useAuth} from '../context/AuthContext';
import {colors} from '../theme/colors';
import {hasRole, roleLabel, ROLES, userRoles} from '../utils/roles';
import {dateText, timeText} from '../utils/format';
import {loadCompanyOrgChart, ORG_CHILD_KEYS, orgNodeId, orgNodeName, orgNodeRole, orgNodeDepartment, orgNodeCompany} from '../utils/orgChart';
import {companyDepartments} from '../utils/departments';
import {companyLeaveAllocations} from '../utils/leaveAllocations';
import {companyLeaveTypes} from '../utils/leaveTypes';
import CreateLeaveAllocationModal from '../components/CreateLeaveAllocationModal';
import EmployeeDocuments from '../components/EmployeeDocuments';
import {loadDocumentEmployees} from '../utils/employeeDocuments';
import {companyDocumentRequests} from '../utils/documentRequests';
import CreateDocumentRequestModal from '../components/CreateDocumentRequestModal';
import DocumentRequestDetail from '../components/DocumentRequestDetail';
import CompanySubscriptions from '../components/CompanySubscriptions';
import {SUBSCRIPTION_PAGES} from '../utils/subscriptions';
import CompanyRoles from '../components/CompanyRoles';
import {COMPANY_ROLE_PAGES} from '../utils/companyRoles';
import CompanyLoans from '../components/CompanyLoans';

type AdminModule = {
  title: string;
  subtitle: string;
  icon: string;
  roles: string[];
  pages: string[];
};

type AdminGroup = {
  title: string;
  subtitle: string;
  icon: string;
  modules: AdminModule[];
};

const ADMIN_GROUPS: AdminGroup[] = [
  {
    title: 'Platform',
    subtitle: 'Super admin controls',
    icon: 'planet-outline',
    modules: [
      {title: 'Organizations', subtitle: 'All client organizations', icon: 'business-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN], pages: ['Organizations', 'Create Organization', 'Edit Organization', 'Organization Status']},
      {title: 'Subscriptions', subtitle: 'Plans, limits, and billing scope', icon: 'receipt-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN], pages: ['Subscription Details', 'Plan Limits', 'Billing Scope']},
      {title: 'Platform Monitor', subtitle: 'System-wide health and usage', icon: 'pulse-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN], pages: ['System Health', 'Client Usage', 'Platform Activity']},
    ],
  },
  {
    title: 'Company',
    subtitle: 'Company hierarchy and access',
    icon: 'git-network-outline',
    modules: [
      {title: 'Companies', subtitle: 'Head office and branch offices', icon: 'business-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN], pages: ['Head Offices', 'Branches', 'Company Dashboard', 'Logo Upload']},
      {title: 'Roles', subtitle: 'User roles and cross access', icon: 'shield-checkmark-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN], pages: ['User Roles', 'Assign Role', 'Cross Access', 'Permission Overrides']},
      {title: 'Mail Automation', subtitle: 'HR and system email workflows', icon: 'mail-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER], pages: ['Templates', 'Automation Rules', 'Mail Logs']},
    ],
  },
  {
    title: 'People',
    subtitle: 'Employee administration',
    icon: 'people-outline',
    modules: [
      {title: 'Employees', subtitle: 'Employee list and employee profile', icon: 'people-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER], pages: ['Employees', 'Employee Detail', 'Work Info', 'Bank Details', 'Employee Settings']},
      {title: 'Org Chart', subtitle: 'Company reporting hierarchy', icon: 'share-social-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER], pages: ['Org Chart', 'Reporting Tree', 'Manager View']},
      {title: 'Departments', subtitle: 'Department setup and managers', icon: 'layers-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER], pages: ['Departments', 'Department Managers', 'Department Employees']},
      {title: 'Job Roles & Positions', subtitle: 'Roles, positions, work types, shifts', icon: 'briefcase-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER], pages: ['Job Positions', 'Job Roles', 'Work Types', 'Shift Schedules']},
    ],
  },
  {
    title: 'HR Operations',
    subtitle: 'Attendance, leave, documents',
    icon: 'calendar-outline',
    modules: [
      {title: 'Attendance', subtitle: 'Dashboard, register, settings, work records', icon: 'finger-print-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER, ROLES.TEAM_LEAD, ROLES.EMPLOYEE], pages: ['Attendance Dashboard', 'Attendance Register', 'Regularisation', 'Calendar', 'Settings', 'Work Records']},
      {title: 'Leave', subtitle: 'Requests, balances, allocations, holidays', icon: 'airplane-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER, ROLES.EMPLOYEE], pages: ['Leave Requests', 'Leave Balance', 'Leave Allocations', 'Leave Types', 'Holidays', 'Company Leaves']},
      {title: 'Documents', subtitle: 'Document requests and employee files', icon: 'document-attach-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER, ROLES.EMPLOYEE], pages: ['Document Requests', 'My Documents', 'Upload Document', 'Requested Documents']},
      {title: 'Policies', subtitle: 'Company HR policies', icon: 'book-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER], pages: ['Policies', 'Policy Categories', 'Policy Acknowledgements']},
    ],
  },
  {
    title: 'Payroll',
    subtitle: 'Finance and salary operations',
    icon: 'wallet-outline',
    modules: [
      {title: 'Payroll Dashboard', subtitle: 'Payroll overview and batch groups', icon: 'speedometer-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.ACCOUNTANT], pages: ['Payroll Dashboard', 'Batch Groups', 'Payroll Reports']},
      {title: 'Payroll Processing', subtitle: 'Manual, automated, and payslip import', icon: 'cash-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER, ROLES.ACCOUNTANT], pages: ['Payroll', 'Manual Payroll', 'Automated Payroll', 'Contracts', 'Payslip Import']},
      {title: 'Allowances & Deductions', subtitle: 'Payroll setup and tax settings', icon: 'calculator-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER, ROLES.ACCOUNTANT], pages: ['Allowances', 'Deductions', 'Tax Settings', 'Gratuity', 'Payroll Settings']},
      {title: 'Loans & Reimbursements', subtitle: 'Employee finance requests', icon: 'card-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER, ROLES.ACCOUNTANT, ROLES.EMPLOYEE], pages: ['Loans', 'Reimbursements', 'Loan Requests']},
    ],
  },
  {
    title: 'Talent',
    subtitle: 'Recruitment and performance',
    icon: 'trophy-outline',
    modules: [
      {title: 'Recruitment', subtitle: 'Posts, applicants, interviews, skills', icon: 'person-add-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER], pages: ['Recruitment Dashboard', 'Job Posts', 'Applicants', 'Interviews', 'Skills', 'Surveys']},
      {title: 'Onboarding & Offboarding', subtitle: 'Plans, resignations, exit setup', icon: 'swap-horizontal-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER], pages: ['Onboarding', 'Offboarding Plans', 'Resignations', 'Exit Reasons']},
      {title: 'Performance', subtitle: 'Cycles, objectives, feedback, meetings', icon: 'ribbon-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER, ROLES.TEAM_LEAD, ROLES.EMPLOYEE], pages: ['Performance Cycles', 'Objectives', 'Feedback', 'Anonymous Feedback', 'Question Templates', 'Meetings']},
      {title: 'Bonus Points', subtitle: 'Employee points and actions', icon: 'star-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER], pages: ['Bonus Points', 'Action Types', 'Employee Points']},
    ],
  },
  {
    title: 'Operations',
    subtitle: 'Assets, projects, support',
    icon: 'apps-outline',
    modules: [
      {title: 'Assets', subtitle: 'Inventory, categories, asset requests', icon: 'cube-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER, ROLES.EMPLOYEE], pages: ['Assets', 'Asset Detail', 'Asset Categories', 'Asset Requests']},
      {title: 'Projects', subtitle: 'Projects and timesheets', icon: 'construct-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER, ROLES.DEPARTMENT_MANAGER, ROLES.TEAM_LEAD, ROLES.EMPLOYEE], pages: ['Projects', 'Project Detail', 'Timesheets']},
      {title: 'Helpdesk', subtitle: 'Tickets, FAQ, claims, managers', icon: 'help-buoy-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER, ROLES.EMPLOYEE], pages: ['Tickets', 'Ticket Detail', 'FAQ', 'Claims', 'Department Managers']},
      {title: 'Reports', subtitle: 'HR, finance, and attendance reports', icon: 'bar-chart-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER, ROLES.ACCOUNTANT], pages: ['Reports', 'Attendance Reports', 'Payroll Reports', 'Employee Reports']},
    ],
  },
];

const PAGE_ENDPOINTS: Record<string, string> = {
  Organizations: '/organizations',
  'Head Offices': '/companies/head-offices',
  Branches: '/companies',
  Employees: '/employees',
  'Org Chart': '/employees/org-chart',
  Departments: '/departments',
  'Job Positions': '/job-positions',
  'Job Roles': '/job-roles',
  'Work Types': '/work-types',
  'Shift Schedules': '/shift-schedules',
  'Attendance Dashboard': '/attendance/dashboard',
  'Attendance Register': '/attendance',
  Regularisation: '/attendance/regularisation',
  'Work Records': '/attendance/work-records',
  'Leave Requests': '/leave/requests',
  'Leave Balance': '/leave/balance',
  'Leave Allocations': '/leave/allocations',
  'Leave Types': '/leave/types',
  Holidays: '/leave/holidays',
  'Company Leaves': '/leave/company-leaves',
  'Document Requests': '/documents/requests',
  'My Documents': '/documents',
  Policies: '/hr-policies',
  'User Roles': '/user-roles',
  'Mail Automation': '/mail-automations',
  'Performance Cycles': '/pms/cycles',
  Objectives: '/pms/objectives',
  Feedback: '/pms/feedback',
  'Anonymous Feedback': '/pms/anonymous-feedback',
  Meetings: '/pms/meetings',
  'Question Templates': '/pms/question-templates',
  Projects: '/projects',
  Timesheets: '/projects/timesheets',
  Tickets: '/helpdesk/tickets',
  FAQ: '/helpdesk/faqs',
  Claims: '/helpdesk/claims',
  Assets: '/assets',
  'Asset Categories': '/assets/categories',
  'Asset Requests': '/assets/requests',
  Reports: '/reports/headcount',
  'Payroll Dashboard': '/payroll/dashboard',
  'Batch Groups': '/payroll/batch-groups',
  Payroll: '/payroll/payslips',
  'Manual Payroll': '/payroll/payslips',
  'Automated Payroll': '/payroll/payslips',
  Contracts: '/payroll/contracts',
  Allowances: '/payroll/allowances',
  Deductions: '/payroll/deductions',
  'Tax Settings': '/payroll/filing-statuses',
  Gratuity: '/gratuity',
  Loans: '/payroll/loans',
  Reimbursements: '/payroll/reimbursements',
  Onboarding: '/onboarding/portals',
  Resignations: '/offboarding/resignations',
  'Offboarding Plans': '/offboarding/plans',
  'Exit Reasons': '/offboarding/exit-reasons',
  'Recruitment Dashboard': '/recruitment/dashboard',
  'Job Posts': '/recruitment/posts',
  Applicants: '/recruitment/applicants',
  Interviews: '/recruitment/interviews',
  Skills: '/recruitment/skills',
  Surveys: '/recruitment/survey-templates',
};

function isMobileAdminPage(page: string) {
  return page === 'Assign Role' || SUBSCRIPTION_PAGES.includes(page) || Boolean(PAGE_ENDPOINTS[page]);
}

function asArray(value: any) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.data?.content)) return value.data.content;
  if (Array.isArray(value?.data?.items)) return value.data.items;
  if (Array.isArray(value?.result)) return value.result;
  if (Array.isArray(value?.result?.content)) return value.result.content;
  return value && typeof value === 'object' ? [value] : [];
}

function rawField(item: any, names: string[]) {
  for (const path of names) {
    const value = String(path)
      .split('.')
      .reduce((current, key) => (current === undefined || current === null ? undefined : current?.[key]), item);
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
}

function field(item: any, names: string[], fallback = '-') {
  const value = rawField(item, names);
  if (value !== undefined && value !== null && value !== '') {
    return String(value);
  }
  return fallback;
}

const PENDING_STATUSES = new Set(['REQUESTED', 'PENDING']);
const COMPANY_SCOPED_ADMIN_PAGES = new Set(['Employees', 'Leave Requests', 'Departments', 'Leave Allocations', 'Leave Types', 'My Documents', 'Document Requests', 'Loans', ...COMPANY_ROLE_PAGES]);

function isApprovalPage(page: string) {
  return page === 'Leave Requests' || page === 'Regularisation';
}

function isPendingRecord(item: any) {
  return PENDING_STATUSES.has(String(field(item, ['status'], '')).toUpperCase());
}

function statusColors(status: string) {
  const value = status.toUpperCase();
  if (value === 'APPROVED' || value === 'PAID' || value === 'ACTIVE') return {bg: colors.successLight, fg: colors.success};
  if (value === 'REJECTED') return {bg: colors.dangerLight, fg: colors.danger};
  if (value === 'CANCELLED' || value === 'UNPAID') return {bg: colors.warningLight, fg: colors.warning};
  if (value === 'ANNUAL') return {bg: colors.primaryLight, fg: colors.primary};
  return {bg: colors.warningLight, fg: colors.warning};
}

function logoUrl(path?: string) {
  if (!path) return null;
  if (String(path).startsWith('http')) return String(path);
  return `${API_BASE_URL}/files/${String(path).replace(/^\//, '')}`;
}

function AdminModuleCard({module, onPress}: {module: AdminModule; onPress: () => void}) {
  return (
    <Pressable onPress={onPress} style={styles.moduleCard}>
      <View style={styles.moduleIcon}>
        <Icon name={module.icon as any} size={19} color={colors.primary} />
      </View>
      <View style={styles.moduleCopy}>
        <Text style={styles.moduleTitle}>{module.title}</Text>
        <Text style={styles.moduleSub}>{module.subtitle}</Text>
      </View>
      <Icon name="chevron-forward-outline" size={18} color={colors.subtle} />
    </Pressable>
  );
}

function isStatsObject(item: any) {
  return !!item && typeof item === 'object' && !item.id && !item.uuid && !field(item, ['name', 'fullName', 'title', 'employeeName', 'companyName'], '');
}

function statLabel(key: string) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

function statValueText(value: any) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string' && ISO_DATE_RE.test(value)) return dateText(value);
  return String(value);
}

function todayKey() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function keyDate(key: string) {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

function parseDateKey(key?: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function shiftDateKey(key: string, days: number) {
  const next = keyDate(key);
  next.setDate(next.getDate() + days);
  return dateKey(next);
}


function attendanceSectionTitle(item: any) {
  const key = String(rawField(item, ['attendanceDate', 'date', 'workDate', 'clockDate', 'createdAt', 'checkInTime', 'checkinTime', 'inTime']) || '').slice(0, 10);
  if (key === todayKey()) return 'Today';
  if (key === shiftDateKey(todayKey(), -1)) return 'Yesterday';
  return 'Earlier';
}

function attendanceRecordSortTime(item: any) {
  const key = String(rawField(item, ['attendanceDate', 'date', 'workDate', 'clockDate', 'createdAt', 'checkInTime', 'checkinTime', 'inTime']) || '').slice(0, 10);
  const time = key ? keyDate(key).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function sortedDateRange(from: string, to: string) {
  const f = from || to;
  const t = to || from;
  if (!f && !t) return {from: '', to: ''};
  return f <= t ? {from: f, to: t} : {from: t, to: f};
}

function dateKeysInRange(from: string, to: string) {
  if (!from || !to) return [];
  const range = sortedDateRange(from, to);
  if (!range.from || !range.to) return [];
  const dates: string[] = [];
  const cursor = keyDate(range.from);
  const end = keyDate(range.to);
  while (cursor <= end) {
    dates.push(dateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function dateInRange(value: any, from: string, to: string) {
  if (!value) return false;
  if (!from && !to) return true;
  const key = String(value).slice(0, 10);
  const range = sortedDateRange(from, to);
  if (!range.from || !range.to) return true;
  return key >= range.from && key <= range.to;
}


function sameDay(value: any, key: string) {
  if (!value) return false;
  return String(value).slice(0, 10) === key;
}

function employeeKey(item: any) {
  return field(item, ['employeeId', 'employee.id', 'id', 'userId', 'employeeCode', 'code'], '');
}

function attendanceStatus(item: any) {
  return field(item, ['status', 'attendanceStatus', 'dayStatus', 'state'], '').toUpperCase();
}

function attendanceCheckIn(item: any) {
  return field(item, ['checkInTime', 'checkinTime', 'inTime', 'clockInTime'], '');
}

function attendanceCheckOut(item: any) {
  return field(item, ['checkOutTime', 'checkoutTime', 'outTime', 'clockOutTime'], '');
}

function attendanceCompanyName(item: any) {
  return field(item, ['companyName', 'organizationName', 'company.name', 'organization.name', 'employee.companyName', 'employee.organizationName'], '');
}

function attendanceLocationText(item: any) {
  const address = field(item, [
    'location',
    'address',
    'checkInLocation',
    'checkOutLocation',
    'clockInLocation',
    'clockOutLocation',
    'geoLocation',
    'checkInAddress',
    'checkOutAddress',
  ], '');
  if (address && address !== '-') return address;
  const lat = field(item, ['latitude', 'lat', 'checkInLatitude', 'checkInLat', 'clockInLatitude'], '');
  const lng = field(item, ['longitude', 'lng', 'lon', 'checkInLongitude', 'checkInLng', 'clockInLongitude'], '');
  return lat && lat !== '-' && lng && lng !== '-' ? `${lat}, ${lng}` : '';
}

function isPresentAttendance(item: any) {
  const status = attendanceStatus(item);
  return status.includes('PRESENT') || !!attendanceCheckIn(item);
}

function isAbsentAttendance(item: any) {
  const status = attendanceStatus(item);
  return status === 'ABSENT' || status.includes('ABSENT');
}

function isLateAttendance(item: any) {
  return attendanceStatus(item).includes('LATE') || String(field(item, ['late', 'isLate'], '')).toLowerCase() === 'true';
}

function isIrregularAttendance(item: any) {
  const status = attendanceStatus(item);
  return status.includes('IRREGULAR') || status.includes('REGULARIZATION');
}

function needsRegularisation(item: any) {
  const status = field(item, ['regularisationStatus'], 'NONE').toUpperCase();
  if (status && status !== 'NONE' && status !== '-') return false;
  return isAbsentAttendance(item) || isIrregularAttendance(item) || (!!attendanceCheckIn(item) && !attendanceCheckOut(item));
}

function orgChildren(item: any) {
  for (const key of ORG_CHILD_KEYS) {
    if (Array.isArray(item?.[key])) return item[key];
  }
  return [];
}

function orgNodeLogo(item: any) {
  return logoUrl(field(item, ['photoPath', 'profilePhotoPath', 'logoPath', 'employee.photoPath', 'employee.profilePhotoPath'], ''));
}

function normalizeOrgNode(item: any): any {
  const nested = orgChildren(item);
  return {
    ...item,
    __orgChildren: nested.length ? nested.map(normalizeOrgNode) : (item.__orgChildren || []),
  };
}

function orgNodeMatches(item: any, query: string) {
  if (!query) return true;
  return [
    orgNodeName(item),
    orgNodeRole(item),
    orgNodeDepartment(item),
    orgNodeCompany(item),
    field(item, ['email', 'workEmail', 'employee.email', 'employee.workEmail'], ''),
  ]
    .join(' ')
    .toLowerCase()
    .includes(query);
}

const ORG_CHART_NODE_WIDTH = 154;
const ORG_CHART_NODE_GAP = 18;
const ORG_DEPARTMENT_COLORS = ['#EF4444', '#84CC16', '#3B82F6', '#F97316', '#06B6D4', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899', '#64748B'];

function orgDepartmentColor(department: string) {
  const name = (department || 'Unassigned').toUpperCase();
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash + name.charCodeAt(index) * (index + 1)) % ORG_DEPARTMENT_COLORS.length;
  }
  return ORG_DEPARTMENT_COLORS[hash];
}

function orgLeafCount(item: any): number {
  const children = item.__orgChildren || [];
  if (!children.length) return 1;
  return children.reduce((total: number, child: any) => total + orgLeafCount(child), 0);
}

function orgBranchWidth(item: any) {
  return Math.max(ORG_CHART_NODE_WIDTH, orgLeafCount(item) * (ORG_CHART_NODE_WIDTH + ORG_CHART_NODE_GAP));
}

function flattenOrgNodes(items: any[]) {
  const nodes: any[] = [];
  const seen = new Set<string>();
  const walk = (item: any) => {
    const key = `${item.__companyId}:${orgNodeId(item) || orgNodeName(item)}`;
    if (seen.has(key)) return;
    seen.add(key);
    nodes.push(item);
    (item.__orgChildren || []).forEach(walk);
  };
  items.forEach(walk);
  return nodes;
}

function groupOrgByDepartmentRole(nodes: any[]) {
  const departments = new Map<string, Map<string, any[]>>();
  nodes.forEach(node => {
    const department = orgNodeDepartment(node) || 'Unassigned';
    const role = orgNodeRole(node) || field(node, ['roleName', 'employee.roleName'], '') || 'Employee';
    if (!departments.has(department)) departments.set(department, new Map());
    const roles = departments.get(department)!;
    if (!roles.has(role)) roles.set(role, []);
    roles.get(role)!.push(node);
  });

  return Array.from(departments.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([department, roles]) => ({
      department,
      color: orgDepartmentColor(department),
      roles: Array.from(roles.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([role, employees]) => ({
          role,
          employees: employees.slice().sort((a, b) => orgNodeName(a).localeCompare(orgNodeName(b))),
        })),
    }));
}

function smartDate(value: string) {
  return value && ISO_DATE_RE.test(value) ? dateText(value) : value;
}

const ATTENDANCE_DRILLDOWNS: Record<string, {title: string; subtitle: string; mode: 'employees' | 'present' | 'absent' | 'notOut' | 'late' | 'irregular'}> = {
  totalEmployees: {title: 'Total Employees', subtitle: 'Employees in the selected company', mode: 'employees'},
  presentToday: {title: 'Present Today', subtitle: 'Employees with attendance today', mode: 'present'},
  absentToday: {title: 'Absent Today', subtitle: 'Employees marked absent today', mode: 'absent'},
  notOutYet: {title: 'Not Out Yet', subtitle: 'Checked in but not checked out', mode: 'notOut'},
  lateCount: {title: 'Late Count', subtitle: 'Employees marked late today', mode: 'late'},
  irregularToday: {title: 'Irregular Today', subtitle: 'Irregular attendance records today', mode: 'irregular'},
};

const REGULARISATION_TYPES = [
  {label: 'Missing punch', value: 'MISSING_PUNCH'},
  {label: 'Correction', value: 'CORRECTION'},
  {label: 'Forgot checkout', value: 'FORGOT_CHECKOUT'},
];

function StatsGrid({item, onStatPress}: {item: any; onStatPress?: (key: string, value: any) => void}) {
  const entries = Object.entries(item).filter(([, value]) => typeof value !== 'object' || value === null);
  return (
    <Card style={styles.dataCard}>
      <View style={styles.statsGrid}>
        {entries.map(([key, value]) => {
          const clickable = !!ATTENDANCE_DRILLDOWNS[key] && !!onStatPress;
          return (
          <View key={key} style={styles.statsGridCell}>
            <Pressable
              onPress={clickable ? () => onStatPress?.(key, value) : undefined}
              disabled={!clickable}
              style={({pressed}) => [styles.statsGridItem, clickable && styles.statsGridItemPressable, pressed && styles.pressed]}>
              <Text style={styles.statsGridValue} numberOfLines={1}>{statValueText(value)}</Text>
              <View style={styles.statsGridLabelRow}>
                <Text style={styles.statsGridLabel} numberOfLines={1}>{statLabel(key)}</Text>
                {clickable && <Icon name="chevron-forward-outline" size={13} color={colors.subtle} />}
              </View>
            </Pressable>
          </View>
        );})}
      </View>
    </Card>
  );
}

function formatRequestType(type?: string) {
  if (!type) return 'Regularisation';
  return String(type)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}

function DataRecord({item, page, onPress, onRegularize}: {item: any; page: string; onPress: () => void; onRegularize?: () => void}) {
  const isEmployee = page === 'Employees';
  const isLeave = page === 'Leave Requests';
  const isRegularisation = page === 'Regularisation';
  const isAttendance = page === 'Attendance Register';
  const isLeaveType = page === 'Leave Types';
  const isHoliday = page === 'Holidays';
  const isDepartment = page === 'Departments';
  const isAllocation = page === 'Leave Allocations';
  const isDocumentRequest = page === 'Document Requests';
  const title = field(item, ['name', 'fullName', 'employeeName', 'employee.fullName', 'employee.name', 'title', 'subject', 'companyName', 'roleName', 'departmentName', 'jobPositionName', 'code'], page);
  const attendanceDate = field(item, ['attendanceDate', 'date', 'workDate', 'clockDate', 'createdAt'], '');
  const attendanceIn = attendanceCheckIn(item);
  const attendanceOut = attendanceCheckOut(item);
  const attendanceHours = field(item, ['hoursWorked', 'workingHours', 'workedHours', 'duration', 'totalHours'], '');
  const attendanceStatusText = field(item, ['status', 'attendanceStatus', 'dayStatus', 'state'], '');
  const attendanceCompany = attendanceCompanyName(item);
  const attendanceLocation = attendanceLocationText(item);
  const subtitle = isEmployee
    ? field(item, ['email', 'workEmail', 'phone'], '')
    : isDepartment
    ? (item.managerName ? `Manager: ${item.managerName}` : 'No manager assigned')
    : isAllocation
    ? [field(item, ['leaveTypeName', 'leaveType.name'], ''), field(item, ['year'], '')].filter(Boolean).join(' | ')
    : isDocumentRequest
    ? [item.documentFormat === 'ANY' ? 'Any format' : item.documentFormat || 'Any format', item.maxSizeMb ? `Max ${item.maxSizeMb} MB` : '', `${item.employees?.length || 0} employees tagged`].filter(Boolean).join(' | ')
    : isAttendance
    ? [smartDate(attendanceDate), attendanceStatusText && attendanceStatusText !== '-' ? attendanceStatusText : 'No status'].filter(Boolean).join(' | ')
    : isLeave
    ? [field(item, ['leaveTypeName'], ''), [smartDate(field(item, ['startDate'], '')), smartDate(field(item, ['endDate'], ''))].filter(Boolean).join(' - ')]
        .filter(Boolean)
        .join(' | ')
    : isRegularisation
    ? [formatRequestType(field(item, ['requestType'], '')), smartDate(field(item, ['attendanceDate'], ''))].filter(Boolean).join(' | ')
    : isLeaveType
    ? [
        item.totalDays !== undefined && item.totalDays !== null ? `${item.totalDays} days / year` : '',
        item.paymentType ? String(item.paymentType) : 'PAID',
        item.carryforwardType && item.carryforwardType !== 'NO_CARRYFORWARD' ? 'Carry forward' : '',
      ].filter(Boolean).join(' • ')
    : isHoliday
    ? [
        item.startDate ? (item.startDate === item.endDate || !item.endDate ? smartDate(item.startDate) : `${smartDate(item.startDate)} - ${smartDate(item.endDate)}`) : '',
        item.recurring ? 'Repeats yearly' : 'One-time',
      ].filter(Boolean).join(' • ')
    : smartDate(field(item, ['email', 'description', 'subtitle', 'status', 'type', 'companyType', 'phone', 'date'], ''));
  const meta = isEmployee
    ? [field(item, ['companyName', 'organizationName'], ''), field(item, ['departmentName'], ''), field(item, ['jobPositionName'], '')].filter(Boolean).join(' | ')
    : isDepartment
    ? field(item, ['description'], '')
    : isDocumentRequest
    ? field(item, ['description'], '')
    : isAllocation
    ? [
        item.totalLeaveDays != null ? `${item.totalLeaveDays} days allocated` : '',
        item.remainingDays != null ? `${item.remainingDays} remaining` : item.availableDays != null ? `${item.availableDays} available` : '',
        item.usedDays != null ? `${item.usedDays} used` : '',
      ].filter(Boolean).join(' | ')
    : isAttendance
    ? [
        attendanceIn && attendanceIn !== '-' ? `In ${timeText(attendanceIn)}` : '',
        attendanceOut && attendanceOut !== '-' ? `Out ${timeText(attendanceOut)}` : '',
        attendanceHours && attendanceHours !== '-' ? `${attendanceHours} hrs` : '',
      ].filter(Boolean).join(' | ')
    : isLeave || isRegularisation
    ? field(item, ['reason', 'description'], '')
    : isLeaveType
    ? (item.carryforwardType && item.carryforwardType !== 'NO_CARRYFORWARD' ? `Max carry forward: ${item.carryforwardMax ?? 0} days` : '')
    : isHoliday
    ? (item.recurring ? 'Annual public holiday' : 'Single occurrence')
    : field(item, ['address', 'city', 'departmentName', 'employeeType', 'priority'], '');
  const logo = logoUrl(field(item, ['logoPath', 'photoPath', 'profilePhotoPath', 'employee.logoPath', 'employee.photoPath', 'employee.profilePhotoPath'], ''));
  const status = (isLeave || isRegularisation || isAttendance || isAllocation)
    ? field(item, ['status', 'attendanceStatus', 'dayStatus', 'state'], '')
    : isLeaveType && item.paymentType
    ? String(item.paymentType)
    : isHoliday && item.recurring
    ? 'ANNUAL'
    : '';
  const statusStyle = status ? statusColors(status) : null;

  return (
    <Pressable onPress={onPress} style={({pressed}) => [pressed && styles.pressed]}>
      <Card style={styles.dataCard}>
        <View style={styles.dataTop}>
          <View style={[styles.dataAvatar, isLeaveType && item.colorCode ? {backgroundColor: item.colorCode + '25'} : null]}>
            {logo ? (
              <Image source={{uri: logo}} style={styles.dataAvatarImage} />
            ) : isDepartment ? (
              <Icon name="layers-outline" size={20} color={colors.primary} />
            ) : (
              <Text style={[styles.dataAvatarText, isLeaveType && item.colorCode ? {color: item.colorCode} : null]}>
                {title.slice(0, 2).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.moduleCopy}>
            <Text style={styles.dataTitle} numberOfLines={1}>{title}</Text>
            {!!subtitle && <Text style={styles.dataSub} numberOfLines={2}>{subtitle}</Text>}
            {(isEmployee || isAttendance || isRegularisation || isDepartment || isAllocation || isDocumentRequest) && (isAttendance ? attendanceCompany : field(item, ['companyName', 'organizationName'], '')) ? (
              <View style={styles.companyPill}>
                <Icon name="business-outline" size={12} color={colors.primary} />
                <Text style={styles.companyPillText} numberOfLines={1}>{isAttendance ? attendanceCompany : field(item, ['companyName', 'organizationName'], '')}</Text>
              </View>
            ) : null}
            {statusStyle ? (
              <View style={[styles.statusPill, {backgroundColor: statusStyle.bg}]}>
                <Text style={[styles.statusPillText, {color: statusStyle.fg}]}>{String(status)}</Text>
              </View>
            ) : null}
            {isRegularisation && (
              <View style={styles.regularisationMetaBlock}>
                <View style={styles.regularisationBadgesRow}>
                  {!!field(item, ['requestedCheckIn'], '') && (
                    <View style={styles.regBadge}>
                      <Icon name="log-in-outline" size={12} color={colors.success} />
                      <Text style={styles.regBadgeText}>In: {timeText(field(item, ['requestedCheckIn'], ''))}</Text>
                    </View>
                  )}
                  {!!field(item, ['requestedCheckOut'], '') && (
                    <View style={styles.regBadge}>
                      <Icon name="log-out-outline" size={12} color={colors.warning} />
                      <Text style={styles.regBadgeText}>Out: {timeText(field(item, ['requestedCheckOut'], ''))}</Text>
                    </View>
                  )}
                  {!!rawField(item, ['requestedOvertimeHours']) && (
                    <View style={styles.regBadge}>
                      <Icon name="time-outline" size={12} color={colors.primary} />
                      <Text style={styles.regBadgeText}>{rawField(item, ['requestedOvertimeHours'])}h OT</Text>
                    </View>
                  )}
                </View>
                {!!field(item, ['reason'], '') && (
                  <Text style={styles.regReasonText} numberOfLines={2}>
                    Reason: {field(item, ['reason'], '')}
                  </Text>
                )}
                {!!field(item, ['rejectionRemarks'], '') && (
                  <Text style={styles.regRemarksText} numberOfLines={2}>
                    Rejection: {field(item, ['rejectionRemarks'], '')}
                  </Text>
                )}
              </View>
            )}
            {!!meta && !isRegularisation && <Text style={styles.dataMeta} numberOfLines={1}>{meta}</Text>}
            {isAttendance && !!attendanceLocation && (
              <View style={styles.attendanceLocationRow}>
                <Icon name="location-outline" size={12} color={colors.muted} />
                <Text style={styles.attendanceLocationText} numberOfLines={1}>{attendanceLocation}</Text>
              </View>
            )}
            {isAttendance && needsRegularisation(item) && (
              <Pressable onPress={onRegularize} style={({pressed}) => [styles.regularizeMiniButton, pressed && styles.pressed]}>
                <Icon name="create-outline" size={13} color={colors.warning} />
                <Text style={styles.regularizeMiniButtonText}>Regularize</Text>
              </Pressable>
            )}
          </View>
          <Icon name="chevron-forward-outline" size={18} color={colors.subtle} />
        </View>
      </Card>
    </Pressable>
  );
}

function ApprovalButtons({busy, onApprove, onReject}: {busy: boolean; onApprove: () => void; onReject: () => void}) {
  return (
    <View style={styles.approvalRow}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onReject}
        disabled={busy}
        style={[styles.approvalBtn, styles.rejectBtn, busy && styles.pressed]}>
        <Icon name="close-circle-outline" size={17} color={colors.danger} />
        <Text style={styles.rejectBtnText}>Reject</Text>
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onApprove}
        disabled={busy}
        style={[styles.approvalBtn, styles.approveBtn, busy && styles.pressed]}>
        {busy ? <ActivityIndicator size="small" color={colors.white} /> : <Icon name="checkmark-circle-outline" size={17} color={colors.white} />}
        <Text style={styles.approveBtnText}>Approve</Text>
      </TouchableOpacity>
    </View>
  );
}

function AdminCalendarDateField({
  label,
  value,
  onChange,
  maxDate = todayKey(),
  minHeight,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxDate?: string;
  minHeight?: number;
}) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => parseDateKey(value) || new Date());
  const selectedDate = parseDateKey(value);
  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const firstDay = monthStart.getDay();
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const cells = Array.from({length: firstDay + daysInMonth}, (_, index) => (index < firstDay ? 0 : index - firstDay + 1));
  const monthLabel = visibleMonth.toLocaleDateString(undefined, {month: 'long', year: 'numeric'});

  function shiftMonth(offset: number) {
    setVisibleMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
  }

  function openPicker() {
    setVisibleMonth(selectedDate || new Date());
    setOpen(true);
  }

  return (
    <View style={styles.dateFilterField}>
      <Text style={styles.dateInputLabel}>{label}</Text>
      <TouchableOpacity activeOpacity={0.7} onPress={openPicker} style={[styles.datePickerButton, minHeight ? {minHeight} : undefined]}>
        <View style={styles.datePickerCopy}>
          <Text style={[styles.datePickerValue, !value && styles.datePickerPlaceholder]} numberOfLines={1}>
            {value || 'Select date'}
          </Text>
        </View>
        <Icon name="calendar-outline" size={18} color={value ? colors.primary : colors.subtle} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.calendarSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.calendarHeader}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => shiftMonth(-1)} style={styles.calendarNavButton}>
                <Icon name="chevron-back-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.calendarTitle}>{monthLabel}</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => shiftMonth(1)} style={styles.calendarNavButton}>
                <Icon name="chevron-forward-outline" size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarWeekRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <Text key={day} style={styles.calendarWeekText}>{day}</Text>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {cells.map((day, index) => {
                const cellDate = day ? new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), day) : null;
                const cellKey = cellDate ? dateKey(cellDate) : '';
                const selected = Boolean(day) && value === cellKey;
                const disabled = !day || Boolean(maxDate && cellKey > maxDate);
                return (
                  <TouchableOpacity
                    key={`${index}-${day}`}
                    disabled={disabled}
                    activeOpacity={0.7}
                    onPress={() => {
                      onChange(cellKey);
                      setOpen(false);
                    }}
                    style={[styles.calendarDay, disabled && styles.calendarDayDisabled, selected && styles.calendarDaySelected]}>
                    {!!day && <Text style={[styles.calendarDayText, disabled && styles.calendarDayTextDisabled, selected && styles.calendarDayTextSelected]}>{day}</Text>}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.calendarActions}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  onChange(todayKey());
                  setOpen(false);
                }}
                style={styles.calendarSecondaryButton}>
                <Text style={styles.calendarSecondaryButtonText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setOpen(false)} style={styles.calendarPrimaryButton}>
                <Text style={styles.calendarPrimaryButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const DETAIL_HIDDEN_KEYS = new Set(['id', 'uuid', 'logoPath', 'photoPath', 'password', 'active']);

function RecordDetail({item, page}: {item: any; page: string}) {
  const title = field(item, ['name', 'fullName', 'title', 'subject', 'employeeName', 'companyName', 'roleName', 'departmentName', 'jobPositionName', 'code'], page);
  const status = field(item, ['status', 'active'], '');
  const logo = logoUrl(field(item, ['logoPath', 'photoPath'], ''));
  const rows = Object.entries(item || {}).filter(
    ([key, value]) => !DETAIL_HIDDEN_KEYS.has(key) && value !== null && value !== undefined && value !== '' && typeof value !== 'object',
  );

  return (
    <>
      <Card style={styles.detailHero}>
        <View style={styles.detailAvatarWrap}>
          {logo ? (
            <Image source={{uri: logo}} style={styles.detailAvatarImage} />
          ) : (
            <View style={styles.detailIcon}>
              <Text style={styles.dataAvatarText}>{title.slice(0, 2).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <Text style={styles.detailTitle}>{title}</Text>
        {!!status && (
          <View style={styles.detailStatusPill}>
            <Text style={styles.detailStatusText}>{String(status)}</Text>
          </View>
        )}
      </Card>

      <Card style={styles.groupCard}>
        <View style={styles.groupHead}>
          <View style={styles.groupIcon}>
            <Icon name="list-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.groupCopy}>
            <Text style={styles.groupTitle}>Details</Text>
            <Text style={styles.groupSub}>All fields returned for this record</Text>
          </View>
        </View>
        {rows.map(([key, value]) => (
          <View key={key} style={styles.detailRow}>
            <Text style={styles.detailRowLabel}>{statLabel(key)}</Text>
            <Text style={styles.detailRowValue}>{statValueText(value)}</Text>
          </View>
        ))}
      </Card>
    </>
  );
}

function OrgEmployeeChip({item}: {item: any}) {
  const name = orgNodeName(item);

  return (
    <View style={styles.orgEmployeeChip}>
      <View style={styles.orgEmployeeInitials}>
        <Text style={styles.orgEmployeeInitialsText}>{name.slice(0, 2).toUpperCase()}</Text>
      </View>
      <Text style={styles.orgEmployeeName} numberOfLines={1}>{name}</Text>
    </View>
  );
}

function OrgRoleBox({role, employees, color}: {role: string; employees: any[]; color: string}) {
  return (
    <View style={[styles.orgRoleBox, {borderColor: color}]}>
      <View style={[styles.orgRoleHeader, {backgroundColor: color}]}>
        <Text style={styles.orgRoleTitle} numberOfLines={1}>{role.toUpperCase()}</Text>
      </View>
      <Text style={styles.orgRoleCount}>{employees.length} employee{employees.length === 1 ? '' : 's'}</Text>
      {employees.map((employee, index) => (
        <OrgEmployeeChip key={String(orgNodeId(employee) || `${role}-${index}`)} item={employee} />
      ))}
    </View>
  );
}

function OrgDepartmentBranch({department, roles, color, collapsed}: {department: string; roles: {role: string; employees: any[]}[]; color: string; collapsed: boolean}) {
  return (
    <View style={styles.orgDepartmentBranch}>
      <View style={[styles.orgDepartmentCard, {borderColor: color}]}>
        <View style={[styles.orgDepartmentHeader, {backgroundColor: color}]}>
          <Text style={styles.orgDepartmentTitle} numberOfLines={1}>{department.toUpperCase()}</Text>
        </View>
        <Text style={styles.orgDepartmentSub}>
          {roles.reduce((total, role) => total + role.employees.length, 0)} employees • {roles.length} roles
        </Text>
      </View>
      {!collapsed && !!roles.length && (
        <>
          <View style={styles.orgChartParentLine} />
          <View style={styles.orgChartConnectorBand}>
            {roles.length > 1 && <View style={styles.orgDepartmentSiblingLine} />}
          </View>
          <View style={styles.orgRoleRow}>
            {roles.map(role => (
              <View key={role.role} style={styles.orgRoleSlot}>
                <View style={styles.orgChartChildLine} />
                <OrgRoleBox role={role.role} employees={role.employees} color={color} />
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function OrgChartView({records, query, selectedCompanyName}: {records: any[]; query: string; selectedCompanyName: string}) {
  const [collapsed, setCollapsed] = useState(false);
  const [zoom, setZoom] = useState(50);
  const sections = useMemo(() => {
    const nodes = flattenOrgNodes(records.map(normalizeOrgNode));
    const q = query.trim().toLowerCase();
    const grouped = new Map<string, any[]>();

    nodes
      .filter(item => orgNodeMatches(item, q))
      .forEach((item: any) => {
        const company = orgNodeCompany(item) || selectedCompanyName || 'Organization';
        if (!grouped.has(company)) grouped.set(company, []);
        grouped.get(company)?.push(item);
      });

    return Array.from(grouped.entries()).map(([company, employees]) => ({company, nodes: employees, departments: groupOrgByDepartmentRole(employees)}));
  }, [query, records, selectedCompanyName]);

  const totalPeople = useMemo(() => {
    return sections.reduce((total, section) => total + section.nodes.length, 0);
  }, [sections]);

  const departments = useMemo(() => {
    const counts = new Map<string, number>();
    sections.forEach(section => {
      section.nodes.forEach(node => {
        const department = orgNodeDepartment(node) || 'Unassigned';
        counts.set(department, (counts.get(department) || 0) + 1);
      });
    });
    return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [sections]);

  if (!sections.length) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Icon name="git-network-outline" size={28} color={colors.primary} />
        </View>
        <Text style={styles.emptyTitle}>No Org Chart</Text>
        <Text style={styles.emptyText}>No employees match this company or search.</Text>
      </View>
    );
  }

  return (
    <>
      <Card style={styles.orgChartSummaryCard}>
        <View style={styles.orgChartSummaryRow}>
          <View style={styles.orgChartSummaryItem}>
            <View style={[styles.orgLegendDot, {backgroundColor: colors.primary}]} />
            <Text style={styles.orgChartSummaryText}>{totalPeople} employee{totalPeople === 1 ? '' : 's'}</Text>
          </View>
          <View style={styles.orgChartSummaryItem}>
            <View style={[styles.orgLegendDot, {backgroundColor: colors.purple}]} />
            <Text style={styles.orgChartSummaryText}>{departments.length} department{departments.length === 1 ? '' : 's'}</Text>
          </View>
        </View>
        <Text style={styles.orgLegendTitle}>Department colours</Text>
        <View style={styles.orgLegendGrid}>
          {departments.map(([department, count]) => (
            <View key={department} style={styles.orgLegendChip}>
              <View style={[styles.orgLegendDot, {backgroundColor: orgDepartmentColor(department)}]} />
              <Text style={styles.orgLegendText} numberOfLines={1}>{department.toUpperCase()}</Text>
              <Text style={styles.orgLegendCount}>{count}</Text>
            </View>
          ))}
        </View>
      </Card>
      {sections.map(section => (
        <Card key={section.company} style={styles.orgSectionCard}>
          <View style={styles.orgSectionHead}>
            <View style={styles.orgSectionIcon}>
              <Icon name="git-network-outline" size={18} color={colors.primary} />
            </View>
            <View style={styles.orgSectionCopy}>
              <Text style={styles.orgSectionTitle} numberOfLines={1}>{section.company}</Text>
              <Text style={styles.orgSectionSub}>{section.departments.length} department{section.departments.length === 1 ? '' : 's'} • {section.nodes.length} employees</Text>
            </View>
          </View>
          <View style={styles.orgChartToolbar}>
            <TouchableOpacity activeOpacity={0.7} onPress={() => setCollapsed(false)} style={styles.orgChartTextButton}>
              <Text style={styles.orgChartTextButtonLabel}>Expand all</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.7} onPress={() => setCollapsed(true)} style={styles.orgChartTextButton}>
              <Text style={styles.orgChartTextButtonLabel}>Collapse all</Text>
            </TouchableOpacity>
            <View style={styles.orgZoomControls}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setZoom(value => Math.max(50, value - 25))} style={styles.orgZoomButton}>
                <Text style={styles.orgZoomButtonText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.orgZoomValue}>{zoom}%</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setZoom(value => Math.min(100, value + 25))} style={styles.orgZoomButton}>
                <Text style={styles.orgZoomButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={styles.orgChartCanvas}>
            <View style={[styles.orgChartZoomLayer, {transform: [{scale: zoom / 100}]}]}>
              <View style={styles.orgCompanyChartRoot}>
                <View style={styles.orgCompanyNode}>
                  <Icon name="business-outline" size={18} color={colors.white} />
                  <Text style={styles.orgCompanyNodeText} numberOfLines={1}>{section.company}</Text>
                </View>
                {!collapsed && !!section.departments.length && (
                  <>
                    <View style={styles.orgChartParentLine} />
                    <View style={styles.orgChartConnectorBand}>
                      {section.departments.length > 1 && <View style={styles.orgCompanySiblingLine} />}
                    </View>
                  </>
                )}
              </View>
              {!collapsed && (
                <View style={styles.orgDepartmentRow}>
                  {section.departments.map(department => (
                    <View key={department.department} style={styles.orgDepartmentSlot}>
                      <View style={styles.orgChartChildLine} />
                      <OrgDepartmentBranch
                        department={department.department}
                        roles={department.roles}
                        color={department.color}
                        collapsed={collapsed}
                      />
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        </Card>
      ))}
    </>
  );
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const {user, profile} = useAuth();
  const [activeModule, setActiveModule] = useState<AdminModule | null>(null);
  const [activePage, setActivePage] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [employeeDetailTab, setEmployeeDetailTab] = useState<'details' | 'documents'>('details');
  const [records, setRecords] = useState<any[]>([]);
  const recordsRequest = useRef(0);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState('');
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('All');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('ALL');
  const [attendanceFromDate, setAttendanceFromDate] = useState(todayKey());
  const [attendanceToDate, setAttendanceToDate] = useState(todayKey());
  const [draftAttendanceFromDate, setDraftAttendanceFromDate] = useState(todayKey());
  const [draftAttendanceToDate, setDraftAttendanceToDate] = useState(todayKey());
  const [leaveStatusFilter, setLeaveStatusFilter] = useState('ALL');
  const [accessibleCompanies, setAccessibleCompanies] = useState<any[]>([]);
  const [companiesError, setCompaniesError] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | string>('all');
  const [actionBusyId, setActionBusyId] = useState<string | number | null>(null);
  const [actionError, setActionError] = useState('');
  const [attendanceDrilldown, setAttendanceDrilldown] = useState<{key: string; value: any} | null>(null);
  const [attendanceDrilldownRecords, setAttendanceDrilldownRecords] = useState<any[]>([]);
  const [attendanceDrilldownLoading, setAttendanceDrilldownLoading] = useState(false);
  const [attendanceDrilldownError, setAttendanceDrilldownError] = useState('');
  const [regularisationTarget, setRegularisationTarget] = useState<any>(null);
  const [regularisationType, setRegularisationType] = useState(REGULARISATION_TYPES[1].value);
  const [regularisationReason, setRegularisationReason] = useState('');
  const [regularisationCheckIn, setRegularisationCheckIn] = useState('09:00');
  const [regularisationSubmitting, setRegularisationSubmitting] = useState(false);
  const [regularisationError, setRegularisationError] = useState('');
  const [regularisationStatusFilter, setRegularisationStatusFilter] = useState('ALL');
  const [rejectTarget, setRejectTarget] = useState<any>(null);
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [rejectError, setRejectError] = useState('');
  const [createDepartmentCompany, setCreateDepartmentCompany] = useState<{id: number | string; name: string} | null>(null);
  const [departmentName, setDepartmentName] = useState('');
  const [departmentSubmitting, setDepartmentSubmitting] = useState(false);
  const [departmentError, setDepartmentError] = useState('');
  const [createAllocationCompany, setCreateAllocationCompany] = useState<{id: number | string; name: string} | null>(null);
  const [createDocumentRequestCompany, setCreateDocumentRequestCompany] = useState<{id: number | string; name: string} | null>(null);
  const [createLeaveTypeModalOpen, setCreateLeaveTypeModalOpen] = useState(false);
  const [leaveTypeCompanyId, setLeaveTypeCompanyId] = useState<number | string>('');
  const [leaveTypeName, setLeaveTypeName] = useState('');
  const [leaveTypeTotalDays, setLeaveTypeTotalDays] = useState('14');
  const [leaveTypePaymentType, setLeaveTypePaymentType] = useState<'PAID' | 'UNPAID'>('PAID');
  const [leaveTypeCarryforwardType, setLeaveTypeCarryforwardType] = useState('NO_CARRYFORWARD');
  const [leaveTypeCarryforwardMax, setLeaveTypeCarryforwardMax] = useState('5');
  const [leaveTypeRequireAttachment, setLeaveTypeRequireAttachment] = useState(false);
  const [leaveTypeColor, setLeaveTypeColor] = useState('#3B82F6');
  const [leaveTypeSubmitting, setLeaveTypeSubmitting] = useState(false);
  const [leaveTypeError, setLeaveTypeError] = useState('');
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [createHolidayModalOpen, setCreateHolidayModalOpen] = useState(false);
  const [holidayCompanyId, setHolidayCompanyId] = useState<number | string>('');
  const [holidayName, setHolidayName] = useState('');
  const [holidayStartDate, setHolidayStartDate] = useState(todayKey());
  const [holidayEndDate, setHolidayEndDate] = useState(todayKey());
  const [holidayRecurring, setHolidayRecurring] = useState(true);
  const [holidaySubmitting, setHolidaySubmitting] = useState(false);
  const [holidayError, setHolidayError] = useState('');
  const [showHolidayCompanyPicker, setShowHolidayCompanyPicker] = useState(false);
  const roles = useMemo(() => userRoles(user, profile), [user, profile]);
  const canManageEmployeeDocuments = hasRole(roles, [ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER]);
  const isAdminDocumentsPage = activePage === 'My Documents' && canManageEmployeeDocuments;
  const isDocumentRequestsPage = activePage === 'Document Requests' && canManageEmployeeDocuments;
  const pageDisplayName = isAdminDocumentsPage ? 'Employee Documents' : activePage;
  const visibleGroups = useMemo(
    () =>
      ADMIN_GROUPS.map(group => ({
        ...group,
        modules: group.modules.filter(module => hasRole(roles, module.roles)),
      })).filter(group => group.modules.length),
    [roles],
  );
  const moduleCount = visibleGroups.reduce((total, group) => total + group.modules.length, 0);

  const loadAccessibleCompanies = useCallback(async () => {
    setCompaniesError('');
    try {setAccessibleCompanies(await api.accessibleCompanies());}
    catch (err: any) {setAccessibleCompanies([]); setCompaniesError(err?.message || 'Unable to load accessible companies.');}
  }, []);
  useEffect(() => {loadAccessibleCompanies();}, [loadAccessibleCompanies]);

  const selectedCompanyName = useMemo(() => {
    if (selectedCompanyId === 'all') return 'All accessible companies';
    const company = accessibleCompanies.find(item => String(item?.id) === String(selectedCompanyId));
    return company?.name || `Company ${selectedCompanyId}`;
  }, [accessibleCompanies, selectedCompanyId]);

  // Employee, attendance, and leave operations must always operate inside one
  // company context. Do not default these pages to a cross-company aggregate.
  useEffect(() => {
    if (!COMPANY_SCOPED_ADMIN_PAGES.has(activePage) || selectedCompanyId !== 'all') return;
    const currentCompanyId = profile?.companyId || user?.companyId;
    const selected = accessibleCompanies.find(company => String(company?.id) === String(currentCompanyId)) || accessibleCompanies[0];
    if (selected?.id != null) setSelectedCompanyId(selected.id);
  }, [activePage, accessibleCompanies, profile?.companyId, selectedCompanyId, user?.companyId]);

  useEffect(() => {
    if (activePage === 'Departments' || activePage === 'Leave Allocations' || activePage === 'Leave Types' || isAdminDocumentsPage || isDocumentRequestsPage) setSearch('');
    if (isAdminDocumentsPage || isDocumentRequestsPage) setSelectedRecord(null);
  }, [activePage, isAdminDocumentsPage, isDocumentRequestsPage, selectedCompanyId]);

  useEffect(() => {
    setEmployeeDetailTab(isAdminDocumentsPage ? 'documents' : 'details');
  }, [isAdminDocumentsPage, selectedRecord]);

  const loadPage = useCallback(async () => {
    const requestId = ++recordsRequest.current;
    if (!activePage || activePage === 'Loans' || COMPANY_ROLE_PAGES.includes(activePage) || SUBSCRIPTION_PAGES.includes(activePage)) return;
    const endpoint = activePage === 'Employees' && roles.includes(ROLES.PLATFORM_SUPER_ADMIN) ? '/employees/global' : PAGE_ENDPOINTS[activePage];
    setRecordsError('');
    setRecords([]);
    if (!endpoint) {
      setRecordsError('This mobile page is ready, but its API route is not mapped yet.');
      return;
    }
    setLoadingRecords(true);
    try {
      if (isAdminDocumentsPage) {
        if (selectedCompanyId === 'all') return;
        const employees = await loadDocumentEmployees(api.companyEmployees, {id: selectedCompanyId, name: selectedCompanyName});
        if (requestId === recordsRequest.current) setRecords(employees);
        return;
      }
      if (isDocumentRequestsPage) {
        if (selectedCompanyId === 'all') return;
        const result = await api.adminDocumentRequests(selectedCompanyId);
        if (requestId === recordsRequest.current) setRecords(companyDocumentRequests(result, {id: selectedCompanyId, name: selectedCompanyName}));
        return;
      }
      if (activePage === 'Departments') {
        if (selectedCompanyId === 'all') return;
        const result = await api.departments(selectedCompanyId);
        if (requestId === recordsRequest.current) {
          setRecords(companyDepartments(result, {id: selectedCompanyId, name: selectedCompanyName}));
        }
        return;
      }
      if (activePage === 'Leave Allocations') {
        if (selectedCompanyId === 'all') return;
        const result = await api.leaveAllocations(selectedCompanyId);
        if (requestId === recordsRequest.current) {
          setRecords(companyLeaveAllocations(result, {id: selectedCompanyId, name: selectedCompanyName}));
        }
        return;
      }
      if (activePage === 'Leave Types') {
        if (selectedCompanyId === 'all') return;
        const result = await api.adminLeaveTypes(selectedCompanyId);
        if (requestId === recordsRequest.current) setRecords(companyLeaveTypes(result, selectedCompanyId));
        return;
      }
      if (activePage === 'Attendance Dashboard') {
        const filterCompanyId = selectedCompanyId === 'all' ? null : selectedCompanyId;
        const companyParam = selectedCompanyId === 'all' ? undefined : selectedCompanyId;
        const selectedCompany = accessibleCompanies.find(company => String(company?.id) === String(selectedCompanyId));
        const selectedName = selectedCompany?.name ? String(selectedCompany.name).toLowerCase() : '';
        const matchesSelectedCompany = (item: any) => {
          if (selectedCompanyId === 'all') return true;
          const ids = [
            rawField(item, ['companyId', 'organizationId', 'company.id', 'organization.id']),
            rawField(item, ['employee.companyId', 'employee.organizationId']),
          ]
            .filter(value => value !== undefined && value !== null)
            .map(value => String(value));
          if (ids.includes(String(selectedCompanyId))) return true;
          if (!selectedName) return false;
          const names = [
            field(item, ['companyName', 'organizationName', 'company.name', 'organization.name'], ''),
            field(item, ['employee.companyName', 'employee.organizationName'], ''),
          ].filter(Boolean);
          return names.some(name => String(name).toLowerCase() === selectedName);
        };
        const employeeEndpoints = roles.includes(ROLES.PLATFORM_SUPER_ADMIN) ? ['/employees/global', '/employees'] : ['/employees', '/employees/global'];
        let employees: any[] = [];
        for (const employeeEndpoint of employeeEndpoints) {
          try {
            const result = asArray(await api.adminList(employeeEndpoint, {page: 0, size: 1000, sort: 'id,desc', companyId: companyParam}, filterCompanyId));
            const scoped = result.filter(matchesSelectedCompany);
            if (scoped.length || !employees.length) employees = scoped.length ? scoped : result;
            if (scoped.length) break;
          } catch {
            // Try the next employee endpoint; tenants differ by role.
          }
        }
        employees = employees.filter(matchesSelectedCompany);

        let attendance: any[] = [];
        try {
          const date = todayKey();
          const result = asArray(await api.adminList('/attendance', {page: 0, size: 1000, sort: 'id,desc', date, attendanceDate: date, companyId: companyParam}, filterCompanyId));
          attendance = result.filter(matchesSelectedCompany).filter((item: any) => {
            const dateValue = rawField(item, ['attendanceDate', 'date', 'workDate', 'clockDate', 'createdAt', 'checkInTime', 'checkinTime', 'inTime']);
            return !dateValue || sameDay(dateValue, date);
          });
        } catch {
          attendance = [];
        }

        const presentIds = new Set(
          attendance
            .filter(isPresentAttendance)
            .map((item: any) => employeeKey(item))
            .filter(Boolean),
        );
        const notOutYet = attendance.filter((item: any) => {
          const checkin = attendanceCheckIn(item);
          const checkout = attendanceCheckOut(item);
          return !!checkin && (!checkout || checkout === '-');
        }).length;
        const lateCount = attendance.filter(isLateAttendance).length;
        const irregularToday = attendance.filter(isIrregularAttendance).length;

        const totalEmployees = employees.length;
        const presentToday = presentIds.size || attendance.filter(isPresentAttendance).length;
        const explicitAbsent = attendance.filter(isAbsentAttendance).length;
        const absentToday = totalEmployees ? Math.max(totalEmployees - presentToday, explicitAbsent) : explicitAbsent;
        setRecords([{
          totalEmployees,
          presentToday,
          absentToday,
          notOutYet,
          lateCount,
          irregularToday,
        }]);
        return;
      }
      if (activePage === 'Org Chart') {
        const scopes = selectedCompanyId === 'all'
          ? (accessibleCompanies.length ? accessibleCompanies : [{id: profile?.companyId || user?.companyId, name: profile?.companyName || user?.companyName || selectedCompanyName}])
          : accessibleCompanies.filter(company => String(company?.id) === String(selectedCompanyId));
        const companyScopes = (scopes.length ? scopes : [{id: selectedCompanyId, name: selectedCompanyName}])
          .filter(company => company?.id != null && company.id !== 'all');
        const charts = await Promise.all(companyScopes.map(company => loadCompanyOrgChart(api, company)));
        if (requestId === recordsRequest.current) setRecords(charts.flat());
        return;
      }
      if (activePage === 'Attendance Register') {
        const hasDateFilter = Boolean(attendanceFromDate || attendanceToDate);
        const range = hasDateFilter
          ? sortedDateRange(attendanceFromDate, attendanceToDate)
          : {from: '', to: ''};
        const rangeDates = hasDateFilter ? dateKeysInRange(range.from, range.to) : [];
        const companyScopes = selectedCompanyId === 'all'
          ? (accessibleCompanies.length ? accessibleCompanies : [{id: null, name: ''}])
          : accessibleCompanies.filter(company => String(company?.id) === String(selectedCompanyId));
        const scopes = companyScopes.length ? companyScopes : [{id: selectedCompanyId === 'all' ? null : selectedCompanyId, name: selectedCompanyName}];
        const merged: any[] = [];

        if (!hasDateFilter) {
          for (const company of scopes) {
            const filterCompanyId = company?.id == null || selectedCompanyId === 'all' && !company?.id ? null : company.id;
            const companyParam = company?.id == null ? undefined : company.id;
            const companyName = company?.name || selectedCompanyName;
            try {
              const result = asArray(await api.adminList('/attendance', {
                page: 0,
                size: 500,
                sort: 'id,desc',
                companyId: companyParam,
              }, filterCompanyId));
              const scoped = result.filter((item: any) => {
                if (company?.id == null) return true;
                const ids = [
                  rawField(item, ['companyId', 'organizationId', 'company.id', 'organization.id']),
                  rawField(item, ['employee.companyId', 'employee.organizationId']),
                ].filter(value => value !== undefined && value !== null).map(value => String(value));
                if (ids.includes(String(company.id))) return true;
                return attendanceCompanyName(item).toLowerCase() === String(companyName).toLowerCase();
              });
              scoped.forEach((record: any) => {
                merged.push({
                  ...record,
                  companyId: rawField(record, ['companyId', 'organizationId', 'company.id', 'organization.id']) || company?.id,
                  companyName: attendanceCompanyName(record) || companyName,
                });
              });
            } catch {
              // Ignore
            }
          }
          setRecords(merged);
          return;
        }

        for (const company of scopes) {
          const filterCompanyId = company?.id == null || selectedCompanyId === 'all' && !company?.id ? null : company.id;
          const companyParam = company?.id == null ? undefined : company.id;
          const companyName = company?.name || selectedCompanyName;
          let employees: any[] = [];
          let attendance: any[] = [];

          const employeeEndpoints = roles.includes(ROLES.PLATFORM_SUPER_ADMIN) ? ['/employees/global', '/employees'] : ['/employees', '/employees/global'];
          for (const employeeEndpoint of employeeEndpoints) {
            try {
              const result = asArray(await api.adminList(employeeEndpoint, {page: 0, size: 1000, sort: 'id,desc', companyId: companyParam}, filterCompanyId));
              employees = company?.id == null ? result : result.filter((item: any) => {
                const ids = [
                  rawField(item, ['companyId', 'organizationId', 'company.id', 'organization.id']),
                  rawField(item, ['employee.companyId', 'employee.organizationId']),
                ].filter(value => value !== undefined && value !== null).map(value => String(value));
                if (ids.includes(String(company.id))) return true;
                const names = [field(item, ['companyName', 'organizationName', 'company.name', 'organization.name'], '')].filter(Boolean);
                return names.some(name => String(name).toLowerCase() === String(companyName).toLowerCase());
              });
              if (employees.length) break;
            } catch {
              // Try the next role-specific employees endpoint.
            }
          }

          try {
            const result = asArray(await api.adminList('/attendance', {
              page: 0,
              size: 1000,
              sort: 'id,desc',
              from: range.from,
              to: range.to,
              date: range.from === range.to ? range.from : undefined,
              attendanceDate: range.from === range.to ? range.from : undefined,
              startDate: range.from,
              endDate: range.to,
              fromDate: range.from,
              toDate: range.to,
              companyId: companyParam,
            }, filterCompanyId));
            attendance = result.filter((item: any) => {
              const dateValue = rawField(item, ['attendanceDate', 'date', 'workDate', 'clockDate', 'createdAt', 'checkInTime', 'checkinTime', 'inTime']);
              if (dateValue && !dateInRange(dateValue, range.from, range.to)) return false;
              if (company?.id == null) return true;
              const ids = [
                rawField(item, ['companyId', 'organizationId', 'company.id', 'organization.id']),
                rawField(item, ['employee.companyId', 'employee.organizationId']),
              ].filter(value => value !== undefined && value !== null).map(value => String(value));
              if (ids.includes(String(company.id))) return true;
              return attendanceCompanyName(item).toLowerCase() === String(companyName).toLowerCase();
            });
          } catch {
            attendance = [];
          }

          const attendanceByEmployee = new Map<string, any>();
          attendance.forEach((record: any) => {
            const key = employeeKey(record);
            const recordDate = String(rawField(record, ['attendanceDate', 'date', 'workDate', 'clockDate', 'createdAt', 'checkInTime', 'checkinTime', 'inTime']) || range.from).slice(0, 10);
            if (key) attendanceByEmployee.set(`${key}-${recordDate}`, record);
          });

          employees.forEach((employee: any) => {
            const key = employeeKey(employee);
            rangeDates.forEach(date => {
              const record = key ? attendanceByEmployee.get(`${key}-${date}`) : null;
              if (record) {
                merged.push({...record, companyId: rawField(record, ['companyId', 'organizationId', 'company.id', 'organization.id']) || company?.id, companyName: attendanceCompanyName(record) || companyName, employee});
                return;
              }
              merged.push({
                id: `absent-${company?.id || 'all'}-${date}-${key || field(employee, ['email', 'workEmail', 'name', 'fullName'], Math.random().toString(36).slice(2))}`,
                attendanceDate: date,
                status: 'ABSENT',
                attendanceStatus: 'ABSENT',
                companyId: company?.id,
                employeeName: field(employee, ['fullName', 'name', 'employeeName'], 'Employee'),
                companyName,
                departmentName: field(employee, ['departmentName'], ''),
                jobPositionName: field(employee, ['jobPositionName'], ''),
                photoPath: field(employee, ['photoPath', 'profilePhotoPath', 'logoPath'], ''),
                employee,
                syntheticAbsent: true,
              });
            });
          });

          attendance.forEach((record: any) => {
            const key = employeeKey(record);
            const recordDate = String(rawField(record, ['attendanceDate', 'date', 'workDate', 'clockDate', 'createdAt', 'checkInTime', 'checkinTime', 'inTime']) || range.from).slice(0, 10);
            if (!key || !employees.some((employee: any) => employeeKey(employee) === key && rangeDates.includes(recordDate))) {
              merged.push({...record, companyId: rawField(record, ['companyId', 'organizationId', 'company.id', 'organization.id']) || company?.id, companyName: attendanceCompanyName(record) || companyName});
            }
          });
        }

        setRecords(merged);
        return;
      }
      if (activePage === 'Regularisation') {
        const companyScopes = selectedCompanyId === 'all'
          ? (accessibleCompanies.length ? accessibleCompanies : [{id: profile?.companyId || user?.companyId, name: selectedCompanyName}])
          : accessibleCompanies.filter(company => String(company?.id) === String(selectedCompanyId));
        const scopes = companyScopes.length ? companyScopes : [{id: selectedCompanyId === 'all' ? (profile?.companyId || user?.companyId) : selectedCompanyId, name: selectedCompanyName}];
        const merged: any[] = [];
        let hasSuccess = false;
        let lastError: any = null;
        for (const company of scopes) {
          if (!company?.id) continue;
          try {
            const result = asArray(await api.adminList('/attendance/regularisation', {companyId: company.id}, company.id));
            hasSuccess = true;
            result.forEach((record: any) => {
              merged.push({
                ...record,
                companyId: rawField(record, ['companyId', 'organizationId', 'company.id', 'organization.id']) || company.id,
                companyName: field(record, ['companyName', 'organizationName'], company.name || selectedCompanyName),
              });
            });
          } catch (err: any) {
            lastError = err;
          }
        }
        if (!hasSuccess && lastError && scopes.length === 1) {
          throw lastError;
        }
        setRecords(merged);
        return;
      }
      if (activePage === 'Holidays' || activePage === 'Company Leaves') {
        const companyScopes = selectedCompanyId === 'all'
          ? (accessibleCompanies.length ? accessibleCompanies : [{id: profile?.companyId || user?.companyId, name: selectedCompanyName}])
          : accessibleCompanies.filter(company => String(company?.id) === String(selectedCompanyId));
        const scopes = companyScopes.length ? companyScopes : [{id: selectedCompanyId === 'all' ? (profile?.companyId || user?.companyId) : selectedCompanyId, name: selectedCompanyName}];
        const merged: any[] = [];
        let hasSuccess = false;
        let lastError: any = null;
        for (const company of scopes) {
          if (!company?.id) continue;
          try {
            const result = asArray(await api.adminList(endpoint, {companyId: company.id}, company.id));
            hasSuccess = true;
            result.forEach((record: any) => {
              merged.push({
                ...record,
                companyId: rawField(record, ['companyId', 'organizationId', 'company.id', 'organization.id']) || company.id,
                companyName: field(record, ['companyName', 'organizationName'], company.name || selectedCompanyName),
              });
            });
          } catch (err: any) {
            lastError = err;
          }
        }
        if (!hasSuccess && lastError && scopes.length === 1) {
          throw lastError;
        }
        setRecords(merged);
        return;
      }
      const result = await api.adminList(endpoint, {
        page: 0,
        size: activePage === 'Employees' ? 500 : (activePage === 'Leave Requests' || activePage === 'Attendance Register') ? 100 : 50,
        sort: 'id,desc',
        status: activePage === 'Leave Requests' && leaveStatusFilter !== 'ALL' ? leaveStatusFilter : undefined,
        date: activePage === 'Attendance Register' && attendanceFromDate === attendanceToDate ? attendanceFromDate : undefined,
        attendanceDate: activePage === 'Attendance Register' && attendanceFromDate === attendanceToDate ? attendanceFromDate : undefined,
        startDate: activePage === 'Attendance Register' ? sortedDateRange(attendanceFromDate, attendanceToDate).from : undefined,
        endDate: activePage === 'Attendance Register' ? sortedDateRange(attendanceFromDate, attendanceToDate).to : undefined,
        // A handful of dashboard-style endpoints (e.g. attendance/payroll dashboards) require a
        // companyId; harmless to send everywhere else since Spring ignores unknown params.
        companyId: selectedCompanyId === 'all' ? undefined : selectedCompanyId,
      }, selectedCompanyId === 'all' ? null : selectedCompanyId);
      setRecords(asArray(result));
    } catch (err: any) {
      if (requestId === recordsRequest.current) setRecordsError(err?.message || 'Unable to load records.');
    } finally {
      if (requestId === recordsRequest.current) setLoadingRecords(false);
    }
  }, [accessibleCompanies, activePage, attendanceFromDate, attendanceToDate, isAdminDocumentsPage, isDocumentRequestsPage, leaveStatusFilter, profile?.companyId, profile?.companyName, roles, selectedCompanyId, selectedCompanyName, user?.companyId, user?.companyName]);

  useEffect(() => {
    setSearch('');
    setCompanyFilter('All');
    setLeaveStatusFilter('ALL');
    setRegularisationStatusFilter('ALL');
    setSelectedRecord(null);
    setActionError('');
    setAttendanceDrilldown(null);
    setAttendanceDrilldownRecords([]);
    setAttendanceDrilldownError('');
    setRegularisationTarget(null);
    setRegularisationReason('');
    setRegularisationCheckIn('09:00');
    setRegularisationType(REGULARISATION_TYPES[1].value);
    setRegularisationError('');
    setRejectTarget(null);
    setRejectRemarks('');
    setRejectError('');
    setCreateDepartmentCompany(null);
    setCreateAllocationCompany(null);
    setCreateDocumentRequestCompany(null);
    setDepartmentError('');
    setCreateLeaveTypeModalOpen(false);
    setLeaveTypeError('');
    setShowCompanyPicker(false);
    setCreateHolidayModalOpen(false);
    setHolidayError('');
    setShowHolidayCompanyPicker(false);
  }, [activePage]);

  const openPage = useCallback((page: string) => {
    if (SUBSCRIPTION_PAGES.includes(page)) setSelectedCompanyId('all');
    if (page === 'Attendance Register') setAttendanceStatusFilter('ALL');
    if (page === 'Regularisation') setRegularisationStatusFilter('ALL');
    setActivePage(page);
  }, []);

  const openAttendanceRegisterForStat = useCallback((statKey: string) => {
    const statusByStat: Record<string, string> = {
      totalEmployees: 'ALL',
      presentToday: 'CHECKED_IN',
      absentToday: 'ABSENT',
      notOutYet: 'NOT_OUT',
      lateCount: 'LATE',
      irregularToday: 'IRREGULAR',
    };
    setSearch('');
    setCompanyFilter('All');
    setAttendanceStatusFilter(statusByStat[statKey] || 'ALL');
    setAttendanceDrilldown(null);
    setActivePage('Attendance Register');
  }, []);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  async function handleApprovalAction(item: any, action: 'approve' | 'reject') {
    if (action === 'reject') {
      openRejectModal(item);
      return;
    }
    setActionBusyId(item.id);
    setActionError('');
    try {
      const companyId = rawField(item, ['companyId', 'organizationId', 'company.id', 'organization.id']) || (selectedCompanyId === 'all' ? null : selectedCompanyId);
      if (activePage === 'Leave Requests') {
        await api.approveLeaveRequest(item.id, companyId);
      } else if (activePage === 'Regularisation') {
        await api.approveRegularisation(item.id, undefined, companyId);
      }
      await loadPage();
    } catch (err: any) {
      setActionError(err?.message || `Unable to ${action} this request.`);
    } finally {
      setActionBusyId(null);
    }
  }

  function openRejectModal(item: any) {
    setRejectTarget(item);
    setRejectRemarks('');
    setRejectError('');
  }

  async function submitRejectModal() {
    if (!rejectTarget) return;
    if (!rejectRemarks.trim()) {
      setRejectError('Please enter a rejection reason.');
      return;
    }
    setRejectSubmitting(true);
    setRejectError('');
    try {
      const companyId = rawField(rejectTarget, ['companyId', 'organizationId', 'company.id', 'organization.id']) || (selectedCompanyId === 'all' ? null : selectedCompanyId);
      if (activePage === 'Regularisation') {
        await api.rejectRegularisation(rejectTarget.id, rejectRemarks.trim(), companyId);
      } else if (activePage === 'Leave Requests') {
        await api.rejectLeaveRequest(rejectTarget.id, rejectRemarks.trim(), companyId);
      }
      setRejectTarget(null);
      setRejectRemarks('');
      await loadPage();
    } catch (err: any) {
      setRejectError(err?.message || 'Unable to reject request.');
    } finally {
      setRejectSubmitting(false);
    }
  }

  function openRegularisationModal(item: any) {
    setRegularisationTarget(item);
    setRegularisationType(item?.syntheticAbsent ? 'MISSING_PUNCH' : REGULARISATION_TYPES[1].value);
    setRegularisationCheckIn('09:00');
    setRegularisationReason('');
    setRegularisationError('');
  }

  async function submitAdminRegularisation() {
    if (!regularisationTarget) return;
    const attendanceDate = field(regularisationTarget, ['attendanceDate', 'date', 'workDate', 'clockDate'], '');
    const companyId = rawField(regularisationTarget, ['companyId', 'organizationId', 'company.id', 'organization.id', 'employee.companyId', 'employee.organizationId']) || (selectedCompanyId === 'all' ? undefined : selectedCompanyId);
    const employeeId = rawField(regularisationTarget, ['employeeId', 'employee.id', 'userId']);
    const isSynthetic = !!regularisationTarget.syntheticAbsent || String(regularisationTarget.id || '').startsWith('absent-');

    if (!regularisationReason.trim()) {
      setRegularisationError('Please enter a reason.');
      return;
    }
    if (isSynthetic && !/^([01]\d|2[0-3]):[0-5]\d$/.test(regularisationCheckIn)) {
      setRegularisationError('Enter check-in time in HH:MM format.');
      return;
    }

    setRegularisationSubmitting(true);
    setRegularisationError('');
    try {
      await api.submitRegularisationRequest(isSynthetic
        ? {
            attendanceDate,
            companyId,
            employeeId,
            requestType: 'MISSING_PUNCH',
            requestedCheckIn: regularisationCheckIn,
            reason: regularisationReason.trim(),
          }
        : {
            attendanceId: regularisationTarget.id,
            attendanceDate,
            companyId,
            employeeId,
            requestType: regularisationType,
            reason: regularisationReason.trim(),
          }, companyId as any);
      setRegularisationTarget(null);
      setRegularisationReason('');
      setRegularisationCheckIn('09:00');
      setRegularisationType(REGULARISATION_TYPES[1].value);
      await loadPage();
    } catch (err: any) {
      setRegularisationError(err?.message || 'Unable to submit regularisation request.');
    } finally {
      setRegularisationSubmitting(false);
    }
  }

  function openCreateDepartmentModal() {
    if (selectedCompanyId === 'all') return;
    setCreateDepartmentCompany({id: selectedCompanyId, name: selectedCompanyName});
    setDepartmentName('');
    setDepartmentError('');
  }

  async function submitCreateDepartment() {
    if (departmentSubmitting || !createDepartmentCompany) return;
    const name = departmentName.trim();
    if (!name) {
      setDepartmentError('Please enter a department name.');
      return;
    }
    if (records.some(item => String(item.companyId) === String(createDepartmentCompany.id)
      && String(item.name || '').trim().toLowerCase() === name.toLowerCase())) {
      setDepartmentError('A department with this name already exists in this company.');
      return;
    }
    setDepartmentSubmitting(true);
    setDepartmentError('');
    try {
      await api.createDepartment({name}, createDepartmentCompany.id);
      setCreateDepartmentCompany(null);
      setSearch('');
      await loadPage();
    } catch (err: any) {
      setDepartmentError(err?.message || 'Unable to create department.');
    } finally {
      setDepartmentSubmitting(false);
    }
  }

  function openCreateLeaveTypeModal() {
    const defaultCompanyId = selectedCompanyId !== 'all' ? selectedCompanyId : (accessibleCompanies[0]?.id || profile?.companyId || user?.companyId || '');
    setLeaveTypeCompanyId(defaultCompanyId);
    setLeaveTypeName('');
    setLeaveTypeTotalDays('14');
    setLeaveTypePaymentType('PAID');
    setLeaveTypeCarryforwardType('NO_CARRYFORWARD');
    setLeaveTypeCarryforwardMax('5');
    setLeaveTypeRequireAttachment(false);
    setLeaveTypeColor('#3B82F6');
    setLeaveTypeError('');
    setShowCompanyPicker(false);
    setCreateLeaveTypeModalOpen(true);
  }

  async function submitCreateLeaveType() {
    if (!leaveTypeCompanyId) {
      setLeaveTypeError('Please select an organization / company.');
      return;
    }
    if (!leaveTypeName.trim()) {
      setLeaveTypeError('Please enter a leave type name.');
      return;
    }
    const days = parseInt(leaveTypeTotalDays, 10);
    if (Number.isNaN(days) || days < 0) {
      setLeaveTypeError('Please enter a valid number of days (e.g. 14).');
      return;
    }

    setLeaveTypeSubmitting(true);
    setLeaveTypeError('');
    try {
      await api.createLeaveType({
        name: leaveTypeName.trim(),
        totalDays: days,
        paymentType: leaveTypePaymentType,
        carryforwardType: leaveTypeCarryforwardType,
        carryforwardMax: leaveTypeCarryforwardType !== 'NO_CARRYFORWARD' ? (parseFloat(leaveTypeCarryforwardMax) || 0) : null,
        colorCode: leaveTypeColor,
        requireAttachment: leaveTypeRequireAttachment,
        isOrganizationWide: false,
        company: { id: leaveTypeCompanyId },
      }, leaveTypeCompanyId);

      setCreateLeaveTypeModalOpen(false);
      if (selectedCompanyId !== 'all' && String(selectedCompanyId) !== String(leaveTypeCompanyId)) {
        setSelectedCompanyId(leaveTypeCompanyId);
      } else {
        await loadPage();
      }
    } catch (err: any) {
      setLeaveTypeError(err?.message || 'Unable to create leave type.');
    } finally {
      setLeaveTypeSubmitting(false);
    }
  }

  function openCreateHolidayModal() {
    const defaultCompanyId = selectedCompanyId !== 'all' ? selectedCompanyId : (accessibleCompanies[0]?.id || profile?.companyId || user?.companyId || '');
    setHolidayCompanyId(defaultCompanyId);
    setHolidayName('');
    setHolidayStartDate(todayKey());
    setHolidayEndDate(todayKey());
    setHolidayRecurring(true);
    setHolidayError('');
    setShowHolidayCompanyPicker(false);
    setCreateHolidayModalOpen(true);
  }

  async function submitCreateHoliday() {
    if (!holidayCompanyId) {
      setHolidayError('Please select an organization / company.');
      return;
    }
    if (!holidayName.trim()) {
      setHolidayError('Please enter a holiday name.');
      return;
    }
    if (!holidayStartDate) {
      setHolidayError('Please select a start date.');
      return;
    }

    setHolidaySubmitting(true);
    setHolidayError('');
    try {
      const range = sortedDateRange(holidayStartDate, holidayEndDate || holidayStartDate);
      await api.createHoliday({
        name: holidayName.trim(),
        startDate: range.from,
        endDate: range.to,
        recurring: holidayRecurring,
      }, holidayCompanyId);

      setCreateHolidayModalOpen(false);
      if (selectedCompanyId !== 'all' && String(selectedCompanyId) !== String(holidayCompanyId)) {
        setSelectedCompanyId(holidayCompanyId);
      } else {
        await loadPage();
      }
    } catch (err: any) {
      setHolidayError(err?.message || 'Unable to create holiday.');
    } finally {
      setHolidaySubmitting(false);
    }
  }

  const currentFilterCompanyId = selectedCompanyId === 'all' ? null : selectedCompanyId;

  const selectedCompanyMatches = useCallback((item: any) => {
    if (selectedCompanyId === 'all') return true;
    const ids = [
      rawField(item, ['companyId', 'organizationId', 'company.id', 'organization.id']),
      rawField(item, ['employee.companyId', 'employee.organizationId']),
    ]
      .filter(value => value !== undefined && value !== null)
      .map(value => String(value));
    if (ids.includes(String(selectedCompanyId))) return true;
    const names = [
      field(item, ['companyName', 'organizationName', 'company.name', 'organization.name'], ''),
      field(item, ['employee.companyName', 'employee.organizationName'], ''),
    ].filter(Boolean);
    return names.some(name => String(name).toLowerCase() === selectedCompanyName.toLowerCase());
  }, [selectedCompanyId, selectedCompanyName]);

  const loadCompanyEmployees = useCallback(async () => {
    const companyParam = selectedCompanyId === 'all' ? undefined : selectedCompanyId;
    const endpoints = roles.includes(ROLES.PLATFORM_SUPER_ADMIN) ? ['/employees/global', '/employees'] : ['/employees', '/employees/global'];
    let best: any[] = [];
    let lastError: any = null;
    for (const endpoint of endpoints) {
      try {
        const result = asArray(await api.adminList(endpoint, {page: 0, size: 1000, sort: 'id,desc', companyId: companyParam}, currentFilterCompanyId));
        const scoped = result.filter(selectedCompanyMatches);
        if (scoped.length) return scoped;
        if (!best.length && result.length) best = result;
      } catch (err) {
        lastError = err;
      }
    }
    if (best.length) return best.filter(selectedCompanyMatches);
    if (lastError) throw lastError;
    return [];
  }, [currentFilterCompanyId, roles, selectedCompanyId, selectedCompanyMatches]);

  const loadCompanyAttendance = useCallback(async () => {
    const companyParam = selectedCompanyId === 'all' ? undefined : selectedCompanyId;
    const date = todayKey();
    const result = asArray(await api.adminList('/attendance', {page: 0, size: 1000, sort: 'id,desc', date, attendanceDate: date, companyId: companyParam}, currentFilterCompanyId));
    const scoped = result.filter(selectedCompanyMatches);
    const todayScoped = scoped.filter((item: any) => {
      const dateValue = rawField(item, ['attendanceDate', 'date', 'workDate', 'clockDate', 'createdAt', 'checkInTime', 'checkinTime', 'inTime']);
      return !dateValue || sameDay(dateValue, date);
    });
    return todayScoped;
  }, [currentFilterCompanyId, selectedCompanyId, selectedCompanyMatches]);

  const loadAttendanceDrilldown = useCallback(async () => {
    if (!attendanceDrilldown) return;
    const config = ATTENDANCE_DRILLDOWNS[attendanceDrilldown.key];
    if (!config) return;
    setAttendanceDrilldownError('');
    setAttendanceDrilldownLoading(true);
    try {
      const attendance = await loadCompanyAttendance();
      if (config.mode === 'employees') {
        const employees = await loadCompanyEmployees();
        setAttendanceDrilldownRecords(employees);
        return;
      }

      const filtered = attendance.filter((item: any) => {
        const checkout = attendanceCheckOut(item);
        const checkin = attendanceCheckIn(item);
        if (config.mode === 'present') return isPresentAttendance(item);
        if (config.mode === 'absent') return isAbsentAttendance(item);
        if (config.mode === 'notOut') return !!checkin && (!checkout || checkout === '-');
        if (config.mode === 'late') return isLateAttendance(item);
        if (config.mode === 'irregular') return isIrregularAttendance(item);
        return true;
      });
      setAttendanceDrilldownRecords(filtered);
    } catch (err: any) {
      setAttendanceDrilldownError(err?.message || 'Unable to load attendance details.');
      setAttendanceDrilldownRecords([]);
    } finally {
      setAttendanceDrilldownLoading(false);
    }
  }, [attendanceDrilldown, loadCompanyAttendance, loadCompanyEmployees]);

  useEffect(() => {
    loadAttendanceDrilldown();
  }, [loadAttendanceDrilldown]);

  const companyOptions = useMemo(() => {
    const names = records
      .map(item => activePage === 'Attendance Register' ? attendanceCompanyName(item) : field(item, ['companyName', 'organizationName'], ''))
      .filter(Boolean);
    return ['All', ...Array.from(new Set(names)).sort()];
  }, [activePage, records]);

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter(item => {
      if (isAdminDocumentsPage && String(item.companyId) !== String(selectedCompanyId)) return false;
      if (isDocumentRequestsPage && String(item.companyId) !== String(selectedCompanyId)) return false;
      if ((activePage === 'Departments' || activePage === 'Leave Allocations') && String(item.companyId) !== String(selectedCompanyId)) return false;
      if (activePage === 'Leave Types' && String(item.__companyId) !== String(selectedCompanyId)) return false;
      const companyName = activePage === 'Attendance Register' ? attendanceCompanyName(item) : field(item, ['companyName', 'organizationName'], '');
      if (activePage === 'Employees' && companyFilter !== 'All' && companyName !== companyFilter) {
        return false;
      }
      if (activePage === 'Leave Requests' && leaveStatusFilter !== 'ALL'
          && String(field(item, ['status'], '')).toUpperCase() !== leaveStatusFilter) {
        return false;
      }
      if (activePage === 'Attendance Register' && attendanceStatusFilter !== 'ALL') {
        if (attendanceStatusFilter === 'CHECKED_IN' && !isPresentAttendance(item)) return false;
        if (attendanceStatusFilter === 'ABSENT' && !isAbsentAttendance(item)) return false;
        if (attendanceStatusFilter === 'LATE' && !isLateAttendance(item)) return false;
        if (attendanceStatusFilter === 'IRREGULAR' && !isIrregularAttendance(item)) return false;
        if (attendanceStatusFilter === 'NOT_OUT' && !(!!attendanceCheckIn(item) && !attendanceCheckOut(item))) return false;
      }
      if (activePage === 'Regularisation' && regularisationStatusFilter !== 'ALL') {
        const itemStatus = String(field(item, ['status'], '')).toUpperCase();
        if (regularisationStatusFilter === 'PENDING') {
          if (!isPendingRecord(item) && itemStatus !== 'PENDING' && itemStatus !== 'REQUESTED') return false;
        } else if (itemStatus !== regularisationStatusFilter) {
          return false;
        }
      }
      if (!query) return true;
      const haystack = [
        field(item, ['fullName', 'name', 'employeeName'], ''),
        field(item, ['title'], ''),
        field(item, ['description'], ''),
        field(item, ['documentFormat'], ''),
        field(item, ['employee.fullName', 'employee.name'], ''),
        field(item, ['email', 'workEmail'], ''),
        field(item, ['employee.email', 'employee.workEmail'], ''),
        field(item, ['badgeId', 'employeeCode', 'code', 'employeeBadgeId'], ''),
        companyName,
        field(item, ['departmentName'], ''),
        field(item, ['managerName'], ''),
        field(item, ['leaveTypeName', 'leaveType.name'], ''),
        field(item, ['year'], ''),
        field(item, ['employee.departmentName'], ''),
        field(item, ['jobPositionName'], ''),
        field(item, ['phone', 'workPhone'], ''),
        field(item, ['status', 'attendanceStatus', 'dayStatus', 'state'], ''),
        field(item, ['requestType', 'reason', 'rejectionRemarks', 'paymentType', 'carryforwardType'], ''),
        attendanceLocationText(item),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [activePage, attendanceStatusFilter, companyFilter, isAdminDocumentsPage, isDocumentRequestsPage, leaveStatusFilter, records, regularisationStatusFilter, search, selectedCompanyId]);

  const attendanceRecordSections = useMemo(() => {
    if (activePage !== 'Attendance Register') return [];
    const buckets = new Map<string, any[]>([
      ['Today', []],
      ['Yesterday', []],
      ['Earlier', []],
    ]);
    visibleRecords.forEach(item => {
      if (isStatsObject(item)) return;
      const title = attendanceSectionTitle(item);
      buckets.get(title)?.push(item);
    });
    return ['Today', 'Yesterday', 'Earlier']
      .map(title => ({
        title,
        records: (buckets.get(title) || []).slice().sort((a, b) => attendanceRecordSortTime(b) - attendanceRecordSortTime(a)),
      }))
      .filter(section => section.records.length);
  }, [activePage, visibleRecords]);

  function renderRegularisationModal() {
    const target = regularisationTarget;
    const isSynthetic = !!target?.syntheticAbsent || String(target?.id || '').startsWith('absent-');
    const employeeName = field(target, ['employeeName', 'employee.fullName', 'employee.name', 'fullName', 'name'], 'Employee');
    const companyName = attendanceCompanyName(target) || selectedCompanyName;
    const recordDate = field(target, ['attendanceDate', 'date', 'workDate', 'clockDate'], '');
    return (
      <Modal visible={!!target} animationType="slide" transparent onRequestClose={() => setRegularisationTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <TouchableOpacity disabled={regularisationSubmitting} onPress={() => setRegularisationTarget(null)} style={styles.modalClose}>
              <Icon name="close-outline" size={20} color={colors.textMid} />
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderIcon}>
                  <Icon name="create-outline" size={19} color={colors.warning} />
                </View>
                <View style={styles.modalHeaderCopy}>
                  <Text style={styles.modalTitle}>Regularize Attendance</Text>
                  <Text style={styles.modalSub}>{recordDate ? dateText(`${recordDate}T00:00:00`) : 'Attendance date'}</Text>
                </View>
              </View>

              <View style={styles.modalInfoCard}>
                <Text style={styles.modalInfoTitle}>{employeeName}</Text>
                <Text style={styles.modalInfoText} numberOfLines={1}>{companyName}</Text>
                <Text style={styles.modalInfoText}>
                  {attendanceCheckIn(target) && attendanceCheckIn(target) !== '-' ? `In ${timeText(attendanceCheckIn(target))}` : 'No check-in'}
                  {'  |  '}
                  {attendanceCheckOut(target) && attendanceCheckOut(target) !== '-' ? `Out ${timeText(attendanceCheckOut(target))}` : 'No check-out'}
                </Text>
              </View>

              {!isSynthetic && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modalChipRow}>
                  {REGULARISATION_TYPES.map(type => (
                    <TouchableOpacity
                      key={type.value}
                      activeOpacity={0.7}
                      onPress={() => setRegularisationType(type.value)}
                      style={[styles.companyChip, regularisationType === type.value && styles.companyChipActive]}>
                      <Text style={[styles.companyChipText, regularisationType === type.value && styles.companyChipTextActive]}>{type.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {isSynthetic && (
                <>
                  <Text style={styles.modalHelp}>This employee has no attendance record for this date. A missing-punch request will be submitted for the selected company.</Text>
                  <Text style={styles.inputLabel}>Requested check-in</Text>
                  <TextInput
                    value={regularisationCheckIn}
                    onChangeText={setRegularisationCheckIn}
                    placeholder="09:00"
                    placeholderTextColor={colors.subtle}
                    keyboardType="numbers-and-punctuation"
                    style={styles.input}
                  />
                </>
              )}

              <Text style={styles.inputLabel}>Reason</Text>
              <TextInput
                value={regularisationReason}
                onChangeText={setRegularisationReason}
                placeholder="Reason for regularisation"
                placeholderTextColor={colors.subtle}
                multiline
                style={[styles.input, styles.reasonInput]}
              />
              {!!regularisationError && <Text style={styles.modalError}>{regularisationError}</Text>}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  disabled={regularisationSubmitting}
                  onPress={submitAdminRegularisation}
                  style={[styles.modalPrimaryButton, regularisationSubmitting && styles.pressed]}>
                  {regularisationSubmitting ? <ActivityIndicator size="small" color={colors.white} /> : <Icon name="send-outline" size={16} color={colors.white} />}
                  <Text style={styles.modalPrimaryButtonText}>Submit Request</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={regularisationSubmitting}
                  onPress={() => setRegularisationTarget(null)}
                  style={[styles.modalSecondaryButton, regularisationSubmitting && styles.pressed]}>
                  <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  function renderRejectModal() {
    const target = rejectTarget;
    if (!target) return null;
    const employeeName = field(target, ['employeeName', 'employee.fullName', 'employee.name', 'fullName', 'name'], 'Employee');
    const requestType = formatRequestType(field(target, ['requestType'], ''));
    const attendanceDate = smartDate(field(target, ['attendanceDate'], ''));

    return (
      <Modal visible={!!target} animationType="slide" transparent onRequestClose={() => !rejectSubmitting && setRejectTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <TouchableOpacity disabled={rejectSubmitting} onPress={() => setRejectTarget(null)} style={styles.modalClose}>
              <Icon name="close-outline" size={20} color={colors.textMid} />
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <View style={[styles.modalHeaderIcon, {backgroundColor: colors.dangerLight}]}>
                  <Icon name="close-circle-outline" size={22} color={colors.danger} />
                </View>
                <View style={styles.modalHeaderCopy}>
                  <Text style={styles.modalTitle}>Reject Request</Text>
                  <Text style={styles.modalSub}>{employeeName} • {requestType}</Text>
                </View>
              </View>

              <View style={styles.modalInfoCard}>
                <Text style={styles.modalInfoTitle}>{employeeName}</Text>
                <Text style={styles.modalInfoText}>Date: {attendanceDate || '-'}</Text>
                {!!field(target, ['reason'], '') && (
                  <Text style={styles.modalInfoText}>Employee Reason: {field(target, ['reason'], '')}</Text>
                )}
              </View>

              <Text style={styles.inputLabel}>Reason for Rejection *</Text>
              <TextInput
                value={rejectRemarks}
                onChangeText={setRejectRemarks}
                placeholder="Enter rejection reason (required)..."
                placeholderTextColor={colors.subtle}
                multiline
                style={[styles.input, styles.reasonInput]}
              />

              {!!rejectError && <Text style={styles.modalError}>{rejectError}</Text>}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  disabled={rejectSubmitting}
                  onPress={submitRejectModal}
                  style={[styles.modalPrimaryButton, {backgroundColor: colors.danger}, rejectSubmitting && styles.pressed]}>
                  {rejectSubmitting ? <ActivityIndicator size="small" color={colors.white} /> : <Icon name="close-circle-outline" size={17} color={colors.white} />}
                  <Text style={styles.modalPrimaryButtonText}>Confirm Rejection</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={rejectSubmitting}
                  onPress={() => setRejectTarget(null)}
                  style={[styles.modalSecondaryButton, rejectSubmitting && styles.pressed]}>
                  <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  function renderCreateDepartmentModal() {
    if (!createDepartmentCompany) return null;
    const close = () => {
      if (!departmentSubmitting) setCreateDepartmentCompany(null);
    };
    return (
      <Modal visible animationType="slide" transparent onRequestClose={close}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <TouchableOpacity accessibilityLabel="Close create department" disabled={departmentSubmitting} onPress={close} style={styles.modalClose}>
              <Icon name="close-outline" size={20} color={colors.textMid} />
            </TouchableOpacity>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <View style={[styles.modalHeaderIcon, styles.departmentModalIcon]}>
                  <Icon name="layers-outline" size={20} color={colors.primary} />
                </View>
                <View style={styles.modalHeaderCopy}>
                  <Text style={styles.modalTitle}>Create Department</Text>
                </View>
              </View>
              <View style={styles.modalInfoCard}>
                <Text style={styles.scopeLabel}>Company</Text>
                <Text style={styles.modalInfoTitle}>{createDepartmentCompany.name}</Text>
              </View>
              <Text style={styles.inputLabel}>Department Name *</Text>
              <TextInput
                accessibilityLabel="Department name"
                value={departmentName}
                onChangeText={value => {setDepartmentName(value); setDepartmentError('');}}
                editable={!departmentSubmitting}
                placeholder="e.g. Human Resources"
                placeholderTextColor={colors.subtle}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={submitCreateDepartment}
                style={styles.input}
              />
              {!!departmentError && <Text accessibilityRole="alert" style={styles.modalError}>{departmentError}</Text>}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={departmentSubmitting}
                  onPress={submitCreateDepartment}
                  style={[styles.modalPrimaryButton, styles.departmentSubmitButton, departmentSubmitting && styles.pressed]}>
                  {departmentSubmitting ? <ActivityIndicator color={colors.white} size="small" /> : <Icon name="add-outline" size={18} color={colors.white} />}
                  <Text style={styles.modalPrimaryButtonText}>{departmentSubmitting ? 'Creating...' : 'Create Department'}</Text>
                </TouchableOpacity>
                <TouchableOpacity disabled={departmentSubmitting} onPress={close} style={styles.modalSecondaryButton}>
                  <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    );
  }

  function renderCreateLeaveTypeModal() {
    if (!createLeaveTypeModalOpen) return null;
    const selectedCompanyObj = accessibleCompanies.find(c => String(c.id) === String(leaveTypeCompanyId));
    const selectedCompanyNameText = selectedCompanyObj?.name || (leaveTypeCompanyId ? `Company ${leaveTypeCompanyId}` : 'Select a company');

    const COLOR_PRESETS = [
      {color: '#3B82F6', label: 'Blue'},
      {color: '#10B981', label: 'Green'},
      {color: '#F59E0B', label: 'Amber'},
      {color: '#EF4444', label: 'Red'},
      {color: '#8B5CF6', label: 'Purple'},
      {color: '#EC4899', label: 'Pink'},
      {color: '#06B6D4', label: 'Cyan'},
      {color: '#64748B', label: 'Slate'},
    ];

    return (
      <Modal visible={createLeaveTypeModalOpen} animationType="slide" transparent onRequestClose={() => !leaveTypeSubmitting && setCreateLeaveTypeModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, styles.createLeaveTypeSheet]}>
            <View style={styles.modalHandle} />
            <TouchableOpacity disabled={leaveTypeSubmitting} onPress={() => setCreateLeaveTypeModalOpen(false)} style={styles.modalClose}>
              <Icon name="close-outline" size={20} color={colors.textMid} />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <View style={[styles.modalHeaderIcon, {backgroundColor: colors.primaryLight}]}>
                  <Icon name="airplane-outline" size={22} color={colors.primary} />
                </View>
                <View style={styles.modalHeaderCopy}>
                  <Text style={styles.modalTitle}>Create Leave Type</Text>
                  <Text style={styles.modalSub}>Add a new leave policy to an organization</Text>
                </View>
              </View>

              {/* Organization / Company Selector */}
              <Text style={styles.inputLabel}>Organization / Company *</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={leaveTypeSubmitting}
                onPress={() => setShowCompanyPicker(!showCompanyPicker)}
                style={styles.dropdownSelector}>
                <View style={styles.dropdownSelectorLeft}>
                  <Icon name="business-outline" size={17} color={colors.primary} />
                  <Text style={styles.dropdownSelectorText} numberOfLines={1}>{selectedCompanyNameText}</Text>
                </View>
                <Icon name={showCompanyPicker ? 'chevron-up-outline' : 'chevron-down-outline'} size={18} color={colors.muted} />
              </TouchableOpacity>

              {showCompanyPicker && (
                <View style={styles.dropdownList}>
                  {accessibleCompanies.map(company => {
                    const isSelected = String(leaveTypeCompanyId) === String(company.id);
                    return (
                      <TouchableOpacity
                        key={String(company.id)}
                        activeOpacity={0.7}
                        onPress={() => {
                          setLeaveTypeCompanyId(company.id);
                          setShowCompanyPicker(false);
                        }}
                        style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}>
                        <Icon name="business-outline" size={15} color={isSelected ? colors.primary : colors.muted} />
                        <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]} numberOfLines={1}>
                          {company.name || `Company ${company.id}`}
                        </Text>
                        {isSelected && <Icon name="checkmark-circle" size={17} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Leave Type Name */}
              <Text style={styles.inputLabel}>Leave Type Name *</Text>
              <TextInput
                value={leaveTypeName}
                onChangeText={setLeaveTypeName}
                placeholder="e.g. Annual Leave, Casual Leave, Sick Leave"
                placeholderTextColor={colors.subtle}
                style={styles.input}
              />

              {/* Total Days */}
              <Text style={styles.inputLabel}>Total Days (Annual Allocation) *</Text>
              <TextInput
                value={leaveTypeTotalDays}
                onChangeText={setLeaveTypeTotalDays}
                placeholder="14"
                placeholderTextColor={colors.subtle}
                keyboardType="numeric"
                style={styles.input}
              />

              {/* Payment Type */}
              <Text style={styles.inputLabel}>Payment Type</Text>
              <View style={styles.modalChipRowInline}>
                {(['PAID', 'UNPAID'] as const).map(type => (
                  <TouchableOpacity
                    key={type}
                    activeOpacity={0.7}
                    onPress={() => setLeaveTypePaymentType(type)}
                    style={[styles.companyChip, leaveTypePaymentType === type && styles.companyChipActive]}>
                    <Text style={[styles.companyChipText, leaveTypePaymentType === type && styles.companyChipTextActive]}>
                      {type === 'PAID' ? 'Paid Leave' : 'Unpaid Leave'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Carryforward Type */}
              <Text style={styles.inputLabel}>Carry Forward Policy</Text>
              <View style={styles.modalChipRowInline}>
                {[
                  {value: 'NO_CARRYFORWARD', label: 'No Carry Forward'},
                  {value: 'CARRYFORWARD', label: 'Carry Forward'},
                  {value: 'CARRYFORWARD_EXPIRE', label: 'Carry Forward with Expiry'},
                ].map(item => (
                  <TouchableOpacity
                    key={item.value}
                    activeOpacity={0.7}
                    onPress={() => setLeaveTypeCarryforwardType(item.value)}
                    style={[styles.companyChip, leaveTypeCarryforwardType === item.value && styles.companyChipActive]}>
                    <Text style={[styles.companyChipText, leaveTypeCarryforwardType === item.value && styles.companyChipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {leaveTypeCarryforwardType !== 'NO_CARRYFORWARD' && (
                <>
                  <Text style={styles.inputLabel}>Max Carry Forward Days</Text>
                  <TextInput
                    value={leaveTypeCarryforwardMax}
                    onChangeText={setLeaveTypeCarryforwardMax}
                    placeholder="5"
                    placeholderTextColor={colors.subtle}
                    keyboardType="numeric"
                    style={styles.input}
                  />
                </>
              )}

              {/* Require Attachment */}
              <Text style={styles.inputLabel}>Require Supporting Attachment / Certificate?</Text>
              <View style={styles.modalChipRowInline}>
                {[
                  {value: false, label: 'No'},
                  {value: true, label: 'Yes (Attachment Required)'},
                ].map(item => (
                  <TouchableOpacity
                    key={String(item.value)}
                    activeOpacity={0.7}
                    onPress={() => setLeaveTypeRequireAttachment(item.value)}
                    style={[styles.companyChip, leaveTypeRequireAttachment === item.value && styles.companyChipActive]}>
                    <Text style={[styles.companyChipText, leaveTypeRequireAttachment === item.value && styles.companyChipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Color Tag */}
              <Text style={styles.inputLabel}>Color Tag</Text>
              <View style={styles.colorPaletteRow}>
                {COLOR_PRESETS.map(preset => {
                  const isSelected = leaveTypeColor === preset.color;
                  return (
                    <TouchableOpacity
                      key={preset.color}
                      activeOpacity={0.8}
                      onPress={() => setLeaveTypeColor(preset.color)}
                      style={[styles.colorSwatch, {backgroundColor: preset.color}, isSelected && styles.colorSwatchSelected]}>
                      {isSelected && <Icon name="checkmark" size={14} color={colors.white} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {!!leaveTypeError && <Text style={styles.modalError}>{leaveTypeError}</Text>}

              <View style={[styles.modalActions, styles.createLeaveTypeActions]}>
                <TouchableOpacity
                  disabled={leaveTypeSubmitting}
                  onPress={submitCreateLeaveType}
                  style={[styles.modalPrimaryButton, styles.createLeaveTypeSubmitBtn, leaveTypeSubmitting && styles.pressed]}>
                  {leaveTypeSubmitting ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Icon name="add-circle-outline" size={17} color={colors.white} />
                  )}
                  <Text style={styles.modalPrimaryButtonText}>Create Leave Type</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={leaveTypeSubmitting}
                  onPress={() => setCreateLeaveTypeModalOpen(false)}
                  style={[styles.modalSecondaryButton, leaveTypeSubmitting && styles.pressed]}>
                  <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  function renderCreateHolidayModal() {
    if (!createHolidayModalOpen) return null;
    const selectedCompanyObj = accessibleCompanies.find(c => String(c.id) === String(holidayCompanyId));
    const selectedCompanyNameText = selectedCompanyObj?.name || (holidayCompanyId ? `Company ${holidayCompanyId}` : 'Select a company');

    return (
      <Modal visible={createHolidayModalOpen} animationType="slide" transparent onRequestClose={() => !holidaySubmitting && setCreateHolidayModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, styles.createLeaveTypeSheet]}>
            <View style={styles.modalHandle} />
            <TouchableOpacity disabled={holidaySubmitting} onPress={() => setCreateHolidayModalOpen(false)} style={styles.modalClose}>
              <Icon name="close-outline" size={20} color={colors.textMid} />
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <View style={[styles.modalHeaderIcon, styles.modalHeaderIconSuccess]}>
                  <Icon name="calendar-outline" size={22} color={colors.success} />
                </View>
                <View style={styles.modalHeaderCopy}>
                  <Text style={styles.modalTitle}>Create Holiday</Text>
                  <Text style={styles.modalSub}>Add a public or statutory holiday for an organization</Text>
                </View>
              </View>

              {/* Organization / Company Selector */}
              <Text style={styles.inputLabel}>Organization / Company *</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                disabled={holidaySubmitting}
                onPress={() => setShowHolidayCompanyPicker(!showHolidayCompanyPicker)}
                style={styles.dropdownSelector}>
                <View style={styles.dropdownSelectorLeft}>
                  <Icon name="business-outline" size={17} color={colors.primary} />
                  <Text style={styles.dropdownSelectorText} numberOfLines={1}>{selectedCompanyNameText}</Text>
                </View>
                <Icon name={showHolidayCompanyPicker ? 'chevron-up-outline' : 'chevron-down-outline'} size={18} color={colors.muted} />
              </TouchableOpacity>

              {showHolidayCompanyPicker && (
                <View style={styles.dropdownList}>
                  {accessibleCompanies.map(company => {
                    const isSelected = String(holidayCompanyId) === String(company.id);
                    return (
                      <TouchableOpacity
                        key={String(company.id)}
                        activeOpacity={0.7}
                        onPress={() => {
                          setHolidayCompanyId(company.id);
                          setShowHolidayCompanyPicker(false);
                        }}
                        style={[styles.dropdownItem, isSelected && styles.dropdownItemSelected]}>
                        <Icon name="business-outline" size={15} color={isSelected ? colors.primary : colors.muted} />
                        <Text style={[styles.dropdownItemText, isSelected && styles.dropdownItemTextSelected]} numberOfLines={1}>
                          {company.name || `Company ${company.id}`}
                        </Text>
                        {isSelected && <Icon name="checkmark-circle" size={17} color={colors.primary} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Holiday Name */}
              <Text style={styles.inputLabel}>Holiday Name *</Text>
              <TextInput
                value={holidayName}
                onChangeText={setHolidayName}
                placeholder="e.g. New Year's Day, National Day, Christmas"
                placeholderTextColor={colors.subtle}
                style={styles.input}
              />

              {/* Dates */}
              <View style={styles.holidayDateRow}>
                <View style={styles.holidayDateCol}>
                  <AdminCalendarDateField label="Start Date *" value={holidayStartDate} onChange={setHolidayStartDate} maxDate="" />
                </View>
                <View style={styles.holidayDateCol}>
                  <AdminCalendarDateField label="End Date" value={holidayEndDate} onChange={setHolidayEndDate} maxDate="" />
                </View>
              </View>

              {/* Recurring */}
              <Text style={styles.inputLabel}>Repeats Annually?</Text>
              <View style={styles.modalChipRowInline}>
                {[
                  {value: true, label: 'Yes (Repeats Every Year)'},
                  {value: false, label: 'No (One-time Holiday)'},
                ].map(item => (
                  <TouchableOpacity
                    key={String(item.value)}
                    activeOpacity={0.7}
                    onPress={() => setHolidayRecurring(item.value)}
                    style={[styles.companyChip, holidayRecurring === item.value && styles.companyChipActive]}>
                    <Text style={[styles.companyChipText, holidayRecurring === item.value && styles.companyChipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {!!holidayError && <Text style={styles.modalError}>{holidayError}</Text>}

              <View style={[styles.modalActions, styles.createLeaveTypeActions]}>
                <TouchableOpacity
                  disabled={holidaySubmitting}
                  onPress={submitCreateHoliday}
                  style={[styles.modalPrimaryButton, styles.createLeaveTypeSubmitBtn, holidaySubmitting && styles.pressed]}>
                  {holidaySubmitting ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Icon name="add-circle-outline" size={17} color={colors.white} />
                  )}
                  <Text style={styles.modalPrimaryButtonText}>Create Holiday</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={holidaySubmitting}
                  onPress={() => setCreateHolidayModalOpen(false)}
                  style={[styles.modalSecondaryButton, holidaySubmitting && styles.pressed]}>
                  <Text style={styles.modalSecondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  if (activeModule && activePage && selectedRecord) {
    const isEmployeeDetail = canManageEmployeeDocuments && (activePage === 'Employees' || isAdminDocumentsPage || attendanceDrilldown?.key === 'totalEmployees');
    const employeeCompanyId = rawField(selectedRecord, ['companyId', 'company.id', '__companyId'])
      ?? (selectedCompanyId === 'all' ? null : selectedCompanyId);
    const employeeId = rawField(selectedRecord, ['id', 'employeeId']);
    const recordTitle = field(
      selectedRecord,
      ['name', 'fullName', 'title', 'subject', 'employeeName', 'companyName', 'roleName', 'departmentName', 'jobPositionName', 'code'],
      activePage,
    );
    return (
      <View className="flex-1 bg-background" style={styles.screen}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient colors={['#17134D', '#2B2C91', '#4F46E5']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.pageHeader}>
          <Pressable onPress={() => setSelectedRecord(null)} style={styles.backButton}>
            <Icon name="chevron-back-outline" size={22} color={colors.white} />
          </Pressable>
          <View style={styles.pageTitleWrap}>
            <Text style={styles.pageTitle} numberOfLines={1}>{recordTitle}</Text>
            <Text style={styles.pageSubtitle}>{isEmployeeDetail ? 'Employee Details' : activePage}</Text>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {isEmployeeDetail && (
            <View style={styles.employeeDetailTabs}>
              {(['details', 'documents'] as const).map(tab => (
                <TouchableOpacity
                  key={tab}
                  accessibilityRole="tab"
                  accessibilityState={{selected: employeeDetailTab === tab}}
                  onPress={() => setEmployeeDetailTab(tab)}
                  style={[styles.employeeDetailTab, employeeDetailTab === tab && styles.employeeDetailTabActive]}>
                  <Icon name={tab === 'details' ? 'person-outline' : 'document-attach-outline'} size={17} color={employeeDetailTab === tab ? colors.primary : colors.muted} />
                  <Text style={[styles.employeeDetailTabText, employeeDetailTab === tab && styles.employeeDetailTabTextActive]}>{tab === 'details' ? 'Details' : 'Documents'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          {isEmployeeDetail && employeeDetailTab === 'documents' ? (
            <>
              <View style={styles.employeeDocumentProfile}>
                <View style={styles.dataAvatar}>
                  {logoUrl(field(selectedRecord, ['photoPath', 'profilePhotoPath'], '')) ? (
                    <Image source={{uri: logoUrl(field(selectedRecord, ['photoPath', 'profilePhotoPath'], ''))!}} style={styles.dataAvatarImage} />
                  ) : <Text style={styles.dataAvatarText}>{recordTitle.slice(0, 2).toUpperCase()}</Text>}
                </View>
                <View style={styles.moduleCopy}>
                  <Text style={styles.dataTitle}>{recordTitle}</Text>
                  <Text style={styles.dataSub}>{field(selectedRecord, ['companyName', 'company.name'], selectedCompanyName)}</Text>
                </View>
              </View>
              <EmployeeDocuments key={`${employeeCompanyId}-${employeeId}`} employeeId={employeeId} companyId={employeeCompanyId} />
            </>
          ) : isDocumentRequestsPage ? <DocumentRequestDetail request={selectedRecord} companyId={selectedRecord.companyId} /> : <RecordDetail item={selectedRecord} page={isEmployeeDetail ? 'Employees' : activePage} />}
          {isApprovalPage(activePage) && isPendingRecord(selectedRecord) && (
            <ApprovalButtons
              busy={actionBusyId === selectedRecord.id}
              onApprove={() => handleApprovalAction(selectedRecord, 'approve')}
              onReject={() => handleApprovalAction(selectedRecord, 'reject')}
            />
          )}
        </ScrollView>
        {renderRejectModal()}
      </View>
    );
  }

  if (activeModule && activePage === 'Attendance Dashboard' && attendanceDrilldown) {
    const config = ATTENDANCE_DRILLDOWNS[attendanceDrilldown.key];
    const recordPage = config?.mode === 'employees' ? 'Employees' : 'Attendance Register';
    return (
      <View className="flex-1 bg-background" style={styles.screen}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient colors={['#17134D', '#2B2C91', '#4F46E5']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.pageHeader}>
          <Pressable onPress={() => setAttendanceDrilldown(null)} style={styles.backButton}>
            <Icon name="chevron-back-outline" size={22} color={colors.white} />
          </Pressable>
          <View style={styles.pageTitleWrap}>
            <Text style={styles.pageTitle} numberOfLines={1}>{config?.title || statLabel(attendanceDrilldown.key)}</Text>
            <Text style={styles.pageSubtitle} numberOfLines={2}>{selectedCompanyName}</Text>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={attendanceDrilldownLoading} onRefresh={loadAttendanceDrilldown} />}>
          <Card style={styles.drilldownSummaryCard}>
            <View style={styles.selectedCompanyBanner}>
              <Icon name="business-outline" size={15} color={colors.primary} />
              <View style={styles.selectedCompanyCopy}>
                <Text style={styles.scopeLabel}>Selected company</Text>
                <Text style={styles.selectedCompanyName} numberOfLines={1}>{selectedCompanyName}</Text>
              </View>
            </View>
            <Text style={styles.drilldownCount}>{statValueText(attendanceDrilldown.value)}</Text>
            <Text style={styles.drilldownSubtitle}>{config?.subtitle || 'Attendance details'}</Text>
          </Card>

          {attendanceDrilldownLoading && !attendanceDrilldownRecords.length ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.emptyText}>Loading {config?.title.toLowerCase() || 'attendance details'}...</Text>
            </View>
          ) : attendanceDrilldownError ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon name="alert-circle-outline" size={28} color={colors.warning} />
              </View>
              <Text style={styles.emptyTitle}>Cannot Load {config?.title || 'Details'}</Text>
              <Text style={styles.emptyText}>{attendanceDrilldownError}</Text>
            </View>
          ) : attendanceDrilldownRecords.length ? (
            attendanceDrilldownRecords.map((item, index) => {
              const key = String(item?.id || item?.uuid || index);
              return <DataRecord key={key} item={item} page={recordPage} onPress={() => setSelectedRecord(item)} />;
            })
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon name="folder-open-outline" size={28} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No {config?.title || 'Records'}</Text>
              <Text style={styles.emptyText}>No matching attendance details were found for today.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  if (activeModule && activePage === 'Loans') {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient colors={['#17134D', '#2B2C91', '#4F46E5']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.pageHeader}>
          <Pressable onPress={() => setActivePage('')} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back to Loans and Reimbursements">
            <Icon name="chevron-back-outline" size={22} color={colors.white} />
          </Pressable>
          <View style={styles.pageTitleWrap}>
            <Text style={styles.pageTitle}>Loans</Text>
            <Text style={styles.pageSubtitle}>Loans &amp; Reimbursements</Text>
          </View>
        </LinearGradient>
        <CompanyLoans companies={accessibleCompanies} selectedCompanyId={selectedCompanyId} onSelectCompany={setSelectedCompanyId} roles={roles} companiesError={companiesError} onReloadCompanies={loadAccessibleCompanies} renderDateField={(label, value, onChange) => <AdminCalendarDateField label={label} value={value} onChange={onChange} maxDate="" minHeight={46} />} />
      </View>
    );
  }

  if (activeModule && COMPANY_ROLE_PAGES.includes(activePage)) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient colors={['#17134D', '#2B2C91', '#4F46E5']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.pageHeader}>
          <Pressable onPress={() => setActivePage('')} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back to Roles">
            <Icon name="chevron-back-outline" size={22} color={colors.white} />
          </Pressable>
          <View style={styles.pageTitleWrap}>
            <Text style={styles.pageTitle}>{activePage}</Text>
            <Text style={styles.pageSubtitle}>Roles</Text>
          </View>
        </LinearGradient>
        <CompanyRoles companies={accessibleCompanies} selectedCompanyId={selectedCompanyId} onSelectCompany={setSelectedCompanyId} page={activePage} onSelectPage={setActivePage} callerRoles={roles} callerUserId={user?.userId} companiesError={companiesError} onReloadCompanies={loadAccessibleCompanies} />
      </View>
    );
  }

  if (activeModule && SUBSCRIPTION_PAGES.includes(activePage)) {
    return (
      <View style={styles.screen}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient colors={['#17134D', '#2B2C91', '#4F46E5']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.pageHeader}>
          <Pressable onPress={() => setActivePage('')} style={styles.backButton} accessibilityRole="button" accessibilityLabel="Back to Subscriptions">
            <Icon name="chevron-back-outline" size={22} color={colors.white} />
          </Pressable>
          <View style={styles.pageTitleWrap}>
            <Text style={styles.pageTitle}>Subscriptions</Text>
            <Text style={styles.pageSubtitle}>{activePage}</Text>
          </View>
        </LinearGradient>
        <CompanySubscriptions companies={accessibleCompanies} selectedCompanyId={selectedCompanyId} onSelectCompany={setSelectedCompanyId} page={activePage} onSelectPage={setActivePage} />
      </View>
    );
  }

  if (activeModule && activePage) {
    return (
      <View className="flex-1 bg-background" style={styles.screen}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient colors={['#17134D', '#2B2C91', '#4F46E5']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.pageHeader}>
          <Pressable onPress={() => setActivePage('')} style={styles.backButton}>
            <Icon name="chevron-back-outline" size={22} color={colors.white} />
          </Pressable>
          <View style={styles.pageTitleWrap}>
            <Text style={styles.pageTitle}>{pageDisplayName}</Text>
            <Text style={styles.pageSubtitle}>{activeModule.title}</Text>
          </View>
        </LinearGradient>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={loadingRecords} onRefresh={loadPage} />}>
          <Card style={styles.listHeaderCard}>
            <View style={styles.groupHead}>
              <View style={styles.groupIcon}>
                <Icon name={activeModule.icon as any} size={18} color={colors.primary} />
              </View>
              <View style={styles.groupCopy}>
                <Text style={styles.groupTitle}>{pageDisplayName}</Text>
                <Text style={styles.groupSub}>
                  {isAdminDocumentsPage ? 'Employee files' : activePage === 'Employees' && roles.includes(ROLES.PLATFORM_SUPER_ADMIN)
                    ? '/employees/global - all organizations'
                    : PAGE_ENDPOINTS[activePage] || 'API mapping pending'}
                </Text>
              </View>
            </View>
          </Card>

          {(accessibleCompanies.length > 1 || activePage === 'Departments' || activePage === 'Leave Allocations' || activePage === 'Leave Types' || isAdminDocumentsPage || isDocumentRequestsPage) && activePage !== 'Employees' && (
            <Card style={styles.filterCard}>
              <View style={styles.selectedCompanyBanner}>
                <Icon name="business-outline" size={15} color={colors.primary} />
                <View style={styles.selectedCompanyCopy}>
                  <Text style={styles.scopeLabel}>Selected company</Text>
                  <Text style={styles.selectedCompanyName} numberOfLines={1}>{selectedCompanyName}</Text>
                </View>
              </View>
              {accessibleCompanies.length > 1 && activePage !== 'Departments' && activePage !== 'Leave Allocations' && activePage !== 'Leave Types' && !isAdminDocumentsPage && !isDocumentRequestsPage && <Text style={styles.scopeHint}>Switch company below. Lists and approval actions use this selection.</Text>}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.companyFilterRow}>
                {!COMPANY_SCOPED_ADMIN_PAGES.has(activePage) && (
                  <Pressable onPress={() => setSelectedCompanyId('all')} style={[styles.companyChip, selectedCompanyId === 'all' && styles.companyChipActive]}>
                    <Text style={[styles.companyChipText, selectedCompanyId === 'all' && styles.companyChipTextActive]}>All access</Text>
                  </Pressable>
                )}
                {accessibleCompanies.map(company => {
                  const companyId = company?.id;
                  const selected = String(selectedCompanyId) === String(companyId);
                  return (
                    <Pressable key={String(companyId)} onPress={() => setSelectedCompanyId(companyId)} style={[styles.companyChip, selected && styles.companyChipActive]}>
                      <Text style={[styles.companyChipText, selected && styles.companyChipTextActive]} numberOfLines={1}>{company?.name || `Company ${companyId}`}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </Card>
          )}

          {activePage === 'Employees' && (
            <Card style={styles.filterCard}>
              <View style={styles.employeeSelectedCompany}>
                <Icon name="business-outline" size={15} color={colors.primary} />
                <Text style={styles.employeeSelectedCompanyLabel}>Selected company</Text>
                <Text style={styles.employeeSelectedCompanyName} numberOfLines={1}>{selectedCompanyName}</Text>
              </View>
              <View style={styles.searchBox}>
                <Icon name="search-outline" size={18} color={colors.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search employee, email, badge, department..."
                  placeholderTextColor={colors.subtle}
                  style={styles.searchInput}
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.companyFilterRow}>
                {companyOptions.map(company => {
                  const selected = companyFilter === company;
                  return (
                    <Pressable key={company} onPress={() => setCompanyFilter(company)} style={[styles.companyChip, selected && styles.companyChipActive]}>
                      <Text style={[styles.companyChipText, selected && styles.companyChipTextActive]}>{company}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={styles.resultText}>
                Showing {visibleRecords.length} of {records.length} employee{records.length === 1 ? '' : 's'}
              </Text>
            </Card>
          )}

          {activePage === 'Org Chart' && (
            <Card style={styles.filterCard}>
              <View style={styles.searchBox}>
                <Icon name="search-outline" size={18} color={colors.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search employee, manager, role, department..."
                  placeholderTextColor={colors.subtle}
                  style={styles.searchInput}
                />
              </View>
              <Text style={styles.resultText}>
                Showing organization chart for {selectedCompanyName}
              </Text>
            </Card>
          )}

          {isDocumentRequestsPage && (
            <View style={styles.departmentSearch}>
              <View style={styles.departmentActionRow}>
                <TouchableOpacity accessibilityRole="button" disabled={selectedCompanyId === 'all'} onPress={() => setCreateDocumentRequestCompany({id: selectedCompanyId, name: selectedCompanyName})} style={[styles.departmentCreateButton, selectedCompanyId === 'all' && styles.pressed]}>
                  <Icon name="add-outline" size={18} color={colors.white} />
                  <Text style={styles.departmentCreateButtonText}>Create Request</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.searchBox}>
                <Icon name="search-outline" size={18} color={colors.muted} />
                <TextInput value={search} onChangeText={setSearch} placeholder="Search request title or format..." placeholderTextColor={colors.subtle} style={styles.searchInput} />
              </View>
              {!loadingRecords && !recordsError && <Text style={styles.resultText}>{visibleRecords.length} request{visibleRecords.length === 1 ? '' : 's'} in {selectedCompanyName}</Text>}
            </View>
          )}

          {isAdminDocumentsPage && (
            <View style={styles.departmentSearch}>
              <View style={styles.searchBox}>
                <Icon name="search-outline" size={18} color={colors.muted} />
                <TextInput value={search} onChangeText={setSearch} placeholder="Search employee, email or department..." placeholderTextColor={colors.subtle} style={styles.searchInput} />
              </View>
              {!loadingRecords && !recordsError && <Text style={styles.resultText}>{visibleRecords.length} employee{visibleRecords.length === 1 ? '' : 's'} in {selectedCompanyName}</Text>}
            </View>
          )}

          {activePage === 'Departments' && (
            <View style={styles.departmentSearch}>
              <View style={styles.departmentActionRow}>
                <TouchableOpacity
                  accessibilityRole="button"
                  disabled={selectedCompanyId === 'all'}
                  onPress={openCreateDepartmentModal}
                  style={[styles.departmentCreateButton, selectedCompanyId === 'all' && styles.pressed]}>
                  <Icon name="add-outline" size={18} color={colors.white} />
                  <Text style={styles.departmentCreateButtonText}>Create Department</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.searchBox}>
                <Icon name="search-outline" size={18} color={colors.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search departments or managers..."
                  placeholderTextColor={colors.subtle}
                  style={styles.searchInput}
                />
              </View>
              {!loadingRecords && !recordsError && (
                <Text style={styles.resultText}>{visibleRecords.length} department{visibleRecords.length === 1 ? '' : 's'} in {selectedCompanyName}</Text>
              )}
            </View>
          )}

          {activePage === 'Leave Allocations' && (
            <View style={styles.departmentSearch}>
              {hasRole(roles, [ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER]) && (
                <View style={styles.departmentActionRow}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    disabled={selectedCompanyId === 'all' || loadingRecords || !!recordsError}
                    onPress={() => setCreateAllocationCompany({id: selectedCompanyId, name: selectedCompanyName})}
                    style={[styles.departmentCreateButton, (selectedCompanyId === 'all' || loadingRecords || !!recordsError) && styles.pressed]}>
                    <Icon name="add-outline" size={18} color={colors.white} />
                    <Text style={styles.departmentCreateButtonText}>Create Allocation</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={styles.searchBox}>
                <Icon name="search-outline" size={18} color={colors.muted} />
                <TextInput value={search} onChangeText={setSearch} placeholder="Search employee, leave type or year..." placeholderTextColor={colors.subtle} style={styles.searchInput} />
              </View>
              {!loadingRecords && !recordsError && <Text style={styles.resultText}>{visibleRecords.length} allocation{visibleRecords.length === 1 ? '' : 's'} in {selectedCompanyName}</Text>}
            </View>
          )}

          {activePage === 'Attendance Register' && (
            <Card style={styles.filterCard}>
              <View style={styles.attendanceDateFilterRow}>
                <AdminCalendarDateField label="From" value={draftAttendanceFromDate} onChange={setDraftAttendanceFromDate} />
                <AdminCalendarDateField label="To" value={draftAttendanceToDate} onChange={setDraftAttendanceToDate} />
                <View style={styles.attendanceDateActionStack}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => {
                      if (!draftAttendanceFromDate && !draftAttendanceToDate) {
                        setAttendanceFromDate('');
                        setAttendanceToDate('');
                        return;
                      }
                      const range = sortedDateRange(draftAttendanceFromDate, draftAttendanceToDate);
                      setDraftAttendanceFromDate(range.from);
                      setDraftAttendanceToDate(range.to);
                      setAttendanceFromDate(range.from);
                      setAttendanceToDate(range.to);
                    }}
                    style={[
                      styles.dateApplyButton,
                      (draftAttendanceFromDate !== attendanceFromDate || draftAttendanceToDate !== attendanceToDate) && styles.dateApplyButtonPending,
                    ]}>
                    <Text style={styles.dateApplyButtonText}>Apply</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => {
                      setDraftAttendanceFromDate('');
                      setDraftAttendanceToDate('');
                      setAttendanceFromDate('');
                      setAttendanceToDate('');
                    }}
                    style={styles.dateClearButton}>
                    <Text style={styles.dateClearButtonText}>Clear</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {(draftAttendanceFromDate !== attendanceFromDate || draftAttendanceToDate !== attendanceToDate) && (
                <Text style={styles.datePendingText}>Date changed. Tap Apply to update records.</Text>
              )}
              <View style={styles.searchBox}>
                <Icon name="search-outline" size={18} color={colors.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search employee, department, or status..."
                  placeholderTextColor={colors.subtle}
                  style={styles.searchInput}
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.companyFilterRow}>
                {[
                  ['ALL', 'All'],
                  ['CHECKED_IN', 'Checked In'],
                  ['ABSENT', 'Absent'],
                  ['LATE', 'Late'],
                  ['IRREGULAR', 'Irregular'],
                  ['NOT_OUT', 'Not Out'],
                ].map(([value, label]) => {
                  const selected = attendanceStatusFilter === value;
                  return (
                    <Pressable key={value} onPress={() => setAttendanceStatusFilter(value)} style={[styles.companyChip, selected && styles.companyChipActive]}>
                      <Text style={[styles.companyChipText, selected && styles.companyChipTextActive]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={styles.resultText}>
                Showing {visibleRecords.length} attendance record{visibleRecords.length === 1 ? '' : 's'}
                {attendanceFromDate || attendanceToDate
                  ? ` from ${sortedDateRange(attendanceFromDate, attendanceToDate).from} to ${sortedDateRange(attendanceFromDate, attendanceToDate).to}`
                  : ''}
                {selectedCompanyName ? ` in ${selectedCompanyName}` : ''}
              </Text>
            </Card>
          )}

          {activePage === 'Leave Requests' && (
            <Card style={styles.filterCard}>
              <View style={styles.searchBox}>
                <Icon name="search-outline" size={18} color={colors.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search employee, leave type, or reason..."
                  placeholderTextColor={colors.subtle}
                  style={styles.searchInput}
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.companyFilterRow}>
                {['ALL', 'REQUESTED', 'APPROVED', 'REJECTED'].map(status => {
                  const selected = leaveStatusFilter === status;
                  const label = status === 'ALL' ? 'All' : status[0] + status.slice(1).toLowerCase();
                  return (
                    <Pressable key={status} onPress={() => setLeaveStatusFilter(status)} style={[styles.companyChip, selected && styles.companyChipActive]}>
                      <Text style={[styles.companyChipText, selected && styles.companyChipTextActive]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              <Text style={styles.resultText}>Showing {visibleRecords.length} leave request{visibleRecords.length === 1 ? '' : 's'}</Text>
            </Card>
          )}

          {activePage === 'Regularisation' && (
            <Card style={styles.filterCard}>
              <View style={styles.searchBox}>
                <Icon name="search-outline" size={18} color={colors.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search employee, reason, request type..."
                  placeholderTextColor={colors.subtle}
                  style={styles.searchInput}
                />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.companyFilterRow}>
                {[
                  ['ALL', 'All'],
                  ['PENDING', 'Pending'],
                  ['APPROVED', 'Approved'],
                  ['REJECTED', 'Rejected'],
                ].map(([status, label]) => {
                  const selected = regularisationStatusFilter === status;
                  return (
                    <TouchableOpacity
                      key={status}
                      activeOpacity={0.7}
                      onPress={() => setRegularisationStatusFilter(status)}
                      style={[styles.companyChip, selected && styles.companyChipActive]}>
                      <Text style={[styles.companyChipText, selected && styles.companyChipTextActive]}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              <Text style={styles.resultText}>
                Showing {visibleRecords.length} of {records.length} regularisation request{records.length === 1 ? '' : 's'}
                {selectedCompanyName ? ` (${selectedCompanyName})` : ''}
              </Text>
            </Card>
          )}

          {activePage === 'Leave Types' && (
            <Card style={styles.filterCard}>
              <View style={styles.leaveTypeHeaderRow}>
                <View style={styles.leaveTypeHeaderCopy}>
                  <Text style={styles.leaveTypeHeaderTitle}>Leave Policies</Text>
                  <Text style={styles.leaveTypeHeaderSub} numberOfLines={1}>
                    {selectedCompanyName}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={selectedCompanyId === 'all'}
                  onPress={openCreateLeaveTypeModal}
                  style={[styles.createLeaveTypeBtn, selectedCompanyId === 'all' && styles.pressed]}>
                  <Icon name="add-circle-outline" size={17} color={colors.white} />
                  <Text style={styles.createLeaveTypeBtnText}>Create Leave Type</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.searchBox}>
                <Icon name="search-outline" size={18} color={colors.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search leave types..."
                  placeholderTextColor={colors.subtle}
                  style={styles.searchInput}
                />
              </View>
              {!loadingRecords && !recordsError && <Text style={styles.resultText}>
                Showing {visibleRecords.length} of {records.length} leave type{records.length === 1 ? '' : 's'}
                {selectedCompanyName ? ` (${selectedCompanyName})` : ''}
              </Text>}
            </Card>
          )}

          {activePage === 'Holidays' && (
            <Card style={styles.filterCard}>
              <View style={styles.leaveTypeHeaderRow}>
                <View style={styles.leaveTypeHeaderCopy}>
                  <Text style={styles.leaveTypeHeaderTitle}>Public Holidays</Text>
                  <Text style={styles.leaveTypeHeaderSub} numberOfLines={1}>
                    {selectedCompanyName}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={openCreateHolidayModal}
                  style={styles.createLeaveTypeBtn}>
                  <Icon name="add-circle-outline" size={17} color={colors.white} />
                  <Text style={styles.createLeaveTypeBtnText}>Create Holiday</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.searchBox}>
                <Icon name="search-outline" size={18} color={colors.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search holidays..."
                  placeholderTextColor={colors.subtle}
                  style={styles.searchInput}
                />
              </View>
              <Text style={styles.resultText}>
                Showing {visibleRecords.length} of {records.length} holiday{records.length === 1 ? '' : 's'}
                {selectedCompanyName ? ` (${selectedCompanyName})` : ''}
              </Text>
            </Card>
          )}

          {!!actionError && <Text style={styles.error}>{actionError}</Text>}

          {loadingRecords && !records.length ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.emptyText}>Loading {isAdminDocumentsPage ? 'employees' : activePage.toLowerCase()}...</Text>
            </View>
          ) : recordsError ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon name="alert-circle-outline" size={28} color={colors.warning} />
              </View>
              <Text style={styles.emptyTitle}>Cannot Load {activePage}</Text>
              <Text style={styles.emptyText}>{recordsError}</Text>
            </View>
          ) : activePage === 'Org Chart' ? (
            <OrgChartView records={records} query={search} selectedCompanyName={selectedCompanyName} />
          ) : visibleRecords.length ? (
            activePage === 'Attendance Register' ? (
              attendanceRecordSections.map(section => (
                <View key={section.title} style={styles.attendanceRegisterSection}>
                  <Text style={styles.attendanceRegisterSectionTitle}>{section.title}</Text>
                  {section.records.map((item, index) => {
                    const key = String(item?.id || item?.uuid || `${section.title}-${index}`);
                    return (
                      <DataRecord
                        key={key}
                        item={item}
                        page={activePage}
                        onPress={() => setSelectedRecord(item)}
                        onRegularize={() => openRegularisationModal(item)}
                      />
                    );
                  })}
                </View>
              ))
            ) : visibleRecords.map((item, index) => {
              const key = String(item?.id || item?.uuid || index);
              if (isStatsObject(item)) {
                return <StatsGrid key={key} item={item} onStatPress={statKey => openAttendanceRegisterForStat(statKey)} />;
              }
              return (
                <View key={key}>
                  <DataRecord
                    item={item}
                    page={isAdminDocumentsPage ? 'Employees' : activePage}
                    onPress={() => setSelectedRecord(item)}
                    onRegularize={activePage === 'Attendance Register' ? () => openRegularisationModal(item) : undefined}
                  />
                  {isApprovalPage(activePage) && isPendingRecord(item) && (
                    <ApprovalButtons
                      busy={actionBusyId === item.id}
                      onApprove={() => handleApprovalAction(item, 'approve')}
                      onReject={() => handleApprovalAction(item, 'reject')}
                    />
                  )}
                </View>
              );
            })
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon name="folder-open-outline" size={28} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>{isAdminDocumentsPage ? 'No Employees' : 'No Records'}</Text>
              <Text style={styles.emptyText}>{isAdminDocumentsPage ? 'No employees match this company or search.' : `No ${activePage.toLowerCase()} records are available.`}</Text>
              {activePage === 'Leave Types' && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={openCreateLeaveTypeModal}
                  style={[styles.createLeaveTypeBtn, styles.createLeaveTypeEmptyBtn]}>
                  <Icon name="add-circle-outline" size={18} color={colors.white} />
                  <Text style={[styles.createLeaveTypeBtnText, styles.createLeaveTypeEmptyBtnText]}>Create First Leave Type</Text>
                </TouchableOpacity>
              )}
              {activePage === 'Holidays' && (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={openCreateHolidayModal}
                  style={[styles.createLeaveTypeBtn, styles.createLeaveTypeEmptyBtn]}>
                  <Icon name="add-circle-outline" size={18} color={colors.white} />
                  <Text style={[styles.createLeaveTypeBtnText, styles.createLeaveTypeEmptyBtnText]}>Create First Holiday</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
        {renderRegularisationModal()}
        {renderRejectModal()}
        {renderCreateDepartmentModal()}
        {!!createDocumentRequestCompany && (
          <CreateDocumentRequestModal
            key={String(createDocumentRequestCompany.id)}
            company={createDocumentRequestCompany}
            onClose={() => setCreateDocumentRequestCompany(null)}
            onCreated={() => {setCreateDocumentRequestCompany(null); setSearch(''); void loadPage();}}
          />
        )}
        {!!createAllocationCompany && (
          <CreateLeaveAllocationModal
            key={String(createAllocationCompany.id)}
            company={createAllocationCompany}
            existing={records}
            onClose={() => setCreateAllocationCompany(null)}
            onCreated={() => {setCreateAllocationCompany(null); setSearch(''); void loadPage();}}
          />
        )}
        {renderCreateLeaveTypeModal()}
        {renderCreateHolidayModal()}
      </View>
    );
  }

  if (activeModule) {
    return (
      <View className="flex-1 bg-background" style={styles.screen}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient colors={['#17134D', '#2B2C91', '#4F46E5']} start={{x: 0, y: 0}} end={{x: 1, y: 0}} style={styles.pageHeader}>
          <Pressable onPress={() => setActiveModule(null)} style={styles.backButton}>
            <Icon name="chevron-back-outline" size={22} color={colors.white} />
          </Pressable>
          <View style={styles.pageTitleWrap}>
            <Text style={styles.pageTitle} numberOfLines={1}>{activeModule.title}</Text>
            <Text style={styles.pageSubtitle} numberOfLines={2}>{activeModule.subtitle}</Text>
          </View>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Card style={styles.detailHero}>
            <View style={styles.detailIcon}>
              <Icon name={activeModule.icon as any} size={24} color={colors.primary} />
            </View>
            <Text style={styles.detailTitle}>{activeModule.title}</Text>
            <Text style={styles.detailSub}>{activeModule.subtitle}</Text>
            <View style={styles.accessRow}>
              <Icon name="shield-checkmark-outline" size={15} color={colors.success} />
              <Text style={styles.accessText}>Access enabled for your role</Text>
            </View>
          </Card>

          <Card style={styles.groupCard}>
            <View style={styles.groupHead}>
              <View style={styles.groupIcon}>
                <Icon name="albums-outline" size={18} color={colors.primary} />
              </View>
              <View style={styles.groupCopy}>
                <Text style={styles.groupTitle}>Pages</Text>
                <Text style={styles.groupSub}>Website features available under this module</Text>
              </View>
            </View>
            {activeModule.pages.map(page => {
              const integrated = isMobileAdminPage(page);
              const label = page === 'My Documents' && canManageEmployeeDocuments ? 'Employee Documents' : page;
              return (
              <Pressable
                key={page}
                disabled={!integrated}
                onPress={() => openPage(page)}
                style={[styles.pageRow, !integrated && styles.pageRowUnavailable]}>
                <View style={styles.pageRowIcon}>
                  <Icon name={integrated ? 'document-text-outline' : 'desktop-outline'} size={17} color={integrated ? colors.primary : colors.subtle} />
                </View>
                <View style={styles.moduleCopy}>
                  <Text style={styles.moduleTitle}>{label}</Text>
                  <Text style={styles.moduleSub}>{integrated ? `Open and manage ${label.toLowerCase()}` : 'Available in the web portal'}</Text>
                </View>
                {integrated ? <Icon name="chevron-forward-outline" size={18} color={colors.subtle} /> : <Text style={styles.webOnly}>Web</Text>}
              </Pressable>
              );
            })}
          </Card>
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background" style={styles.screen}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        pointerEvents="none"
        colors={['#17134D', '#2B2C91', '#4F46E5']}
        start={{x: 0, y: 0}}
        end={{x: 1, y: 0}}
        style={[styles.headerBackdrop, {height: insets.top + 116}]}
      />
      <View style={[styles.header, {height: insets.top + 116, paddingTop: insets.top + 6}]}>
        <Text style={styles.headerEyebrow}>Role Based Access</Text>
        <Text style={styles.headerTitle}>Admin Console</Text>
        <Text style={styles.headerSub}>
          {roles.includes(ROLES.PLATFORM_SUPER_ADMIN) ? 'Full platform access enabled' : 'Modules enabled for your assigned role'}
        </Text>
        <View style={styles.roleWrap}>
          {roles.map(role => (
            <View key={role} style={styles.rolePill}>
              <Text style={styles.rolePillText}>{roleLabel(role)}</Text>
            </View>
          ))}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.summaryRow}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{accessibleCompanies.length || 1}</Text>
            <Text style={styles.summaryLabel}>Companies</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{moduleCount}</Text>
            <Text style={styles.summaryLabel}>Admin tools</Text>
          </Card>
        </View>

        <Card style={styles.quickCard}>
          <Text style={styles.quickTitle}>Quick actions</Text>
          <Text style={styles.quickSub}>Open the tasks most often needed from a phone.</Text>
          <View style={styles.quickGrid}>
            {['Employees', 'Attendance', 'Leave', 'Roles'].map(title => {
              const module = visibleGroups.flatMap(group => group.modules).find(item => item.title === title);
              return module ? (
                <Pressable key={title} onPress={() => setActiveModule(module)} style={styles.quickAction}>
                  <Icon name={module.icon as any} size={18} color={colors.primary} />
                  <Text style={styles.quickActionText}>{title}</Text>
                </Pressable>
              ) : null;
            })}
          </View>
        </Card>

        {visibleGroups.map(group => (
          <Card key={group.title} style={styles.groupCard}>
            <View style={styles.groupHead}>
              <View style={styles.groupIcon}>
                <Icon name={group.icon as any} size={18} color={colors.primary} />
              </View>
              <View style={styles.groupCopy}>
                <Text style={styles.groupTitle}>{group.title}</Text>
                <Text style={styles.groupSub}>{group.subtitle}</Text>
              </View>
            </View>
            {group.modules.map(module => (
              <AdminModuleCard key={`${group.title}-${module.title}`} module={module} onPress={() => setActiveModule(module)} />
            ))}
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: colors.background},
  headerBackdrop: {position: 'absolute', top: 0, left: 0, right: 0},
  header: {
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 14,
    justifyContent: 'flex-start',
  },
  headerEyebrow: {color: '#C7D2FE', fontSize: 11, fontWeight: '900', textTransform: 'uppercase'},
  headerTitle: {color: colors.white, fontSize: 22, lineHeight: 27, fontWeight: '800', marginTop: 4},
  headerSub: {color: '#E0E7FF', fontSize: 12, lineHeight: 17, fontWeight: '600', marginTop: 3},
  roleWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12},
  rolePill: {borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 6},
  rolePillText: {color: colors.white, fontSize: 10, fontWeight: '900'},
  content: {padding: 14, paddingBottom: 28},
  summaryRow: {flexDirection: 'row', gap: 10, marginBottom: 10},
  summaryCard: {
    flex: 1,
    minHeight: 74,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  summaryValue: {color: colors.text, fontSize: 26, fontWeight: '900'},
  quickCard: {padding: 14, marginBottom: 10, borderRadius: 12},
  quickTitle: {color: colors.text, fontSize: 16, fontWeight: '800'},
  quickSub: {color: colors.muted, fontSize: 12, marginTop: 3},
  quickGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12},
  quickAction: {width: '48%', minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 10, backgroundColor: colors.surfaceAlt},
  quickActionText: {color: colors.textMid, fontSize: 12, fontWeight: '800'},
  summaryLabel: {color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginTop: 4},
  groupCard: {
    padding: 0,
    marginBottom: 10,
    borderRadius: 10,
    borderWidth: 0,
    overflow: 'hidden',
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  groupHead: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11},
  groupIcon: {width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight},
  groupCopy: {flex: 1},
  groupTitle: {color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: '800'},
  groupSub: {color: colors.muted, fontSize: 11, lineHeight: 15, fontWeight: '600', marginTop: 1},
  pageHeader: {
    alignSelf: 'stretch',
    width: '100%',
    height: 166,
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 76,
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  pageTitleWrap: {position: 'absolute', left: 84, right: 20, top: 70},
  pageTitle: {color: colors.white, fontSize: 24, lineHeight: 29, fontWeight: '900'},
  pageSubtitle: {color: '#E0E7FF', fontSize: 15, lineHeight: 20, fontWeight: '700', marginTop: 6},
  detailHero: {padding: 16, marginBottom: 10, borderRadius: 12},
  detailIcon: {width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight},
  detailTitle: {color: colors.text, fontSize: 22, lineHeight: 28, fontWeight: '900', marginTop: 12},
  detailSub: {color: colors.muted, fontSize: 13, lineHeight: 19, fontWeight: '700', marginTop: 4},
  accessRow: {flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12},
  accessText: {color: colors.success, fontSize: 12, fontWeight: '900'},
  detailAvatarWrap: {},
  detailAvatarImage: {width: 48, height: 48, borderRadius: 16},
  detailStatusPill: {alignSelf: 'flex-start', marginTop: 10, borderRadius: 999, backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 5},
  detailStatusText: {color: colors.primary, fontSize: 11, fontWeight: '900', textTransform: 'uppercase'},
  detailRow: {paddingVertical: 11, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: colors.border},
  detailRowLabel: {color: colors.muted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase'},
  detailRowValue: {color: colors.text, fontSize: 14, fontWeight: '700', marginTop: 4},
  listHeaderCard: {padding: 0, marginBottom: 10, borderRadius: 12, overflow: 'hidden'},
  filterCard: {padding: 12, marginBottom: 10, borderRadius: 12},
  searchBox: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 11,
  },
  searchInput: {flex: 1, color: colors.text, fontSize: 13, fontWeight: '700', paddingVertical: 0},
  companyFilterRow: {gap: 8, paddingTop: 8, paddingBottom: 1},
  companyChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  companyChipActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  companyChipText: {color: colors.textMid, fontSize: 11, fontWeight: '900'},
  companyChipTextActive: {color: colors.white},
  resultText: {color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 8},
  attendanceRegisterSection: {marginBottom: 14},
  attendanceRegisterSectionTitle: {color: colors.text, fontSize: 15, lineHeight: 19, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8, marginLeft: 2},
  dateRangeHeader: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    padding: 10,
    marginBottom: 8,
  },
  attendanceDateFilterRow: {flexDirection: 'row', alignItems: 'flex-end', gap: 7, marginBottom: 7},
  attendanceDateActionStack: {width: 72, flexShrink: 0, gap: 5},
  dateRangeGrid: {flexDirection: 'row', gap: 8, marginBottom: 8},
  dateFilterField: {flex: 1, minWidth: 0},
  datePickerButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  datePickerCopy: {flex: 1, minWidth: 0},
  datePickerValue: {color: colors.text, fontSize: 12, lineHeight: 16, fontWeight: '900'},
  datePickerPlaceholder: {color: colors.subtle, fontSize: 12, lineHeight: 16, fontWeight: '700'},
  datePickerSub: {color: colors.muted, fontSize: 10, lineHeight: 13, fontWeight: '800', marginTop: 2},
  dateActionRow: {flexDirection: 'row', gap: 8, marginBottom: 8},
  dateTodayButton: {
    minHeight: 40,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateTodayButtonActive: {backgroundColor: colors.primaryLight, borderColor: colors.primaryLight},
  dateTodayButtonText: {color: colors.textMid, fontSize: 12, fontWeight: '900'},
  dateTodayButtonTextActive: {color: colors.primary},
  dateApplyButton: {
    minHeight: 31,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 9,
    backgroundColor: colors.primary,
    paddingHorizontal: 8,
  },
  dateApplyButtonPending: {
    backgroundColor: colors.primaryDark,
    shadowColor: colors.primary,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  dateApplyButtonText: {color: colors.white, fontSize: 11, fontWeight: '900'},
  dateClearButton: {
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 8,
  },
  dateClearButtonText: {color: colors.primary, fontSize: 11, fontWeight: '900'},
  datePendingText: {color: colors.warning, fontSize: 11, lineHeight: 15, fontWeight: '800', marginBottom: 8},
  dateInputCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: 8,
  },
  dateInputLabel: {color: colors.muted, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', marginBottom: 6},
  dateInputRow: {minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 5},
  dateSmallButton: {
    width: 28,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  dateInput: {flex: 1, minWidth: 0, color: colors.text, fontSize: 12, fontWeight: '900', paddingVertical: 0, textAlign: 'center'},
  dateFilterBar: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    padding: 8,
    marginBottom: 10,
  },
  dateNavButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateNavButtonDisabled: {opacity: 0.45},
  dateFilterCopy: {flex: 1, minWidth: 0},
  dateFilterValue: {color: colors.text, fontSize: 14, lineHeight: 18, fontWeight: '900', marginTop: 2},
  dateFilterSub: {color: colors.muted, fontSize: 10, lineHeight: 13, fontWeight: '800', marginTop: 1},
  todayButton: {
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayButtonActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  todayButtonText: {color: colors.textMid, fontSize: 11, fontWeight: '900'},
  todayButtonTextActive: {color: colors.white},
  employeeSelectedCompany: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 11,
    marginBottom: 10,
  },
  employeeSelectedCompanyLabel: {color: colors.primary, fontSize: 10, fontWeight: '900', textTransform: 'uppercase'},
  employeeSelectedCompanyName: {flex: 1, color: colors.text, fontSize: 12, fontWeight: '900'},
  loadingState: {alignItems: 'center', justifyContent: 'center', minHeight: 260, gap: 12},
  emptyState: {alignItems: 'center', justifyContent: 'center', minHeight: 320, paddingHorizontal: 24},
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    marginBottom: 12,
  },
  emptyTitle: {color: colors.text, fontSize: 17, fontWeight: '900', textAlign: 'center'},
  emptyText: {color: colors.muted, fontSize: 13, lineHeight: 19, fontWeight: '700', textAlign: 'center', marginTop: 5},
  dataCard: {padding: 13, marginBottom: 10, borderRadius: 12},
  statsGrid: {flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10},
  statsGridCell: {width: '48%', marginBottom: 10},
  statsGridItem: {minHeight: 66, backgroundColor: colors.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12},
  statsGridItemPressable: {backgroundColor: colors.white},
  statsGridValue: {color: colors.text, fontSize: 20, fontWeight: '900'},
  statsGridLabelRow: {marginTop: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4},
  statsGridLabel: {flex: 1, color: colors.muted, fontSize: 11, fontWeight: '800'},
  dataTop: {flexDirection: 'row', alignItems: 'center', gap: 12},
  dataAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    overflow: 'hidden',
  },
  dataAvatarImage: {width: '100%', height: '100%'},
  dataAvatarText: {color: colors.primary, fontSize: 15, fontWeight: '900'},
  dataTitle: {color: colors.text, fontSize: 15, fontWeight: '900'},
  dataSub: {color: colors.textMid, fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 3},
  companyPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 7,
  },
  companyPillText: {color: colors.primary, fontSize: 11, fontWeight: '900', flexShrink: 1},
  dataMeta: {color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 4},
  attendanceLocationRow: {marginTop: 5, flexDirection: 'row', alignItems: 'center', gap: 4},
  attendanceLocationText: {flex: 1, color: colors.muted, fontSize: 11, fontWeight: '700'},
  regularizeMiniButton: {alignSelf: 'flex-start', marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, backgroundColor: colors.warningLight, paddingHorizontal: 10, paddingVertical: 6},
  regularizeMiniButtonText: {color: colors.warning, fontSize: 11, fontWeight: '900'},
  orgResultText: {color: colors.muted, fontSize: 12, lineHeight: 17, fontWeight: '800', marginBottom: 10, paddingHorizontal: 2},
  departmentSearch: {marginBottom: 12},
  employeeDetailTabs: {flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 14},
  employeeDetailTab: {flex: 1, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderBottomWidth: 2, borderBottomColor: 'transparent'},
  employeeDetailTabActive: {borderBottomColor: colors.primary},
  employeeDetailTabText: {color: colors.muted, fontSize: 13, fontWeight: '700'},
  employeeDetailTabTextActive: {color: colors.primary},
  employeeDocumentProfile: {flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, marginBottom: 14},
  departmentActionRow: {alignItems: 'flex-end', marginBottom: 10},
  departmentCreateButton: {minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: colors.primary},
  departmentCreateButtonText: {color: colors.white, fontSize: 12, fontWeight: '800'},
  departmentModalIcon: {backgroundColor: colors.primaryLight},
  departmentSubmitButton: {backgroundColor: colors.primary},
  orgChartSummaryCard: {padding: 12, marginBottom: 10, borderRadius: 14},
  orgChartSummaryRow: {flexDirection: 'row', gap: 14, marginBottom: 10},
  orgChartSummaryItem: {flexDirection: 'row', alignItems: 'center', gap: 7},
  orgChartSummaryText: {color: colors.textMid, fontSize: 12, fontWeight: '900'},
  orgLegendTitle: {color: colors.textMid, fontSize: 11, lineHeight: 15, fontWeight: '900', marginBottom: 8},
  orgLegendGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 7},
  orgLegendChip: {
    minHeight: 30,
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  orgLegendDot: {width: 8, height: 8, borderRadius: 4, flexShrink: 0},
  orgLegendText: {flex: 1, minWidth: 0, color: colors.textMid, fontSize: 10, fontWeight: '900'},
  orgLegendCount: {color: colors.muted, fontSize: 10, fontWeight: '900'},
  orgSectionCard: {padding: 12, marginBottom: 12, borderRadius: 14},
  orgSectionHead: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 10},
  orgSectionIcon: {width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight},
  orgSectionCopy: {flex: 1, minWidth: 0},
  orgSectionTitle: {color: colors.text, fontSize: 15, lineHeight: 20, fontWeight: '900'},
  orgSectionSub: {color: colors.muted, fontSize: 11, lineHeight: 15, fontWeight: '700', marginTop: 1},
  orgChartToolbar: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  orgChartTextButton: {paddingVertical: 8},
  orgChartTextButtonLabel: {color: colors.primary, fontSize: 11, fontWeight: '900'},
  orgZoomControls: {marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 7},
  orgZoomButton: {width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center'},
  orgZoomButtonText: {color: colors.text, fontSize: 15, fontWeight: '900'},
  orgZoomValue: {color: colors.text, fontSize: 11, fontWeight: '900'},
  orgChartCanvas: {minHeight: 420, paddingVertical: 14, paddingHorizontal: 12, alignItems: 'flex-start', backgroundColor: '#F8FAFC'},
  orgChartZoomLayer: {alignItems: 'center'},
  orgCompanyChartRoot: {alignItems: 'center', alignSelf: 'center', minWidth: 220},
  orgCompanyNode: {minWidth: 190, maxWidth: 250, minHeight: 44, borderRadius: 6, backgroundColor: '#17134D', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12},
  orgCompanyNodeText: {flexShrink: 1, color: colors.white, fontSize: 12, lineHeight: 16, fontWeight: '900'},
  orgCompanySiblingLine: {position: 'absolute', top: 0, left: -220, right: -220, height: 1.5, backgroundColor: '#94A3B8'},
  orgDepartmentRow: {flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', gap: 18},
  orgDepartmentSlot: {alignItems: 'center', width: 190},
  orgDepartmentBranch: {alignItems: 'center', width: 190},
  orgDepartmentCard: {width: 176, borderRadius: 5, borderWidth: 1, backgroundColor: colors.white, overflow: 'hidden'},
  orgDepartmentHeader: {minHeight: 32, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8},
  orgDepartmentTitle: {color: colors.white, fontSize: 10, lineHeight: 13, fontWeight: '900'},
  orgDepartmentSub: {color: colors.muted, fontSize: 9, lineHeight: 12, fontWeight: '800', textAlign: 'center', paddingHorizontal: 8, paddingVertical: 7},
  orgDepartmentSiblingLine: {position: 'absolute', top: 0, left: 28, right: 28, height: 1.5, backgroundColor: '#94A3B8'},
  orgRoleRow: {alignItems: 'center', gap: 12},
  orgRoleSlot: {alignItems: 'center', width: 176},
  orgRoleBox: {width: 176, borderRadius: 5, borderWidth: 1, backgroundColor: colors.white, overflow: 'hidden'},
  orgRoleHeader: {minHeight: 30, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8},
  orgRoleTitle: {color: colors.white, fontSize: 9, lineHeight: 12, fontWeight: '900'},
  orgRoleCount: {color: colors.muted, fontSize: 8, lineHeight: 11, fontWeight: '800', textAlign: 'center', paddingVertical: 5, backgroundColor: '#F8FAFC'},
  orgEmployeeChip: {minHeight: 34, flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 8, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: '#F8FAFC'},
  orgEmployeeInitials: {width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight},
  orgEmployeeInitialsText: {color: colors.primary, fontSize: 8, fontWeight: '900'},
  orgEmployeeName: {flex: 1, minWidth: 0, color: colors.text, fontSize: 10, lineHeight: 13, fontWeight: '900'},
  orgAvatarImage: {width: '100%', height: '100%'},
  orgAvatarText: {color: colors.primary, fontSize: 13, fontWeight: '900'},
  orgChartParentLine: {width: 1.5, height: 18, backgroundColor: '#94A3B8'},
  orgChartConnectorBand: {position: 'relative', width: '100%', height: 14},
  orgChartChildLine: {width: 1.5, height: 18, backgroundColor: '#94A3B8', marginBottom: 0},
  pressed: {opacity: 0.72},
  moduleCard: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  moduleIcon: {width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight},
  moduleCopy: {flex: 1},
  moduleTitle: {color: colors.text, fontSize: 13, lineHeight: 18, fontWeight: '800'},
  moduleSub: {color: colors.muted, fontSize: 10, lineHeight: 14, fontWeight: '600', marginTop: 1},
  pageRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pageRowUnavailable: {opacity: 0.58},
  pageRowIcon: {width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight},
  webOnly: {color: colors.muted, backgroundColor: colors.surfaceAlt, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, fontSize: 10, fontWeight: '800'},
  selectedCompanyBanner: {flexDirection: 'row', alignItems: 'center', gap: 9, padding: 10, borderRadius: 10, backgroundColor: colors.primaryLight},
  selectedCompanyCopy: {flex: 1, minWidth: 0},
  scopeLabel: {color: colors.primary, fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.35},
  selectedCompanyName: {color: colors.text, fontSize: 14, fontWeight: '900', marginTop: 2},
  scopeHint: {color: colors.muted, fontSize: 11, lineHeight: 16, fontWeight: '600', marginTop: 8},
  drilldownSummaryCard: {padding: 12, marginBottom: 10, borderRadius: 12},
  drilldownCount: {color: colors.text, fontSize: 26, lineHeight: 32, fontWeight: '900', marginTop: 12},
  drilldownSubtitle: {color: colors.muted, fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 2},
  error: {
    color: colors.danger,
    backgroundColor: colors.dangerSoft,
    padding: 11,
    borderRadius: 12,
    marginBottom: 10,
    fontWeight: '700',
  },
  statusPill: {alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, marginTop: 7},
  statusPillText: {fontSize: 10, fontWeight: '900', textTransform: 'uppercase'},
  regularisationMetaBlock: {marginTop: 6, gap: 5},
  regularisationBadgesRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  regBadge: {flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.surfaceAlt, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: colors.border},
  regBadgeText: {color: colors.text, fontSize: 11, fontWeight: '700'},
  regReasonText: {color: colors.textMid, fontSize: 12, lineHeight: 16, fontWeight: '600'},
  regRemarksText: {color: colors.danger, fontSize: 11, lineHeight: 15, fontWeight: '600'},
  approvalRow: {flexDirection: 'row', gap: 9, marginTop: -5, marginBottom: 12, padding: 8, borderRadius: 13, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white},
  approvalBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  rejectBtn: {backgroundColor: colors.white, borderWidth: 1, borderColor: colors.danger},
  rejectBtnText: {color: colors.danger, fontSize: 13, fontWeight: '900'},
  approveBtn: {backgroundColor: '#16A34A'},
  approveBtnText: {color: colors.white, fontSize: 13, fontWeight: '900'},
  successCard: {padding: 13, marginBottom: 10, borderRadius: 12, backgroundColor: colors.successLight},
  successCardText: {color: colors.success, fontSize: 13, fontWeight: '800'},
  dataCardSelected: {borderWidth: 2, borderColor: colors.primary},
  chipSection: {paddingHorizontal: 14, marginTop: 4, marginBottom: 6},
  chipSectionLabel: {color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginBottom: 8},
  chipWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  roleChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  roleChipActive: {backgroundColor: colors.primary, borderColor: colors.primary},
  roleChipText: {color: colors.textMid, fontSize: 12, fontWeight: '800'},
  roleChipTextActive: {color: colors.white},
  assignButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 14,
    marginBottom: 14,
    marginTop: 6,
  },
  assignButtonDisabled: {opacity: 0.5},
  assignButtonText: {color: colors.white, fontSize: 14, fontWeight: '900'},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(17,24,39,0.5)', justifyContent: 'flex-end'},
  calendarSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 18,
  },
  calendarHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12},
  calendarNavButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  calendarTitle: {color: colors.text, fontSize: 17, fontWeight: '900'},
  calendarWeekRow: {flexDirection: 'row', marginBottom: 8},
  calendarWeekText: {width: `${100 / 7}%`, color: colors.muted, fontSize: 11, fontWeight: '900', textAlign: 'center'},
  calendarGrid: {flexDirection: 'row', flexWrap: 'wrap'},
  calendarDay: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  calendarDayDisabled: {opacity: 0.35},
  calendarDaySelected: {backgroundColor: colors.primary},
  calendarDayText: {color: colors.textMid, fontSize: 14, fontWeight: '900'},
  calendarDayTextDisabled: {color: colors.subtle},
  calendarDayTextSelected: {color: colors.white},
  calendarActions: {flexDirection: 'row', gap: 10, marginTop: 16},
  calendarPrimaryButton: {flex: 1, minHeight: 46, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center'},
  calendarPrimaryButtonText: {color: colors.white, fontSize: 13, fontWeight: '900'},
  calendarSecondaryButton: {flex: 1, minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center'},
  calendarSecondaryButtonText: {color: colors.textMid, fontSize: 13, fontWeight: '900'},
  modalSheet: {
    maxHeight: '86%',
    backgroundColor: colors.background,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingTop: 10,
    paddingBottom: 18,
  },
  modalHandle: {alignSelf: 'center', width: 44, height: 5, borderRadius: 999, backgroundColor: colors.border, marginBottom: 8},
  modalClose: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  modalHeader: {flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 8, paddingRight: 58, paddingBottom: 12},
  modalHeaderIcon: {width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warningLight},
  modalHeaderCopy: {flex: 1, minWidth: 0},
  modalTitle: {color: colors.text, fontSize: 18, lineHeight: 23, fontWeight: '900'},
  modalSub: {color: colors.muted, fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 2},
  modalInfoCard: {marginHorizontal: 16, marginBottom: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, padding: 12},
  modalInfoTitle: {color: colors.text, fontSize: 16, lineHeight: 21, fontWeight: '900'},
  modalInfoText: {color: colors.muted, fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 4},
  modalChipRow: {gap: 8, paddingHorizontal: 16, paddingBottom: 12},
  modalHelp: {color: colors.muted, fontSize: 12, lineHeight: 18, fontWeight: '700', marginHorizontal: 16, marginBottom: 12},
  inputLabel: {color: colors.textMid, fontSize: 12, fontWeight: '900', marginHorizontal: 16, marginBottom: 7},
  input: {
    minHeight: 46,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    paddingHorizontal: 12,
  },
  reasonInput: {minHeight: 94, paddingTop: 12, textAlignVertical: 'top'},
  modalError: {color: colors.danger, backgroundColor: colors.dangerSoft, marginHorizontal: 16, marginBottom: 12, borderRadius: 11, padding: 10, fontSize: 12, fontWeight: '800'},
  modalActions: {gap: 10, paddingHorizontal: 16, paddingBottom: 4},
  modalPrimaryButton: {
    minHeight: 46,
    borderRadius: 12,
    backgroundColor: colors.warning,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  modalPrimaryButtonText: {color: colors.white, fontSize: 13, fontWeight: '900'},
  modalSecondaryButton: {minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center'},
  modalSecondaryButtonText: {color: colors.textMid, fontSize: 13, fontWeight: '900'},
  leaveTypeHeaderRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 10},
  leaveTypeHeaderCopy: {flex: 1, minWidth: 0},
  leaveTypeHeaderTitle: {color: colors.text, fontSize: 16, fontWeight: '900'},
  leaveTypeHeaderSub: {color: colors.muted, fontSize: 11, fontWeight: '700', marginTop: 1},
  createLeaveTypeBtn: {flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9},
  createLeaveTypeBtnText: {color: colors.white, fontSize: 12, fontWeight: '900'},
  dropdownSelector: {
    minHeight: 46,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownSelectorLeft: {flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, minWidth: 0},
  dropdownSelectorText: {color: colors.text, fontSize: 13, fontWeight: '800', flex: 1},
  dropdownList: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dropdownItemSelected: {backgroundColor: colors.primaryLight},
  dropdownItemText: {color: colors.textMid, fontSize: 13, fontWeight: '700', flex: 1},
  dropdownItemTextSelected: {color: colors.primary, fontWeight: '900'},
  modalChipRowInline: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginHorizontal: 16, marginBottom: 12},
  colorPaletteRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginHorizontal: 16, marginBottom: 14},
  colorSwatch: {width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center'},
  colorSwatchSelected: {borderWidth: 3, borderColor: colors.text},
  createLeaveTypeSheet: {maxHeight: '90%'},
  createLeaveTypeActions: {marginTop: 12},
  createLeaveTypeSubmitBtn: {backgroundColor: colors.primary},
  createLeaveTypeEmptyBtn: {marginTop: 14, paddingHorizontal: 16, paddingVertical: 11},
  createLeaveTypeEmptyBtnText: {fontSize: 13},
  modalHeaderIconSuccess: {backgroundColor: colors.successLight},
  holidayDateRow: {flexDirection: 'row', gap: 10, marginHorizontal: 16, marginBottom: 12},
  holidayDateCol: {flex: 1},
});
