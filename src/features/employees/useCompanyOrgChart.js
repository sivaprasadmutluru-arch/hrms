import { useEffect, useState } from 'react'
import api from '../../services/api'
import { validateCompanyChartData } from './orgChartGrouping'

export default function useCompanyOrgChart(companyId) {
  const [result, setResult] = useState({ companyId: null, nodes: [], departments: [], loaded: false, error: '' })
  useEffect(() => {
    if (!companyId) return
    const controller = new AbortController()
    let active = true
    const config = {
      params: { companyId },
      headers: { 'X-Company-Id': String(companyId), 'X-Filter-Company-Id': String(companyId) },
      signal: controller.signal,
    }
    Promise.all([api.get('/employees/org-chart', config), api.get('/departments', config)])
      .then(([chart, departments]) => {
        const data = validateCompanyChartData(companyId, chart.data, departments.data)
        if (active) setResult({ companyId, ...data, loaded: true, error: '' })
      })
      .catch(error => {
        if (active) setResult({ companyId, nodes: [], departments: [], loaded: true,
          error: error.response?.data?.message || error.message || 'Unable to load the company org chart' })
      })
    return () => { active = false; controller.abort() }
  }, [companyId])
  // Never render the previous company's data while a new request is pending.
  if (!companyId || String(result.companyId) !== String(companyId)) {
    return { nodes: [], departments: [], loaded: false, error: '' }
  }
  return result
}
