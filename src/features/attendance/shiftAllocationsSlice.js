import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchShiftAllocations = createAsyncThunk('shiftAllocations/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/shift-allocations', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch shift allocations')
  }
})

export const createShiftAllocation = createAsyncThunk('shiftAllocations/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/shift-allocations', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create shift allocation')
  }
})

export const updateShiftAllocation = createAsyncThunk('shiftAllocations/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/shift-allocations/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update shift allocation')
  }
})

export const deleteShiftAllocation = createAsyncThunk('shiftAllocations/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/shift-allocations/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete shift allocation')
  }
})

export const approveShiftAllocation = createAsyncThunk('shiftAllocations/approve', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/shift-allocations/${id}/approve`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to approve shift allocation')
  }
})

export const cancelShiftAllocation = createAsyncThunk('shiftAllocations/cancel', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/shift-allocations/${id}/cancel`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to cancel shift allocation')
  }
})

export const bulkAllocateShifts = createAsyncThunk('shiftAllocations/bulkAllocate', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/shift-allocations/bulk-allocate', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to bulk allocate shifts')
  }
})

const shiftAllocationsSlice = createSlice({
  name: 'shiftAllocations',
  initialState: {
    data: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchShiftAllocations.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchShiftAllocations.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload.content || action.payload
      })
      .addCase(fetchShiftAllocations.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createShiftAllocation.fulfilled, (state, action) => { state.data.unshift(action.payload) })
      .addCase(updateShiftAllocation.fulfilled, (state, action) => {
        const idx = state.data.findIndex(s => s.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
      })
      .addCase(deleteShiftAllocation.fulfilled, (state, action) => {
        state.data = state.data.filter(s => s.id !== action.payload)
      })
      .addCase(approveShiftAllocation.fulfilled, (state, action) => {
        const idx = state.data.findIndex(s => s.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
      })
      .addCase(cancelShiftAllocation.fulfilled, (state, action) => {
        const idx = state.data.findIndex(s => s.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
      })
      .addCase(bulkAllocateShifts.pending, (state) => { state.loading = true })
      .addCase(bulkAllocateShifts.fulfilled, (state) => { state.loading = false })
      .addCase(bulkAllocateShifts.rejected, (state, action) => { state.loading = false; state.error = action.payload })
  },
})

export const selectShiftAllocations = (state) => state.shiftAllocations.data
export const selectShiftAllocationsLoading = (state) => state.shiftAllocations.loading
export default shiftAllocationsSlice.reducer
