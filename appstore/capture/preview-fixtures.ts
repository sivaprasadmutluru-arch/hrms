import {api} from '../../src/api/client';
import * as storage from '../../src/utils/storage';
import * as location from '../../src/utils/location';

// Imported temporarily during screenshot capture, never by the normal app entry.
// All records are fictional; saved sessions and backend writes are untouched.
const day = (offset: number) => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const today = day(0);
const demoCompany = {id: 9001, name: 'Northstar Studio', companyType: 'HEAD_OFFICE', currency: 'USD', city: 'Dubai', country: 'United Arab Emirates'};
const demoProfile = {
  id: 9001, employeeId: 9001, userId: 9001, firstName: 'Alex', lastName: 'Morgan', fullName: 'Alex Morgan',
  email: 'alex.morgan@example.com', workEmail: 'alex.morgan@example.com', badgeId: 'NS-1042',
  companyId: 9001, companyName: demoCompany.name, departmentName: 'Design', jobPositionName: 'Product Designer',
  jobRoleName: 'Product Designer', shiftName: 'General Shift', workTypeName: 'Full Time',
  dateJoining: '2024-04-15', employeeType: 'Permanent', currencySymbol: '$', roles: ['EMPLOYEE'],
  currentAddress: 'Dubai, United Arab Emirates', permanentAddress: 'Dubai, United Arab Emirates', country: 'United Arab Emirates', city: 'Dubai',
};
const demoUser = {token: 'app-store-preview-only', userId: 9001, username: 'alex.morgan', email: demoProfile.email, companyId: 9001, companyName: demoCompany.name, employeeId: 9001, roles: ['EMPLOYEE']};
const attendance = Array.from({length: 10}, (_, index) => ({
  id: 100 + index, attendanceDate: day(-index), date: day(-index),
  checkIn: `${day(-index)}T09:00:00`, checkInTime: `${day(-index)}T09:00:00`,
  checkOut: index ? `${day(-index)}T17:30:00` : null, checkOutTime: index ? `${day(-index)}T17:30:00` : null,
  atWorkSecond: index ? 30600 : 21600, workedHours: index ? '8h 30m' : '6h 0m',
  displayStatus: 'REGULAR', status: 'PRESENT', attendanceStatus: 'REGULAR',
  checkInAddress: 'Northstar Studio, Dubai', checkOutAddress: index ? 'Northstar Studio, Dubai' : '',
  shiftName: 'General Shift', companyId: 9001, companyName: demoCompany.name,
}));
const leaveTypes = [{id: 1, name: 'Annual Leave', totalDays: 30}, {id: 2, name: 'Sick Leave', totalDays: 10}, {id: 3, name: 'Personal Leave', totalDays: 5}];
const leave = [
  {id: 1, leaveTypeName: 'Annual Leave', startDate: day(12), endDate: day(16), requestedDays: 5, status: 'REQUESTED', reason: 'Family vacation'},
  {id: 2, leaveTypeName: 'Personal Leave', startDate: day(5), endDate: day(5), requestedDays: 1, status: 'REQUESTED', reason: 'Personal appointment'},
  {id: 3, leaveTypeName: 'Annual Leave', startDate: day(-22), endDate: day(-20), requestedDays: 3, status: 'APPROVED', reason: 'Time with family'},
  {id: 4, leaveTypeName: 'Annual Leave', startDate: day(-42), endDate: day(-40), requestedDays: 3, status: 'APPROVED', reason: 'Planned time off'},
];
const documents = [
  {id: 1, title: 'Employment Letter', description: 'Your employment confirmation letter', fileName: 'employment-letter.pdf', createdAt: day(-12), status: 'APPROVED'},
  {id: 2, title: 'Company Handbook', description: 'Policies and employee benefits', fileName: 'company-handbook.pdf', createdAt: day(-20), status: 'APPROVED'},
  {id: 3, title: 'Insurance Card', description: 'Annual employee insurance document', fileName: 'insurance-card.pdf', createdAt: day(-30), status: 'APPROVED'},
];
const payslips = [9, 8, 7, 6].map(month => ({id: month, month: `2026-${String(month).padStart(2, '0')}`, startDate: `2026-${String(month).padStart(2, '0')}-01`, endDate: `2026-${String(month).padStart(2, '0')}-${month === 6 || month === 9 ? '30' : '31'}`, grossPay: 6000, netPay: 5520, basicPay: 4500, housingAllowance: 1000, transportAllowance: 500, totalDeductions: 480, status: 'PAID'}));
const holidays = [
  {id: 1, name: 'Company Foundation Day', date: day(18), startDate: day(18), endDate: day(18), recurring: true},
  {id: 2, name: 'Winter Holiday', date: '2026-12-25', startDate: '2026-12-25', endDate: '2026-12-25', recurring: true},
  {id: 3, name: "New Year's Day", date: '2027-01-01', startDate: '2027-01-01', endDate: '2027-01-01', recurring: true},
];
const announcement = {id: 1, title: 'Growing together', content: 'Join our team workshop this Friday. Share ideas, connect with colleagues, and celebrate the work we do together.', description: 'Our team workshop is this Friday. Connect, learn, and share ideas.', createdAt: `${today}T09:00:00`, publishedAt: `${today}T09:00:00`};
const answer = (value: any) => async () => JSON.parse(JSON.stringify(value));

