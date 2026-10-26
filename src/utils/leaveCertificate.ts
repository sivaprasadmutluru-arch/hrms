// Controls upload visibility only; the server calculates policy-specific leave days.
export function showLeaveCertificate(leaveName: string, startDate: string, endDate: string): boolean {
  const validDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString().slice(0, 10) === value;
  return leaveName.replace(/[^a-z]/gi, '').toLowerCase() === 'sickleave'
    && validDate(startDate) && validDate(endDate) && endDate > startDate;
}
