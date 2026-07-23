import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import twoFactorReducer from '../features/auth/twoFactorSlice'
import userGroupsReducer from '../features/roles/userGroupsSlice'
import userPermissionsReducer from '../features/roles/userPermissionsSlice'
import generalSettingsReducer from '../features/settings/generalSettingsSlice'
import shiftAllocationsReducer from '../features/attendance/shiftAllocationsSlice'
import rotatingAssignsReducer from '../features/attendance/rotatingAssignsSlice'
import platformReducer from '../features/platform/platformSlice'
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
import regularisationReducer from '../features/attendance/regularisationSlice'
import loanRequestReducer from '../features/payroll/loanRequestSlice'
import documentsReducer from '../features/documents/documentsSlice'
import auditReducer from '../features/audit/auditSlice'
import announcementsReducer from '../features/announcements/announcementsSlice'
import baseExtrasReducer from '../features/base/baseExtrasSlice'
import biometricReducer from '../features/biometric/biometricSlice'
import geofencingReducer from '../features/geofencing/geofencingSlice'
import faceDetectionReducer from '../features/facedetection/faceDetectionSlice'
import ldapReducer from '../features/ldap/ldapSlice'
import backupReducer from '../features/backup/backupSlice'
import outlookAuthReducer from '../features/outlookauth/outlookAuthSlice'
import accessibilityReducer from '../features/accessibility/accessibilitySlice'
import viewsReducer from '../features/views/viewsSlice'
import dynamicFieldsReducer from '../features/dynamicfields/dynamicFieldsSlice'
import essReducer from '../features/ess/essSlice'
import mailAutomationReducer from '../features/mail-automation/mailAutomationSlice'
import chatbotReducer from '../features/chatbot/chatbotSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    twoFactor: twoFactorReducer,
    userGroups: userGroupsReducer,
    userPermissions: userPermissionsReducer,
    generalSettings: generalSettingsReducer,
    shiftAllocations: shiftAllocationsReducer,
    rotatingAssigns: rotatingAssignsReducer,
    platform: platformReducer,
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
    regularisation: regularisationReducer,
    loanRequests: loanRequestReducer,
    documents: documentsReducer,
    audit: auditReducer,
    announcements: announcementsReducer,
    baseExtras: baseExtrasReducer,
    biometric: biometricReducer,
    geofencing: geofencingReducer,
    faceDetection: faceDetectionReducer,
    ldap: ldapReducer,
    backup: backupReducer,
    outlookAuth: outlookAuthReducer,
    accessibility: accessibilityReducer,
    views: viewsReducer,
    dynamicFields: dynamicFieldsReducer,
    ess: essReducer,
    mailAutomation: mailAutomationReducer,
    chatbot: chatbotReducer,
  },
  devTools: import.meta.env.DEV
})
