import {api, setApiSession} from '../src/api/client';
import {assignableCompanyRoles, companyRoleMembers, companyRolePayload, RoleMember, roleScopes} from '../src/utils/companyRoles';

const company = {id: 2, name: 'Pioneer', companyType: 'HEAD_OFFICE'};
const member: RoleMember = {key: 'user:90', userId: 90, employeeId: 7, name: 'Employee', email: 'employee@example.com', companyId: 2, employmentCompanyId: 2, assignments: []};
const values = {roleName: 'HR_MANAGER', accessScope: 'BRANCH', reason: ' Promotion ', departmentId: '', accessLevel: 'FULL'};
afterEach(() => {jest.restoreAllMocks(); setApiSession({});});

it('uses the selected company for role reads, user options, and assignment writes', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ok: true, text: async () => '[]'} as Response);
  setApiSession({token: 'test-token', companyId: 1});
  await api.companyUserRoles(2);
  await api.assignableUsers(2);
  const payload = companyRolePayload(company, member, values, ['PLATFORM_SUPER_ADMIN'], 10, []);
  await api.assignRole(payload);
  await api.myCompanyInfo();
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/user-roles\/company\/2$/);
  expect(fetchMock.mock.calls[1][0]).toMatch(/\/user-roles\/users$/);
  expect(fetchMock.mock.calls[2][1]).toMatchObject({method: 'POST'});
  expect(JSON.parse(String(fetchMock.mock.calls[2][1]?.body))).toEqual({...values, reason: 'Promotion', departmentId: undefined, userId: 90, companyId: 2});
  fetchMock.mock.calls.slice(0, 3).forEach(([, options]) => expect(options?.headers).toMatchObject({'X-Company-Id': '2', 'X-Filter-Company-Id': '2'}));
  expect(fetchMock.mock.calls[3][1]?.headers).toMatchObject({'X-Company-Id': '1'});
});

it('joins tenant employee IDs to global account IDs and excludes other-company assignments and users', () => {
  const result = companyRoleMembers([{id: 7, userId: 90, fullName: 'Prem Mulani', companyId: 2}, {id: 7, userId: 91, fullName: 'Other tenant', companyId: 3}], [{id: 90, companyId: 2}, {id: 91, companyId: 3}], [{id: 1, userId: 90, companyId: 2, roleName: 'EMPLOYEE'}, {id: 2, userId: 90, companyId: 3, roleName: 'HR_MANAGER'}], 2);
  expect(result).toHaveLength(1);
  expect(result[0]).toMatchObject({name: 'Prem Mulani', employeeId: 7, userId: 90, assignments: [{id: 1, userId: 90, companyId: 2, roleName: 'EMPLOYEE'}]});
});

it('shows employees without accounts but never uses an employee ID as the assignment user ID', () => {
  const result = companyRoleMembers([{id: 7, fullName: 'No account', companyId: 2}], [{id: 7, email: 'different@example.com', companyId: 3}], [], 2);
  expect(result[0].userId).toBeNull();
  expect(() => companyRolePayload(company, result[0], values, ['PLATFORM_SUPER_ADMIN'], 10, [])).toThrow('no linked login account');
});

it('supports legacy account links only when a company-scoped email is unambiguous', () => {
  expect(companyRoleMembers([{id: 1, email: 'person@example.com', companyId: 2}], [], [{id: 1, userId: 90, companyId: 2, email: 'person@example.com', roleName: 'EMPLOYEE'}], 2)[0].userId).toBe(90);
  const result = companyRoleMembers([{id: 1, email: 'person@example.com', companyId: 2}], [{id: 90, companyId: 2, email: 'person@example.com'}, {id: 91, companyId: 2, email: 'person@example.com'}], [], 2);
  expect(result.find(item => item.employeeId === 1)?.userId).toBeNull();
});

it('keeps company-specific administrative users visible even without an employee profile', () => {
  const result = companyRoleMembers([], [{id: 90, firstName: 'Office', lastName: 'Admin', companyId: 2}], [{id: 1, userId: 90, companyId: 2, roleName: 'COMPANY_ADMIN'}], 2);
  expect(result[0]).toMatchObject({name: 'Office Admin', userId: 90, assignments: [expect.objectContaining({roleName: 'COMPANY_ADMIN'})]});
});

it('rejects a missing reason, wrong company, unauthorized role, and duplicate active assignment', () => {
  expect(() => companyRolePayload(company, member, {...values, reason: ''}, ['PLATFORM_SUPER_ADMIN'], 10, [])).toThrow('assignment reason');
  expect(() => companyRolePayload({id: 3}, member, values, ['PLATFORM_SUPER_ADMIN'], 10, [])).toThrow('this company');
  expect(() => companyRolePayload(company, member, values, ['BRANCH_ADMIN'], 10, [])).toThrow('cannot assign');
  expect(() => companyRolePayload(company, {...member, assignments: [{roleName: 'HR_MANAGER', assignmentStatus: 'ACTIVE'}]}, values, ['PLATFORM_SUPER_ADMIN'], 10, [])).toThrow('already has');
  expect(() => companyRolePayload(company, {...member, employmentCompanyId: 3}, values, ['PLATFORM_SUPER_ADMIN'], 10, [])).toThrow('employment company');
});

it('requires a department from the selected company for department-manager assignments', () => {
  const departmentValues = {...values, roleName: 'DEPARTMENT_MANAGER', accessScope: 'DEPARTMENT', departmentId: '4'};
  expect(() => companyRolePayload(company, member, departmentValues, ['PLATFORM_SUPER_ADMIN'], 10, [{id: 4, companyId: 3}])).toThrow('department from this company');
  expect(companyRolePayload(company, member, departmentValues, ['BRANCH_ADMIN'], 10, [{id: 4, companyId: 2}])).toMatchObject({departmentId: 4, companyId: 2, accessScope: 'DEPARTMENT'});
});

it('limits roles by caller authority and avoids branch-to-head-office reanchoring or self-escalation', () => {
  expect(assignableCompanyRoles(['BRANCH_ADMIN'], company)).toEqual(['DEPARTMENT_MANAGER', 'EMPLOYEE']);
  expect(assignableCompanyRoles(['ENTERPRISE_ADMIN'], company)).not.toContain('SUPER_ADMIN');
  expect(assignableCompanyRoles(['PLATFORM_SUPER_ADMIN'], company, 90, 90)).not.toContain('SUPER_ADMIN');
  expect(assignableCompanyRoles(['COMPANY_MANAGER'], company)).toEqual([]);
  expect(assignableCompanyRoles(['PLATFORM_SUPER_ADMIN'], {companyType: 'BRANCH'})).not.toContain('COMPANY_ADMIN');
  expect(roleScopes('ACCOUNT_MANAGER', {companyType: 'BRANCH'})).toEqual(['BRANCH']);
  expect(roleScopes('EMPLOYEE', company)).toEqual(['SELF']);
});
