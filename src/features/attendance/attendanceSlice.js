import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchAll = createAsyncThunk('attendance/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch attendance records')
  }
})

export const fetchById = createAsyncThunk('attendance/fetchById', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/attendance/${id}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch attendance record')
  }
})

export const create = createAsyncThunk('attendance/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/attendance', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create attendance record')
  }
})

export const update = createAsyncThunk('attendance/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/attendance/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update attendance record')
  }
})

export const remove = createAsyncThunk('attendance/remove', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/attendance/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete attendance record')
  }
})

export const approve = createAsyncThunk('attendance/approve', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/attendance/${id}/approve`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to approve attendance record')
  }
})

export const reject = createAsyncThunk('attendance/reject', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/attendance/${id}/reject`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reject attendance record')
  }
})

export const fetchGraceTimes = createAsyncThunk('attendance/fetchGraceTimes', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance/grace-times')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch grace times')
  }
})

export const createGraceTime = createAsyncThunk('attendance/createGraceTime', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/attendance/grace-times', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create grace time')
  }
})

export const updateGraceTime = createAsyncThunk('attendance/updateGraceTime', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/attendance/grace-times/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update grace time')
  }
})

export const deleteGraceTime = createAsyncThunk('attendance/deleteGraceTime', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/attendance/grace-times/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete grace time')
  }
})

export const fetchValidationConditions = createAsyncThunk('attendance/fetchValidationConditions', async (companyId, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance/validation-conditions', { params: { companyId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch validation conditions')
  }
})

export const updateValidationConditions = createAsyncThunk('attendance/updateValidationConditions', async ({ companyId, data }, { rejectWithValue }) => {
  try {
    const res = await api.put('/attendance/validation-conditions', data, { params: { companyId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update validation conditions')
  }
})

export const fetchAttendanceComments = createAsyncThunk('attendance/fetchAttendanceComments', async (attendanceId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/attendance/${attendanceId}/comments`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch comments')
  }
})

export const addAttendanceComment = createAsyncThunk('attendance/addAttendanceComment', async ({ attendanceId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/attendance/${attendanceId}/comments`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add comment')
  }
})

// ─── General Settings ──────────────────────────────────────────────────────

export const fetchGeneralSettings = createAsyncThunk('attendance/fetchGeneralSettings', async (companyId, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance/general-settings', { params: { companyId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch general settings')
  }
})

export const upsertGeneralSettings = createAsyncThunk('attendance/upsertGeneralSettings', async ({ companyId, data }, { rejectWithValue }) => {
  try {
    const res = await api.put('/attendance/general-settings', data, { params: { companyId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update general settings')
  }
})

// ─── Allowed IPs ───────────────────────────────────────────────────────────

export const fetchAllowedIPs = createAsyncThunk('attendance/fetchAllowedIPs', async (companyId, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance/allowed-ips', { params: { companyId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch allowed IPs')
  }
})

export const createAllowedIP = createAsyncThunk('attendance/createAllowedIP', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/attendance/allowed-ips', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create allowed IP')
  }
})

export const updateAllowedIP = createAsyncThunk('attendance/updateAllowedIP', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/attendance/allowed-ips/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update allowed IP')
  }
})

export const deleteAllowedIP = createAsyncThunk('attendance/deleteAllowedIP', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/attendance/allowed-ips/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete allowed IP')
  }
})

// ─── Late Come / Early Out ─────────────────────────────────────────────────

export const fetchLateComeEarlyOut = createAsyncThunk('attendance/fetchLateComeEarlyOut', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance/late-come-early-out')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch late/early records')
  }
})

export const createLateComeEarlyOut = createAsyncThunk('attendance/createLateComeEarlyOut', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/attendance/late-come-early-out', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create late/early record')
  }
})

export const deleteLateComeEarlyOut = createAsyncThunk('attendance/deleteLateComeEarlyOut', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/attendance/late-come-early-out/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete late/early record')
  }
})

// ─── Batch Attendance ──────────────────────────────────────────────────────

export const fetchBatches = createAsyncThunk('attendance/fetchBatches', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance/batches')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch batches')
  }
})

export const createBatch = createAsyncThunk('attendance/createBatch', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/attendance/batches', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create batch')
  }
})

export const updateBatch = createAsyncThunk('attendance/updateBatch', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/attendance/batches/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update batch')
  }
})

export const deleteBatch = createAsyncThunk('attendance/deleteBatch', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/attendance/batches/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete batch')
  }
})

