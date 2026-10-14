type Company = {id: number | string; name: string};

export function allocationItems(result: any): any[] {
  if (Array.isArray(result)) return result;
  if (!result || typeof result !== 'object') return [];
  for (const key of ['content', 'items', 'data', 'result']) {
    if (result[key] != null) return allocationItems(result[key]);
  }
  return result.id != null ? [result] : [];
}

export function allocationCompanyItems(result: any, companyId: number | string) {
  return allocationItems(result).filter(item => {
    if (!item || typeof item !== 'object') return false;
    const id = item.companyId ?? item.company?.id ?? item.employee?.companyId ?? item.employee?.company?.id;
    return item.isActive !== false && (id == null || String(id) === String(companyId));
  });
}

export function companyLeaveAllocations(result: any, company: Company) {
  return allocationCompanyItems(result, company.id).map(item => ({...item, companyId: company.id, companyName: company.name}));
}

export async function loadAllocationOptions(client: {
  allocationEmployees: (companyId: number | string, page: number, size: number) => Promise<any>;
  adminLeaveTypes: (companyId: number | string) => Promise<any>;
}, companyId: number | string) {
  async function employees() {
    const items: any[] = [];
    const size = 200;
    let page = 0;
    while (true) {
      const result = await client.allocationEmployees(companyId, page, size);
      const batch = allocationItems(result);
      items.push(...allocationCompanyItems(result, companyId));
      const totalPages = (result?.page || result?.data?.page || result)?.totalPages;
      if (!batch.length || result?.last === true || (typeof totalPages === 'number' ? page + 1 >= totalPages : batch.length < size)) break;
      page += 1;
    }
    return items;
  }
  const [employeeOptions, types] = await Promise.all([employees(), client.adminLeaveTypes(companyId)]);
  return {employees: employeeOptions, leaveTypes: allocationCompanyItems(types, companyId)};
}

export function allocationPayload(companyId: number | string, employeeId: string, leaveTypeId: string, daysText: string, yearText: string, options: {employees: any[]; leaveTypes: any[]}, existing: any[]) {
  if (!Number.isSafeInteger(Number(companyId)) || Number(companyId) <= 0) throw new Error('Select a company.');
  if (!options.employees.some(item => String(item.id) === employeeId)) throw new Error('Select an employee in this company.');
  if (!options.leaveTypes.some(item => String(item.id) === leaveTypeId)) throw new Error('Select a leave type for this company.');
  const days = Number(daysText);
  if (!daysText.trim() || !Number.isFinite(days) || days < 0.5 || !Number.isInteger(days * 2)) throw new Error('Enter leave days in increments of 0.5.');
  if (!/^\d{4}$/.test(yearText.trim()) || Number(yearText) < 1900) throw new Error('Enter a valid four-digit year.');
  if (existing.some(item => String(item.employeeId) === employeeId && String(item.leaveTypeId) === leaveTypeId && Number(item.year) === Number(yearText))) {
    throw new Error('This employee already has an allocation for this leave type and year.');
  }
  return {employeeId: Number(employeeId), leaveTypeId: Number(leaveTypeId), days, year: Number(yearText), companyId: Number(companyId)};
}
