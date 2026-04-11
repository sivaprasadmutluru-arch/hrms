import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchMyProfile = createAsyncThunk('ess/fetchMyProfile', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/ess/me')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch profile')
  }
})

export const fetchMyLeave = createAsyncThunk('ess/fetchMyLeave', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/ess/my-leave')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch leave requests')
  }
})

export const fetchEssLeaveTypes = createAsyncThunk('ess/fetchLeaveTypes', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/ess/leave-types')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch leave types')
  }
})

export const applyLeave = createAsyncThunk('ess/applyLeave', async (params, { rejectWithValue }) => {
  try {
    const res = await api.post('/ess/apply-leave', null, { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to apply for leave')
  }
})

export const fetchMyAttendance = createAsyncThunk('ess/fetchMyAttendance', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/ess/my-attendance', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch attendance')
  }
})

export const checkIn = createAsyncThunk('ess/checkIn', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/ess/check-in', data || {})
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Check-in failed')
  }
})

export const fetchMyPayslips = createAsyncThunk('ess/fetchMyPayslips', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/ess/my-payslips')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch payslips')
  }
})

const essSlice = createSlice({
  name: 'ess',
  initialState: {
    profile: null,
    leaveRequests: [],
    leaveTypes: [],
    attendance: [],
    payslips: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    const pending = (state) => { state.loading = true; state.error = null }
    const rejected = (state, action) => { state.loading = false; state.error = action.payload }

    builder
      .addCase(fetchMyProfile.pending, pending)
      .addCase(fetchMyProfile.fulfilled, (state, action) => { state.loading = false; state.profile = action.payload })
      .addCase(fetchMyProfile.rejected, rejected)

      .addCase(fetchMyLeave.pending, pending)
      .addCase(fetchMyLeave.fulfilled, (state, action) => { state.loading = false; state.leaveRequests = action.payload })
      .addCase(fetchMyLeave.rejected, rejected)

      .addCase(fetchEssLeaveTypes.fulfilled, (state, action) => { state.leaveTypes = action.payload })

      .addCase(applyLeave.pending, pending)
      .addCase(applyLeave.fulfilled, (state, action) => { state.loading = false; state.leaveRequests = [action.payload, ...state.leaveRequests] })
      .addCase(applyLeave.rejected, rejected)

      .addCase(fetchMyAttendance.pending, pending)
      .addCase(fetchMyAttendance.fulfilled, (state, action) => { state.loading = false; state.attendance = action.payload })
      .addCase(fetchMyAttendance.rejected, rejected)

      .addCase(checkIn.pending, pending)
      .addCase(checkIn.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.attendance.findIndex(a => a.id === action.payload.id)
        if (idx >= 0) state.attendance[idx] = action.payload
        else state.attendance = [action.payload, ...state.attendance]
      })
      .addCase(checkIn.rejected, rejected)

      .addCase(fetchMyPayslips.pending, pending)
      .addCase(fetchMyPayslips.fulfilled, (state, action) => { state.loading = false; state.payslips = action.payload })
      .addCase(fetchMyPayslips.rejected, rejected)
  },
})

export const selectEssProfile = (state) => state.ess.profile
export const selectEssLeaveRequests = (state) => state.ess.leaveRequests
export const selectEssLeaveTypes = (state) => state.ess.leaveTypes
export const selectEssAttendance = (state) => state.ess.attendance
export const selectEssPayslips = (state) => state.ess.payslips
export const selectEssLoading = (state) => state.ess.loading

export default essSlice.reducer
