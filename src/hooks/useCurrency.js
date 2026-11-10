import { useSelector } from 'react-redux'

/**
 * Returns the active company's currency code and a locale-aware formatter function.
 *
 * Automatically resolves the currency based on company country:
 *   - India (IN/IND) → INR formatted in Indian locale (₹)
 *   - UAE (AE)       → AED
 *   - UK (GB)        → GBP (£)
 *   - US (US)        → USD ($)
 */
export default function useCurrency() {
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
    (platformCompanies || []).find(c => String(c.id) === id) ||
    (companiesData || []).find(c => String(c.id) === id)     ||
    (String(selectedCompany?.id) === id ? selectedCompany : null) ||
    platformCompanies?.[0] ||
    companiesData?.[0] ||
    null

  const countryNormalized = (company?.country || '').trim().toLowerCase().replace(/[.\s_-]/g, '')
  let currency = company?.currency?.toUpperCase()?.trim() || ''

  // If country is India (or starts with ind), currency must be INR
  if (['india', 'in', 'ind'].includes(countryNormalized) || countryNormalized.startsWith('ind')) {
    currency = 'INR'
  } else if (!currency || currency === 'USD') {
    if (['unitedarabemirates', 'uae', 'ae', 'are', 'dubai'].includes(countryNormalized)) {
      currency = 'AED'
    } else if (['unitedkingdom', 'uk', 'gb', 'gbr', 'greatbritain', 'britain'].includes(countryNormalized)) {
      currency = 'GBP'
    } else if (['unitedstates', 'unitedstatesofamerica', 'us', 'usa'].includes(countryNormalized)) {
      currency = 'USD'
    } else if (!currency) {
      currency = 'INR'
    }
  }

  const locale = currency === 'INR' ? 'en-IN'
               : currency === 'AED' ? 'en-AE'
               : currency === 'GBP' ? 'en-GB'
               : 'en-US'

  const format = (amount) => {
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount ?? 0)
    } catch {
      return `${currency} ${Number(amount ?? 0).toFixed(2)}`
    }
  }

  return { currency, format }
}
