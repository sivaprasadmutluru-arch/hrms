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
  },
})

export const selectWorkTypeRequests = (state) => state.workTypeRequests.data
export const selectWorkTypeRequestsLoading = (state) => state.workTypeRequests.loading
export default workTypeRequestSlice.reducer
