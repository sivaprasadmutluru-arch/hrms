import {Platform} from 'react-native';
import {API_BASE_URL_OVERRIDE} from './config';

const envUrl = API_BASE_URL_OVERRIDE || ((globalThis as any).HRMS_API_BASE_URL as string | undefined);

function defaultBaseUrl() {
  if (Platform.OS === 'android') {
    return 'http://10.0.2.2:8080/api';
  }
  return 'http://localhost:8080/api';
}

export const API_BASE_URL = envUrl || defaultBaseUrl();
export const API_MEDIA_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '');

let token: string | null = null;
let companyId: number | string | null = null;

export function setApiSession(session: {token?: string | null; companyId?: number | string | null}) {
  token = session.token || null;
  companyId = session.companyId || null;
}

export function apiAuthHeaders(extra?: Record<string, string>) {
  return {
    ...(token ? {Authorization: `Bearer ${token}`} : {}),
    ...(companyId ? {'X-Company-Id': String(companyId)} : {}),
    ...(extra || {}),
  };
}

/**
 * Native downloads cannot use the JavaScript fetch client. Keep this small
 * accessor here so protected file endpoints get the same tenant and bearer
 * context as normal API calls.
 */
export function getAuthenticatedDownloadHeaders(extra?: Record<string, string>) {
  return apiAuthHeaders(extra);
}

function queryString(params?: Record<string, any>) {
  const search = new URLSearchParams();
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const isForm = options.body instanceof FormData;
  const headers = {
    Accept: 'application/json',
    ...(isForm ? {} : {'Content-Type': 'application/json'}),
    ...apiAuthHeaders(),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {...options, headers});
  const raw = await response.text();
  let data: any = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!response.ok) {
    throw new Error(data?.message || data?.error || data || `Request failed (${response.status})`);
  }

  return data as T;
}

export type LoginResponse = {
  token: string;
  userId: number;
  username: string;
  email: string;
  roles?: string[];
  companyId?: number;
  companyName?: string;
  employeeId?: number | null;
};

function companyEmployeePage(selectedCompanyId: number | string, page: number, size: number) {
  return request<any>(`/employees${queryString({filterByCompanyId: selectedCompanyId, page, size, sort: 'id,asc'})}`, {
    headers: {'X-Company-Id': String(selectedCompanyId), 'X-Filter-Company-Id': String(selectedCompanyId)},
  });
}

