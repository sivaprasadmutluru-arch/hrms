import {api, setApiSession} from '../src/api/client';
import {companyDepartments} from '../src/utils/departments';

afterEach(() => {
  jest.restoreAllMocks();
  setApiSession({});
});

it('uses the selected company to load departments without changing the login context', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ok: true, text: async () => '[]'} as Response);
  setApiSession({token: 'test-token', companyId: 1});
  await api.departments(2);
  await api.departments(3);
  await api.me();
  expect(fetchMock.mock.calls[0][0]).toMatch(/\/departments$/);
  expect(fetchMock.mock.calls[0][1]?.headers).toMatchObject({'X-Company-Id': '2', 'X-Filter-Company-Id': '2'});
  expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({'X-Company-Id': '3', 'X-Filter-Company-Id': '3'});
  expect(fetchMock.mock.calls[2][1]?.headers).toMatchObject({'X-Company-Id': '1'});
});

it('shows only active departments for the selected company, with their manager and company labels', () => {
  const records = companyDepartments([
    {id: 1, name: 'Sales', company: {id: 2}, manager: {firstName: 'Alex', lastName: 'Patel'}},
    {id: 2, name: 'Admin', companyId: '2'},
    {id: 3, name: 'Finance', companyId: 1},
    {id: 4, name: 'Archived', companyId: 2, isActive: false},
  ], {id: 2, name: 'Pioneer'});
  expect(records.map(item => item.name)).toEqual(['Admin', 'Sales']);
  expect(records[1]).toMatchObject({companyId: 2, companyName: 'Pioneer', managerName: 'Alex Patel'});
});

it('creates a department under the selected company in both the URL and request context', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ok: true, text: async () => '{"id":42,"name":"Human Resources"}'} as Response);
  setApiSession({token: 'test-token', companyId: 1});
  const result = await api.createDepartment({name: 'Human Resources'}, 3);
  const [url, options] = fetchMock.mock.calls[0];
  expect(url).toMatch(/\/departments\?companyId=3$/);
  expect(options).toMatchObject({method: 'POST', headers: {'X-Company-Id': '3', 'X-Filter-Company-Id': '3'}});
  expect(JSON.parse(String(options?.body))).toEqual({name: 'Human Resources'});
  expect(result).toMatchObject({id: 42, name: 'Human Resources'});
});

it('handles scoped responses without company fields and empty paginated responses', () => {
  expect(companyDepartments({data: {content: [{id: 1, name: 'HR'}]}}, {id: 3, name: 'WonderGifts'}))
    .toEqual([expect.objectContaining({companyId: 3, companyName: 'WonderGifts', name: 'HR'})]);
  expect(companyDepartments({content: []}, {id: 3, name: 'WonderGifts'})).toEqual([]);
});