// ─── Work Records ──────────────────────────────────────────────────────────

export const fetchWorkRecords = createAsyncThunk('attendance/fetchWorkRecords', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance/work-records', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch work records')
  }
})

export const createWorkRecord = createAsyncThunk('attendance/createWorkRecord', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/attendance/work-records', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create work record')
  }
})

export const updateWorkRecord = createAsyncThunk('attendance/updateWorkRecord', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/attendance/work-records/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update work record')
  }
})

export const deleteWorkRecord = createAsyncThunk('attendance/deleteWorkRecord', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/attendance/work-records/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete work record')
  }
})

// ─── Register ──────────────────────────────────────────────────────────────

export const fetchRegister = createAsyncThunk('attendance/fetchRegister', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance/register', {
      params,
      headers: { 'X-Company-Id': params.companyId },
    })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch attendance register')
  }
})

export const updateRegisterCell = createAsyncThunk('attendance/updateRegisterCell', async ({ employeeId, date, status, companyId }, { rejectWithValue }) => {
  try {
    const res = await api.patch(`/attendance/register/${employeeId}/${date}`, { status }, {
      params: { companyId },
      headers: { 'X-Company-Id': companyId },
    })
    return { employeeId, date, cell: res.data }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update attendance cell')
  }
})

// ─── Calendar ──────────────────────────────────────────────────────────────

export const fetchCalendar = createAsyncThunk('attendance/fetchCalendar', async ({ year, month, employeeId }, { rejectWithValue }) => {
  try {
    const params = { year, month }
    if (employeeId) params.employeeId = employeeId
    const res = await api.get('/attendance/calendar', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch attendance calendar')
  }
})

// ─── Clock In / Clock Out / Not-In / Not-Out / Today / Bulk Overtime / Dashboard ─

export const clockIn = createAsyncThunk('attendance/clockIn', async (params, { rejectWithValue }) => {
  try {
    const res = await api.post('/attendance/clock-in', null, { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to clock in')
  }
})

export const clockOut = createAsyncThunk('attendance/clockOut', async (params, { rejectWithValue }) => {
  try {
    const res = await api.post('/attendance/clock-out', null, { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to clock out')
  }
})

export const fetchNotIn = createAsyncThunk('attendance/fetchNotIn', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance/not-in', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch not-in employees')
  }
})

export const fetchNotOut = createAsyncThunk('attendance/fetchNotOut', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance/not-out', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch not-out employees')
  }
})

export const fetchToday = createAsyncThunk('attendance/fetchToday', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance/today', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch today attendance')
  }
})

export const bulkApproveOvertime = createAsyncThunk('attendance/bulkApproveOvertime', async (ids, { rejectWithValue }) => {
  try {
    const res = await api.post('/attendance/overtime/bulk-approve', ids)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to bulk approve overtime')
  }
})

export const fetchAttendanceDashboard = createAsyncThunk('attendance/fetchDashboard', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance/dashboard', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch attendance dashboard')
  }
})

// ─── Overtime ──────────────────────────────────────────────────────────────

export const fetchOvertime = createAsyncThunk('attendance/fetchOvertime', async (companyId, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance/overtime', { params: { companyId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch overtime records')
  }
})

export const approveOvertime = createAsyncThunk('attendance/approveOvertime', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/attendance/overtime/${id}/approve`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to approve overtime')
  }
})

export const rejectOvertime = createAsyncThunk('attendance/rejectOvertime', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/attendance/overtime/${id}/reject`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reject overtime')
  }
})

