import {api, setApiSession} from '../src/api/client';
import {companyLeaveTypes} from '../src/utils/leaveTypes';

afterEach(() => {
  jest.restoreAllMocks();
  setApiSession({});
});

it('switches the admin Leave Types request context without changing the employee session', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ok: true, text: async () => '[]'} as Response);
  setApiSession({token: 'test-token', companyId: 1});
  await api.adminLeaveTypes(2);
  await api.adminLeaveTypes(3);
  await api.leaveTypes();
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/leave\/types$/);
  expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({'X-Company-Id': '2', 'X-Filter-Company-Id': '2'});
  expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({'X-Company-Id': '3', 'X-Filter-Company-Id': '3'});
  expect(fetchMock.mock.calls[2][0]).toMatch(/\/ess\/leave-types$/);
  expect(fetchMock.mock.calls[2][1]?.headers).toMatchObject({'X-Company-Id': '1'});
});

it('creates leave types in the selected company instead of the login company', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ok: true, text: async () => '{"id":8,"name":"Annual"}'} as Response);
  setApiSession({token: 'test-token', companyId: 1});
  const data = {name: 'Annual', company: {id: 2}, totalDays: 30};
  await api.createLeaveType(data, 2);
  expect(fetchMock.mock.calls[0][1]).toMatchObject({method: 'POST', headers: {'X-Company-Id': '2', 'X-Filter-Company-Id': '2'}});
  expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual(data);
});

it('keeps the scoped DTOs and applicable organization policies, and drops unrelated company policies', () => {
  const records = companyLeaveTypes({content: [
    {id: 1, name: 'Annual'},
    {id: 2, name: 'Sick', companyId: '2'},
    {id: 3, name: 'Organization policy', companyId: 1, isOrganizationWide: true},
    {id: 4, name: 'Other company', company: {id: 3}},
  ]}, 2);
  expect(records.map(item => item.id)).toEqual([1, 2, 3]);
  expect(records.every(item => item.__companyId === 2)).toBe(true);
  expect(companyLeaveTypes({content: []}, 2)).toEqual([]);
});
