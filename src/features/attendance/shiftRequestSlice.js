import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchShiftRequests = createAsyncThunk('shiftRequests/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/shift-requests')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch shift requests')
  }
})

export const createShiftRequest = createAsyncThunk('shiftRequests/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/shift-requests', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create shift request')
  }
})

export const approveShiftRequest = createAsyncThunk('shiftRequests/approve', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/shift-requests/${id}/approve`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to approve shift request')
  }
})

export const rejectShiftRequest = createAsyncThunk('shiftRequests/reject', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/shift-requests/${id}/reject`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reject shift request')
  }
})

const shiftRequestSlice = createSlice({
  name: 'shiftRequests',
  initialState: { data: [], loading: false, error: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchShiftRequests.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchShiftRequests.fulfilled, (state, action) => { state.loading = false; state.data = action.payload.content || action.payload })
      .addCase(fetchShiftRequests.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createShiftRequest.fulfilled, (state, action) => { state.loading = false; state.data.unshift(action.payload) })
      .addCase(approveShiftRequest.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.data.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
      })
      .addCase(rejectShiftRequest.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.data.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
      })
  },
})

export const selectShiftRequests = (state) => state.shiftRequests.data
export const selectShiftRequestsLoading = (state) => state.shiftRequests.loading
export default shiftRequestSlice.reducer
