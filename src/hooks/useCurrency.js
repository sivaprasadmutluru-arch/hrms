import { useSelector } from 'react-redux'

/**
 * Returns the active company's currency code and a formatter function.
 *
 * Companies can live in three different Redux locations depending on role/page:
 *   - state.platform.companies  → loaded by CompanySwitcher (most reliable)
 *   - state.companies.data      → loaded by fetchMyCompany / fetchAll
 *   - state.companies.selected  → loaded by fetchById
 *
 * Falls back to 'USD' if no match found.
 */
export default function useCurrency() {
  // Use Redux-tracked selectedCompanyId so the hook re-renders on company switch
  // Fall back to user's own companyId for ENTERPRISE_ADMIN/BRANCH_ADMIN (who have no selectedCompanyId)
  const selectedCompanyId = useSelector(s => s.auth.selectedCompanyId)
  const userCompanyId     = useSelector(s => s.auth.user?.companyId)
  const selectedId = selectedCompanyId
    ?? localStorage.getItem('selectedCompanyId')
    ?? userCompanyId

  const platformCompanies = useSelector(s => s.platform.companies)
  const companiesData     = useSelector(s => s.companies.data)
  const selectedCompany   = useSelector(s => s.companies.selected)

  const id = String(selectedId)
  const company =
    platformCompanies.find(c => String(c.id) === id) ||
    companiesData.find(c => String(c.id) === id)     ||
    (String(selectedCompany?.id) === id ? selectedCompany : null)

  const currency = company?.currency || 'USD'

  const format = (amount) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount ?? 0)
    } catch {
      return `${currency} ${Number(amount ?? 0).toFixed(2)}`
    }
  }

  return { currency, format }
}
