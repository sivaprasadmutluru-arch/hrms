import {allocationItems} from './leaveAllocations';

export const DOCUMENT_FORMATS = ['ANY', 'PDF', 'DOCX', 'XLSX', 'JPG', 'PNG'] as const;

export function companyDocumentRequests(result: any, company: {id: number | string; name: string}) {
  return allocationItems(result)
    .filter(item => {
      if (!item || typeof item !== 'object') return false;
      const id = item.companyId ?? item.company?.id;
      return id == null || String(id) === String(company.id);
    })
    .map(item => ({...item, companyId: company.id, companyName: company.name}));
}

export function documentRequestPayload(companyId: number | string, values: {title: string; documentFormat: string; maxSizeMb: string; description: string; employeeIds: string[]}, employees: any[]) {
  if (!Number.isSafeInteger(Number(companyId)) || Number(companyId) <= 0) throw new Error('Select a company.');
  const title = values.title.trim();
  if (!title) throw new Error('Enter a request title.');
  if (title.length > 255) throw new Error('Use a title of 255 characters or fewer.');
  if (!DOCUMENT_FORMATS.some(format => format === values.documentFormat)) throw new Error('Select a supported document format.');
  const sizeText = values.maxSizeMb.trim();
  const maxSizeMb = sizeText ? Number(sizeText) : null;
  if (maxSizeMb !== null && (!Number.isSafeInteger(maxSizeMb) || maxSizeMb <= 0 || maxSizeMb > 2147483647)) throw new Error('Enter a positive whole number for the maximum size in MB.');
  const employeeIds = [...new Set(values.employeeIds)];
  if (employeeIds.some(id => !Number.isSafeInteger(Number(id)) || Number(id) <= 0 || !employees.some(employee => String(employee.id) === id
    && String(employee.companyId ?? employee.company?.id ?? companyId) === String(companyId)))) {
    throw new Error('Select employees from this company only.');
  }
  return {
    title,
    documentFormat: values.documentFormat,
    maxSizeMb,
    description: values.description.trim(),
    company: {id: Number(companyId)},
    employees: employeeIds.map(id => ({id: Number(id)})),
  };
}
