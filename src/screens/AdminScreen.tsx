import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Card from '../components/Card';
import Icon from '../components/Icon';
import {API_BASE_URL, api} from '../api/client';
import {useAuth} from '../context/AuthContext';
import {colors} from '../theme/colors';
import {hasRole, roleLabel, ROLES, userRoles} from '../utils/roles';
import {dateText} from '../utils/format';

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
      {title: 'Employees', subtitle: 'Employee list and employee profile', icon: 'id-card-outline', roles: [ROLES.PLATFORM_SUPER_ADMIN, ROLES.ENTERPRISE_ADMIN, ROLES.BRANCH_ADMIN, ROLES.HR_MANAGER], pages: ['Employees', 'Employee Detail', 'Work Info', 'Bank Details', 'Employee Settings']},
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

function asArray(value: any) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.content)) return value.content;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return value && typeof value === 'object' ? [value] : [];
}

function field(item: any, names: string[], fallback = '-') {
  for (const name of names) {
    const value = item?.[name];
    if (value !== undefined && value !== null && value !== '') {
      return String(value);
    }
  }
  return fallback;
}

function logoUrl(path?: string) {
  if (!path) return null;
  if (String(path).startsWith('http')) return String(path);
  return `${API_BASE_URL}/files/${String(path).replace(/^\//, '')}`;
}