export const api = {
  login: (usernameOrEmail: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({usernameOrEmail, password}),
    }),
  forgotPassword: (email: string) =>
    request<{message: string}>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({email}),
    }),
  me: async () => {
    const profile = await request<any>('/ess/me');
    // Older servers may not expose approval capabilities during a rolling release.
    const access = await request<any>('/ess/approval-access').catch(() => ({}));
    return {...profile, ...access};
  },
  myCompanyInfo: () => request<any>('/companies/mine'),
  adminList: (path: string, params?: Record<string, any>, filterCompanyId?: number | string | null) =>
    request<any>(`${path}${queryString(params)}`, {
      headers: filterCompanyId ? {'X-Filter-Company-Id': String(filterCompanyId)} : {},
    }),
  accessibleCompanies: () => request<any[]>('/companies/accessible'),
  teamAttendance: (selectedCompanyId: number | string, from: string, to: string) =>
    request<any[]>(`/team/attendance${queryString({from, to})}`, {
      headers: {'X-Company-Id': String(selectedCompanyId), 'X-Filter-Company-Id': String(selectedCompanyId)},
    }),
  teamRegularisations: (selectedCompanyId: number | string) => request<any[]>('/team/regularisation', {
    headers: {'X-Company-Id': String(selectedCompanyId), 'X-Filter-Company-Id': String(selectedCompanyId)},
  }),
  decideTeamRegularisation: (id: number | string, action: 'approve' | 'reject', selectedCompanyId: number | string, remarks?: string) =>
    request<any>(`/team/regularisation/${id}/${action}`, {
      method: 'POST', body: JSON.stringify({remarks}),
      headers: {'X-Company-Id': String(selectedCompanyId), 'X-Filter-Company-Id': String(selectedCompanyId)},
    }),
  subscriptionOrganizations: () => request<any>('/organizations'),
  organizationPlanLimits: (organizationId: number | string, selectedCompanyId: number | string) =>
    request<any>(`/organizations/${encodeURIComponent(String(organizationId))}/plan-limits`, {
      headers: {'X-Company-Id': String(selectedCompanyId), 'X-Filter-Company-Id': String(selectedCompanyId)},
    }),
  companyLoans: (selectedCompanyId: number | string) => request<any>('/payroll/loans', {
    headers: {'X-Company-Id': String(selectedCompanyId), 'X-Filter-Company-Id': String(selectedCompanyId)},
  }),
  createCompanyLoan: (data: Record<string, any>, selectedCompanyId: number | string) => request<any>('/payroll/loans', {
    method: 'POST', body: JSON.stringify(data),
    headers: {'X-Company-Id': String(selectedCompanyId), 'X-Filter-Company-Id': String(selectedCompanyId)},
  }),
  companyEmployees: companyEmployeePage,
  employeeDocuments: (employeeId: number | string, selectedCompanyId: number | string) =>
    request<any>(`/documents/employee/${encodeURIComponent(String(employeeId))}`, {
      headers: {'X-Company-Id': String(selectedCompanyId), 'X-Filter-Company-Id': String(selectedCompanyId)},
    }),
  adminDocumentRequests: (selectedCompanyId: number | string) =>
    request<any>('/documents/requests', {
      headers: {'X-Company-Id': String(selectedCompanyId), 'X-Filter-Company-Id': String(selectedCompanyId)},
    }),
  createDocumentRequest: (data: Record<string, any>, selectedCompanyId: number | string) =>
    request<any>('/documents/requests', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {'X-Company-Id': String(selectedCompanyId), 'X-Filter-Company-Id': String(selectedCompanyId)},
    }),
  documentRequestSubmissions: (requestId: number | string, selectedCompanyId: number | string) =>
    request<any>(`/documents/requests/${encodeURIComponent(String(requestId))}/submissions`, {
      headers: {'X-Company-Id': String(selectedCompanyId), 'X-Filter-Company-Id': String(selectedCompanyId)},
    }),
  departments: (departmentCompanyId: number | string) =>
    request<any>('/departments', {
      headers: {'X-Company-Id': String(departmentCompanyId), 'X-Filter-Company-Id': String(departmentCompanyId)},
    }),
  createDepartment: (data: {name: string}, departmentCompanyId: number | string) =>
    request<any>(`/departments${queryString({companyId: departmentCompanyId})}`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {'X-Company-Id': String(departmentCompanyId), 'X-Filter-Company-Id': String(departmentCompanyId)},
    }),
  leaveAllocations: (allocationCompanyId: number | string) =>
    request<any>('/leave/allocations', {
      headers: {'X-Company-Id': String(allocationCompanyId), 'X-Filter-Company-Id': String(allocationCompanyId)},
    }),
  adminLeaveTypes: (selectedCompanyId: number | string) =>
    request<any>('/leave/types', {
      headers: {'X-Company-Id': String(selectedCompanyId), 'X-Filter-Company-Id': String(selectedCompanyId)},
    }),
  allocationEmployees: companyEmployeePage,
  createLeaveAllocation: (data: {employeeId: number; leaveTypeId: number; days: number; year: number; companyId: number}) =>
    request<any>('/leave/allocate', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {'X-Company-Id': String(data.companyId), 'X-Filter-Company-Id': String(data.companyId)},
    }),
  orgChart: (chartCompanyId: number | string) =>
    request<any>(`/employees/org-chart${queryString({companyId: chartCompanyId})}`, {
      headers: {'X-Company-Id': String(chartCompanyId), 'X-Filter-Company-Id': String(chartCompanyId)},
    }),
  orgChartEmployees: companyEmployeePage,
  approveLeaveRequest: (id: number | string, filterCompanyId?: number | string | null) =>
    request<any>(`/leave/requests/${id}/approve`, {method: 'POST', headers: filterCompanyId ? {'X-Filter-Company-Id': String(filterCompanyId)} : {}}),
  rejectLeaveRequest: (id: number | string, reason?: string, filterCompanyId?: number | string | null) =>
    request<any>(`/leave/requests/${id}/reject`, {method: 'POST', body: JSON.stringify({reason}), headers: filterCompanyId ? {'X-Filter-Company-Id': String(filterCompanyId)} : {}}),
  approveRegularisation: (id: number | string, remarks?: string, filterCompanyId?: number | string | null) =>
    request<any>(`/attendance/regularisation/${id}/approve`, {method: 'POST', body: JSON.stringify({remarks}), headers: filterCompanyId ? {'X-Filter-Company-Id': String(filterCompanyId)} : {}}),
  rejectRegularisation: (id: number | string, remarks?: string, filterCompanyId?: number | string | null) =>
    request<any>(`/attendance/regularisation/${id}/reject`, {method: 'POST', body: JSON.stringify({remarks}), headers: filterCompanyId ? {'X-Filter-Company-Id': String(filterCompanyId)} : {}}),
  companyUserRoles: (selectedCompanyId: number | string) =>
    request<any>(`/user-roles/company/${encodeURIComponent(String(selectedCompanyId))}`, {
      headers: {'X-Company-Id': String(selectedCompanyId), 'X-Filter-Company-Id': String(selectedCompanyId)},
    }),
  assignableUsers: (selectedCompanyId: number | string) => request<any[]>('/user-roles/users', {
    headers: {'X-Company-Id': String(selectedCompanyId), 'X-Filter-Company-Id': String(selectedCompanyId)},
  }),
  assignRole: (data: {userId: number | string; roleName: string; companyId: number | string; accessScope: string; reason: string; departmentId?: number; accessLevel?: string}) =>
    request<any>('/user-roles/assign', {
      method: 'POST', body: JSON.stringify(data),
      headers: {'X-Company-Id': String(data.companyId), 'X-Filter-Company-Id': String(data.companyId)},
    }),
  updateMyProfile: (data: Record<string, any>) =>
    request<any>('/ess/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  uploadMyPhoto: (file: {uri: string; name: string; type: string}) => {
    const body = new FormData();
    body.append('file', file as any);
    return request<any>('/ess/me/photo', {method: 'POST', body});
  },
  workInfo: () => request<any>('/ess/my-work-info'),
  bankDetails: () => request<any>('/ess/bank-details'),
  clockStatus: () => request<any>('/ess/clock-status'),
  geoFencing: () => request<any>('/geofencing'),
  checkGeoLocation: (data: Record<string, any>) =>
    request<any>('/geofencing/check-location', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  myAttendance: (params?: Record<string, any>) => request<any[]>(`/ess/my-attendance${queryString(params)}`),
  myAttendanceActivities: (date?: string) => request<any[]>(`/ess/my-attendance/activities${queryString({date})}`),
  attendanceFullView: (params?: Record<string, any>) => request<any>(`/ess/my-attendance/full-view${queryString(params)}`),
  myRegularisationRequests: () => request<any[]>('/attendance/regularisation/my'),
  submitRegularisationRequest: (data: Record<string, any>, filterCompanyId?: number | string | null) =>
    request<any>('/attendance/regularisation', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: filterCompanyId ? {'X-Filter-Company-Id': String(filterCompanyId)} : {},
    }),
  myLeave: () => request<any[]>('/ess/my-leave'),
  announcements: () => request<any[]>('/announcements'),
  carrMyTasks: () => request<any[]>('/carr/tasks?mine=true'),
  updateCarrTaskProgress: (id: number | string, data: Record<string, any>) =>
    request<any>(`/carr/tasks/${id}/progress`, {method: 'PATCH', body: JSON.stringify(data)}),
  leaveTypes: () => request<any[]>('/ess/leave-types'),
  createLeaveType: (data: Record<string, any>, filterCompanyId?: number | string | null) =>
    request<any>('/leave/types', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: filterCompanyId ? {'X-Company-Id': String(filterCompanyId), 'X-Filter-Company-Id': String(filterCompanyId)} : {},
    }),
  leaveBalance: () => request<any[]>('/ess/my-balance'),
  myPayslips: () => request<any[]>('/ess/my-payslips'),
  payslipPdfUrl: (id: number | string) => `${API_BASE_URL}/payroll/payslips/${id}/pdf`,
  moduleVisibility: (selectedCompanyId?: number | string | null) =>
    request<Record<string, boolean>>(`/settings/module-visibility${queryString({companyId: selectedCompanyId || companyId})}`),
  // The leave calendar endpoint requires the active company as a query parameter.
  // Keep the company header for tenant resolution, and send this explicit value for
  // the controller contract so an employee's calendar does not silently appear empty.
  holidays: () => request<any[]>(`/leave/holidays${queryString({companyId})}`),
  createHoliday: (data: Record<string, any>, companyId: number | string) =>
    request<any>(`/leave/holidays?companyId=${companyId}`, {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'X-Company-Id': String(companyId),
        'X-Filter-Company-Id': String(companyId),
      },
    }),
  applyLeave: (params: {leaveTypeId: number | string; startDate: string; endDate: string; reason?: string; leaveDuration?: string; certificate?: any}) => {
    const fields = {
      leaveTypeId: params.leaveTypeId,
      startDate: params.startDate,
      endDate: params.endDate,
      leaveDuration: params.leaveDuration,
      // The ESS API calls this field description. Keep the mobile form's
      // clearer "reason" label, but send the contract the backend accepts.
      description: params.reason,
    };
    if (params.certificate) {
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') formData.append(key, String(value));
      });
      formData.append('certificate', params.certificate);
      return request<any>('/ess/apply-leave', {method: 'POST', body: formData});
    }
    return request<any>(`/ess/apply-leave${queryString(fields)}`, {
      method: 'POST',
    });
  },
  notifications: (params?: Record<string, any>) => request<any>(`/notifications${queryString(params)}`),
  unreadNotifications: () => request<any>('/notifications/unread-count'),
  markNotificationRead: (id: number | string) => request<any>(`/notifications/${id}/read`, {method: 'POST'}),
  markAllNotificationsRead: () => request<any>('/notifications/mark-all-read', {method: 'POST'}),
  deleteNotification: (id: number | string) => request<any>(`/notifications/${id}`, {method: 'DELETE'}),
  clearNotifications: () => request<any>('/notifications', {method: 'DELETE'}),
  helpdeskTickets: (params?: Record<string, any>) => request<any>(`/helpdesk/tickets${queryString(params)}`),
  createHelpdeskTicket: (data: Record<string, any>) =>
    request<any>('/helpdesk/tickets', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  resolveHelpdeskTicket: (id: number | string) => request<any>(`/helpdesk/tickets/${id}/resolve`, {method: 'POST'}),
  closeHelpdeskTicket: (id: number | string) => request<any>(`/helpdesk/tickets/${id}/close`, {method: 'POST'}),
  checkIn: (location: object) =>
    request<any>('/ess/check-in', {
      method: 'POST',
      body: JSON.stringify({...location, source: 'mobile'}),
    }),
  checkOut: (location: object) =>
    request<any>('/ess/check-out', {
      method: 'POST',
      body: JSON.stringify({...location, source: 'mobile'}),
    }),
  myLoanRequests: () => request<any[]>('/payroll/loan-requests/my'),
  submitLoanRequest: (data: {loanType: string; requestedAmount: number; requestedInstallments: number; reason: string}) =>
    request<any>('/payroll/loan-requests', {method: 'POST', body: JSON.stringify(data)}),
  documentRequests: () => request<any[]>('/documents/requests/my'),
  uploadDocument: (file: {uri: string; name: string; type: string}) => {
    const body = new FormData();
    body.append('file', file as any);
    return request<any>('/files/document', {method: 'POST', body});
  },
};
