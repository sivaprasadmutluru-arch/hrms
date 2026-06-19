import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchWorkInfo = createAsyncThunk('employeeExtras/fetchWorkInfo', async (employeeId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/employees/${employeeId}/work-info`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch work info')
  }
})

export const saveWorkInfo = createAsyncThunk('employeeExtras/saveWorkInfo', async ({ employeeId, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/employees/${employeeId}/work-info`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save work info')
  }
})

export const fetchBankDetails = createAsyncThunk('employeeExtras/fetchBankDetails', async (employeeId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/employees/${employeeId}/bank-details`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch bank details')
  }
})

export const saveBankDetails = createAsyncThunk('employeeExtras/saveBankDetails', async ({ employeeId, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/employees/${employeeId}/bank-details`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save bank details')
  }
})

export const fetchDisciplinaryActions = createAsyncThunk('employeeExtras/fetchDisciplinaryActions', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/disciplinary-actions')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch disciplinary actions')
  }
})

export const createDisciplinaryAction = createAsyncThunk('employeeExtras/createDisciplinaryAction', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/disciplinary-actions', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create disciplinary action')
  }
})

export const updateDisciplinaryAction = createAsyncThunk('employeeExtras/updateDisciplinaryAction', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/disciplinary-actions/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update disciplinary action')
  }
})

export const deleteDisciplinaryAction = createAsyncThunk('employeeExtras/deleteDisciplinaryAction', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/disciplinary-actions/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete disciplinary action')
  }
})

export const fetchBonusPoints = createAsyncThunk('employeeExtras/fetchBonusPoints', async (employeeId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/employees/${employeeId}/bonus-points`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch bonus points')
  }
})

export const updateBonusPoints = createAsyncThunk('employeeExtras/updateBonusPoints', async ({ employeeId, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/employees/${employeeId}/bonus-points`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update bonus points')
  }
})

// ─── Employee Tags ───────────────────────────────────────────────────────────

