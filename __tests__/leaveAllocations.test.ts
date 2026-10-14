import {api, setApiSession} from '../src/api/client';
import {allocationPayload, companyLeaveAllocations, loadAllocationOptions} from '../src/utils/leaveAllocations';

afterEach(() => {
  jest.restoreAllMocks();
  setApiSession({});
});

it('scopes the allocation list and both form option endpoints to the selected company', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ok: true, text: async () => '[]'} as Response);
  setApiSession({token: 'test-token', companyId: 1});
  await api.leaveAllocations(2);
  await api.adminLeaveTypes(2);
  await api.allocationEmployees(2, 0, 200);
  expect(fetchMock.mock.calls.map(([url]) => String(url).replace(/^.*\/api/, ''))).toEqual([
    '/leave/allocations', '/leave/types', '/employees?filterByCompanyId=2&page=0&size=200&sort=id%2Casc',
  ]);
  fetchMock.mock.calls.forEach(([, request]) => {
    expect(request?.headers).toMatchObject({'X-Company-Id': '2', 'X-Filter-Company-Id': '2'});
  });
});

it('creates a new allocation with the selected company in both the body and headers', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ok: true, text: async () => '{"message":"Leave allocated successfully"}'} as Response);
  const data = {companyId: 2, employeeId: 7, leaveTypeId: 4, days: 14, year: 2026};
  await api.createLeaveAllocation(data);
  const [url, request] = fetchMock.mock.calls[0];
  expect(url).toMatch(/\/leave\/allocate$/);
  expect(request).toMatchObject({method: 'POST', headers: {'X-Company-Id': '2', 'X-Filter-Company-Id': '2'}});
  expect(JSON.parse(String(request?.body))).toEqual(data);
});

it('labels scoped DTOs and excludes allocations explicitly belonging to another company', () => {
  const result = companyLeaveAllocations({content: [
    {id: 1, employeeName: 'Alex', leaveTypeName: 'Annual', year: 2026},
    {id: 2, companyId: 3},
  ]}, {id: 2, name: 'Pioneer'});
  expect(result).toEqual([expect.objectContaining({id: 1, companyId: 2, companyName: 'Pioneer'})]);
});

it('loads all employee pages and excludes other company employees and leave types', async () => {
  const client = {
    allocationEmployees: jest.fn()
      .mockResolvedValueOnce({content: [{id: 7, companyId: 2}, {id: 8, companyId: 1}], page: {totalPages: 2}})
      .mockResolvedValueOnce({content: [{id: 9, companyId: '2'}], page: {totalPages: 2}}),
    adminLeaveTypes: jest.fn().mockResolvedValue([{id: 4, company: {id: 2}}, {id: 5, companyId: 1}]),
  };
  const options = await loadAllocationOptions(client, 2);
  expect(options.employees.map(item => item.id)).toEqual([7, 9]);
  expect(options.leaveTypes.map(item => item.id)).toEqual([4]);
  expect(client.allocationEmployees.mock.calls).toEqual([[2, 0, 200], [2, 1, 200]]);
});

const options = {employees: [{id: 7}], leaveTypes: [{id: 4}]};

it('validates company, employee, leave type, days and year before sending a request', () => {
  expect(allocationPayload(2, '7', '4', '1.5', '2026', options, [])).toEqual({companyId: 2, employeeId: 7, leaveTypeId: 4, days: 1.5, year: 2026});
  expect(() => allocationPayload('all', '7', '4', '1', '2026', options, [])).toThrow('Select a company');
  expect(() => allocationPayload(2, '8', '4', '1', '2026', options, [])).toThrow('employee in this company');
  expect(() => allocationPayload(2, '7', '5', '1', '2026', options, [])).toThrow('leave type for this company');
  for (const days of ['', '0', '-1', '0.25', 'abc', 'Infinity']) {
    expect(() => allocationPayload(2, '7', '4', days, '2026', options, [])).toThrow('increments of 0.5');
  }
  expect(() => allocationPayload(2, '7', '4', '1', '26', options, [])).toThrow('four-digit year');
});

it('blocks duplicate allocations instead of resetting an existing employee balance', () => {
  expect(() => allocationPayload(2, '7', '4', '14', '2026', options, [{employeeId: 7, leaveTypeId: 4, year: 2026}]))
    .toThrow('already has an allocation');
  expect(allocationPayload(2, '7', '4', '14', '2027', options, [{employeeId: 7, leaveTypeId: 4, year: 2026}]).year).toBe(2027);
});