function AdminModuleCard({module, onPress}: {module: AdminModule; onPress: () => void}) {
  return (
    <Pressable onPress={onPress} style={({pressed}) => [styles.moduleCard, pressed && styles.pressed]}>
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

function smartDate(value: string) {
  return value && ISO_DATE_RE.test(value) ? dateText(value) : value;
}

function StatsGrid({item}: {item: any}) {
  const entries = Object.entries(item).filter(([, value]) => typeof value !== 'object' || value === null);
  return (
    <Card style={styles.dataCard}>
      <View style={styles.statsGrid}>
        {entries.map(([key, value]) => (
          <View key={key} style={styles.statsGridItem}>
            <Text style={styles.statsGridValue} numberOfLines={1}>{statValueText(value)}</Text>
            <Text style={styles.statsGridLabel} numberOfLines={1}>{statLabel(key)}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

function DataRecord({item, page, onPress}: {item: any; page: string; onPress: () => void}) {
  const isEmployee = page === 'Employees';
  const title = field(item, ['name', 'fullName', 'title', 'subject', 'employeeName', 'companyName', 'roleName', 'departmentName', 'jobPositionName', 'code'], page);
  const subtitle = isEmployee
    ? field(item, ['email', 'workEmail', 'phone'], '')
    : smartDate(field(item, ['email', 'description', 'subtitle', 'status', 'type', 'companyType', 'phone', 'date'], ''));
  const meta = isEmployee
    ? [field(item, ['companyName', 'organizationName'], ''), field(item, ['departmentName'], ''), field(item, ['jobPositionName'], '')].filter(Boolean).join(' | ')
    : field(item, ['address', 'city', 'departmentName', 'employeeType', 'priority'], '');
  const logo = logoUrl(field(item, ['logoPath', 'photoPath'], ''));

  return (
    <Pressable onPress={onPress} style={({pressed}) => [pressed && styles.pressed]}>
      <Card style={styles.dataCard}>
        <View style={styles.dataTop}>
          <View style={styles.dataAvatar}>
            {logo ? (
              <Image source={{uri: logo}} style={styles.dataAvatarImage} />
            ) : (
              <Text style={styles.dataAvatarText}>{title.slice(0, 2).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.moduleCopy}>
            <Text style={styles.dataTitle} numberOfLines={1}>{title}</Text>
            {!!subtitle && <Text style={styles.dataSub} numberOfLines={2}>{subtitle}</Text>}
            {isEmployee && field(item, ['companyName', 'organizationName'], '') ? (
              <View style={styles.companyPill}>
                <Icon name="business-outline" size={12} color={colors.primary} />
                <Text style={styles.companyPillText} numberOfLines={1}>{field(item, ['companyName', 'organizationName'], '')}</Text>
              </View>
            ) : null}
            {!!meta && <Text style={styles.dataMeta} numberOfLines={1}>{meta}</Text>}
          </View>
          <Icon name="chevron-forward-outline" size={18} color={colors.subtle} />
        </View>
      </Card>
    </Pressable>
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

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const {user, profile} = useAuth();
  const [activeModule, setActiveModule] = useState<AdminModule | null>(null);
  const [activePage, setActivePage] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordsError, setRecordsError] = useState('');
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('All');
  const roles = useMemo(() => userRoles(user, profile), [user, profile]);
  const visibleGroups = useMemo(
    () =>
      ADMIN_GROUPS.map(group => ({
        ...group,
        modules: group.modules.filter(module => hasRole(roles, module.roles)),
      })).filter(group => group.modules.length),
    [roles],
  );
  const moduleCount = visibleGroups.reduce((total, group) => total + group.modules.length, 0);

  const loadPage = useCallback(async () => {
    if (!activePage) return;
    const endpoint = activePage === 'Employees' && roles.includes(ROLES.PLATFORM_SUPER_ADMIN) ? '/employees/global' : PAGE_ENDPOINTS[activePage];
    setRecordsError('');
    setRecords([]);
    if (!endpoint) {
      setRecordsError('This mobile page is ready, but its API route is not mapped yet.');
      return;
    }
    setLoadingRecords(true);
    try {
      const result = await api.adminList(endpoint, {
        page: 0,
        size: activePage === 'Employees' ? 500 : 50,
        sort: 'id,desc',
        // A handful of dashboard-style endpoints (e.g. attendance/payroll dashboards) require a
        // companyId; harmless to send everywhere else since Spring ignores unknown params.
        companyId: user?.companyId,
      });
      setRecords(asArray(result));
    } catch (err: any) {
      setRecordsError(err?.message || 'Unable to load records.');
    } finally {
      setLoadingRecords(false);
    }
  }, [activePage, roles]);

  useEffect(() => {
    setSearch('');
    setCompanyFilter('All');
    setSelectedRecord(null);
  }, [activePage]);

  useEffect(() => {
    loadPage();
  }, [loadPage]);

  const companyOptions = useMemo(() => {
    const names = records
      .map(item => field(item, ['companyName', 'organizationName'], ''))
      .filter(Boolean);
    return ['All', ...Array.from(new Set(names)).sort()];
  }, [records]);

  const visibleRecords = useMemo(() => {
    const query = search.trim().toLowerCase();
    return records.filter(item => {
      const companyName = field(item, ['companyName', 'organizationName'], '');
      if (activePage === 'Employees' && companyFilter !== 'All' && companyName !== companyFilter) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        field(item, ['fullName', 'name', 'employeeName'], ''),
        field(item, ['email', 'workEmail'], ''),
        field(item, ['badgeId', 'employeeCode', 'code'], ''),
        companyName,
        field(item, ['departmentName'], ''),
        field(item, ['jobPositionName'], ''),
        field(item, ['phone', 'workPhone'], ''),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [activePage, companyFilter, records, search]);

  if (activeModule && activePage && selectedRecord) {
    const recordTitle = field(
      selectedRecord,
      ['name', 'fullName', 'title', 'subject', 'employeeName', 'companyName', 'roleName', 'departmentName', 'jobPositionName', 'code'],
      activePage,
    );
    return (
      <View style={styles.screen}>
        <View style={[styles.pageHeader, {paddingTop: insets.top + 10}]}>
          <Pressable onPress={() => setSelectedRecord(null)} style={styles.backButton}>
            <Icon name="chevron-back-outline" size={22} color={colors.primary} />
          </Pressable>
          <View style={styles.pageTitleWrap}>
            <Text style={styles.pageTitle} numberOfLines={1}>{recordTitle}</Text>
            <Text style={styles.pageSubtitle}>{activePage}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <RecordDetail item={selectedRecord} page={activePage} />
        </ScrollView>
      </View>
    );
  }

  if (activeModule && activePage) {
    return (
      <View style={styles.screen}>
        <View style={[styles.pageHeader, {paddingTop: insets.top + 10}]}>
          <Pressable onPress={() => setActivePage('')} style={styles.backButton}>
            <Icon name="chevron-back-outline" size={22} color={colors.primary} />
          </Pressable>
          <View style={styles.pageTitleWrap}>
            <Text style={styles.pageTitle}>{activePage}</Text>
            <Text style={styles.pageSubtitle}>{activeModule.title}</Text>
          </View>
        </View>

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
                <Text style={styles.groupTitle}>{activePage}</Text>
                <Text style={styles.groupSub}>
                  {activePage === 'Employees' && roles.includes(ROLES.PLATFORM_SUPER_ADMIN)
                    ? '/employees/global - all organizations'
                    : PAGE_ENDPOINTS[activePage] || 'API mapping pending'}
                </Text>
              </View>
            </View>
          </Card>

          {activePage === 'Employees' && (
            <Card style={styles.filterCard}>
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

          {loadingRecords && !records.length ? (
            <View style={styles.loadingState}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.emptyText}>Loading {activePage.toLowerCase()}...</Text>
            </View>
          ) : recordsError ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon name="alert-circle-outline" size={28} color={colors.warning} />
              </View>
              <Text style={styles.emptyTitle}>Cannot Load {activePage}</Text>
              <Text style={styles.emptyText}>{recordsError}</Text>
            </View>
          ) : visibleRecords.length ? (
            visibleRecords.map((item, index) =>
              isStatsObject(item) ? (
                <StatsGrid key={String(item?.id || item?.uuid || index)} item={item} />
              ) : (
                <DataRecord
                  key={String(item?.id || item?.uuid || index)}
                  item={item}
                  page={activePage}
                  onPress={() => setSelectedRecord(item)}
                />
              ),
            )
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Icon name="folder-open-outline" size={28} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No Records</Text>
              <Text style={styles.emptyText}>No {activePage.toLowerCase()} records are available.</Text>
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  if (activeModule) {
    return (
      <View style={styles.screen}>
        <View style={[styles.pageHeader, {paddingTop: insets.top + 10}]}>
          <Pressable onPress={() => setActiveModule(null)} style={styles.backButton}>
            <Icon name="chevron-back-outline" size={22} color={colors.primary} />
          </Pressable>
          <View style={styles.pageTitleWrap}>
            <Text style={styles.pageTitle}>{activeModule.title}</Text>
            <Text style={styles.pageSubtitle}>{activeModule.subtitle}</Text>
          </View>
        </View>

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
            {activeModule.pages.map(page => (
              <Pressable key={page} onPress={() => setActivePage(page)} style={({pressed}) => [styles.pageRow, pressed && styles.pressed]}>
                <View style={styles.pageRowIcon}>
                  <Icon name="document-text-outline" size={17} color={colors.primary} />
                </View>
                <View style={styles.moduleCopy}>
                  <Text style={styles.moduleTitle}>{page}</Text>
                  <Text style={styles.moduleSub}>Open and manage {page.toLowerCase()}</Text>
                </View>
                <Icon name="chevron-forward-outline" size={18} color={colors.subtle} />
              </Pressable>
            ))}
          </Card>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.header, {paddingTop: insets.top + 12}]}>
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
            <Text style={styles.summaryValue}>{visibleGroups.length}</Text>
            <Text style={styles.summaryLabel}>Sections</Text>
          </Card>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryValue}>{moduleCount}</Text>
            <Text style={styles.summaryLabel}>Modules</Text>
          </Card>
        </View>

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
  header: {
    backgroundColor: colors.sidebar,
    paddingHorizontal: 16,
    paddingBottom: 18,
  },
  headerEyebrow: {color: '#C7D2FE', fontSize: 11, fontWeight: '900', textTransform: 'uppercase'},
  headerTitle: {color: colors.white, fontSize: 24, lineHeight: 30, fontWeight: '900', marginTop: 5},
  headerSub: {color: '#E0E7FF', fontSize: 13, lineHeight: 18, fontWeight: '700', marginTop: 4},
  roleWrap: {flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 12},
  rolePill: {borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 6},
  rolePillText: {color: colors.white, fontSize: 10, fontWeight: '900'},
  content: {padding: 14, paddingBottom: 28},
  summaryRow: {flexDirection: 'row', gap: 10, marginBottom: 10},
  summaryCard: {flex: 1, minHeight: 82, justifyContent: 'center', alignItems: 'center'},
  summaryValue: {color: colors.text, fontSize: 26, fontWeight: '900'},
  summaryLabel: {color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase', marginTop: 4},
  groupCard: {padding: 0, marginBottom: 10, borderRadius: 12, overflow: 'hidden'},
  groupHead: {flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, paddingBottom: 10},
  groupIcon: {width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight},
  groupCopy: {flex: 1},
  groupTitle: {color: colors.text, fontSize: 16, fontWeight: '900'},
  groupSub: {color: colors.muted, fontSize: 12, lineHeight: 17, fontWeight: '700', marginTop: 2},
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
  },
  pageTitleWrap: {flex: 1},
  pageTitle: {color: colors.text, fontSize: 22, lineHeight: 27, fontWeight: '900'},
  pageSubtitle: {color: colors.muted, fontSize: 13, lineHeight: 18, fontWeight: '700', marginTop: 2},
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
    minHeight: 44,
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
  companyFilterRow: {gap: 8, paddingTop: 10, paddingBottom: 2},
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
  statsGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  statsGridItem: {width: '47%', backgroundColor: colors.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: colors.border, padding: 12},
  statsGridValue: {color: colors.text, fontSize: 20, fontWeight: '900'},
  statsGridLabel: {color: colors.muted, fontSize: 11, fontWeight: '800', marginTop: 4},
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
  pressed: {opacity: 0.72},
  moduleCard: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  moduleIcon: {width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight},
  moduleCopy: {flex: 1},
  moduleTitle: {color: colors.text, fontSize: 14, fontWeight: '900'},
  moduleSub: {color: colors.muted, fontSize: 11, lineHeight: 16, fontWeight: '700', marginTop: 2},
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
  pageRowIcon: {width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight},
});
