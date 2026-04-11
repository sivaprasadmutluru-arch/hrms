import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

// ─── Date/Time Format ─────────────────────────────────────────────────────────
export const fetchDateTimeFormat = createAsyncThunk('generalSettings/fetchDateTimeFormat', async (companyId, { rejectWithValue }) => {
  try { const res = await api.get('/settings/date-time-format', { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const saveDateTimeFormat = createAsyncThunk('generalSettings/saveDateTimeFormat', async ({ companyId, data }, { rejectWithValue }) => {
  try { const res = await api.post('/settings/date-time-format', data, { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Dashboard Components ─────────────────────────────────────────────────────
export const fetchDashboardComponents = createAsyncThunk('generalSettings/fetchDashboardComponents', async (companyId, { rejectWithValue }) => {
  try { const res = await api.get('/settings/dashboard-components', { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const toggleDashboardComponent = createAsyncThunk('generalSettings/toggleDashboardComponent', async ({ companyId, componentKey }, { rejectWithValue }) => {
  try { const res = await api.post('/settings/dashboard-components/toggle', { companyId, componentKey }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const bulkUpdateDashboardComponents = createAsyncThunk('generalSettings/bulkUpdateDashboard', async ({ companyId, components }, { rejectWithValue }) => {
  try { const res = await api.post('/settings/dashboard-components/bulk-update', { companyId, components }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── White Label ──────────────────────────────────────────────────────────────
export const fetchWhiteLabel = createAsyncThunk('generalSettings/fetchWhiteLabel', async (companyId, { rejectWithValue }) => {
  try { const res = await api.get('/settings/white-label', { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const saveWhiteLabel = createAsyncThunk('generalSettings/saveWhiteLabel', async ({ companyId, data }, { rejectWithValue }) => {
  try { const res = await api.post('/settings/white-label', data, { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const toggleWhiteLabel = createAsyncThunk('generalSettings/toggleWhiteLabel', async (companyId, { rejectWithValue }) => {
  try { const res = await api.post('/settings/white-label/toggle', null, { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Email Config ─────────────────────────────────────────────────────────────
export const testEmailConfig = createAsyncThunk('generalSettings/testEmail', async ({ companyId, testEmailTo }, { rejectWithValue }) => {
  try { const res = await api.post('/settings/email/test', null, { params: { companyId, testEmailTo } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const setPrimaryEmailConfig = createAsyncThunk('generalSettings/setPrimaryEmail', async ({ companyId, configId }, { rejectWithValue }) => {
  try { const res = await api.post('/settings/email/set-primary', null, { params: { companyId, configId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── History Tracking ─────────────────────────────────────────────────────────
export const fetchHistoryTracking = createAsyncThunk('generalSettings/fetchHistoryTracking', async (companyId, { rejectWithValue }) => {
  try { const res = await api.get('/settings/history-tracking', { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const saveHistoryTracking = createAsyncThunk('generalSettings/saveHistoryTracking', async ({ companyId, data }, { rejectWithValue }) => {
  try { const res = await api.post('/settings/history-tracking', data, { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Account Block Feature ────────────────────────────────────────────────────
export const fetchAccountBlockFeature = createAsyncThunk('generalSettings/fetchAccountBlockFeature', async (_, { rejectWithValue }) => {
  try { const res = await api.get('/audit/account-block-feature'); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const toggleAccountBlockFeature = createAsyncThunk('generalSettings/toggleAccountBlockFeature', async (_, { rejectWithValue }) => {
  try { const res = await api.post('/audit/account-block-feature/toggle'); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Audit Tags ───────────────────────────────────────────────────────────────
export const fetchAuditTags = createAsyncThunk('generalSettings/fetchAuditTags', async (companyId, { rejectWithValue }) => {
  try { const res = await api.get('/settings/audit-tags', { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const createAuditTag = createAsyncThunk('generalSettings/createAuditTag', async (data, { rejectWithValue }) => {
  try { const res = await api.post('/settings/audit-tags', data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const updateAuditTag = createAsyncThunk('generalSettings/updateAuditTag', async ({ id, data }, { rejectWithValue }) => {
  try { const res = await api.put(`/settings/audit-tags/${id}`, data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const deleteAuditTag = createAsyncThunk('generalSettings/deleteAuditTag', async (id, { rejectWithValue }) => {
  try { await api.delete(`/settings/audit-tags/${id}`); return id }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Helpdesk Tags ────────────────────────────────────────────────────────────
export const fetchHelpdeskTags = createAsyncThunk('generalSettings/fetchHelpdeskTags', async (companyId, { rejectWithValue }) => {
  try { const res = await api.get('/settings/helpdesk-tags', { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const createHelpdeskTag = createAsyncThunk('generalSettings/createHelpdeskTag', async (data, { rejectWithValue }) => {
  try { const res = await api.post('/settings/helpdesk-tags', data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const updateHelpdeskTag = createAsyncThunk('generalSettings/updateHelpdeskTag', async ({ id, data }, { rejectWithValue }) => {
  try { const res = await api.put(`/settings/helpdesk-tags/${id}`, data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const deleteHelpdeskTag = createAsyncThunk('generalSettings/deleteHelpdeskTag', async (id, { rejectWithValue }) => {
  try { await api.delete(`/settings/helpdesk-tags/${id}`); return id }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

const generalSettingsSlice = createSlice({
  name: 'generalSettings',
  initialState: {
    dateTimeFormat: null,
    dashboardComponents: [],
    whiteLabel: null,
    historyTracking: null,
    accountBlockFeature: null,
    auditTags: [],
    helpdeskTags: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDateTimeFormat.fulfilled, (state, action) => { state.dateTimeFormat = action.payload })
      .addCase(saveDateTimeFormat.fulfilled, (state, action) => { state.dateTimeFormat = action.payload })
      .addCase(fetchDashboardComponents.fulfilled, (state, action) => { state.dashboardComponents = action.payload })
      .addCase(bulkUpdateDashboardComponents.fulfilled, (state, action) => { state.dashboardComponents = action.payload })
      .addCase(fetchWhiteLabel.fulfilled, (state, action) => { state.whiteLabel = action.payload })
      .addCase(saveWhiteLabel.fulfilled, (state, action) => { state.whiteLabel = action.payload })
      .addCase(toggleWhiteLabel.fulfilled, (state, action) => { state.whiteLabel = action.payload })
      .addCase(fetchHistoryTracking.fulfilled, (state, action) => { state.historyTracking = action.payload })
      .addCase(saveHistoryTracking.fulfilled, (state, action) => { state.historyTracking = action.payload })
      .addCase(fetchAccountBlockFeature.fulfilled, (state, action) => { state.accountBlockFeature = action.payload })
      .addCase(toggleAccountBlockFeature.fulfilled, (state, action) => { state.accountBlockFeature = action.payload })
      // Audit Tags
      .addCase(fetchAuditTags.fulfilled, (state, action) => { state.auditTags = action.payload })
      .addCase(createAuditTag.fulfilled, (state, action) => { state.auditTags.push(action.payload) })
      .addCase(updateAuditTag.fulfilled, (state, action) => {
        const idx = state.auditTags.findIndex(t => t.id === action.payload.id)
        if (idx !== -1) state.auditTags[idx] = action.payload
      })
      .addCase(deleteAuditTag.fulfilled, (state, action) => {
        state.auditTags = state.auditTags.filter(t => t.id !== action.payload)
      })
      // Helpdesk Tags
      .addCase(fetchHelpdeskTags.fulfilled, (state, action) => { state.helpdeskTags = action.payload })
      .addCase(createHelpdeskTag.fulfilled, (state, action) => { state.helpdeskTags.push(action.payload) })
      .addCase(updateHelpdeskTag.fulfilled, (state, action) => {
        const idx = state.helpdeskTags.findIndex(t => t.id === action.payload.id)
        if (idx !== -1) state.helpdeskTags[idx] = action.payload
      })
      .addCase(deleteHelpdeskTag.fulfilled, (state, action) => {
        state.helpdeskTags = state.helpdeskTags.filter(t => t.id !== action.payload)
      })
  },
})

export const selectGeneralSettings = (state) => state.generalSettings
export default generalSettingsSlice.reducer