export const fetchEmployeeTags = createAsyncThunk('employeeExtras/fetchEmployeeTags', async (companyId, { rejectWithValue }) => {
  try { const res = await api.get('/employee-tags', { params: companyId ? { companyId } : {} }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const createEmployeeTag = createAsyncThunk('employeeExtras/createEmployeeTag', async (data, { rejectWithValue }) => {
  try { const res = await api.post('/employee-tags', data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const updateEmployeeTag = createAsyncThunk('employeeExtras/updateEmployeeTag', async ({ id, data }, { rejectWithValue }) => {
  try { const res = await api.put(`/employee-tags/${id}`, data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const deleteEmployeeTag = createAsyncThunk('employeeExtras/deleteEmployeeTag', async (id, { rejectWithValue }) => {
  try { await api.delete(`/employee-tags/${id}`); return id }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Employee Notes ──────────────────────────────────────────────────────────

export const fetchEmployeeNotes = createAsyncThunk('employeeExtras/fetchEmployeeNotes', async (employeeId, { rejectWithValue }) => {
  try { const res = await api.get(`/employees/${employeeId}/notes`); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const createEmployeeNote = createAsyncThunk('employeeExtras/createEmployeeNote', async ({ employeeId, data }, { rejectWithValue }) => {
  try { const res = await api.post(`/employees/${employeeId}/notes`, data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const updateEmployeeNote = createAsyncThunk('employeeExtras/updateEmployeeNote', async ({ noteId, data }, { rejectWithValue }) => {
  try { const res = await api.put(`/employees/notes/${noteId}`, data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const deleteEmployeeNote = createAsyncThunk('employeeExtras/deleteEmployeeNote', async (noteId, { rejectWithValue }) => {
  try { await api.delete(`/employees/notes/${noteId}`); return noteId }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Action Types ────────────────────────────────────────────────────────────

export const fetchActionTypes = createAsyncThunk('employeeExtras/fetchActionTypes', async (companyId, { rejectWithValue }) => {
  try { const res = await api.get('/action-types', { params: companyId ? { companyId } : {} }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const createActionType = createAsyncThunk('employeeExtras/createActionType', async (data, { rejectWithValue }) => {
  try { const res = await api.post('/action-types', data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const updateActionType = createAsyncThunk('employeeExtras/updateActionType', async ({ id, data }, { rejectWithValue }) => {
  try { const res = await api.put(`/action-types/${id}`, data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const deleteActionType = createAsyncThunk('employeeExtras/deleteActionType', async (id, { rejectWithValue }) => {
  try { await api.delete(`/action-types/${id}`); return id }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Employee General Settings ───────────────────────────────────────────────

export const fetchEmployeeSettings = createAsyncThunk('employeeExtras/fetchEmployeeSettings', async (companyId, { rejectWithValue }) => {
  try { const res = await api.get('/employee-settings', { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const upsertEmployeeSettings = createAsyncThunk('employeeExtras/upsertEmployeeSettings', async ({ companyId, data }, { rejectWithValue }) => {
  try { const res = await api.put('/employee-settings', data, { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Profile Edit Features ───────────────────────────────────────────────────

export const fetchProfileFeatures = createAsyncThunk('employeeExtras/fetchProfileFeatures', async (companyId, { rejectWithValue }) => {
  try { const res = await api.get('/employee-profile-features', { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const upsertProfileFeature = createAsyncThunk('employeeExtras/upsertProfileFeature', async ({ companyId, data }, { rejectWithValue }) => {
  try { const res = await api.put('/employee-profile-features', data, { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const fetchMyProfileFeatures = createAsyncThunk('employeeExtras/fetchMyProfileFeatures', async (_, { rejectWithValue }) => {
  try { const res = await api.get('/ess/profile-features'); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

const employeeExtrasSlice = createSlice({
  name: 'employeeExtras',
  initialState: {
    workInfo: null,
    bankDetails: null,
    disciplinaryActions: [],
    bonusPoints: null,
    employeeTags: [],
    employeeNotes: [],
    actionTypes: [],
    employeeSettings: null,
    profileFeatures: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchWorkInfo.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchWorkInfo.fulfilled, (state, action) => { state.loading = false; state.workInfo = action.payload })
      .addCase(fetchWorkInfo.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(saveWorkInfo.pending, (state) => { state.loading = true; state.error = null })
      .addCase(saveWorkInfo.fulfilled, (state, action) => { state.loading = false; state.workInfo = action.payload })
      .addCase(saveWorkInfo.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchBankDetails.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchBankDetails.fulfilled, (state, action) => { state.loading = false; state.bankDetails = action.payload })
      .addCase(fetchBankDetails.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(saveBankDetails.pending, (state) => { state.loading = true; state.error = null })
      .addCase(saveBankDetails.fulfilled, (state, action) => { state.loading = false; state.bankDetails = action.payload })
      .addCase(saveBankDetails.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchDisciplinaryActions.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchDisciplinaryActions.fulfilled, (state, action) => {
        state.loading = false
        state.disciplinaryActions = action.payload.content || action.payload
      })
      .addCase(fetchDisciplinaryActions.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(createDisciplinaryAction.fulfilled, (state, action) => {
        state.loading = false
        state.disciplinaryActions.unshift(action.payload)
      })
      .addCase(updateDisciplinaryAction.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.disciplinaryActions.findIndex(a => a.id === action.payload.id)
        if (idx !== -1) state.disciplinaryActions[idx] = action.payload
      })
      .addCase(deleteDisciplinaryAction.fulfilled, (state, action) => {
        state.loading = false
        state.disciplinaryActions = state.disciplinaryActions.filter(a => a.id !== action.payload)
      })

      .addCase(fetchBonusPoints.fulfilled, (state, action) => { state.loading = false; state.bonusPoints = action.payload })
      .addCase(updateBonusPoints.fulfilled, (state, action) => { state.loading = false; state.bonusPoints = action.payload })

      .addCase(fetchEmployeeTags.fulfilled, (state, action) => { state.employeeTags = action.payload })
      .addCase(createEmployeeTag.fulfilled, (state, action) => { state.employeeTags.push(action.payload) })
      .addCase(updateEmployeeTag.fulfilled, (state, action) => {
        const idx = state.employeeTags.findIndex(t => t.id === action.payload.id)
        if (idx !== -1) state.employeeTags[idx] = action.payload
      })
      .addCase(deleteEmployeeTag.fulfilled, (state, action) => { state.employeeTags = state.employeeTags.filter(t => t.id !== action.payload) })

      .addCase(fetchEmployeeNotes.fulfilled, (state, action) => { state.employeeNotes = action.payload })
      .addCase(createEmployeeNote.fulfilled, (state, action) => { state.employeeNotes.unshift(action.payload) })
      .addCase(updateEmployeeNote.fulfilled, (state, action) => {
        const idx = state.employeeNotes.findIndex(n => n.id === action.payload.id)
        if (idx !== -1) state.employeeNotes[idx] = action.payload
      })
      .addCase(deleteEmployeeNote.fulfilled, (state, action) => { state.employeeNotes = state.employeeNotes.filter(n => n.id !== action.payload) })

      .addCase(fetchActionTypes.fulfilled, (state, action) => { state.actionTypes = action.payload })
      .addCase(createActionType.fulfilled, (state, action) => { state.actionTypes.push(action.payload) })
      .addCase(updateActionType.fulfilled, (state, action) => {
        const idx = state.actionTypes.findIndex(a => a.id === action.payload.id)
        if (idx !== -1) state.actionTypes[idx] = action.payload
      })
      .addCase(deleteActionType.fulfilled, (state, action) => { state.actionTypes = state.actionTypes.filter(a => a.id !== action.payload) })

      .addCase(fetchEmployeeSettings.fulfilled, (state, action) => { state.employeeSettings = action.payload })
      .addCase(upsertEmployeeSettings.fulfilled, (state, action) => { state.employeeSettings = action.payload })

      .addCase(fetchProfileFeatures.fulfilled, (state, action) => { state.profileFeatures = action.payload })
      .addCase(fetchMyProfileFeatures.fulfilled, (state, action) => { state.profileFeatures = action.payload })
      .addCase(upsertProfileFeature.fulfilled, (state, action) => {
        const idx = state.profileFeatures.findIndex(f => f.id === action.payload.id)
        if (idx !== -1) state.profileFeatures[idx] = action.payload
        else state.profileFeatures.push(action.payload)
      })
  },
})

export const selectWorkInfo = (state) => state.employeeExtras.workInfo
export const selectBankDetails = (state) => state.employeeExtras.bankDetails
export const selectDisciplinaryActions = (state) => state.employeeExtras.disciplinaryActions
export const selectBonusPoints = (state) => state.employeeExtras.bonusPoints
export const selectEmployeeTags = (state) => state.employeeExtras.employeeTags
export const selectEmployeeNotes = (state) => state.employeeExtras.employeeNotes
export const selectActionTypes = (state) => state.employeeExtras.actionTypes
export const selectEmployeeSettings = (state) => state.employeeExtras.employeeSettings
export const selectProfileFeatures = (state) => state.employeeExtras.profileFeatures
export const selectLoading = (state) => state.employeeExtras.loading
export default employeeExtrasSlice.reducer