export const requestValidation = createAsyncThunk('attendance/requestValidation', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/attendance/${id}/request-validation`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to submit validation request')
  }
})

export const fetchValidationPending = createAsyncThunk('attendance/fetchValidationPending', async (companyId, { rejectWithValue }) => {
  try {
    const res = await api.get('/attendance/validation-pending', { params: { companyId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch validation pending records')
  }
})

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState: {
    data: [],
    selected: {},
    graceTimes: [],
    validationConditions: null,
    generalSettings: null,
    allowedIPs: [],
    lateComeEarlyOut: [],
    overtimeRecords: [],
    batches: [],
    workRecords: [],
    workRecordsPagination: { page: 0, size: 20, total: 0 },
    comments: [],
    calendarDays: [],
    calendarLoading: false,
    register: null,
    registerLoading: false,
    pagination: { page: 0, size: 20, total: 0 },
    loading: false,
    error: null,
    notIn: [],
    notOut: [],
    today: [],
    dashboard: null,
    validationPending: [],
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAll.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchAll.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload.content || action.payload
        if (action.payload.totalElements !== undefined) {
          state.pagination.total = action.payload.totalElements
          state.pagination.page = action.payload.number ?? state.pagination.page
          state.pagination.size = action.payload.size ?? state.pagination.size
        }
      })
      .addCase(fetchAll.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchById.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchById.fulfilled, (state, action) => { state.loading = false; state.selected = action.payload })
      .addCase(fetchById.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(create.pending, (state) => { state.loading = true; state.error = null })
      .addCase(create.fulfilled, (state, action) => { state.loading = false; state.data.push(action.payload) })
      .addCase(create.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(update.pending, (state) => { state.loading = true; state.error = null })
      .addCase(update.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.data.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
        if (state.selected?.id === action.payload.id) state.selected = action.payload
      })
      .addCase(update.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(remove.pending, (state) => { state.loading = true; state.error = null })
      .addCase(remove.fulfilled, (state, action) => {
        state.loading = false
        state.data = state.data.filter((item) => item.id !== action.payload)
      })
      .addCase(remove.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(approve.pending, (state) => { state.loading = true; state.error = null })
      .addCase(approve.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.data.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
        if (state.selected?.id === action.payload.id) state.selected = action.payload
      })
      .addCase(approve.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(reject.pending, (state) => { state.loading = true; state.error = null })
      .addCase(reject.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.data.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
        if (state.selected?.id === action.payload.id) state.selected = action.payload
      })
      .addCase(reject.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchGraceTimes.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchGraceTimes.fulfilled, (state, action) => { state.loading = false; state.graceTimes = action.payload.content || action.payload })
      .addCase(fetchGraceTimes.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(createGraceTime.fulfilled, (state, action) => { state.graceTimes.push(action.payload) })
      .addCase(updateGraceTime.fulfilled, (state, action) => {
        const idx = state.graceTimes.findIndex(g => g.id === action.payload.id)
        if (idx !== -1) state.graceTimes[idx] = action.payload
      })
      .addCase(deleteGraceTime.fulfilled, (state, action) => {
        state.graceTimes = state.graceTimes.filter(g => g.id !== action.payload)
      })

      .addCase(fetchValidationConditions.fulfilled, (state, action) => { state.validationConditions = action.payload })
      .addCase(updateValidationConditions.fulfilled, (state, action) => { state.validationConditions = action.payload })

      .addCase(fetchAttendanceComments.fulfilled, (state, action) => { state.comments = action.payload.content || action.payload })
      .addCase(addAttendanceComment.fulfilled, (state, action) => { state.comments.push(action.payload) })

      // General Settings
      .addCase(fetchGeneralSettings.fulfilled, (state, action) => { state.generalSettings = action.payload })
      .addCase(upsertGeneralSettings.fulfilled, (state, action) => { state.generalSettings = action.payload })

      // Allowed IPs
      .addCase(fetchAllowedIPs.fulfilled, (state, action) => { state.allowedIPs = action.payload.content || action.payload })
      .addCase(createAllowedIP.fulfilled, (state, action) => { state.allowedIPs.push(action.payload) })
      .addCase(updateAllowedIP.fulfilled, (state, action) => {
        const idx = state.allowedIPs.findIndex(i => i.id === action.payload.id)
        if (idx !== -1) state.allowedIPs[idx] = action.payload
      })
      .addCase(deleteAllowedIP.fulfilled, (state, action) => {
        state.allowedIPs = state.allowedIPs.filter(i => i.id !== action.payload)
      })

      // Late Come / Early Out
      .addCase(fetchLateComeEarlyOut.fulfilled, (state, action) => { state.lateComeEarlyOut = action.payload.content || action.payload })
      .addCase(createLateComeEarlyOut.fulfilled, (state, action) => { state.lateComeEarlyOut.push(action.payload) })
      .addCase(deleteLateComeEarlyOut.fulfilled, (state, action) => {
        state.lateComeEarlyOut = state.lateComeEarlyOut.filter(r => r.id !== action.payload)
      })

      // Batch Attendance
      .addCase(fetchBatches.fulfilled, (state, action) => { state.batches = action.payload.content || action.payload })
      .addCase(createBatch.fulfilled, (state, action) => { state.batches.push(action.payload) })
      .addCase(updateBatch.fulfilled, (state, action) => {
        const idx = state.batches.findIndex(b => b.id === action.payload.id)
        if (idx !== -1) state.batches[idx] = action.payload
      })
      .addCase(deleteBatch.fulfilled, (state, action) => {
        state.batches = state.batches.filter(b => b.id !== action.payload)
      })

      // Work Records
      .addCase(fetchWorkRecords.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchWorkRecords.fulfilled, (state, action) => {
        state.loading = false
        state.workRecords = action.payload.content || action.payload
        if (action.payload.totalElements !== undefined) {
          state.workRecordsPagination.total = action.payload.totalElements
          state.workRecordsPagination.page = action.payload.number ?? state.workRecordsPagination.page
          state.workRecordsPagination.size = action.payload.size ?? state.workRecordsPagination.size
        }
      })
      .addCase(fetchWorkRecords.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createWorkRecord.fulfilled, (state, action) => { state.workRecords.push(action.payload) })
      .addCase(updateWorkRecord.fulfilled, (state, action) => {
        const idx = state.workRecords.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.workRecords[idx] = action.payload
      })
      .addCase(deleteWorkRecord.fulfilled, (state, action) => {
        state.workRecords = state.workRecords.filter(r => r.id !== action.payload)
      })

      // Calendar
      .addCase(fetchCalendar.pending, (state) => { state.calendarLoading = true })
      .addCase(fetchCalendar.fulfilled, (state, action) => { state.calendarLoading = false; state.calendarDays = action.payload })
      .addCase(fetchCalendar.rejected, (state) => { state.calendarLoading = false })

      // Register
      .addCase(fetchRegister.pending, (state) => { state.registerLoading = true })
      .addCase(fetchRegister.fulfilled, (state, action) => { state.registerLoading = false; state.register = action.payload })
      .addCase(fetchRegister.rejected, (state) => { state.registerLoading = false })
      .addCase(updateRegisterCell.fulfilled, (state, action) => {
        if (!state.register) return
        const { employeeId, date, cell } = action.payload
        const row = state.register.employees.find(e => e.employeeId === employeeId)
        if (row) row.days[date] = cell
      })

      // Overtime
      .addCase(fetchOvertime.fulfilled, (state, action) => { state.overtimeRecords = action.payload })
      .addCase(approveOvertime.fulfilled, (state, action) => {
        const idx = state.overtimeRecords.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.overtimeRecords[idx] = action.payload
      })
      .addCase(rejectOvertime.fulfilled, (state, action) => {
        const idx = state.overtimeRecords.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.overtimeRecords[idx] = action.payload
      })

      // Clock In / Clock Out / Not-In / Not-Out / Today / Dashboard
      .addCase(fetchNotIn.fulfilled, (state, action) => { state.notIn = action.payload })
      .addCase(fetchNotOut.fulfilled, (state, action) => { state.notOut = action.payload })
      .addCase(fetchToday.fulfilled, (state, action) => { state.today = action.payload })
      .addCase(fetchAttendanceDashboard.fulfilled, (state, action) => { state.dashboard = action.payload })
      .addCase(fetchValidationPending.fulfilled, (state, action) => { state.validationPending = action.payload })
      .addCase(requestValidation.fulfilled, (state, action) => {
        const idx = state.data.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
      })
  },
})

export const selectAll = (state) => state.attendance.data
export const selectSelected = (state) => state.attendance.selected
export const selectLoading = (state) => state.attendance.loading
export const selectPagination = (state) => state.attendance.pagination
export const selectGraceTimes = (state) => state.attendance.graceTimes
export const selectValidationConditions = (state) => state.attendance.validationConditions
export const selectGeneralSettings = (state) => state.attendance.generalSettings
export const selectAllowedIPs = (state) => state.attendance.allowedIPs
export const selectLateComeEarlyOut = (state) => state.attendance.lateComeEarlyOut
export const selectBatches = (state) => state.attendance.batches
export const selectWorkRecords = (state) => state.attendance.workRecords
export const selectWorkRecordsPagination = (state) => state.attendance.workRecordsPagination
export const selectComments = (state) => state.attendance.comments
export const selectOvertimeRecords = (state) => state.attendance.overtimeRecords
export const selectCalendarDays = (state) => state.attendance.calendarDays
export const selectCalendarLoading = (state) => state.attendance.calendarLoading
export const selectRegister = (state) => state.attendance.register
export const selectRegisterLoading = (state) => state.attendance.registerLoading
export const selectValidationPending = (state) => state.attendance.validationPending
export default attendanceSlice.reducer
