import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {api} from '../src/api/client';
import CompanySubscriptions, {SubscriptionCard} from '../src/components/CompanySubscriptions';

jest.mock('../src/components/Icon', () => 'Icon');
afterEach(() => jest.restoreAllMocks());

const companies = [{id: 2, name: 'Pioneer', organizationId: 42}, {id: 5, name: 'Prabha', organizationId: 99}];

it('discards an earlier company response when selection changes', async () => {
  jest.spyOn(api, 'subscriptionOrganizations').mockResolvedValue([{id: 42, name: 'Pioneer Group'}, {id: 99, name: 'Prabha Group'}]);
  let resolveOld!: (value: any) => void;
  const oldRequest = new Promise(resolve => {resolveOld = resolve;});
  const limits = jest.spyOn(api, 'organizationPlanLimits').mockReturnValueOnce(oldRequest).mockResolvedValueOnce({plan: 'ENTERPRISE', maxEmployees: null});
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  const props = {companies, page: 'Subscription Details', onSelectCompany: jest.fn(), onSelectPage: jest.fn()};
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<CompanySubscriptions {...props} selectedCompanyId={2} />);});
  await ReactTestRenderer.act(async () => {renderer.update(<CompanySubscriptions {...props} selectedCompanyId={5} />);});
  await ReactTestRenderer.act(async () => {resolveOld({plan: 'BASIC'});});
  expect(limits.mock.calls).toEqual([[42, 2], [99, 5]]);
  expect(renderer.root.findAllByType(SubscriptionCard)).toHaveLength(1);
  expect(renderer.root.findByType(SubscriptionCard).props.record.company.id).toBe(5);
  expect(renderer.root.findByType(SubscriptionCard).props.record.limits.plan).toBe('ENTERPRISE');
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});

it('selects individual companies or all companies and switches views without fetching again', async () => {
  jest.spyOn(api, 'subscriptionOrganizations').mockResolvedValue([{id: 42, name: 'Pioneer Group'}, {id: 99, name: 'Prabha Group'}]);
  const limits = jest.spyOn(api, 'organizationPlanLimits').mockResolvedValue({plan: 'STANDARD', currentEmployees: 5, maxEmployees: 200});
  const onSelectCompany = jest.fn();
  const onSelectPage = jest.fn();
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  const props = {companies, selectedCompanyId: 'all', page: 'Subscription Details', onSelectCompany, onSelectPage};
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<CompanySubscriptions {...props} />);});
  expect(renderer.root.findAllByType(SubscriptionCard)).toHaveLength(2);
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Select subscription company'}).props.onPress();});
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Select Pioneer'}).props.onPress();});
  expect(onSelectCompany).toHaveBeenCalledWith(2);
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Select subscription company'}).props.onPress();});
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Select All companies'}).props.onPress();});
  expect(onSelectCompany).toHaveBeenCalledWith('all');
  await ReactTestRenderer.act(async () => {renderer.root.findByProps({accessibilityLabel: 'Plan Limits'}).props.onPress();});
  expect(onSelectPage).toHaveBeenCalledWith('Plan Limits');
  await ReactTestRenderer.act(async () => {renderer.update(<CompanySubscriptions {...props} page="Plan Limits" />);});
  expect(limits).toHaveBeenCalledTimes(2);
  expect(renderer.root.findAllByType(SubscriptionCard)[0].props.record.limits).toMatchObject({currentEmployees: 5, maxEmployees: 200});
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});

it('shows billing organization contacts without inventing prices or invoice totals', async () => {
  let renderer!: ReactTestRenderer.ReactTestRenderer;
  await ReactTestRenderer.act(async () => {renderer = ReactTestRenderer.create(<SubscriptionCard page="Billing Scope" record={{company: companies[0], organization: {name: 'Pioneer Group', contactEmail: 'billing@example.com', contactPhone: '123'}, limits: {plan: 'BASIC'}, error: ''}} />);});
  const view = JSON.stringify(renderer.toJSON());
  expect(view).toContain('billing@example.com');
  expect(view).toContain('Organization-wide');
  expect(view).not.toContain('Invoice');
  await ReactTestRenderer.act(async () => {renderer.unmount();});
});
