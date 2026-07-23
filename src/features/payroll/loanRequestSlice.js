import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

// ─── Employee ─────────────────────────────────────────────────────────────────

export const fetchMyLoanRequests = createAsyncThunk('loanRequests/fetchMy', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/payroll/loan-requests/my')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch your loan requests')
  }
})

export const submitLoanRequest = createAsyncThunk('loanRequests/submit', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/payroll/loan-requests', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to submit loan request')
  }
})

// ─── Admin / HR / Accountant ─────────────────────────────────────────────────

export const fetchPendingLoanApproval = createAsyncThunk('loanRequests/fetchPendingApproval', async (companyId, { rejectWithValue }) => {
  try {
    const res = await api.get('/payroll/loan-requests/pending-approval', { params: { companyId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch pending loan requests')
  }
})

export const approveLoanRequest = createAsyncThunk('loanRequests/approve', async ({ id, remarks }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/payroll/loan-requests/${id}/approve`, { remarks })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to approve')
  }
})

export const rejectLoanRequest = createAsyncThunk('loanRequests/reject', async ({ id, remarks }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/payroll/loan-requests/${id}/reject`, { remarks })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reject')
  }
})

export const fetchAllLoanRequestsForCompany = createAsyncThunk('loanRequests/fetchAll', async (companyId, { rejectWithValue }) => {
  try {
    const res = await api.get('/payroll/loan-requests', { params: { companyId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch loan requests')
  }
})

// ─── Slice ────────────────────────────────────────────────────────────────────

const loanRequestSlice = createSlice({
  name: 'loanRequests',
  initialState: {
    myRequests: [],
    pendingApproval: [],
    allRequests: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMyLoanRequests.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchMyLoanRequests.fulfilled, (state, action) => { state.loading = false; state.myRequests = action.payload })
      .addCase(fetchMyLoanRequests.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(submitLoanRequest.pending, (state) => { state.loading = true; state.error = null })
      .addCase(submitLoanRequest.fulfilled, (state, action) => { state.loading = false; state.myRequests.unshift(action.payload) })
      .addCase(submitLoanRequest.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchPendingLoanApproval.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchPendingLoanApproval.fulfilled, (state, action) => { state.loading = false; state.pendingApproval = action.payload })
      .addCase(fetchPendingLoanApproval.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(approveLoanRequest.fulfilled, (state, action) => {
        state.pendingApproval = state.pendingApproval.filter(r => r.id !== action.payload.id)
      })
      .addCase(rejectLoanRequest.fulfilled, (state, action) => {
        state.pendingApproval = state.pendingApproval.filter(r => r.id !== action.payload.id)
      })

      .addCase(fetchAllLoanRequestsForCompany.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchAllLoanRequestsForCompany.fulfilled, (state, action) => { state.loading = false; state.allRequests = action.payload })
      .addCase(fetchAllLoanRequestsForCompany.rejected, (state, action) => { state.loading = false; state.error = action.payload })
  },
})

export const selectMyLoanRequests = (state) => state.loanRequests.myRequests
export const selectPendingLoanApproval = (state) => state.loanRequests.pendingApproval
export const selectAllLoanRequests = (state) => state.loanRequests.allRequests
export const selectLoanRequestsLoading = (state) => state.loanRequests.loading
export default loanRequestSlice.reducer
