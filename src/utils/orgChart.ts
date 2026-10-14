export const ORG_CHILD_KEYS = ['children', 'directReports', 'subordinates', 'reports', 'reportees', 'teamMembers'];

type ChartCompany = {id: number | string; name: string};
type ChartApi = {
  orgChart: (companyId: number | string) => Promise<any>;
  orgChartEmployees: (companyId: number | string, page: number, size: number) => Promise<any>;
};

function valueAt(item: any, path: string): any {
  return path.split('.').reduce((value, key) => value?.[key], item);
}

function textField(item: any, paths: string[], fallback = ''): string {
  for (const path of paths) {
    const value = valueAt(item, path);
    if ((typeof value === 'string' || typeof value === 'number') && String(value).trim()) return String(value).trim();
  }
  return fallback;
}

export function orgAsArray(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return [];
  for (const key of ['root', 'roots', 'rootNodes', 'nodes', 'items', 'content', 'employees', 'data', 'result']) {
    if (value[key] !== undefined && value[key] !== null) return orgAsArray(value[key]);
  }
  return orgNodeId(value) || textField(value, ['name', 'fullName', 'employeeName']) ? [value] : [];
}

export function orgNodeId(item: any) {
  return textField(item, ['id', 'employeeId', 'employee.id', 'userId', 'uuid', 'code', 'employeeCode']);
}

export function orgNodeName(item: any) {
  return textField(item, ['fullName', 'employeeName', 'name', 'employee.fullName', 'employee.name'],
    [textField(item, ['firstName', 'employee.firstName']), textField(item, ['lastName', 'employee.lastName'])].filter(Boolean).join(' ') || 'Employee');
}

export function orgNodeRole(item: any) {
  return textField(item, ['jobRoleName', 'jobRole.name', 'jobRole', 'employee.jobRoleName', 'jobPositionName', 'positionName', 'position.name', 'position', 'designation', 'roleName', 'role.name', 'employee.jobPositionName', 'employee.roleName']);
}

export function orgNodeDepartment(item: any) {
  return textField(item, ['departmentName', 'department.name', 'department', 'employee.departmentName', 'employee.department.name', 'employee.department', 'workInfo.departmentName']);
}

export function orgNodeCompany(item: any) {
  return textField(item, ['__companyName', 'companyName', 'company.name', 'employee.companyName', 'employee.company.name', 'organizationName', 'organization.name']);
}

function matchesCompany(item: any, company: ChartCompany) {
  const recordCompanyId = textField(item, ['companyId', 'company.id', 'employee.companyId', 'employee.company.id']);
  if (recordCompanyId) return recordCompanyId === String(company.id);
  const name = textField(item, ['companyName', 'company.name', 'employee.companyName', 'employee.company.name']);
  return !name || name.toLowerCase() === company.name.toLowerCase();
}

function annotateOrgRecords(items: any[], company: ChartCompany): any[] {
  return items.filter(item => item && typeof item === 'object' && matchesCompany(item, company)).map(item => {
    const copy = {...item, __companyId: company.id, __companyName: company.name};
    ORG_CHILD_KEYS.forEach(key => {
      if (Array.isArray(copy[key])) copy[key] = annotateOrgRecords(copy[key], company);
    });
    return copy;
  });
}

export async function loadCompanyOrgChart(client: ChartApi, company: ChartCompany): Promise<any[]> {
  try {
    const chart = annotateOrgRecords(orgAsArray(await client.orgChart(company.id)), company);
    if (chart.length) return chart;
  } catch {
    // Older servers may not expose the chart endpoint; use the scoped employee list.
  }

  const records: any[] = [];
  const size = 200;
  let page = 0;
  try {
    while (true) {
      const result = await client.orgChartEmployees(company.id, page, size);
      const items = orgAsArray(result);
      records.push(...annotateOrgRecords(items, company));
      const metadata = result?.page || result?.data?.page || result;
      const totalPages = metadata?.totalPages;
      if (!items.length || result?.last === true || (typeof totalPages === 'number' ? page + 1 >= totalPages : items.length < size)) break;
      page += 1;
    }
    return records;
  } catch (error: any) {
    throw new Error(`${company.name}: ${error?.message || 'Unable to load organization chart'}`);
  }
}
