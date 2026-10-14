import {loadCompanyOrgChart, orgAsArray, orgNodeDepartment, orgNodeRole} from '../src/utils/orgChart';
import {api, setApiSession} from '../src/api/client';

const pioneer = {id: 2, name: 'Pioneer Insurance'};
const prabha = {id: 1, name: 'Prabha Technologies'};

afterEach(() => {
  jest.restoreAllMocks();
  setApiSession({});
});

it('requests the selected company context without changing the login company', async () => {
  const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue({ok: true, text: async () => '[]'} as Response);
  setApiSession({token: 'test-token', companyId: prabha.id});
  await api.orgChart(pioneer.id);
  await api.orgChartEmployees(pioneer.id, 0, 200);
  await api.me();
  const [chartUrl, chartOptions] = fetchMock.mock.calls[0];
  expect(chartUrl).toContain('/employees/org-chart?companyId=2');
  expect(chartOptions?.headers).toMatchObject({'X-Company-Id': '2', 'X-Filter-Company-Id': '2'});
  expect(fetchMock.mock.calls[1][0]).toContain('filterByCompanyId=2');
  expect(fetchMock.mock.calls[1][1]?.headers).toMatchObject({'X-Company-Id': '2'});
  expect(fetchMock.mock.calls[2][1]?.headers).toMatchObject({'X-Company-Id': '1'});
});

it('loads each company independently even when employee IDs overlap', async () => {
  const client = {
    orgChart: jest.fn(async () => [{id: 7, name: 'Manager', department: 'Sales', jobRole: 'Lead', children: [{id: 8, name: 'Employee'}]}]),
    orgChartEmployees: jest.fn(),
  };
  const charts = await Promise.all([prabha, pioneer].map(company => loadCompanyOrgChart(client, company)));
  expect(client.orgChart.mock.calls).toEqual([[1], [2]]);
  expect(charts[0][0].__companyId).toBe(1);
  expect(charts[1][0].__companyId).toBe(2);
  expect(charts[1][0].children[0].__companyName).toBe(pioneer.name);
  expect(client.orgChartEmployees).not.toHaveBeenCalled();
});

it('falls back on an empty chart and loads every employee page for that company', async () => {
  const client = {
    orgChart: jest.fn().mockResolvedValue([]),
    orgChartEmployees: jest.fn()
      .mockResolvedValueOnce({content: [{id: 7, companyId: 2, fullName: 'Employee A'}], page: {totalPages: 2}})
      .mockResolvedValueOnce({content: [{id: 8, companyId: 2, fullName: 'Employee B'}, {id: 9, companyId: 1, fullName: 'Other company'}], page: {totalPages: 2}}),
  };
  const records = await loadCompanyOrgChart(client, pioneer);
  expect(records.map(employee => employee.id)).toEqual([7, 8]);
  expect(client.orgChartEmployees.mock.calls).toEqual([[2, 0, 200], [2, 1, 200]]);
});

it('supports a missing chart endpoint but reports employee loading failures', async () => {
  const client = {
    orgChart: jest.fn().mockRejectedValue(new Error('Not found')),
    orgChartEmployees: jest.fn().mockResolvedValue({content: [{id: 7, companyId: 2}]}),
  };
  expect(await loadCompanyOrgChart(client, pioneer)).toHaveLength(1);
  client.orgChartEmployees.mockRejectedValue(new Error('Access denied'));
  await expect(loadCompanyOrgChart(client, pioneer)).rejects.toThrow('Pioneer Insurance: Access denied');
});

it('reads the web chart and employee DTO department and role fields', () => {
  expect(orgNodeDepartment({department: 'Sales'})).toBe('Sales');
  expect(orgNodeRole({jobRole: 'Team lead', position: 'Sales executive'})).toBe('Team lead');
  expect(orgNodeDepartment({departmentName: 'Management'})).toBe('Management');
  expect(orgNodeRole({jobRoleName: 'COO', jobPositionName: 'Executive'})).toBe('COO');
  expect(orgNodeRole({position: 'Executive'})).toBe('Executive');
  expect(orgNodeDepartment({department: {name: 'Admin'}})).toBe('Admin');
  expect(orgAsArray({data: {content: []}})).toEqual([]);
  expect(orgAsArray({totalPages: 0})).toEqual([]);
});
