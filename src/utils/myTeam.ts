export function pendingReview(item: any) {
  return item?.canReview === true && ['PENDING', 'REQUESTED'].includes(String(item?.status || '').toUpperCase());
}

export function validTeamRange(from: string, to: string) {
  const valid = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
    && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  return valid(from) && valid(to) && from <= to && (Date.parse(to) - Date.parse(from)) / 86400000 <= 366;
}

export function teamRecords(records: any[], employeeId: string, search: string, status: string) {
  const query = search.trim().toLowerCase();
  return records.filter(item => (!employeeId || String(item.employeeId) === employeeId)
    && (!query || [item.employeeName, item.leaveTypeName, item.requestType, item.reason, item.description].some(value => String(value || '').toLowerCase().includes(query)))
    && (status === 'ALL' || (status === 'PENDING' ? ['PENDING', 'REQUESTED'].includes(String(item.status).toUpperCase()) : String(item.status).toUpperCase() === status)));
}
