import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from 'react-native';
import {api} from '../src/api/client';
import CompanyLoans from '../src/components/CompanyLoans';
import CreateCompanyLoanModal from '../src/components/CreateCompanyLoanModal';

jest.mock('../src/components/Icon', () => 'Icon');
afterEach(() => jest.restoreAllMocks());
const companies = [{id: 2, name: 'Pioneer', currency: 'AED'}, {id: 3, name: 'Prabha'}];
const props = {companies, selectedCompanyId: 2, onSelectCompany: jest.fn(), roles: ['PLATFORM_SUPER_ADMIN'], renderDateField: () => null};
const viewText = (renderer: ReactTestRenderer.ReactTestRenderer) => renderer.root.findAllByType(Text).map(item => item.props.children).flat(Infinity).join(' ');

it('loads only the selected company and discards late data from the previous one', async () => {
  let resolveOld!: (value: any) => void;
  const old = new Promise(resolve => {resolveOld = resolve;});
  const loans = jest.spyOn(api, 'companyLoans').mockReturnValueOnce(old).mockResolvedValueOnce([{id: 1, title: 'Current loan', loanAmount: 100, companyId: 3}]);
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<CompanyLoans {...props} />);});
  await ReactTestRenderer.act(async () => {renderer.update(<CompanyLoans {...props} selectedCompanyId={3} />);});
  await ReactTestRenderer.act(async () => {resolveOld([{id: 1, title: 'Old company loan', companyId: 2}]);});
  expect(loans.mock.calls).toEqual([[2], [3]]);
  expect(viewText(renderer)).toContain('Current loan');
  expect(viewText(renderer)).not.toContain('Old company loan');
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});

it('shows Create Loan only to authorized admins and refreshes after creation', async () => {
  const loans = jest.spyOn(api, 'companyLoans').mockResolvedValue([]);
  jest.spyOn(api, 'companyEmployees').mockResolvedValue({content: []});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<CompanyLoans {...props} roles={['EMPLOYEE']} />);});
  expect(renderer.root.findAllByProps({accessibilityLabel: 'Create company loan'})).toHaveLength(0);
  await ReactTestRenderer.act(async () => {renderer.update(<CompanyLoans {...props} />);});
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Create company loan'}).props.onPress();});
  expect(renderer.root.findByType(CreateCompanyLoanModal).props.company.id).toBe(2);
  await ReactTestRenderer.act(async () => {renderer.root.findByType(CreateCompanyLoanModal).props.onCreated();});
  expect(loans).toHaveBeenCalledTimes(2);
  expect(renderer.root.findAllByType(CreateCompanyLoanModal)).toHaveLength(0);
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});

it('clears an open create form when the company changes', async () => {
  jest.spyOn(api, 'companyLoans').mockResolvedValue([]);
  jest.spyOn(api, 'companyEmployees').mockResolvedValue({content: []});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<CompanyLoans {...props} />);});
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Create company loan'}).props.onPress();});
  await ReactTestRenderer.act(async () => {renderer.update(<CompanyLoans {...props} selectedCompanyId={3} />);});
  expect(renderer.root.findAllByType(CreateCompanyLoanModal)).toHaveLength(0);
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});

it('shows request failures as errors, not a false empty loan balance', async () => {
  jest.spyOn(api, 'companyLoans').mockRejectedValue(new Error('Payroll access denied'));
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<CompanyLoans {...props} />);});
  expect(viewText(renderer)).toContain('Payroll access denied');
  expect(viewText(renderer)).not.toContain('No loan accounts found');
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});
