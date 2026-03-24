import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import organizationsReducer from '../features/organizations/organizationsSlice'
import companiesReducer from '../features/companies/companiesSlice'
import departmentsReducer from '../features/departments/departmentsSlice'
import attendanceReducer from '../features/attendance/attendanceSlice'
import leaveReducer from '../features/leave/leaveSlice'
import assetsReducer from '../features/assets/assetsSlice'
import projectsReducer from '../features/projects/projectsSlice'
import payrollReducer from '../features/payroll/payrollSlice'
import recruitmentReducer from '../features/recruitment/recruitmentSlice'
import onboardingReducer from '../features/onboarding/onboardingSlice'
import offboardingReducer from '../features/offboarding/offboardingSlice'
import performanceReducer from '../features/performance/performanceSlice'
import helpdeskReducer from '../features/helpdesk/helpdeskSlice'
import policiesReducer from '../features/policies/policiesSlice'
import notificationsReducer from '../features/notifications/notificationsSlice'
import reportsReducer from '../features/reports/reportsSlice'
import rolesReducer from '../features/roles/rolesSlice'
import employeesReducer from '../features/employees/employeesSlice'
import employeeExtrasReducer from '../features/employees/employeeExtrasSlice'
import shiftRequestsReducer from '../features/attendance/shiftRequestSlice'
import workTypeRequestsReducer from '../features/attendance/workTypeRequestSlice'
import documentsReducer from '../features/documents/documentsSlice'
import auditReducer from '../features/audit/auditSlice'
import announcementsReducer from '../features/announcements/announcementsSlice'
import baseExtrasReducer from '../features/base/baseExtrasSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    organizations: organizationsReducer,
    companies: companiesReducer,
    departments: departmentsReducer,
    attendance: attendanceReducer,
    leave: leaveReducer,
    assets: assetsReducer,
    projects: projectsReducer,
    payroll: payrollReducer,
    recruitment: recruitmentReducer,
    onboarding: onboardingReducer,
    offboarding: offboardingReducer,
    performance: performanceReducer,
    helpdesk: helpdeskReducer,
    policies: policiesReducer,
    notifications: notificationsReducer,
    reports: reportsReducer,
    roles: rolesReducer,
    employees: employeesReducer,
    employeeExtras: employeeExtrasReducer,
    shiftRequests: shiftRequestsReducer,
    workTypeRequests: workTypeRequestsReducer,
    documents: documentsReducer,
    audit: auditReducer,
    announcements: announcementsReducer,
    baseExtras: baseExtrasReducer,
  },
  devTools: true
})
