import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchAuditLogs = createAsyncThunk('audit/fetchLogs', async ({ entityType, page = 0, size = 20 } = {}, { rejectWithValue }) => {
  try {
    const params = { page, size }
    if (entityType) params.entityType = entityType
    const res = await api.get('/audit/logs', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch audit logs')
  }
})

const auditSlice = createSlice({
  name: 'audit',
  initialState: {
    logs: [],
    pagination: { page: 0, size: 20, total: 0 },
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAuditLogs.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.loading = false
        state.logs = action.payload.content || action.payload
        if (action.payload.totalElements !== undefined) {
          state.pagination.total = action.payload.totalElements
          state.pagination.page = action.payload.number ?? state.pagination.page
          state.pagination.size = action.payload.size ?? state.pagination.size
        }
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => { state.loading = false; state.error = action.payload })
  },
})

export const selectAuditLogs = (state) => state.audit.logs
export const selectAuditPagination = (state) => state.audit.pagination
export const selectAuditLoading = (state) => state.audit.loading
export default auditSlice.reducer
