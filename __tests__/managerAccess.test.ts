import {canAccessAdmin, canReviewLeave, userRoles, usesDirectReportAttendance} from '../src/utils/roles';

it('shows Admin for canonical and legacy managers', () => {
  for (const role of ['COMPANY_MANAGER', 'DEPARTMENT_MANAGER', 'TEAM_LEAD', 'HR_MANAGER']) {
    expect(canAccessAdmin({roles: [role]})).toBe(true);
  }
});

it('only admits employee reporting managers with a server-confirmed capability', () => {
  expect(canAccessAdmin({roles: ['EMPLOYEE']}, {isReportingManager: true})).toBe(true);
  expect(canAccessAdmin({roles: ['EMPLOYEE']}, {isReportingManager: false})).toBe(false);
  expect(canAccessAdmin({roles: ['EMPLOYEE']})).toBe(false);
});

it('prefers refreshed roles, including removal of stale permissions', () => {
  expect(userRoles({roles: ['EMPLOYEE']}, {roles: ['DEPARTMENT_MANAGER']})).toEqual(['DEPARTMENT_MANAGER']);
  expect(canAccessAdmin({roles: ['HR_MANAGER']}, {roles: ['EMPLOYEE']})).toBe(false);
  expect(userRoles({roles: ['HR_MANAGER']}, {roles: []})).toEqual([]);
});

it('requires server review permission on a pending request', () => {
  expect(canReviewLeave({status: 'REQUESTED', canReview: true})).toBe(true);
  expect(canReviewLeave({status: 'PENDING', canReview: true})).toBe(true);
  expect(canReviewLeave({status: 'REQUESTED', canReview: false})).toBe(false);
  expect(canReviewLeave({status: 'REQUESTED'})).toBe(false);
  expect(canReviewLeave({status: 'APPROVED', canReview: true})).toBe(false);
});

it('uses direct-report attendance for managers without company-wide HR access', () => {
  expect(usesDirectReportAttendance({roles: ['EMPLOYEE']}, {isReportingManager: true})).toBe(true);
  expect(usesDirectReportAttendance({roles: ['DEPARTMENT_MANAGER']})).toBe(true);
  expect(usesDirectReportAttendance({roles: ['EMPLOYEE']})).toBe(false);
  expect(usesDirectReportAttendance({roles: ['HR_MANAGER']}, {isReportingManager: true})).toBe(false);
});