if (__DEV__) {
  for (const key of Object.keys(api)) {
    (api as any)[key] = async () => {throw new Error('This action is disabled in screenshot preview.');};
  }
  Object.assign(api, {
    me: answer(demoProfile), myCompanyInfo: answer(demoCompany), accessibleCompanies: answer([demoCompany]),
    clockStatus: answer({online: true, checkIn: `${today}T09:00:00`, checkOut: null, atWorkSecond: 21600}),
    workInfo: answer({...demoProfile, reportingManagerName: 'Jordan Lee', shiftStartTime: '09:00', shiftEndTime: '17:30'}),
    attendanceFullView: answer({content: attendance}), myAttendance: answer({content: attendance}),
    myAttendanceActivities: answer([{id: 1, attendanceDate: today, checkInTime: `${today}T09:00:00`, checkIn: `${today}T09:00:00`, checkInAddress: 'Northstar Studio, Dubai'}]),
    geoFencing: answer({start: false}), documentRequests: answer(documents), myLeave: answer(leave),
    leaveTypes: answer(leaveTypes), leaveBalance: answer([{leaveTypeId: 1, leaveTypeName: 'Annual Leave', totalLeaveDays: 30, remainingDays: 24, usedDays: 6}, {leaveTypeId: 2, leaveTypeName: 'Sick Leave', totalLeaveDays: 10, remainingDays: 9, usedDays: 1}, {leaveTypeId: 3, leaveTypeName: 'Personal Leave', totalLeaveDays: 5, remainingDays: 5, usedDays: 0}]),
    myPayslips: answer(payslips), payslipPdfUrl: () => 'https://example.com/demo-payslip.pdf',
    holidays: answer(holidays), announcements: answer([announcement]),
    carrMyTasks: answer([{id: 1, title: 'Complete onboarding checklist', status: 'IN_PROGRESS', progress: 75, dueDate: day(4)}, {id: 2, title: 'Update quarterly goals', status: 'PENDING', progress: 0, dueDate: day(10)}]),
    myLoanRequests: answer([]), myRegularisationRequests: answer([]), bankDetails: answer({bankName: 'Demo Bank', accountHolderName: 'Alex Morgan', accountNumber: 'XXXX XXXX 1042'}),
  });
  Object.assign(storage, {
    loadSession: answer({token: demoUser.token, user: demoUser, profile: demoProfile}),
    saveSession: async () => {}, clearSession: async () => {},
  });
  Object.assign(location, {
    captureCurrentLocation: answer({coords: {latitude: 25.2, longitude: 55.3, accuracy: 10}}),
    reverseGeocode: async () => 'Northstar Studio, Dubai', requestLocationPermission: async () => true,
  });
}
