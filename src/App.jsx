import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import AppLayout from './components/layout/AppLayout'
import ProtectedRoute from './components/common/ProtectedRoute'
import LoginPage from './features/auth/LoginPage'
import ForgotPasswordPage from './features/auth/ForgotPasswordPage'
import ForbiddenPage from './features/auth/ForbiddenPage'
import DashboardPage from './features/dashboard/DashboardPage'
import OrganizationsPage from './features/organizations/OrganizationsPage'
import SubscriptionPage from './features/organizations/SubscriptionPage'
import CompaniesPage from './features/companies/CompaniesPage'
import DepartmentsPage from './features/departments/DepartmentsPage'
import AttendancePage from './features/attendance/AttendancePage'
import LeavePage from './features/leave/LeavePage'
import ContractsPage from './features/payroll/ContractsPage'
import PayslipsPage from './features/payroll/PayslipsPage'
import AssetsPage from './features/assets/AssetsPage'
import AssetDetailPage from './features/assets/AssetDetailPage'
import ProjectsPage from './features/projects/ProjectsPage'
import ProjectDetailPage from './features/projects/ProjectDetailPage'
import RecruitmentPostsPage from './features/recruitment/RecruitmentPostsPage'
import ApplicantsPage from './features/recruitment/ApplicantsPage'
import OnboardingPage from './features/onboarding/OnboardingPage'
import OffboardingPage from './features/offboarding/OffboardingPage'
import OffboardingPlansPage from './features/offboarding/OffboardingPlansPage'
import OffboardingSettingsPage from './features/offboarding/OffboardingSettingsPage'
import PerformanceCyclesPage from './features/performance/PerformanceCyclesPage'
import ObjectivesPage from './features/performance/ObjectivesPage'
import FeedbackPage from './features/performance/FeedbackPage'
import HelpdeskPage from './features/helpdesk/HelpdeskPage'
import TicketDetailPage from './features/helpdesk/TicketDetailPage'
import PoliciesPage from './features/policies/PoliciesPage'
import ReportsPage from './features/reports/ReportsPage'
import RolesPage from './features/roles/RolesPage'
import NotificationsPage from './features/notifications/NotificationsPage'
import EmployeesPage from './features/employees/EmployeesPage'
import WorkInfoPage from './features/employees/WorkInfoPage'
import BankDetailsPage from './features/employees/BankDetailsPage'
import DisciplinaryPage from './features/employees/DisciplinaryPage'
import BonusPointsPage from './features/employees/BonusPointsPage'
import LeaveBalancePage from './features/leave/LeaveBalancePage'
import LeaveAllocationPage from './features/leave/LeaveAllocationPage'
import LeaveRestrictionsPage from './features/leave/LeaveRestrictionsPage'
import TaxSettingsPage from './features/payroll/TaxSettingsPage'
import LoansPage from './features/payroll/LoansPage'
import ReimbursementsPage from './features/payroll/ReimbursementsPage'
import AllowancesPage from './features/payroll/AllowancesPage'
import DeductionsPage from './features/payroll/DeductionsPage'
import AttendanceSettingsPage from './features/attendance/AttendanceSettingsPage'
import ShiftRequestsPage from './features/attendance/ShiftRequestsPage'
import WorkTypeRequestsPage from './features/attendance/WorkTypeRequestsPage'
import RotatingSchedulesPage from './features/attendance/RotatingSchedulesPage'
import InterviewsPage from './features/recruitment/InterviewsPage'
import SkillZonePage from './features/recruitment/SkillZonePage'
import RejectReasonsPage from './features/recruitment/RejectReasonsPage'
import AnonymousFeedbackPage from './features/performance/AnonymousFeedbackPage'
import QuestionTemplatesPage from './features/performance/QuestionTemplatesPage'
import BonusSettingsPage from './features/performance/BonusSettingsPage'
import MeetingsPage from './features/performance/MeetingsPage'
import FAQPage from './features/helpdesk/FAQPage'
import ClaimsPage from './features/helpdesk/ClaimsPage'
import DepartmentManagersPage from './features/helpdesk/DepartmentManagersPage'
import ResignationsPage from './features/offboarding/ResignationsPage'
import ExitReasonsPage from './features/offboarding/ExitReasonsPage'
import DocumentRequestsPage from './features/documents/DocumentRequestsPage'
import MyDocumentsPage from './features/documents/MyDocumentsPage'
import AuditLogPage from './features/audit/AuditLogPage'
import AnnouncementsPage from './features/announcements/AnnouncementsPage'
import ApprovalConditionsPage from './features/companies/ApprovalConditionsPage'
import TimeSheetsPage from './features/projects/TimeSheetsPage'
import WorkRecordsPage from './features/attendance/WorkRecordsPage'
import AttendanceCalendarPage from './features/attendance/AttendanceCalendarPage'
import PayrollSettingsPage from './features/payroll/PayrollSettingsPage'
import EmployeeSettingsPage from './features/employees/EmployeeSettingsPage'
import EmployeeNotesPage from './features/employees/EmployeeNotesPage'
import MyProfilePage from './features/employees/MyProfilePage'
import AdminProfilePage from './features/employees/AdminProfilePage'
import SkillsPage from './features/recruitment/SkillsPage'
import SurveysPage from './features/recruitment/SurveysPage'
import CandidateDocumentsPage from './features/recruitment/CandidateDocumentsPage'
import EmailTemplatesPage from './features/companies/EmailTemplatesPage'
import EmailLogsPage from './features/companies/EmailLogsPage'
import CompanySettingsPage from './features/companies/CompanySettingsPage'
import BiometricDevicesPage from './features/biometric/BiometricDevicesPage'
import BiometricEmployeesPage from './features/biometric/BiometricEmployeesPage'
import GeoFencingPage from './features/geofencing/GeoFencingPage'
import FaceDetectionPage from './features/facedetection/FaceDetectionPage'
import LdapSettingsPage from './features/ldap/LdapSettingsPage'
import BackupPage from './features/backup/BackupPage'
import OutlookAuthPage from './features/outlookauth/OutlookAuthPage'
import AccessibilityPage from './features/accessibility/AccessibilityPage'
import DynamicFieldsPage from './features/dynamicfields/DynamicFieldsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="forbidden" element={<ForbiddenPage />} />

          {/* Platform Super Admin only */}
          <Route path="organizations" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN']} element={<OrganizationsPage />} />} />
          <Route path="organizations/:id/subscription" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN']} element={<SubscriptionPage />} />} />

          {/* Enterprise Admin only — company hierarchy management */}
          <Route path="companies" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN']} element={<CompaniesPage />} />} />

          {/* Admin-level — roles & access */}
          <Route path="roles" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN']} element={<RolesPage />} />} />

          {/* Employees — admin and HR */}
          <Route path="employees/me" element={<MyProfilePage />} />
          <Route path="admin/profile" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'DEPARTMENT_MANAGER', 'TEAM_LEAD']} element={<AdminProfilePage />} />} />
          <Route path="employees" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<EmployeesPage />} />} />
          <Route path="employees/:id/work-info" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<WorkInfoPage />} />} />
          <Route path="employees/:id/bank-details" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<BankDetailsPage />} />} />
          <Route path="disciplinary-actions" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<DisciplinaryPage />} />} />
          <Route path="bonus-points" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<BonusPointsPage />} />} />
          <Route path="employee-notes" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<EmployeeNotesPage />} />} />
          <Route path="employee-settings" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<EmployeeSettingsPage />} />} />

          {/* HR + Admin routes */}
          <Route path="departments"            element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<DepartmentsPage />} />} />
          <Route path="recruitment/posts"         element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<RecruitmentPostsPage />} />} />
          <Route path="recruitment/applicants"    element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<ApplicantsPage />} />} />
          <Route path="recruitment/interviews"    element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<InterviewsPage />} />} />
          <Route path="recruitment/skill-zones"   element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<SkillZonePage />} />} />
          <Route path="recruitment/reject-reasons" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<RejectReasonsPage />} />} />
          <Route path="recruitment/skills"          element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<SkillsPage />} />} />
          <Route path="recruitment/surveys"         element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<SurveysPage />} />} />
          <Route path="recruitment/candidate-docs"  element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<CandidateDocumentsPage />} />} />
          <Route path="onboarding"             element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<OnboardingPage />} />} />
          <Route path="offboarding"            element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<OffboardingPage />} />} />
          <Route path="offboarding/plans"     element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<OffboardingPlansPage />} />} />
          <Route path="offboarding/settings"  element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<OffboardingSettingsPage />} />} />
          <Route path="offboarding/resignations" element={<ResignationsPage />} />
          <Route path="offboarding/exit-reasons" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<ExitReasonsPage />} />} />
          <Route path="policies"               element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<PoliciesPage />} />} />

          {/* Finance routes */}
          <Route path="payroll/contracts"      element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'ACCOUNTANT']} element={<ContractsPage />} />} />
          <Route path="payroll/tax-settings"   element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<TaxSettingsPage />} />} />
          <Route path="payroll/loans"          element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'EMPLOYEE']} element={<LoansPage />} />} />
          <Route path="payroll/reimbursements" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'ACCOUNTANT', 'EMPLOYEE']} element={<ReimbursementsPage />} />} />
          <Route path="payroll/settings"      element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<PayrollSettingsPage />} />} />
          <Route path="payroll/allowances" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'ACCOUNTANT']} element={<AllowancesPage />} />} />
          <Route path="payroll/deductions" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'ACCOUNTANT']} element={<DeductionsPage />} />} />

          {/* Reports — admin and managers */}
          <Route path="reports" element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER', 'ACCOUNTANT']} element={<ReportsPage />} />} />

          {/* Accessible to all authenticated users */}
          <Route path="attendance"                  element={<AttendancePage />} />
          <Route path="attendance/calendar"         element={<AttendanceCalendarPage />} />
          <Route path="attendance/settings"         element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<AttendanceSettingsPage />} />} />
          <Route path="attendance/work-records"     element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<WorkRecordsPage />} />} />
          <Route path="shift-requests"              element={<ShiftRequestsPage />} />
          <Route path="work-type-requests"          element={<WorkTypeRequestsPage />} />
          <Route path="rotating-schedules"          element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<RotatingSchedulesPage />} />} />
          <Route path="leave"                    element={<LeavePage />} />
          <Route path="leave/balance"            element={<LeaveBalancePage />} />
          <Route path="leave/allocations"        element={<LeaveAllocationPage />} />
          <Route path="leave/restrictions"       element={<ProtectedRoute roles={['PLATFORM_SUPER_ADMIN', 'ENTERPRISE_ADMIN', 'BRANCH_ADMIN', 'HR_MANAGER']} element={<LeaveRestrictionsPage />} />} />
          <Route path="payroll/payslips"         element={<PayslipsPage />} />
          <Route path="assets"                   element={<AssetsPage />} />
          <Route path="assets/:id"               element={<AssetDetailPage />} />
          <Route path="projects"                 element={<ProjectsPage />} />
          <Route path="projects/:id"             element={<ProjectDetailPage />} />
          <Route path="projects/timesheets"      element={<TimeSheetsPage />} />
          <Route path="performance/cycles"            element={<PerformanceCyclesPage />} />
          <Route path="performance/objectives"        element={<ObjectivesPage />} />
          <Route path="performance/feedback"          element={<FeedbackPage />} />
          <Route path="performance/anonymous-feedback" element={<AnonymousFeedbackPage />} />
          <Route path="performance/question-templates" element={<QuestionTemplatesPage />} />
          <Route path="performance/bonus-settings"     element={<BonusSettingsPage />} />
          <Route path="performance/meetings"          element={<MeetingsPage />} />
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
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
