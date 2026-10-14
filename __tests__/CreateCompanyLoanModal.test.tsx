import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {TextInput} from 'react-native';
import {api} from '../src/api/client';
import CreateCompanyLoanModal from '../src/components/CreateCompanyLoanModal';

jest.mock('../src/components/Icon', () => 'Icon');
afterEach(() => jest.restoreAllMocks());
const company = {id: 2, name: 'Pioneer', currency: 'AED'};
const renderDateField = (label: string, value: string, onChange: (value: string) => void) => <TextInput accessibilityLabel={label} value={value} onChangeText={onChange} />;
const props = {company, roles: ['PLATFORM_SUPER_ADMIN'], renderDateField, onClose: jest.fn(), onCreated: jest.fn()};

async function fillRequired(renderer: ReactTestRenderer.ReactTestRenderer) {
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Loan employee'}).props.onPress();});
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Loan employee: Prem'}).props.onPress(); renderer.root.findByProps({accessibilityLabel: 'Loan title'}).props.onChangeText('Staff loan'); renderer.root.findByProps({accessibilityLabel: 'Loan amount'}).props.onChangeText('1000');});
}

it('shows only selected-company employees, validates blank fields, and submits a mocked loan', async () => {
  const employees = jest.spyOn(api, 'companyEmployees').mockResolvedValue({content: [{id: 7, fullName: 'Prem', companyId: 2}, {id: 8, fullName: 'Other company', companyId: 3}]});
  const create = jest.spyOn(api, 'createCompanyLoan').mockResolvedValue({id: 42});
  const onCreated = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<CreateCompanyLoanModal {...props} onCreated={onCreated} />);});
  expect(employees).toHaveBeenCalledWith(2, 0, 200);
  await ReactTestRenderer.act(async () => {await renderer.root.findByProps({accessibilityLabel: 'Submit company loan'}).props.onPress();});
  expect(create).not.toHaveBeenCalled();
  expect(JSON.stringify(renderer.toJSON())).toContain('employee from this company');
  await fillRequired(renderer);
  expect(JSON.stringify(renderer.toJSON())).not.toContain('Other company');
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Provided Date'}).props.onChangeText('2026-10-14');});
  await ReactTestRenderer.act(async () => {await renderer.root.findByProps({accessibilityLabel: 'Submit company loan'}).props.onPress();});
  expect(create).toHaveBeenCalledWith(expect.objectContaining({employee: {id: 7}, company: {id: 2}, loanAmount: 1000, providedDate: '2026-10-14'}), 2);
  expect(onCreated).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});

it('preserves the entered data on failure and prevents duplicate loan creation', async () => {
  jest.spyOn(api, 'companyEmployees').mockResolvedValue({content: [{id: 7, fullName: 'Prem', companyId: 2}]});
  let rejectRequest!: (error: Error) => void;
  const pending = new Promise((_, reject) => {rejectRequest = reject;});
  const create = jest.spyOn(api, 'createCompanyLoan').mockReturnValue(pending);
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<CreateCompanyLoanModal {...props} />);});
  await fillRequired(renderer);
  await ReactTestRenderer.act(async () => {const submit = renderer.root.findByProps({accessibilityLabel: 'Submit company loan'}).props.onPress; submit(); submit();});
  expect(create).toHaveBeenCalledTimes(1);
  await ReactTestRenderer.act(async () => {rejectRequest(new Error('Server rejected the loan'));});
  expect(renderer.root.findByProps({accessibilityLabel: 'Loan title'}).props.value).toBe('Staff loan');
  expect(renderer.root.findByProps({accessibilityLabel: 'Loan amount'}).props.value).toBe('1000');
  expect(JSON.stringify(renderer.toJSON())).toContain('Server rejected the loan');
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});

it('never submits when the caller has no loan-creation permission', async () => {
  jest.spyOn(api, 'companyEmployees').mockResolvedValue({content: [{id: 7, fullName: 'Prem', companyId: 2}]});
  const create = jest.spyOn(api, 'createCompanyLoan').mockResolvedValue({});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<CreateCompanyLoanModal {...props} roles={['EMPLOYEE']} />);});
  await ReactTestRenderer.act(async () => {await renderer.root.findByProps({accessibilityLabel: 'Submit company loan'}).props.onPress();});
  expect(create).not.toHaveBeenCalled();
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});
