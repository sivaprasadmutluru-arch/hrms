import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AssignCompanyRoleModal from '../src/components/AssignCompanyRoleModal';
import {api} from '../src/api/client';
import {RoleMember} from '../src/utils/companyRoles';

jest.mock('../src/components/Icon', () => 'Icon');
afterEach(() => jest.restoreAllMocks());
const company = {id: 2, name: 'Pioneer', companyType: 'HEAD_OFFICE'};
const member: RoleMember = {key: 'user:90', userId: 90, employeeId: 7, companyId: 2, employmentCompanyId: 2, name: 'Prem Mulani', email: '', assignments: []};

async function selectRole(renderer: ReactTestRenderer.ReactTestRenderer, label: string) {
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Role'}).props.onPress();});
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: `Role: ${label}`}).props.onPress();});
}

it('requires a reason and submits the account ID and selected company, not the employee ID', async () => {
  const assign = jest.spyOn(api, 'assignRole').mockResolvedValue({id: 42});
  const onAssigned = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<AssignCompanyRoleModal company={company} member={member} callerRoles={['PLATFORM_SUPER_ADMIN']} callerUserId={10} onClose={jest.fn()} onAssigned={onAssigned} />);});
  await selectRole(renderer, 'Hr Manager');
  await ReactTestRenderer.act(async () => {await renderer.root.findByProps({accessibilityLabel: 'Submit company role assignment'}).props.onPress();});
  expect(assign).not.toHaveBeenCalled();
  expect(JSON.stringify(renderer.toJSON())).toContain('assignment reason');
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Role assignment reason'}).props.onChangeText('Promotion');});
  await ReactTestRenderer.act(async () => {await renderer.root.findByProps({accessibilityLabel: 'Submit company role assignment'}).props.onPress();});
  expect(assign).toHaveBeenCalledWith({companyId: 2, userId: 90, roleName: 'HR_MANAGER', accessScope: 'BRANCH', accessLevel: 'FULL', reason: 'Promotion'});
  expect(onAssigned).toHaveBeenCalledWith({id: 42});
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});

it('loads a department selector using the assignment company and sends its ID', async () => {
  const departments = jest.spyOn(api, 'departments').mockResolvedValue([{id: 4, name: 'Management', companyId: 2}, {id: 5, name: 'Other company', companyId: 3}]);
  const assign = jest.spyOn(api, 'assignRole').mockResolvedValue({id: 42});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<AssignCompanyRoleModal company={company} member={member} callerRoles={['BRANCH_ADMIN']} onClose={jest.fn()} onAssigned={jest.fn()} />);});
  await selectRole(renderer, 'Department Manager');
  expect(departments).toHaveBeenCalledWith(2);
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Department'}).props.onPress();});
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Other company');
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Department: Management'}).props.onPress(); renderer.root.findByProps({accessibilityLabel: 'Role assignment reason'}).props.onChangeText('Team promotion');});
  await ReactTestRenderer.act(async () => {await renderer.root.findByProps({accessibilityLabel: 'Submit company role assignment'}).props.onPress();});
  expect(assign).toHaveBeenCalledWith(expect.objectContaining({departmentId: 4, accessScope: 'DEPARTMENT', companyId: 2}));
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});

it('preserves the form on a server failure and prevents duplicate submissions', async () => {
  let rejectRequest!: (error: Error) => void;
  const pending = new Promise((_, reject) => {rejectRequest = reject;});
  const assign = jest.spyOn(api, 'assignRole').mockReturnValue(pending);
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<AssignCompanyRoleModal company={company} member={member} callerRoles={['PLATFORM_SUPER_ADMIN']} callerUserId={10} onClose={jest.fn()} onAssigned={jest.fn()} />);});
  await selectRole(renderer, 'Hr Manager');
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Role assignment reason'}).props.onChangeText('Promotion');});
  await ReactTestRenderer.act(async () => {const submit = renderer.root.findByProps({accessibilityLabel: 'Submit company role assignment'}).props.onPress; submit(); submit();});
  expect(assign).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(async () => {rejectRequest(new Error('Server rejected this assignment'));});
  expect(renderer.root.findByProps({accessibilityLabel: 'Role assignment reason'}).props.value).toBe('Promotion');
  expect(JSON.stringify(renderer.toJSON())).toContain('Server rejected this assignment');
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});
