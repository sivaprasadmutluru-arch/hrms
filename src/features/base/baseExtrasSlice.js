import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

// ─── Employee Types ───────────────────────────────────────────────────────────

export const fetchEmployeeTypes = createAsyncThunk('baseExtras/fetchEmployeeTypes', async (_, { rejectWithValue }) => {
  try { return (await api.get('/employee-types')).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const createEmployeeType = createAsyncThunk('baseExtras/createEmployeeType', async (data, { rejectWithValue }) => {
  try { return (await api.post('/employee-types', data)).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const updateEmployeeType = createAsyncThunk('baseExtras/updateEmployeeType', async ({ id, data }, { rejectWithValue }) => {
  try { return (await api.put(`/employee-types/${id}`, data)).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const deleteEmployeeType = createAsyncThunk('baseExtras/deleteEmployeeType', async (id, { rejectWithValue }) => {
  try { await api.delete(`/employee-types/${id}`); return id } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Employee Shifts ──────────────────────────────────────────────────────────

export const fetchEmployeeShifts = createAsyncThunk('baseExtras/fetchEmployeeShifts', async (_, { rejectWithValue }) => {
  try { return (await api.get('/employee-shifts')).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const createEmployeeShift = createAsyncThunk('baseExtras/createEmployeeShift', async (data, { rejectWithValue }) => {
  try { return (await api.post('/employee-shifts', data)).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const updateEmployeeShift = createAsyncThunk('baseExtras/updateEmployeeShift', async ({ id, data }, { rejectWithValue }) => {
  try { return (await api.put(`/employee-shifts/${id}`, data)).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const deleteEmployeeShift = createAsyncThunk('baseExtras/deleteEmployeeShift', async (id, { rejectWithValue }) => {
  try { await api.delete(`/employee-shifts/${id}`); return id } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const fetchTags = createAsyncThunk('baseExtras/fetchTags', async (_, { rejectWithValue }) => {
  try { return (await api.get('/tags')).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const createTag = createAsyncThunk('baseExtras/createTag', async (data, { rejectWithValue }) => {
  try { return (await api.post('/tags', data)).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const updateTag = createAsyncThunk('baseExtras/updateTag', async ({ id, data }, { rejectWithValue }) => {
  try { return (await api.put(`/tags/${id}`, data)).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const deleteTag = createAsyncThunk('baseExtras/deleteTag', async (id, { rejectWithValue }) => {
  try { await api.delete(`/tags/${id}`); return id } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Mail Templates ───────────────────────────────────────────────────────────

export const fetchMailTemplates = createAsyncThunk('baseExtras/fetchMailTemplates', async (_, { rejectWithValue }) => {
  try { return (await api.get('/mail-templates')).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const createMailTemplate = createAsyncThunk('baseExtras/createMailTemplate', async (data, { rejectWithValue }) => {
  try { return (await api.post('/mail-templates', data)).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const updateMailTemplate = createAsyncThunk('baseExtras/updateMailTemplate', async ({ id, data }, { rejectWithValue }) => {
  try { return (await api.put(`/mail-templates/${id}`, data)).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const deleteMailTemplate = createAsyncThunk('baseExtras/deleteMailTemplate', async (id, { rejectWithValue }) => {
  try { await api.delete(`/mail-templates/${id}`); return id } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Email Config ─────────────────────────────────────────────────────────────

export const fetchEmailConfig = createAsyncThunk('baseExtras/fetchEmailConfig', async (companyId, { rejectWithValue }) => {
  try { return (await api.get('/email-config', { params: { companyId } })).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const saveEmailConfig = createAsyncThunk('baseExtras/saveEmailConfig', async ({ companyId, data }, { rejectWithValue }) => {
  try { return (await api.post('/email-config', data, { params: { companyId } })).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Email Logs ───────────────────────────────────────────────────────────────

export const fetchEmailLogs = createAsyncThunk('baseExtras/fetchEmailLogs', async (companyId, { rejectWithValue }) => {
  try { return (await api.get('/email-logs', { params: { companyId } })).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Track Late Come / Early Out Settings ────────────────────────────────────

export const fetchTrackSettings = createAsyncThunk('baseExtras/fetchTrackSettings', async (companyId, { rejectWithValue }) => {
  try { return (await api.get('/attendance/track-settings', { params: { companyId } })).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const saveTrackSettings = createAsyncThunk('baseExtras/saveTrackSettings', async ({ companyId, data }, { rejectWithValue }) => {
  try { return (await api.post('/attendance/track-settings', data, { params: { companyId } })).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Penalty Accounts ────────────────────────────────────────────────────────

export const fetchPenaltyAccounts = createAsyncThunk('baseExtras/fetchPenaltyAccounts', async (_, { rejectWithValue }) => {
  try { return (await api.get('/penalty-accounts')).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const createPenaltyAccount = createAsyncThunk('baseExtras/createPenaltyAccount', async (data, { rejectWithValue }) => {
  try { return (await api.post('/penalty-accounts', data)).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const updatePenaltyAccount = createAsyncThunk('baseExtras/updatePenaltyAccount', async ({ id, data }, { rejectWithValue }) => {
  try { return (await api.put(`/penalty-accounts/${id}`, data)).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const deletePenaltyAccount = createAsyncThunk('baseExtras/deletePenaltyAccount', async (id, { rejectWithValue }) => {
  try { await api.delete(`/penalty-accounts/${id}`); return id } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Announcement Views ───────────────────────────────────────────────────────

export const markAnnouncementViewed = createAsyncThunk('baseExtras/markAnnouncementViewed', async ({ id, employeeId }, { rejectWithValue }) => {
  try { return (await api.post(`/announcements/${id}/view`, null, { params: { employeeId } })).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const fetchAnnouncementViews = createAsyncThunk('baseExtras/fetchAnnouncementViews', async (id, { rejectWithValue }) => {
  try { return (await api.get(`/announcements/${id}/views`)).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Shift Schedules ──────────────────────────────────────────────────────────

export const fetchShiftSchedules = createAsyncThunk('baseExtras/fetchShiftSchedules', async (_, { rejectWithValue }) => {
  try { return (await api.get('/shift-schedules')).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Work Types ───────────────────────────────────────────────────────────────

export const fetchWorkTypes = createAsyncThunk('baseExtras/fetchWorkTypes', async (_, { rejectWithValue }) => {
  try { return (await api.get('/work-types')).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Job Positions ────────────────────────────────────────────────────────────

export const fetchJobPositions = createAsyncThunk('baseExtras/fetchJobPositions', async (_, { rejectWithValue }) => {
  try { return (await api.get('/job-positions')).data } catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Slice ────────────────────────────────────────────────────────────────────

const baseExtrasSlice = createSlice({
  name: 'baseExtras',
  initialState: {
    employeeTypes: [],
    employeeShifts: [],
    shiftSchedules: [],
    workTypes: [],
    jobPositions: [],
    tags: [],
    mailTemplates: [],
    emailConfig: null,
    emailLogs: [],
    trackSettings: null,
    penaltyAccounts: [],
    announcementViews: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Employee Types
      .addCase(fetchEmployeeTypes.pending, (state) => { state.loading = true })
      .addCase(fetchEmployeeTypes.fulfilled, (state, action) => { state.loading = false; state.employeeTypes = action.payload.content || action.payload })
      .addCase(fetchEmployeeTypes.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createEmployeeType.fulfilled, (state, action) => { state.employeeTypes.push(action.payload) })
      .addCase(updateEmployeeType.fulfilled, (state, action) => {
        const idx = state.employeeTypes.findIndex(t => t.id === action.payload.id)
        if (idx !== -1) state.employeeTypes[idx] = action.payload
      })
      .addCase(deleteEmployeeType.fulfilled, (state, action) => { state.employeeTypes = state.employeeTypes.filter(t => t.id !== action.payload) })

      // Employee Shifts
      .addCase(fetchEmployeeShifts.pending, (state) => { state.loading = true })
      .addCase(fetchEmployeeShifts.fulfilled, (state, action) => { state.loading = false; state.employeeShifts = action.payload.content || action.payload })
      .addCase(fetchEmployeeShifts.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createEmployeeShift.fulfilled, (state, action) => { state.employeeShifts.push(action.payload) })
      .addCase(updateEmployeeShift.fulfilled, (state, action) => {
        const idx = state.employeeShifts.findIndex(s => s.id === action.payload.id)
        if (idx !== -1) state.employeeShifts[idx] = action.payload
      })
      .addCase(deleteEmployeeShift.fulfilled, (state, action) => { state.employeeShifts = state.employeeShifts.filter(s => s.id !== action.payload) })

      // Tags
      .addCase(fetchTags.fulfilled, (state, action) => { state.tags = action.payload.content || action.payload })
      .addCase(createTag.fulfilled, (state, action) => { state.tags.push(action.payload) })
      .addCase(updateTag.fulfilled, (state, action) => {
        const idx = state.tags.findIndex(t => t.id === action.payload.id)
        if (idx !== -1) state.tags[idx] = action.payload
      })
      .addCase(deleteTag.fulfilled, (state, action) => { state.tags = state.tags.filter(t => t.id !== action.payload) })

      // Mail Templates
      .addCase(fetchMailTemplates.pending, (state) => { state.loading = true })
      .addCase(fetchMailTemplates.fulfilled, (state, action) => { state.loading = false; state.mailTemplates = action.payload.content || action.payload })
      .addCase(fetchMailTemplates.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createMailTemplate.fulfilled, (state, action) => { state.mailTemplates.push(action.payload) })
      .addCase(updateMailTemplate.fulfilled, (state, action) => {
        const idx = state.mailTemplates.findIndex(t => t.id === action.payload.id)
        if (idx !== -1) state.mailTemplates[idx] = action.payload
      })
      .addCase(deleteMailTemplate.fulfilled, (state, action) => { state.mailTemplates = state.mailTemplates.filter(t => t.id !== action.payload) })

      // Email Config
      .addCase(fetchEmailConfig.fulfilled, (state, action) => { state.emailConfig = action.payload })
      .addCase(saveEmailConfig.fulfilled, (state, action) => { state.emailConfig = action.payload })

      // Email Logs
      .addCase(fetchEmailLogs.pending, (state) => { state.loading = true })
      .addCase(fetchEmailLogs.fulfilled, (state, action) => { state.loading = false; state.emailLogs = action.payload.content || action.payload })
      .addCase(fetchEmailLogs.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      // Track Settings
      .addCase(fetchTrackSettings.fulfilled, (state, action) => { state.trackSettings = action.payload })
      .addCase(saveTrackSettings.fulfilled, (state, action) => { state.trackSettings = action.payload })

      // Penalty Accounts
      .addCase(fetchPenaltyAccounts.pending, (state) => { state.loading = true })
      .addCase(fetchPenaltyAccounts.fulfilled, (state, action) => { state.loading = false; state.penaltyAccounts = action.payload.content || action.payload })
      .addCase(fetchPenaltyAccounts.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createPenaltyAccount.fulfilled, (state, action) => { state.penaltyAccounts.push(action.payload) })
      .addCase(updatePenaltyAccount.fulfilled, (state, action) => {
        const idx = state.penaltyAccounts.findIndex(p => p.id === action.payload.id)
        if (idx !== -1) state.penaltyAccounts[idx] = action.payload
      })
      .addCase(deletePenaltyAccount.fulfilled, (state, action) => { state.penaltyAccounts = state.penaltyAccounts.filter(p => p.id !== action.payload) })

      // Announcement Views
      .addCase(fetchAnnouncementViews.fulfilled, (state, action) => { state.announcementViews = action.payload })

      // Shift Schedules
      .addCase(fetchShiftSchedules.fulfilled, (state, action) => { state.shiftSchedules = action.payload.content || action.payload })

      // Work Types
      .addCase(fetchWorkTypes.fulfilled, (state, action) => { state.workTypes = action.payload.content || action.payload })

      // Job Positions
      .addCase(fetchJobPositions.fulfilled, (state, action) => { state.jobPositions = action.payload.content || action.payload })
  },
})

export const selectEmployeeTypes = (state) => state.baseExtras.employeeTypes
export const selectEmployeeShifts = (state) => state.baseExtras.employeeShifts
export const selectShiftSchedules = (state) => state.baseExtras.shiftSchedules
export const selectWorkTypes = (state) => state.baseExtras.workTypes
export const selectJobPositions = (state) => state.baseExtras.jobPositions
export const selectTags = (state) => state.baseExtras.tags
export const selectMailTemplates = (state) => state.baseExtras.mailTemplates
export const selectEmailConfig = (state) => state.baseExtras.emailConfig
export const selectEmailLogs = (state) => state.baseExtras.emailLogs
export const selectTrackSettings = (state) => state.baseExtras.trackSettings
export const selectPenaltyAccounts = (state) => state.baseExtras.penaltyAccounts
export const selectAnnouncementViews = (state) => state.baseExtras.announcementViews
export const selectBaseExtrasLoading = (state) => state.baseExtras.loading

export default baseExtrasSlice.reducer
