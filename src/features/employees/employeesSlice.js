import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchAll = createAsyncThunk('employees/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const { companyIdOverride, ...queryParams } = params || {}
    const headers = companyIdOverride ? { 'X-Company-Id': companyIdOverride } : {}
    console.log('[employeesSlice] fetchAll → X-Company-Id override:', companyIdOverride ?? '(none)', '| headers sent:', headers)
    const res = await api.get('/employees', { params: queryParams, headers })
    console.log('[employeesSlice] fetchAll ← response:', { totalElements: res.data?.totalElements, contentLength: res.data?.content?.length, keys: Object.keys(res.data || {}) })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch employees')
  }
})

// Platform Super Admin only — fetches employees across ALL organization schemas
export const fetchAllGlobal = createAsyncThunk('employees/fetchAllGlobal', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/employees/global', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch global employees')
  }
})

export const create = createAsyncThunk('employees/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/employees', data)
    return res.data
  } catch (err) {
    const d = err.response?.data
    const msg = d?.message || (d?.errors ? Object.values(d.errors).join(', ') : null) || 'Failed to create employee'
    return rejectWithValue(msg)
  }
})

export const update = createAsyncThunk('employees/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/employees/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update employee')
  }
})

export const remove = createAsyncThunk('employees/remove', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/employees/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete employee')
  }
})

export const uploadPhoto = createAsyncThunk('employees/uploadPhoto', async ({ id, file }, { rejectWithValue }) => {
  try {
    const formData = new FormData()
    formData.append('photo', file)
    const res = await api.post(`/employees/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to upload photo')
  }
})

export const fetchOrgChart = createAsyncThunk('employees/fetchOrgChart', async (params, { rejectWithValue }) => {
  try { const res = await api.get('/employees/org-chart', { params }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to fetch org chart') }
})
export const bulkArchiveEmployees = createAsyncThunk('employees/bulkArchive', async (ids, { rejectWithValue }) => {
  try { const res = await api.post('/employees/bulk-archive', ids); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to bulk archive') }
})
export const fetchEmployeeDashboard = createAsyncThunk('employees/fetchDashboard', async (params, { rejectWithValue }) => {
  try { const res = await api.get('/employees/dashboard', { params }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to fetch dashboard') }
})

export const exportWorkInfo = createAsyncThunk('employees/exportWorkInfo', async (companyId, { rejectWithValue }) => {
  try {
    const res = await api.get('/employees/work-info/export', { params: { companyId }, responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'work-info.xlsx')
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to export work info')
  }
})

export const importWorkInfo = createAsyncThunk('employees/importWorkInfo', async ({ companyId, file }, { rejectWithValue }) => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post('/employees/work-info/import', formData, {
      params: { companyId },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to import work info')
  }
})

export const bulkUpdateEmployees = createAsyncThunk('employees/bulkUpdate', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/employees/bulk-update', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to bulk update employees')
  }
})

export const fetchEncashmentCondition = createAsyncThunk('employees/fetchEncashmentCondition', async ({ id, companyId }, { rejectWithValue }) => {
  try {
    const cfg = companyId ? { headers: { 'X-Company-Id': companyId } } : {}
    const res = await api.get(`/employees/${id}/encashment-condition`, cfg)
    return res.data
  } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to fetch encashment condition') }
})

export const upsertEncashmentCondition = createAsyncThunk('employees/upsertEncashmentCondition', async ({ id, data, companyId }, { rejectWithValue }) => {
  try {
    const cfg = companyId ? { headers: { 'X-Company-Id': companyId } } : {}
    const res = await api.post(`/employees/${id}/encashment-condition`, data, cfg)
    return res.data
  } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to save encashment condition') }
})

export const deleteEncashmentCondition = createAsyncThunk('employees/deleteEncashmentCondition', async ({ id, companyId }, { rejectWithValue }) => {
  try {
    const cfg = companyId ? { headers: { 'X-Company-Id': companyId } } : {}
    await api.delete(`/employees/${id}/encashment-condition`, cfg)
    return id
  } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed to delete encashment condition') }
})

const employeesSlice = createSlice({
  name: 'employees',
  initialState: {
    data: [],
    pagination: { page: 0, size: 20, total: 0 },
    loading: false,
    error: null,
    orgChart: [],
    employeeDashboard: null,
    encashmentCondition: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAll.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchAll.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload.content || action.payload
        if (action.payload.totalElements !== undefined) {
          state.pagination.total = action.payload.totalElements
          state.pagination.page = action.payload.number ?? state.pagination.page
          state.pagination.size = action.payload.size ?? state.pagination.size
        }
      })
      .addCase(fetchAll.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchAllGlobal.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchAllGlobal.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload.content || action.payload
        if (action.payload.totalElements !== undefined) {
          state.pagination.total = action.payload.totalElements
          state.pagination.page = action.payload.number ?? state.pagination.page
          state.pagination.size = action.payload.size ?? state.pagination.size
        }
      })
      .addCase(fetchAllGlobal.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(create.pending, (state) => { state.loading = true; state.error = null })
      .addCase(create.fulfilled, (state, action) => { state.loading = false; state.data.unshift(action.payload) })
      .addCase(create.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(update.pending, (state) => { state.loading = true; state.error = null })
      .addCase(update.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.data.findIndex(e => e.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
      })
      .addCase(update.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(remove.pending, (state) => { state.loading = true; state.error = null })
      .addCase(remove.fulfilled, (state, action) => {
        state.loading = false
        state.data = state.data.filter(e => e.id !== action.payload)
      })
      .addCase(remove.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(uploadPhoto.pending, (state) => { state.loading = true; state.error = null })
      .addCase(uploadPhoto.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.data.findIndex(e => e.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
      })
      .addCase(uploadPhoto.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(fetchOrgChart.fulfilled, (state, action) => { state.orgChart = action.payload })
      .addCase(fetchEmployeeDashboard.fulfilled, (state, action) => { state.employeeDashboard = action.payload })
      .addCase(fetchEncashmentCondition.fulfilled, (state, action) => { state.encashmentCondition = action.payload })
      .addCase(upsertEncashmentCondition.fulfilled, (state, action) => { state.encashmentCondition = action.payload })
      .addCase(deleteEncashmentCondition.fulfilled, (state) => { state.encashmentCondition = null })
  },
})

export const selectAll = (state) => state.employees.data
export const selectLoading = (state) => state.employees.loading
export const selectPagination = (state) => state.employees.pagination
export default employeesSlice.reducer
