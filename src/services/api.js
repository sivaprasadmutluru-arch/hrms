import axios from 'axios'
import { API_BASE_URL } from '../config/constants'

const api = axios.create({ baseURL: API_BASE_URL })

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  const stored = localStorage.getItem('user')
  if (stored) {
    try {
      const user = JSON.parse(stored)
      // Only set from stored user if not already overridden by the specific request
      if (user?.companyId && !config.headers['X-Company-Id']) {
        config.headers['X-Company-Id'] = user.companyId
      }
    } catch (_) {}
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
