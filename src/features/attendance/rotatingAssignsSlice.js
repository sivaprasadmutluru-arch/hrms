import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

// ─── Rotating Shift Assigns ───────────────────────────────────────────────────
export const fetchRotatingShiftAssigns = createAsyncThunk('rotatingAssigns/fetchShifts', async (companyId, { rejectWithValue }) => {
  try {
    const res = await api.get('/rotating-shift-assigns', { params: { companyId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch rotating shift assigns')
  }
})

export const createRotatingShiftAssign = createAsyncThunk('rotatingAssigns/createShift', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/rotating-shift-assigns', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create rotating shift assign')
  }
})

export const updateRotatingShiftAssign = createAsyncThunk('rotatingAssigns/updateShift', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/rotating-shift-assigns/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update rotating shift assign')
  }
})

export const deleteRotatingShiftAssign = createAsyncThunk('rotatingAssigns/deleteShift', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/rotating-shift-assigns/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete rotating shift assign')
  }
})

export const rotateShiftAssign = createAsyncThunk('rotatingAssigns/rotateShift', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/rotating-shift-assigns/${id}/rotate`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to trigger rotation')
  }
})

export const bulkAssignRotatingShifts = createAsyncThunk('rotatingAssigns/bulkShift', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/rotating-shift-assigns/bulk-assign', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to bulk assign rotating shifts')
  }
})

// ─── Rotating Work Type Assigns ───────────────────────────────────────────────
export const fetchRotatingWorkTypeAssigns = createAsyncThunk('rotatingAssigns/fetchWorkTypes', async (companyId, { rejectWithValue }) => {
  try {
    const res = await api.get('/rotating-work-type-assigns', { params: { companyId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch rotating work type assigns')
  }
})

export const createRotatingWorkTypeAssign = createAsyncThunk('rotatingAssigns/createWorkType', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/rotating-work-type-assigns', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create rotating work type assign')
  }
})

export const updateRotatingWorkTypeAssign = createAsyncThunk('rotatingAssigns/updateWorkType', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/rotating-work-type-assigns/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update rotating work type assign')
  }
})

export const deleteRotatingWorkTypeAssign = createAsyncThunk('rotatingAssigns/deleteWorkType', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/rotating-work-type-assigns/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete rotating work type assign')
  }
})

export const bulkAssignRotatingWorkTypes = createAsyncThunk('rotatingAssigns/bulkWorkType', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/rotating-work-type-assigns/bulk-assign', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to bulk assign rotating work types')
  }
})

const rotatingAssignsSlice = createSlice({
  name: 'rotatingAssigns',
  initialState: {
    shiftAssigns: [],
    workTypeAssigns: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRotatingShiftAssigns.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchRotatingShiftAssigns.fulfilled, (state, action) => {
        state.loading = false
        state.shiftAssigns = action.payload.content || action.payload
      })
      .addCase(fetchRotatingShiftAssigns.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createRotatingShiftAssign.fulfilled, (state, action) => { state.shiftAssigns.unshift(action.payload) })
      .addCase(updateRotatingShiftAssign.fulfilled, (state, action) => {
        const idx = state.shiftAssigns.findIndex(s => s.id === action.payload.id)
        if (idx !== -1) state.shiftAssigns[idx] = action.payload
      })
      .addCase(deleteRotatingShiftAssign.fulfilled, (state, action) => {
        state.shiftAssigns = state.shiftAssigns.filter(s => s.id !== action.payload)
      })
      .addCase(rotateShiftAssign.fulfilled, (state, action) => {
        const idx = state.shiftAssigns.findIndex(s => s.id === action.payload.id)
        if (idx !== -1) state.shiftAssigns[idx] = action.payload
      })
      .addCase(fetchRotatingWorkTypeAssigns.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchRotatingWorkTypeAssigns.fulfilled, (state, action) => {
        state.loading = false
        state.workTypeAssigns = action.payload.content || action.payload
      })
      .addCase(fetchRotatingWorkTypeAssigns.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createRotatingWorkTypeAssign.fulfilled, (state, action) => { state.workTypeAssigns.unshift(action.payload) })
      .addCase(updateRotatingWorkTypeAssign.fulfilled, (state, action) => {
        const idx = state.workTypeAssigns.findIndex(s => s.id === action.payload.id)
        if (idx !== -1) state.workTypeAssigns[idx] = action.payload
      })
      .addCase(deleteRotatingWorkTypeAssign.fulfilled, (state, action) => {
        state.workTypeAssigns = state.workTypeAssigns.filter(s => s.id !== action.payload)
      })
  },
})

export const selectShiftAssigns = (state) => state.rotatingAssigns.shiftAssigns
export const selectWorkTypeAssigns = (state) => state.rotatingAssigns.workTypeAssigns
export const selectRotatingAssignsLoading = (state) => state.rotatingAssigns.loading
export default rotatingAssignsSlice.reducer
