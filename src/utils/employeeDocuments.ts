import {allocationItems} from './leaveAllocations';

export async function loadDocumentEmployees(loadPage: (companyId: number | string, page: number, size: number) => Promise<any>, company: {id: number | string; name: string}) {
  const employees = new Map<string, any>();
  const size = 200;
  let page = 0;
  while (true) {
    const result = await loadPage(company.id, page, size);
    const items = allocationItems(result);
    items.forEach(item => {
      if (!item || item.id == null || item.isActive === false) return;
      const companyId = item.companyId ?? item.company?.id;
      if (companyId != null && String(companyId) !== String(company.id)) return;
      employees.set(String(item.id), {...item, companyId: company.id, companyName: company.name});
    });
    const totalPages = (result?.page || result?.data?.page || result)?.totalPages;
    if (!items.length || result?.last === true || (typeof totalPages === 'number' ? page + 1 >= totalPages : items.length < size)) break;
    page += 1;
  }
  return Array.from(employees.values()).sort((a, b) => String(a.fullName || a.name || '').localeCompare(String(b.fullName || b.name || '')));
}

export function documentsForEmployee(result: any, employeeId: number | string, companyId: number | string) {
  return allocationItems(result).filter(item => {
    if (!item || typeof item !== 'object') return false;
    const ownerId = item.employeeId ?? item.employee?.id;
    const ownerCompanyId = item.companyId ?? item.company?.id ?? item.employee?.companyId ?? item.employee?.company?.id;
    return (ownerId == null || String(ownerId) === String(employeeId))
      && (ownerCompanyId == null || String(ownerCompanyId) === String(companyId));
  });
}

const DOCUMENT_MIME: Record<string, string> = {
  pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png',
  webp: 'image/webp', heic: 'image/heic', txt: 'text/plain', csv: 'text/csv',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

export function documentFile(item: any, baseUrl: string) {
  const path = String(item.filePath || item.fileUrl || item.documentPath || item.url || '').trim();
  if (!path) return null;
  let url: URL;
  const apiUrl = new URL(baseUrl);
  if (/^https?:\/\//i.test(path)) {
    url = new URL(path);
  } else {
    const relative = path.replace(/^\/?(?:api\/)?files\//, '').replace(/^\/+/, '');
    const segments = relative.split('/');
    if (segments.some(segment => segment === '.' || segment === '..')) throw new Error('Invalid document file path.');
    url = new URL(`${baseUrl.replace(/\/$/, '')}/files/${segments.map(encodeURIComponent).join('/')}`);
  }
  const filename = String(item.fileName || url.pathname.split('/').pop() || 'document');
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return {
    url: url.toString(),
    authenticated: url.origin === apiUrl.origin,
    filename: filename.replace(/[^a-zA-Z0-9._-]/g, '-'),
    mime: DOCUMENT_MIME[extension] || 'application/octet-stream',
  };
}
