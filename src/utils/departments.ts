function departmentItems(result: any): any[] {
  if (Array.isArray(result)) return result;
  if (!result || typeof result !== 'object') return [];
  for (const key of ['content', 'items', 'data', 'result']) {
    if (result[key] !== undefined && result[key] !== null) return departmentItems(result[key]);
  }
  return result.id != null && result.name ? [result] : [];
}

export function companyDepartments(result: any, company: {id: number | string; name: string}) {
  return departmentItems(result)
    .filter(item => {
      if (!item || typeof item !== 'object' || item.isActive === false) return false;
      const companyId = item.companyId ?? item.company?.id;
      return companyId == null || String(companyId) === String(company.id);
    })
    .map(item => ({
      ...item,
      companyId: company.id,
      companyName: company.name,
      managerName: item.managerName || item.manager?.fullName
        || [item.manager?.firstName, item.manager?.lastName].filter(Boolean).join(' ').trim(),
    }))
    .sort((a, b) => String(a.name || a.departmentName || '').localeCompare(String(b.name || b.departmentName || '')));
}
