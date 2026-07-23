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

// ─── RPT-005: central Reports repository ───────────────────────────────────
export const generateReport = createAsyncThunk('reports/generateReport', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/reports/repository/generate', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to generate report')
  }
})

export const fetchReportHistory = createAsyncThunk('reports/fetchReportHistory', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/reports/repository', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch report history')
  }
})

export const downloadGeneratedReport = createAsyncThunk('reports/downloadGeneratedReport', async ({ id, filename }, { rejectWithValue }) => {
  try {
    const res = await api.get(`/reports/repository/${id}/download`, { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename || `report-${id}.xlsx`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    return true
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to download report')
  }
})

export const renameReport = createAsyncThunk('reports/renameReport', async ({ id, reportName }, { rejectWithValue }) => {
  try {
    const res = await api.patch(`/reports/repository/${id}/rename`, { reportName })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to rename report')
  }
})

export const archiveReport = createAsyncThunk('reports/archiveReport', async (id, { rejectWithValue }) => {
  try {
    const res = await api.patch(`/reports/repository/${id}/archive`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to archive report')
  }
})

export const unarchiveReport = createAsyncThunk('reports/unarchiveReport', async (id, { rejectWithValue }) => {
  try {
    const res = await api.patch(`/reports/repository/${id}/unarchive`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to unarchive report')
  }
})

const reportsSlice = createSlice({
  name: 'reports',
  initialState: {
    headcount: {},
    attendance: {},
    leave: {},
    payroll: {},
    history: [],
    historyTotal: 0,
    loading: false,
    historyLoading: false,
    exporting: false,
    generating: false,
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

      .addCase(generateReport.pending, (state) => { state.generating = true; state.error = null })
      .addCase(generateReport.fulfilled, (state) => { state.generating = false })
      .addCase(generateReport.rejected, (state, action) => { state.generating = false; state.error = action.payload })

      .addCase(fetchReportHistory.pending, (state) => { state.historyLoading = true; state.error = null })
      .addCase(fetchReportHistory.fulfilled, (state, action) => {
        state.historyLoading = false
        state.history = action.payload.content || action.payload
        state.historyTotal = action.payload.page?.totalElements ?? state.history.length
      })
      .addCase(fetchReportHistory.rejected, (state, action) => { state.historyLoading = false; state.error = action.payload })

      .addCase(downloadGeneratedReport.rejected, (state, action) => { state.error = action.payload })

      .addCase(renameReport.fulfilled, (state, action) => {
        const idx = state.history.findIndex((r) => r.id === action.payload.id)
        if (idx !== -1) state.history[idx] = action.payload
      })
      .addCase(renameReport.rejected, (state, action) => { state.error = action.payload })

      .addCase(archiveReport.fulfilled, (state, action) => {
        const idx = state.history.findIndex((r) => r.id === action.payload.id)
        if (idx !== -1) state.history[idx] = action.payload
      })
      .addCase(archiveReport.rejected, (state, action) => { state.error = action.payload })

      .addCase(unarchiveReport.fulfilled, (state, action) => {
        const idx = state.history.findIndex((r) => r.id === action.payload.id)
        if (idx !== -1) state.history[idx] = action.payload
      })
      .addCase(unarchiveReport.rejected, (state, action) => { state.error = action.payload })
  },
})

export const selectAll = (state) => state.reports
export const selectSelected = (state) => state.reports
export const selectLoading = (state) => state.reports.loading
export const selectHistoryLoading = (state) => state.reports.historyLoading
export const selectExporting = (state) => state.reports.exporting
export const selectPagination = (state) => ({ page: 0, size: 20, total: 0 })
export const selectHeadcount = (state) => state.reports.headcount
export const selectAttendanceReport = (state) => state.reports.attendance
export const selectLeaveReport = (state) => state.reports.leave
export const selectPayrollReport = (state) => state.reports.payroll
export const selectReportHistory = (state) => state.reports.history
export const selectReportHistoryTotal = (state) => state.reports.historyTotal
export const selectGenerating = (state) => state.reports.generating
export default reportsSlice.reducer
