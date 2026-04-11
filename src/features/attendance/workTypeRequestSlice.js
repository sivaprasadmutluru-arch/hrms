import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchWorkTypeRequests = createAsyncThunk('workTypeRequests/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/work-type-requests')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch work type requests')
  }
})

export const createWorkTypeRequest = createAsyncThunk('workTypeRequests/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/work-type-requests', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create work type request')
  }
})

export const approveWorkTypeRequest = createAsyncThunk('workTypeRequests/approve', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/work-type-requests/${id}/approve`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to approve work type request')
  }
})

export const rejectWorkTypeRequest = createAsyncThunk('workTypeRequests/reject', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/work-type-requests/${id}/reject`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reject work type request')
  }
})

export const cancelWorkTypeRequest = createAsyncThunk('workTypeRequests/cancel', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/work-type-requests/${id}/cancel`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to cancel work type request')
  }
})

export const bulkApproveWorkTypeRequests = createAsyncThunk('workTypeRequests/bulkApprove', async (ids, { rejectWithValue }) => {
  try {
    const res = await api.post('/work-type-requests/bulk-approve', { ids })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to bulk approve work type requests')
  }
})

export const bulkCancelWorkTypeRequests = createAsyncThunk('workTypeRequests/bulkCancel', async (ids, { rejectWithValue }) => {
  try {
    const res = await api.post('/work-type-requests/bulk-cancel', { ids })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to bulk cancel work type requests')
  }
})

export const exportWorkTypeRequests = createAsyncThunk('workTypeRequests/export', async (companyId, { rejectWithValue }) => {
  try {
    const res = await api.get('/work-type-requests/export', { params: { companyId }, responseType: 'blob' })
    const url = URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'work-type-requests.xlsx')
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to export work type requests')
  }
})

const workTypeRequestSlice = createSlice({
  name: 'workTypeRequests',
  initialState: { data: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkTypeRequests.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchWorkTypeRequests.fulfilled, (state, action) => { state.loading = false; state.data = action.payload.content || action.payload })
      .addCase(fetchWorkTypeRequests.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createWorkTypeRequest.fulfilled, (state, action) => { state.loading = false; state.data.unshift(action.payload) })
      .addCase(approveWorkTypeRequest.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.data.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
      })
      .addCase(rejectWorkTypeRequest.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.data.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
      })
      .addCase(cancelWorkTypeRequest.fulfilled, (state, action) => {
        const idx = state.data.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
      })
      .addCase(bulkApproveWorkTypeRequests.fulfilled, (state) => { state.loading = false })
      .addCase(bulkCancelWorkTypeRequests.fulfilled, (state) => { state.loading = false })
  },
})

export const selectWorkTypeRequests = (state) => state.workTypeRequests.data
export const selectWorkTypeRequestsLoading = (state) => state.workTypeRequests.loading
export default workTypeRequestSlice.reducer
