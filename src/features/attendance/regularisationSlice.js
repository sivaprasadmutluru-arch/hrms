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

export const fetchUnresolvedRegularisations = createAsyncThunk('regularisation/fetchUnresolved', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance/regularisation/unresolved')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch unresolved attendance')
  }
})

// ─── Admin / HR Manager ─────────────────────────────────────────────────────────

export const fetchPendingApproval = createAsyncThunk('regularisation/fetchPendingApproval', async (companyId, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance/regularisation/pending-approval', { params: { companyId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch pending requests')
  }
})

export const approveRequest = createAsyncThunk('regularisation/approve', async ({ id, remarks }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/attendance/regularisation/${id}/approve`, { remarks })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to approve')
  }
})

export const rejectRequest = createAsyncThunk('regularisation/reject', async ({ id, remarks }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/attendance/regularisation/${id}/reject`, { remarks })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reject')
  }
})

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
    pendingApproval: [],
    allRequests: [],
    unresolved: [],
    pendingCounts: { pendingApproval: 0 },
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
        state.unresolved = state.unresolved.filter(u => u.attendanceId !== action.payload.attendanceId)
      })
      .addCase(submitRequest.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      // Unresolved (reminder)
      .addCase(fetchUnresolvedRegularisations.fulfilled, (state, action) => { state.unresolved = action.payload })

      // Pending approval
      .addCase(fetchPendingApproval.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchPendingApproval.fulfilled, (state, action) => { state.loading = false; state.pendingApproval = action.payload })
      .addCase(fetchPendingApproval.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(approveRequest.pending, (state) => { state.loading = true; state.error = null })
      .addCase(approveRequest.fulfilled, (state, action) => {
        state.loading = false
        state.pendingApproval = state.pendingApproval.filter(r => r.id !== action.payload.id)
        if (state.pendingCounts.pendingApproval > 0) state.pendingCounts.pendingApproval--
      })
      .addCase(approveRequest.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(rejectRequest.pending, (state) => { state.loading = true; state.error = null })
      .addCase(rejectRequest.fulfilled, (state, action) => {
        state.loading = false
        state.pendingApproval = state.pendingApproval.filter(r => r.id !== action.payload.id)
        if (state.pendingCounts.pendingApproval > 0) state.pendingCounts.pendingApproval--
      })
      .addCase(rejectRequest.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      // All company requests
      .addCase(fetchAllForCompany.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchAllForCompany.fulfilled, (state, action) => { state.loading = false; state.allRequests = action.payload })
      .addCase(fetchAllForCompany.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      // Counts
      .addCase(fetchPendingCounts.fulfilled, (state, action) => { state.pendingCounts = action.payload })
  },
})

export const selectMyRequests = (state) => state.regularisation.myRequests
export const selectPendingApproval = (state) => state.regularisation.pendingApproval
export const selectAllRequests = (state) => state.regularisation.allRequests
export const selectUnresolved = (state) => state.regularisation.unresolved
export const selectPendingCounts = (state) => state.regularisation.pendingCounts
export const selectRegLoading = (state) => state.regularisation.loading
export default regularisationSlice.reducer
