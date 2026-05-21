import { lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/common/ProtectedRoute'

const LoginPage               = lazy(() => import('./features/auth/LoginPage'))
const ForgotPasswordPage      = lazy(() => import('./features/auth/ForgotPasswordPage'))
const ForbiddenPage           = lazy(() => import('./features/auth/ForbiddenPage'))
const SuspendedPage           = lazy(() => import('./features/auth/SuspendedPage'))
const AccountSettingsPage     = lazy(() => import('./features/auth/AccountSettingsPage'))
const GeneralSettingsPage     = lazy(() => import('./features/settings/GeneralSettingsPage'))
const UserGroupsPage          = lazy(() => import('./features/roles/UserGroupsPage'))
const ShiftAllocationsPage    = lazy(() => import('./features/attendance/ShiftAllocationsPage'))
const RotatingShiftAssignsPage = lazy(() => import('./features/attendance/RotatingShiftAssignsPage'))
const DashboardPage           = lazy(() => import('./features/dashboard/DashboardPage'))
const OrganizationsPage       = lazy(() => import('./features/organizations/OrganizationsPage'))
const SubscriptionPage        = lazy(() => import('./features/organizations/SubscriptionPage'))
const CompaniesPage           = lazy(() => import('./features/companies/CompaniesPage'))
const DepartmentsPage         = lazy(() => import('./features/departments/DepartmentsPage'))
const JobPositionsPage        = lazy(() => import('./features/base/JobPositionsPage'))
const JobRolesPage            = lazy(() => import('./features/base/JobRolesPage'))
const WorkTypesPage           = lazy(() => import('./features/base/WorkTypesPage'))
const ShiftSchedulesPage      = lazy(() => import('./features/base/ShiftSchedulesPage'))
const AttendancePage          = lazy(() => import('./features/attendance/AttendancePage'))
const LeavePage               = lazy(() => import('./features/leave/LeavePage'))
const ContractsPage           = lazy(() => import('./features/payroll/ContractsPage'))
const PayslipsPage            = lazy(() => import('./features/payroll/PayslipsPage'))
const PayrollPage             = lazy(() => import('./features/payroll/PayrollPage'))
const AutomatedPayrollPage    = lazy(() => import('./features/payroll/AutomatedPayrollPage'))
const AssetsPage              = lazy(() => import('./features/assets/AssetsPage'))
const AssetDetailPage         = lazy(() => import('./features/assets/AssetDetailPage'))
const ProjectsPage            = lazy(() => import('./features/projects/ProjectsPage'))
const ProjectDetailPage       = lazy(() => import('./features/projects/ProjectDetailPage'))
const RecruitmentPostsPage    = lazy(() => import('./features/recruitment/RecruitmentPostsPage'))
const ApplicantsPage          = lazy(() => import('./features/recruitment/ApplicantsPage'))
const OnboardingPage          = lazy(() => import('./features/onboarding/OnboardingPage'))
const OffboardingPage         = lazy(() => import('./features/offboarding/OffboardingPage'))
const OffboardingPlansPage    = lazy(() => import('./features/offboarding/OffboardingPlansPage'))
const OffboardingSettingsPage = lazy(() => import('./features/offboarding/OffboardingSettingsPage'))
const PerformanceCyclesPage   = lazy(() => import('./features/performance/PerformanceCyclesPage'))
const ObjectivesPage          = lazy(() => import('./features/performance/ObjectivesPage'))
const FeedbackPage            = lazy(() => import('./features/performance/FeedbackPage'))
const HelpdeskPage            = lazy(() => import('./features/helpdesk/HelpdeskPage'))
const TicketDetailPage        = lazy(() => import('./features/helpdesk/TicketDetailPage'))
const PoliciesPage            = lazy(() => import('./features/policies/PoliciesPage'))
const ReportsPage             = lazy(() => import('./features/reports/ReportsPage'))
const RolesPage               = lazy(() => import('./features/roles/RolesPage'))
const NotificationsPage       = lazy(() => import('./features/notifications/NotificationsPage'))
const EmployeesPage           = lazy(() => import('./features/employees/EmployeesPage'))
const WorkInfoPage            = lazy(() => import('./features/employees/WorkInfoPage'))
const BankDetailsPage         = lazy(() => import('./features/employees/BankDetailsPage'))
const DisciplinaryPage        = lazy(() => import('./features/employees/DisciplinaryPage'))
const BonusPointsPage         = lazy(() => import('./features/employees/BonusPointsPage'))
const LeaveBalancePage        = lazy(() => import('./features/leave/LeaveBalancePage'))
const LeaveAllocationPage     = lazy(() => import('./features/leave/LeaveAllocationPage'))
const LeaveRestrictionsPage   = lazy(() => import('./features/leave/LeaveRestrictionsPage'))
const TaxSettingsPage         = lazy(() => import('./features/payroll/TaxSettingsPage'))
const LoansPage               = lazy(() => import('./features/payroll/LoansPage'))
const ReimbursementsPage      = lazy(() => import('./features/payroll/ReimbursementsPage'))
const AllowancesPage          = lazy(() => import('./features/payroll/AllowancesPage'))
const DeductionsPage          = lazy(() => import('./features/payroll/DeductionsPage'))
const AttendanceSettingsPage  = lazy(() => import('./features/attendance/AttendanceSettingsPage'))
const ShiftRequestsPage       = lazy(() => import('./features/attendance/ShiftRequestsPage'))
const WorkTypeRequestsPage    = lazy(() => import('./features/attendance/WorkTypeRequestsPage'))
const RotatingSchedulesPage   = lazy(() => import('./features/attendance/RotatingSchedulesPage'))
const InterviewsPage          = lazy(() => import('./features/recruitment/InterviewsPage'))
const SkillZonePage           = lazy(() => import('./features/recruitment/SkillZonePage'))
const RejectReasonsPage       = lazy(() => import('./features/recruitment/RejectReasonsPage'))
const AnonymousFeedbackPage   = lazy(() => import('./features/performance/AnonymousFeedbackPage'))
const QuestionTemplatesPage   = lazy(() => import('./features/performance/QuestionTemplatesPage'))
const BonusSettingsPage       = lazy(() => import('./features/performance/BonusSettingsPage'))
const MeetingsPage            = lazy(() => import('./features/performance/MeetingsPage'))
const FAQPage                 = lazy(() => import('./features/helpdesk/FAQPage'))
const ClaimsPage              = lazy(() => import('./features/helpdesk/ClaimsPage'))
const DepartmentManagersPage  = lazy(() => import('./features/helpdesk/DepartmentManagersPage'))
const ResignationsPage        = lazy(() => import('./features/offboarding/ResignationsPage'))
const ExitReasonsPage         = lazy(() => import('./features/offboarding/ExitReasonsPage'))
const DocumentRequestsPage    = lazy(() => import('./features/documents/DocumentRequestsPage'))
const MyDocumentsPage         = lazy(() => import('./features/documents/MyDocumentsPage'))
const AuditLogPage            = lazy(() => import('./features/audit/AuditLogPage'))
const AnnouncementsPage       = lazy(() => import('./features/announcements/AnnouncementsPage'))
const ApprovalConditionsPage  = lazy(() => import('./features/companies/ApprovalConditionsPage'))
const TimeSheetsPage          = lazy(() => import('./features/projects/TimeSheetsPage'))
const WorkRecordsPage         = lazy(() => import('./features/attendance/WorkRecordsPage'))
const AttendanceCalendarPage  = lazy(() => import('./features/attendance/AttendanceCalendarPage'))
const AttendanceRegisterPage  = lazy(() => import('./features/attendance/AttendanceRegisterPage'))
const PayrollSettingsPage     = lazy(() => import('./features/payroll/PayrollSettingsPage'))
const EmployeeSettingsPage    = lazy(() => import('./features/employees/EmployeeSettingsPage'))
const EmployeeNotesPage       = lazy(() => import('./features/employees/EmployeeNotesPage'))
const MyProfilePage           = lazy(() => import('./features/employees/MyProfilePage'))
const AdminProfilePage        = lazy(() => import('./features/employees/AdminProfilePage'))
const EmployeeDetailPage      = lazy(() => import('./features/employees/EmployeeDetailPage'))
const SkillsPage              = lazy(() => import('./features/recruitment/SkillsPage'))
const SurveysPage             = lazy(() => import('./features/recruitment/SurveysPage'))
const CandidateDocumentsPage  = lazy(() => import('./features/recruitment/CandidateDocumentsPage'))
const EmailTemplatesPage      = lazy(() => import('./features/companies/EmailTemplatesPage'))
const EmailLogsPage           = lazy(() => import('./features/companies/EmailLogsPage'))
const CompanySettingsPage     = lazy(() => import('./features/companies/CompanySettingsPage'))
const BiometricDevicesPage    = lazy(() => import('./features/biometric/BiometricDevicesPage'))
const BiometricEmployeesPage  = lazy(() => import('./features/biometric/BiometricEmployeesPage'))
const GeoFencingPage          = lazy(() => import('./features/geofencing/GeoFencingPage'))
const FaceDetectionPage       = lazy(() => import('./features/facedetection/FaceDetectionPage'))
const LdapSettingsPage        = lazy(() => import('./features/ldap/LdapSettingsPage'))
const BackupPage              = lazy(() => import('./features/backup/BackupPage'))
const OutlookAuthPage         = lazy(() => import('./features/outlookauth/OutlookAuthPage'))
const AccessibilityPage       = lazy(() => import('./features/accessibility/AccessibilityPage'))
const DynamicFieldsPage       = lazy(() => import('./features/dynamicfields/DynamicFieldsPage'))
const HolidaysPage            = lazy(() => import('./features/leave/HolidaysPage'))
const HolidayAllocationPage   = lazy(() => import('./features/leave/HolidayAllocationPage'))
const CompanyLeavesPage       = lazy(() => import('./features/leave/CompanyLeavesPage'))
const LeaveDashboardPage      = lazy(() => import('./features/leave/LeaveDashboardPage'))
const LeaveTypesPage          = lazy(() => import('./features/leave/LeaveTypesPage'))
const AssetCategoriesPage     = lazy(() => import('./features/assets/AssetCategoriesPage'))
const AssetRequestsPage       = lazy(() => import('./features/assets/AssetRequestsPage'))
const PayrollBatchGroupsPage  = lazy(() => import('./features/payroll/PayrollBatchGroupsPage'))
const PayrollDashboardPage    = lazy(() => import('./features/payroll/PayrollDashboardPage'))
const GratuityPage            = lazy(() => import('./features/payroll/GratuityPage'))
const PayslipImportPage       = lazy(() => import('./features/payroll/PayslipImportPage'))
const ManualPayrollPage       = lazy(() => import('./features/payroll/ManualPayrollPage'))
const AttendanceDashboardPage = lazy(() => import('./features/attendance/AttendanceDashboardPage'))
const RecruitmentPipelinePage = lazy(() => import('./features/recruitment/RecruitmentPipelinePage'))
const RecruitmentDashboardPage = lazy(() => import('./features/recruitment/RecruitmentDashboardPage'))
const LinkedInSettingsPage    = lazy(() => import('./features/recruitment/LinkedInSettingsPage'))
const OrgChartPage            = lazy(() => import('./features/employees/OrgChartPage'))
const ESSPage                 = lazy(() => import('./features/ess/ESSPage'))
const MailAutomationPage      = lazy(() => import('./features/mail-automation/MailAutomationPage'))
const PlatformMonitorPage     = lazy(() => import('./features/platform/PlatformMonitorPage'))

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/suspended" element={<SuspendedPage />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="forbidden" element={<ForbiddenPage />} />

          {/* Platform Super Admin only */}
          <Route path="organizations" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN']} element={<OrganizationsPage />} />} />
          <Route path="organizations/:id/subscription" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN']} element={<SubscriptionPage />} />} />
          <Route path="platform/monitor" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN']} element={<PlatformMonitorPage />} />} />

          {/* Mail Automation — admin + HR */}
          <Route path="settings/mail-automation" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<MailAutomationPage />} />} />

          {/* Enterprise Admin only — company hierarchy management */}
          <Route path="companies" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN']} element={<CompaniesPage />} />} />

          {/* Admin-level — roles & access */}
          <Route path="roles" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN']} element={<RolesPage />} />} />

          {/* Employees — admin and HR */}
          <Route path="employees/me" element={<MyProfilePage />} />
          <Route path="admin/profile" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'DEPARTMENT_MANAGER', 'TEAM_LEAD']} element={<AdminProfilePage />} />} />
          <Route path="employees" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<EmployeesPage />} />} />
          <Route path="employees/:id" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<EmployeeDetailPage />} />} />
          <Route path="org-chart" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<OrgChartPage />} />} />
          <Route path="employees/:id/work-info" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<WorkInfoPage />} />} />
          <Route path="employees/:id/bank-details" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<BankDetailsPage />} />} />
          <Route path="disciplinary-actions" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<DisciplinaryPage />} />} />
          <Route path="bonus-points" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<BonusPointsPage />} />} />
          <Route path="employee-notes" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<EmployeeNotesPage />} />} />
          <Route path="employee-settings" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<EmployeeSettingsPage />} />} />

          {/* HR + Admin routes */}
          <Route path="departments"      element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<DepartmentsPage />} />} />
          <Route path="job-positions"    element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<JobPositionsPage />} />} />
          <Route path="job-roles"        element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<JobRolesPage />} />} />
          <Route path="work-types"       element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<WorkTypesPage />} />} />
          <Route path="shift-schedules"  element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<ShiftSchedulesPage />} />} />
          <Route path="recruitment/posts"         element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<RecruitmentPostsPage />} />} />
          <Route path="recruitment/applicants"    element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<ApplicantsPage />} />} />
          <Route path="recruitment/interviews"    element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<InterviewsPage />} />} />
          <Route path="recruitment/skill-zones"   element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<SkillZonePage />} />} />
          <Route path="recruitment/reject-reasons" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<RejectReasonsPage />} />} />
          <Route path="recruitment/skills"          element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<SkillsPage />} />} />
          <Route path="recruitment/surveys"         element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<SurveysPage />} />} />
          <Route path="recruitment/candidate-docs"  element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<CandidateDocumentsPage />} />} />
          <Route path="recruitment/pipeline"        element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<RecruitmentPipelinePage />} />} />
          <Route path="recruitment/dashboard"       element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<RecruitmentDashboardPage />} />} />
          <Route path="settings/linkedin"           element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN']} element={<LinkedInSettingsPage />} />} />
          <Route path="onboarding"             element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<OnboardingPage />} />} />
          <Route path="offboarding"            element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<OffboardingPage />} />} />
          <Route path="offboarding/plans"     element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<OffboardingPlansPage />} />} />
          <Route path="offboarding/settings"  element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<OffboardingSettingsPage />} />} />
          <Route path="offboarding/resignations" element={<ResignationsPage />} />
          <Route path="offboarding/exit-reasons" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<ExitReasonsPage />} />} />
          <Route path="policies"               element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<PoliciesPage />} />} />

          {/* Finance routes */}
          <Route path="payroll/payroll"        element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT']} element={<PayrollPage />} />} />
          <Route path="payroll/manual"         element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT']} element={<ManualPayrollPage />} />} />
          <Route path="payroll/automated"      element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<AutomatedPayrollPage />} />} />
          <Route path="payroll/contracts"      element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT']} element={<ContractsPage />} />} />
          <Route path="payroll/tax-settings"   element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<TaxSettingsPage />} />} />
          <Route path="payroll/loans"          element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'EMPLOYEE']} element={<LoansPage />} />} />
          <Route path="payroll/reimbursements" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'EMPLOYEE']} element={<ReimbursementsPage />} />} />
          <Route path="payroll/settings"      element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<PayrollSettingsPage />} />} />
          <Route path="payroll/allowances" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'ACCOUNTANT']} element={<AllowancesPage />} />} />
          <Route path="payroll/deductions" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'ACCOUNTANT']} element={<DeductionsPage />} />} />
          <Route path="payroll/batch-groups"   element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT']} element={<PayrollBatchGroupsPage />} />} />
          <Route path="payroll/dashboard"      element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT']} element={<PayrollDashboardPage />} />} />
          <Route path="payroll/gratuity"       element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'ACCOUNTANT']} element={<GratuityPage />} />} />

          {/* Reports — admin and managers */}
          <Route path="reports" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'ACCOUNTANT']} element={<ReportsPage />} />} />

          {/* ESS — available to all authenticated employees */}
          <Route path="ess" element={<ESSPage />} />

          {/* Accessible to all authenticated users */}
          <Route path="attendance/dashboard"        element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'DEPARTMENT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE']} element={<AttendanceDashboardPage />} />} />
          <Route path="attendance"                  element={<AttendancePage />} />
          <Route path="attendance/calendar"         element={<AttendanceCalendarPage />} />
          <Route path="attendance/register"         element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<AttendanceRegisterPage />} />} />
          <Route path="attendance/settings"         element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<AttendanceSettingsPage />} />} />
          <Route path="attendance/work-records"     element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<WorkRecordsPage />} />} />
          <Route path="shift-requests"              element={<ShiftRequestsPage />} />
          <Route path="work-type-requests"          element={<WorkTypeRequestsPage />} />
          <Route path="rotating-schedules"          element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<RotatingSchedulesPage />} />} />
          <Route path="leave"                    element={<LeavePage />} />
          <Route path="leave/balance"            element={<LeaveBalancePage />} />
          <Route path="leave/allocations"        element={<LeaveAllocationPage />} />
          <Route path="leave/restrictions"       element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<LeaveRestrictionsPage />} />} />
          <Route path="leave/holidays"           element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<HolidaysPage />} />} />
          <Route path="leave/holiday-allocations" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<HolidayAllocationPage />} />} />
          <Route path="leave/company-leaves"     element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<CompanyLeavesPage />} />} />
          <Route path="leave/dashboard"          element={<LeaveDashboardPage />} />
          <Route path="leave/types"             element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<LeaveTypesPage />} />} />
          <Route path="payroll/payslips"         element={<PayslipsPage />} />
          <Route path="payroll/import"           element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<PayslipImportPage />} />} />
          <Route path="assets"                   element={<AssetsPage />} />
          <Route path="assets/:id"               element={<AssetDetailPage />} />
          <Route path="assets/categories"        element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<AssetCategoriesPage />} />} />
          <Route path="assets/requests"          element={<AssetRequestsPage />} />
          <Route path="projects"                 element={<ProjectsPage />} />
          <Route path="projects/:id"             element={<ProjectDetailPage />} />
          <Route path="projects/timesheets"      element={<TimeSheetsPage />} />
          <Route path="performance/cycles"             element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'DEPARTMENT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE']} element={<PerformanceCyclesPage />} />} />
          <Route path="performance/objectives"        element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'DEPARTMENT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE']} element={<ObjectivesPage />} />} />
          <Route path="performance/feedback"          element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'DEPARTMENT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE']} element={<FeedbackPage />} />} />
          <Route path="performance/anonymous-feedback" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'DEPARTMENT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE']} element={<AnonymousFeedbackPage />} />} />
          <Route path="performance/question-templates" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'DEPARTMENT_MANAGER']} element={<QuestionTemplatesPage />} />} />
          <Route path="performance/bonus-settings"    element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'DEPARTMENT_MANAGER']} element={<BonusSettingsPage />} />} />
          <Route path="performance/meetings"          element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'DEPARTMENT_MANAGER', 'TEAM_LEAD', 'EMPLOYEE']} element={<MeetingsPage />} />} />
          <Route path="helpdesk"                 element={<HelpdeskPage />} />
          <Route path="helpdesk/:id"             element={<TicketDetailPage />} />
          <Route path="helpdesk/faq"             element={<FAQPage />} />
          <Route path="helpdesk/claims"          element={<ClaimsPage />} />
          <Route path="helpdesk/department-managers" element={<DepartmentManagersPage />} />
          <Route path="documents/requests"       element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<DocumentRequestsPage />} />} />
          <Route path="documents/my"             element={<MyDocumentsPage />} />
          <Route path="audit/logs"               element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN']} element={<AuditLogPage />} />} />
          <Route path="announcements"            element={<AnnouncementsPage />} />
          <Route path="settings/approval-conditions" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<ApprovalConditionsPage />} />} />
          <Route path="notifications"            element={<NotificationsPage />} />
          <Route path="companies/email-templates" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN']} element={<EmailTemplatesPage />} />} />
          <Route path="companies/email-logs"      element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN']} element={<EmailLogsPage />} />} />
          <Route path="companies/settings"        element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN']} element={<CompanySettingsPage />} />} />

          {/* Biometric */}
          <Route path="biometric/devices"   element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<BiometricDevicesPage />} />} />
          <Route path="biometric/employees" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<BiometricEmployeesPage />} />} />

          {/* Attendance hardware & integrations */}
          <Route path="geofencing"     element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<GeoFencingPage />} />} />
          <Route path="face-detection" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<FaceDetectionPage />} />} />

          {/* Settings & integrations */}
          <Route path="settings/ldap"           element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN']} element={<LdapSettingsPage />} />} />
          <Route path="settings/backup"         element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN']} element={<BackupPage />} />} />
          <Route path="settings/outlook-auth"   element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN']} element={<OutlookAuthPage />} />} />
          <Route path="settings/accessibility"  element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN']} element={<AccessibilityPage />} />} />
          <Route path="settings/dynamic-fields" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<DynamicFieldsPage />} />} />

          {/* New super admin features */}
          <Route path="settings/account" element={<AccountSettingsPage />} />
          <Route path="settings/general" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN']} element={<GeneralSettingsPage />} />} />
          <Route path="roles/user-groups" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN']} element={<UserGroupsPage />} />} />
          <Route path="attendance/shift-allocations" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<ShiftAllocationsPage />} />} />
          <Route path="attendance/rotating-shifts" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<RotatingShiftAssignsPage />} />} />
          <Route path="attendance/rotating-work-types" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<RotatingShiftAssignsPage />} />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
