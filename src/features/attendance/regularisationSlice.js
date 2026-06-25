import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

// ─── Employee ─────────────────────────────────────────────────────────────────

export const fetchMyRequests = createAsyncThunk('regularisation/fetchMyRequests', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance/regularisation/my')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch your requests')
  }
})

export const submitRequest = createAsyncThunk('regularisation/submit', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/attendance/regularisation', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to submit request')
  }
})

// ─── Manager ──────────────────────────────────────────────────────────────────

export const fetchPendingManager = createAsyncThunk('regularisation/fetchPendingManager', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance/regularisation/pending-manager')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch pending requests')
  }
})

export const approveByManager = createAsyncThunk('regularisation/approveByManager', async ({ id, remarks }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/attendance/regularisation/${id}/approve-manager`, { remarks })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to approve')
  }
})

export const rejectByManager = createAsyncThunk('regularisation/rejectByManager', async ({ id, remarks }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/attendance/regularisation/${id}/reject-manager`, { remarks })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reject')
  }
})

// ─── HR ───────────────────────────────────────────────────────────────────────

export const fetchPendingHR = createAsyncThunk('regularisation/fetchPendingHR', async (companyId, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance/regularisation/pending-hr', { params: { companyId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch HR pending requests')
  }
})

export const approveByHR = createAsyncThunk('regularisation/approveByHR', async ({ id, remarks }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/attendance/regularisation/${id}/approve-hr`, { remarks })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to approve')
  }
})

export const rejectByHR = createAsyncThunk('regularisation/rejectByHR', async ({ id, remarks }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/attendance/regularisation/${id}/reject-hr`, { remarks })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reject')
  }
})

// ─── HR / Admin ───────────────────────────────────────────────────────────────

export const fetchAllForCompany = createAsyncThunk('regularisation/fetchAll', async (companyId, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance/regularisation', { params: { companyId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch records')
  }
})

export const fetchPendingCounts = createAsyncThunk('regularisation/fetchCounts', async (companyId, { rejectWithValue }) => {
  try {
    const params = companyId ? { companyId } : {}
    const res = await api.get('/attendance/regularisation/pending-counts', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch counts')
  }
})

// ─── Slice ────────────────────────────────────────────────────────────────────

const regularisationSlice = createSlice({
  name: 'regularisation',
  initialState: {
    myRequests: [],
    pendingManager: [],
    pendingHR: [],
    allRequests: [],
    pendingCounts: { pendingManager: 0, pendingHR: 0 },
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // My requests
      .addCase(fetchMyRequests.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchMyRequests.fulfilled, (state, action) => { state.loading = false; state.myRequests = action.payload })
      .addCase(fetchMyRequests.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      // Submit
      .addCase(submitRequest.pending, (state) => { state.loading = true; state.error = null })
      .addCase(submitRequest.fulfilled, (state, action) => {
        state.loading = false
        state.myRequests.unshift(action.payload)
      })
      .addCase(submitRequest.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      // Pending manager
      .addCase(fetchPendingManager.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchPendingManager.fulfilled, (state, action) => { state.loading = false; state.pendingManager = action.payload })
      .addCase(fetchPendingManager.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(approveByManager.pending, (state) => { state.loading = true; state.error = null })
      .addCase(approveByManager.fulfilled, (state, action) => {
        state.loading = false
        state.pendingManager = state.pendingManager.filter(r => r.id !== action.payload.id)
        if (state.pendingCounts.pendingManager > 0) state.pendingCounts.pendingManager--
      })
      .addCase(approveByManager.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(rejectByManager.pending, (state) => { state.loading = true; state.error = null })
      .addCase(rejectByManager.fulfilled, (state, action) => {
        state.loading = false
        state.pendingManager = state.pendingManager.filter(r => r.id !== action.payload.id)
        if (state.pendingCounts.pendingManager > 0) state.pendingCounts.pendingManager--
      })
      .addCase(rejectByManager.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      // Pending HR
      .addCase(fetchPendingHR.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchPendingHR.fulfilled, (state, action) => { state.loading = false; state.pendingHR = action.payload })
      .addCase(fetchPendingHR.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(approveByHR.pending, (state) => { state.loading = true; state.error = null })
      .addCase(approveByHR.fulfilled, (state, action) => {
        state.loading = false
        state.pendingHR = state.pendingHR.filter(r => r.id !== action.payload.id)
        if (state.pendingCounts.pendingHR > 0) state.pendingCounts.pendingHR--
      })
      .addCase(approveByHR.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(rejectByHR.pending, (state) => { state.loading = true; state.error = null })
      .addCase(rejectByHR.fulfilled, (state, action) => {
        state.loading = false
        state.pendingHR = state.pendingHR.filter(r => r.id !== action.payload.id)
        if (state.pendingCounts.pendingHR > 0) state.pendingCounts.pendingHR--
      })
      .addCase(rejectByHR.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      // All company requests
      .addCase(fetchAllForCompany.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchAllForCompany.fulfilled, (state, action) => { state.loading = false; state.allRequests = action.payload })
      .addCase(fetchAllForCompany.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      // Counts
      .addCase(fetchPendingCounts.fulfilled, (state, action) => { state.pendingCounts = action.payload })
  },
})

export const selectMyRequests = (state) => state.regularisation.myRequests
export const selectPendingManager = (state) => state.regularisation.pendingManager
export const selectPendingHR = (state) => state.regularisation.pendingHR
export const selectAllRequests = (state) => state.regularisation.allRequests
export const selectPendingCounts = (state) => state.regularisation.pendingCounts
export const selectRegLoading = (state) => state.regularisation.loading
export default regularisationSlice.reducer
