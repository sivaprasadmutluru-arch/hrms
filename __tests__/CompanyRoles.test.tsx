import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from 'react-native';
import {api} from '../src/api/client';
import CompanyRoles from '../src/components/CompanyRoles';
import AssignCompanyRoleModal from '../src/components/AssignCompanyRoleModal';

jest.mock('../src/components/Icon', () => 'Icon');
afterEach(() => jest.restoreAllMocks());
const companies = [{id: 2, name: 'Pioneer'}, {id: 3, name: 'Prabha'}];
const props = {companies, selectedCompanyId: 2, onSelectCompany: jest.fn(), page: 'User Roles', onSelectPage: jest.fn(), callerRoles: ['PLATFORM_SUPER_ADMIN'], callerUserId: 10};
function renderedText(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root.findAllByType(Text).map(item => item.props.children).flat(Infinity).join(' ');
}

it('shows scoped employee names and roles and discards the previous company response', async () => {
  jest.spyOn(api, 'companyEmployees').mockImplementation(async (id) => ({content: [{id: 7, userId: Number(id) + 10, fullName: `Employee ${id}`, companyId: id}]}));
  let resolveOld!: (value: any) => void;
  const oldRequest = new Promise(resolve => {resolveOld = resolve;});
  jest.spyOn(api, 'companyUserRoles').mockReturnValueOnce(oldRequest).mockResolvedValueOnce([{id: 1, userId: 13, companyId: 3, roleName: 'HR_MANAGER'}]);
  jest.spyOn(api, 'assignableUsers').mockImplementation(async id => [{id: Number(id) + 10, companyId: id}]);
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<CompanyRoles {...props} />);});
  await ReactTestRenderer.act(async () => {renderer.update(<CompanyRoles {...props} selectedCompanyId={3} />);});
  await ReactTestRenderer.act(async () => {resolveOld([{id: 1, userId: 12, companyId: 2, roleName: 'EMPLOYEE'}]);});
  expect(renderedText(renderer)).toContain('Employee 3');
  expect(renderedText(renderer)).not.toContain('Employee 2');
  expect(renderedText(renderer)).toContain('Hr Manager');
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});

it('opens an assignment modal for the selected company and clears it after switching companies', async () => {
  jest.spyOn(api, 'companyEmployees').mockResolvedValue({content: [{id: 7, userId: 90, fullName: 'Prem', companyId: 2}]});
  jest.spyOn(api, 'companyUserRoles').mockResolvedValue([]);
  jest.spyOn(api, 'assignableUsers').mockResolvedValue([{id: 90, companyId: 2}]);
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<CompanyRoles {...props} />);});
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Assign role to Prem'}).props.onPress();});
  expect(renderer.root.findByType(AssignCompanyRoleModal).props.company.id).toBe(2);
  expect(renderer.root.findByType(AssignCompanyRoleModal).props.member.userId).toBe(90);
  await ReactTestRenderer.act(async () => {renderer.update(<CompanyRoles {...props} selectedCompanyId={3} />);});
  expect(renderer.root.findAllByType(AssignCompanyRoleModal)).toHaveLength(0);
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});

it('offers accessible companies and refreshes assignments after a successful mocked grant', async () => {
  const employees = jest.spyOn(api, 'companyEmployees').mockResolvedValue({content: [{id: 7, userId: 90, fullName: 'Prem', companyId: 2}]});
  jest.spyOn(api, 'companyUserRoles').mockResolvedValue([]);
  jest.spyOn(api, 'assignableUsers').mockResolvedValue([{id: 90, companyId: 2}]);
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  const onSelectCompany = jest.fn();
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<CompanyRoles {...props} onSelectCompany={onSelectCompany} />);});
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Select roles company'}).props.onPress();});
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Roles company: Prabha'}).props.onPress();});
  expect(onSelectCompany).toHaveBeenCalledWith(3);
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Assign role to Prem'}).props.onPress();});
  await ReactTestRenderer.act(async () => {renderer.root.findByType(AssignCompanyRoleModal).props.onAssigned({id: 42});});
  expect(employees).toHaveBeenCalledTimes(2);
  expect(renderer.root.findAllByType(AssignCompanyRoleModal)).toHaveLength(0);
  expect(renderedText(renderer)).toContain('Role assigned to Prem in Pioneer.');
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});

it('shows a company-loading failure instead of pretending the company has no employees', async () => {
  const retryCompanies = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<CompanyRoles {...props} companies={[]} companiesError="Your session has expired. Please sign in again." onReloadCompanies={retryCompanies} />);});
  expect(renderedText(renderer)).toContain('Your session has expired');
  expect(renderedText(renderer)).not.toContain('No matching employees');
  expect(renderedText(renderer)).not.toContain('0 role assignments');
  await ReactTestRenderer.act(async () => {renderer.root.findAll(node => node.props.onPress === retryCompanies && node.props.accessibilityRole === 'button')[0].props.onPress();});
  expect(retryCompanies).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});
