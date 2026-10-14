import {api, setApiSession} from '../src/api/client';
import {loadCompanySubscriptions, subscriptionLimit, subscriptionUsage} from '../src/utils/subscriptions';

afterEach(() => {jest.restoreAllMocks(); setApiSession({});});

it('requests organization limits in the selected company context, without changing the login session', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ok: true, text: async () => '{}'} as Response);
  setApiSession({token: 'test-token', companyId: 1});
  await api.subscriptionOrganizations();
  await api.organizationPlanLimits(42, 2);
  await api.myCompanyInfo();
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/organizations$/);
  expect(fetchMock.mock.calls[1][0]).toMatch(/\/organizations\/42\/plan-limits$/);
  expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({'X-Company-Id': '2', 'X-Filter-Company-Id': '2'});
  expect(fetchMock.mock.calls[2][1]?.headers).toMatchObject({'X-Company-Id': '1'});
});

function source() {
  return {
    organizations: jest.fn().mockResolvedValue([{id: 42, name: 'Pioneer Group', subscriptionPlan: 'BASIC'}, {id: 99, name: 'Prabha', subscriptionPlan: 'ENTERPRISE'}]),
    employees: jest.fn().mockResolvedValue({content: []}),
    limits: jest.fn().mockResolvedValue({plan: 'BASIC', currentEmployees: 50, maxEmployees: 50, currentBranches: 1, maxBranches: 2}),
  };
}

it('lists all accessible companies and fetches shared organization usage once', async () => {
  const apiSource = source();
  const records = await loadCompanySubscriptions([{id: 2, name: 'Pioneer', organizationId: 42}, {id: 3, name: 'Dubai', parentCompanyId: 2}, {id: 5, name: 'Prabha', organization: {id: 99}}], 'all', apiSource);
  expect(records).toHaveLength(3);
  expect(records.map(record => record.organization.id)).toEqual([42, 42, 99]);
  expect(apiSource.limits.mock.calls).toEqual([[42, 2], [99, 5]]);
  expect(apiSource.employees).not.toHaveBeenCalled();
});

it('resolves older responses using the exact organization name from a company-scoped employee', async () => {
  const apiSource = source();
  apiSource.employees.mockResolvedValue({content: [{id: 7, companyId: 2, organizationName: 'Pioneer Group'}]});
  const records = await loadCompanySubscriptions([{id: 2, name: 'Different head office name'}, {id: 5, name: 'Prabha'}], 2, apiSource);
  expect(records).toHaveLength(1);
  expect(apiSource.employees.mock.calls).toEqual([[2, 0, 1]]);
  expect(apiSource.limits.mock.calls).toEqual([[42, 2]]);
  expect(records[0].limits.currentEmployees).toBe(50);
});

it('never guesses organization IDs or plan defaults for unlinked or wrongly scoped companies', async () => {
  const apiSource = source();
  apiSource.employees.mockResolvedValue([{companyId: 5, organizationName: 'Pioneer Group'}]);
  const records = await loadCompanySubscriptions([{id: 42, name: 'Pioneer Group'}], 'all', apiSource);
  expect(records[0]).toMatchObject({organization: null, limits: null, error: expect.stringContaining('No organization subscription link')});
  expect(apiSource.limits).not.toHaveBeenCalled();
});

it('keeps other companies visible when one plan request fails and preserves unavailable values', async () => {
  const apiSource = source();
  apiSource.limits.mockRejectedValueOnce(new Error('Usage unavailable')).mockResolvedValueOnce({plan: 'ENTERPRISE', maxEmployees: null});
  const records = await loadCompanySubscriptions([{id: 2, organizationId: 42}, {id: 5, organizationId: 99}], 'all', apiSource);
  expect(records[0]).toMatchObject({limits: null, error: 'Usage unavailable'});
  expect(records[1].limits.maxEmployees).toBeNull();
  expect(subscriptionLimit(null)).toBe('Unlimited');
  expect(subscriptionLimit(undefined)).toBe('Not provided');
  expect(subscriptionUsage(undefined, 50)).toBe('Not provided / 50');
  expect(subscriptionUsage(0, null)).toBe('0 / Unlimited');
});

it('does not fetch subscriptions for a company outside the accessible selector', async () => {
  const apiSource = source();
  expect(await loadCompanySubscriptions([{id: 2}], 5, apiSource)).toEqual([]);
  expect(apiSource.organizations).not.toHaveBeenCalled();
});
