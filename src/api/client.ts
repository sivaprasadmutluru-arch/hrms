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
    ...(token ? {Authorization: `Bearer ${token}`} : {}),
    ...(companyId ? {'X-Company-Id': String(companyId)} : {}),
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

export const api = {
  login: (usernameOrEmail: string, password: string) =>
    request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({usernameOrEmail, password}),
    }),
  me: () => request<any>('/ess/me'),
  myCompanyInfo: () => request<any>('/companies/mine'),
  adminList: (path: string, params?: Record<string, any>) => request<any>(`${path}${queryString(params)}`),
  approveLeaveRequest: (id: number | string) => request<any>(`/leave/requests/${id}/approve`, {method: 'POST'}),
  rejectLeaveRequest: (id: number | string, reason?: string) =>
    request<any>(`/leave/requests/${id}/reject`, {method: 'POST', body: JSON.stringify({reason})}),
  approveRegularisation: (id: number | string, remarks?: string) =>
    request<any>(`/attendance/regularisation/${id}/approve`, {method: 'POST', body: JSON.stringify({remarks})}),
  rejectRegularisation: (id: number | string, remarks?: string) =>
    request<any>(`/attendance/regularisation/${id}/reject`, {method: 'POST', body: JSON.stringify({remarks})}),
  assignableUsers: () => request<any[]>('/user-roles/users'),
  assignRole: (data: {userId: number | string; roleName: string; companyId: number | string; accessScope: string}) =>
    request<any>('/user-roles/assign', {method: 'POST', body: JSON.stringify(data)}),
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
  submitRegularisationRequest: (data: Record<string, any>) =>
    request<any>('/attendance/regularisation', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  myLeave: () => request<any[]>('/ess/my-leave'),
  leaveTypes: () => request<any[]>('/ess/leave-types'),
  leaveBalance: () => request<any[]>('/ess/my-balance'),
  myPayslips: () => request<any[]>('/ess/my-payslips'),
  // The leave calendar endpoint requires the active company as a query parameter.
  // Keep the company header for tenant resolution, and send this explicit value for
  // the controller contract so an employee's calendar does not silently appear empty.
  holidays: () => request<any[]>(`/leave/holidays${queryString({companyId})}`),
  applyLeave: (params: {leaveTypeId: number | string; startDate: string; endDate: string; reason?: string; leaveDuration?: string}) =>
    request<any>(`/ess/apply-leave${queryString({
      leaveTypeId: params.leaveTypeId,
      startDate: params.startDate,
      endDate: params.endDate,
      leaveDuration: params.leaveDuration,
      // The ESS API calls this field description. Keep the mobile form's
      // clearer "reason" label, but send the contract the backend accepts.
      description: params.reason,
    })}`, {
      method: 'POST',
    }),
  forgotPassword: (email: string) =>
    request<{message: string}>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({email}),
    }),
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
