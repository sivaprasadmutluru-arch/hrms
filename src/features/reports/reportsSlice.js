import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchHeadcount = createAsyncThunk('reports/fetchHeadcount', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/reports/headcount', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch headcount report')
  }
})

export const fetchAttendanceReport = createAsyncThunk('reports/fetchAttendanceReport', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/reports/attendance', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch attendance report')
  }
})

export const fetchLeaveReport = createAsyncThunk('reports/fetchLeaveReport', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/reports/leave', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch leave report')
  }
})

export const fetchPayrollReport = createAsyncThunk('reports/fetchPayrollReport', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/reports/payroll', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch payroll report')
  }
})

export const exportReport = createAsyncThunk('reports/exportReport', async ({ type, from, to }, { rejectWithValue }) => {
  try {
    const res = await api.get('/reports/export', {
      params: { type, from, to },
      responseType: 'blob',
    })
    // Trigger browser download
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${type}_report_${from}_to_${to}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    return true
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to export report')
  }
})

const reportsSlice = createSlice({
  name: 'reports',
  initialState: {
    headcount: {},
    attendance: {},
    leave: {},
    payroll: {},
    loading: false,
    exporting: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchHeadcount.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchHeadcount.fulfilled, (state, action) => { state.loading = false; state.headcount = action.payload })
      .addCase(fetchHeadcount.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchAttendanceReport.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchAttendanceReport.fulfilled, (state, action) => { state.loading = false; state.attendance = action.payload })
      .addCase(fetchAttendanceReport.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchLeaveReport.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchLeaveReport.fulfilled, (state, action) => { state.loading = false; state.leave = action.payload })
      .addCase(fetchLeaveReport.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchPayrollReport.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchPayrollReport.fulfilled, (state, action) => { state.loading = false; state.payroll = action.payload })
      .addCase(fetchPayrollReport.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(exportReport.pending, (state) => { state.exporting = true })
      .addCase(exportReport.fulfilled, (state) => { state.exporting = false })
      .addCase(exportReport.rejected, (state) => { state.exporting = false })
  },
})

export const selectAll = (state) => state.reports
export const selectSelected = (state) => state.reports
export const selectLoading = (state) => state.reports.loading
export const selectExporting = (state) => state.reports.exporting
export const selectPagination = (state) => ({ page: 0, size: 20, total: 0 })
export const selectHeadcount = (state) => state.reports.headcount
export const selectAttendanceReport = (state) => state.reports.attendance
export const selectLeaveReport = (state) => state.reports.leave
export const selectPayrollReport = (state) => state.reports.payroll
export default reportsSlice.reducer
