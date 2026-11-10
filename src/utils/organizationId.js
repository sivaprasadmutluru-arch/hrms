/** Stable public display of the persisted organization key (not a company/branch key). */
export function formatOrganizationId(id) {
  const value = id == null ? '' : String(id)
  return /^[1-9]\d*$/.test(value) ? `ORG-${value.padStart(6, '0')}` : '—'
}
