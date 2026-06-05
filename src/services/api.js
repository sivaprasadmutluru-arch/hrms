import axios from 'axios'
import { API_BASE_URL } from '../config/constants'

const api = axios.create({ baseURL: API_BASE_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (!config.headers['X-Company-Id']) {
    const selectedCompanyId = localStorage.getItem('selectedCompanyId')
    if (selectedCompanyId) {
      config.headers['X-Company-Id'] = selectedCompanyId
    } else {
      // Platform admins with no selectedCompanyId are in "All Companies" mode —
      // don't send a company header so the backend skips tenant scoping.
      // Regular users always need a company context, so fall back to user.companyId.
      const storedRoles = localStorage.getItem('roles')
      const isPlatformAdmin = storedRoles
        ? (() => { try { return JSON.parse(storedRoles).includes('PLATFORM_SUPER_ADMIN') } catch (_) { return false } })()
        : false
      if (!isPlatformAdmin) {
        const stored = localStorage.getItem('user')
        if (stored) {
          try {
            const user = JSON.parse(stored)
            if (user?.companyId) config.headers['X-Company-Id'] = user.companyId
          } catch (_) {}
        }
      }
    }
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    // Spring Boot 3.3+ VIA_DTO mode nests pagination metadata under a `page` key.
    // Flatten it to top-level so all slices can read totalElements/number/size as before.
    const d = response.data
    if (d && d.page && Array.isArray(d.content)) {
      response.data = {
        ...d,
        totalElements: d.page.totalElements,
        totalPages: d.page.totalPages,
        number: d.page.number,
        size: d.page.size,
      }
    }
    return response
  },
  (error) => {
    if (error.response?.status === 403 && error.response?.data?.message === 'ORGANIZATION_SUSPENDED') {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('roles')
      localStorage.removeItem('selectedCompanyId')
      window.location.href = '/suspended'
      return Promise.reject(error)
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
