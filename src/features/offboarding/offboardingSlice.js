import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchAll = createAsyncThunk('offboarding/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/offboarding', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch offboarding records')
  }
})

export const fetchById = createAsyncThunk('offboarding/fetchById', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/offboarding/${id}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch offboarding record')
  }
})

export const create = createAsyncThunk('offboarding/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/offboarding', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create offboarding record')
  }
})

export const update = createAsyncThunk('offboarding/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/offboarding/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update offboarding record')
  }
})

export const remove = createAsyncThunk('offboarding/remove', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/offboarding/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete offboarding record')
  }
})

export const fetchResignations = createAsyncThunk('offboarding/fetchResignations', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/offboarding/resignations')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch resignations')
  }
})

export const createResignation = createAsyncThunk('offboarding/createResignation', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/offboarding/resignations', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to submit resignation')
  }
})

export const approveResignation = createAsyncThunk('offboarding/approveResignation', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/offboarding/resignations/${id}/approve`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to approve resignation')
  }
})

export const rejectResignation = createAsyncThunk('offboarding/rejectResignation', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/offboarding/resignations/${id}/reject`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reject resignation')
  }
})

export const fetchExitReasons = createAsyncThunk('offboarding/fetchExitReasons', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/offboarding/exit-reasons')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch exit reasons')
  }
})

export const createExitReason = createAsyncThunk('offboarding/createExitReason', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/offboarding/exit-reasons', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create exit reason')
  }
})

export const deleteExitReason = createAsyncThunk('offboarding/deleteExitReason', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/offboarding/exit-reasons/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete exit reason')
  }
})

// ─── Plans ────────────────────────────────────────────────────────────────────

export const fetchPlans = createAsyncThunk('offboarding/fetchPlans', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/offboarding/plans')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch plans')
  }
})

export const createPlan = createAsyncThunk('offboarding/createPlan', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/offboarding/plans', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create plan')
  }
})

export const updatePlan = createAsyncThunk('offboarding/updatePlan', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/offboarding/plans/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update plan')
  }
})

export const deletePlan = createAsyncThunk('offboarding/deletePlan', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/offboarding/plans/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete plan')
  }
})

// ─── Stages ───────────────────────────────────────────────────────────────────

export const fetchOffboardingStages = createAsyncThunk('offboarding/fetchOffboardingStages', async (planId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/offboarding/plans/${planId}/stages`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch stages')
  }
})

export const createOffboardingStage = createAsyncThunk('offboarding/createOffboardingStage', async ({ planId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/offboarding/plans/${planId}/stages`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create stage')
  }
})

export const updateOffboardingStage = createAsyncThunk('offboarding/updateOffboardingStage', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/offboarding/stages/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update stage')
  }
})

export const deleteOffboardingStage = createAsyncThunk('offboarding/deleteOffboardingStage', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/offboarding/stages/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete stage')
  }
})

// ─── Employee Tasks ───────────────────────────────────────────────────────────

export const fetchEmployeeTasks = createAsyncThunk('offboarding/fetchEmployeeTasks', async (offboardingId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/offboarding/employee-offboarding/${offboardingId}/tasks`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch tasks')
  }
})

export const assignEmployeeTask = createAsyncThunk('offboarding/assignEmployeeTask', async ({ offboardingId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/offboarding/employee-offboarding/${offboardingId}/tasks`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to assign task')
  }
})

export const completeEmployeeTask = createAsyncThunk('offboarding/completeEmployeeTask', async (id, { rejectWithValue }) => {
  try {
    const res = await api.put(`/offboarding/employee-tasks/${id}/complete`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to complete task')
  }
})

// ─── Notes ────────────────────────────────────────────────────────────────────

export const fetchOffboardingNotes = createAsyncThunk('offboarding/fetchOffboardingNotes', async (offboardingId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/offboarding/employee-offboarding/${offboardingId}/notes`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch notes')
  }
})

export const addOffboardingNote = createAsyncThunk('offboarding/addOffboardingNote', async ({ offboardingId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/offboarding/employee-offboarding/${offboardingId}/notes`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add note')
  }
})

export const deleteOffboardingNote = createAsyncThunk('offboarding/deleteOffboardingNote', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/offboarding/notes/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete note')
  }
})

// ─── Settings ─────────────────────────────────────────────────────────────────

export const fetchOffboardingSettings = createAsyncThunk('offboarding/fetchOffboardingSettings', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/offboarding/settings')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch settings')
  }
})

export const upsertOffboardingSettings = createAsyncThunk('offboarding/upsertOffboardingSettings', async (data, { rejectWithValue }) => {
  try {
    const res = await api.put('/offboarding/settings', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save settings')
  }
})

const offboardingSlice = createSlice({
  name: 'offboarding',
  initialState: {
    data: [],
    selected: {},
    resignations: [],
    exitReasons: [],
    pagination: { page: 0, size: 20, total: 0 },
    loading: false,
    error: null,
    plans: [],
    offboardingStages: [],
    employeeTasks: [],
    offboardingNotes: [],
    offboardingSettings: {},
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

      .addCase(fetchResignations.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchResignations.fulfilled, (state, action) => { state.loading = false; state.resignations = action.payload.content || action.payload })
      .addCase(fetchResignations.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createResignation.fulfilled, (state, action) => { state.resignations.unshift(action.payload) })
      .addCase(approveResignation.fulfilled, (state, action) => {
        const idx = state.resignations.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.resignations[idx] = action.payload
      })
      .addCase(rejectResignation.fulfilled, (state, action) => {
        const idx = state.resignations.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.resignations[idx] = action.payload
      })

      .addCase(fetchExitReasons.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchExitReasons.fulfilled, (state, action) => { state.loading = false; state.exitReasons = action.payload.content || action.payload })
      .addCase(fetchExitReasons.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createExitReason.fulfilled, (state, action) => { state.exitReasons.push(action.payload) })
      .addCase(deleteExitReason.fulfilled, (state, action) => {
        state.exitReasons = state.exitReasons.filter(r => r.id !== action.payload)
      })

      // Plans
      .addCase(fetchPlans.fulfilled, (state, action) => { state.plans = action.payload })
      .addCase(createPlan.fulfilled, (state, action) => { state.plans.push(action.payload) })
      .addCase(updatePlan.fulfilled, (state, action) => {
        const idx = state.plans.findIndex(p => p.id === action.payload.id)
        if (idx !== -1) state.plans[idx] = action.payload
      })
      .addCase(deletePlan.fulfilled, (state, action) => {
        state.plans = state.plans.filter(p => p.id !== action.payload)
      })

      // Stages
      .addCase(fetchOffboardingStages.fulfilled, (state, action) => { state.offboardingStages = action.payload })
      .addCase(createOffboardingStage.fulfilled, (state, action) => { state.offboardingStages.push(action.payload) })
      .addCase(updateOffboardingStage.fulfilled, (state, action) => {
        const idx = state.offboardingStages.findIndex(s => s.id === action.payload.id)
        if (idx !== -1) state.offboardingStages[idx] = action.payload
      })
      .addCase(deleteOffboardingStage.fulfilled, (state, action) => {
        state.offboardingStages = state.offboardingStages.filter(s => s.id !== action.payload)
      })

      // Employee tasks
      .addCase(fetchEmployeeTasks.fulfilled, (state, action) => { state.employeeTasks = action.payload })
      .addCase(assignEmployeeTask.fulfilled, (state, action) => { state.employeeTasks.push(action.payload) })
      .addCase(completeEmployeeTask.fulfilled, (state, action) => {
        const idx = state.employeeTasks.findIndex(t => t.id === action.payload.id)
        if (idx !== -1) state.employeeTasks[idx] = action.payload
      })

      // Notes
      .addCase(fetchOffboardingNotes.fulfilled, (state, action) => { state.offboardingNotes = action.payload })
      .addCase(addOffboardingNote.fulfilled, (state, action) => { state.offboardingNotes.push(action.payload) })
      .addCase(deleteOffboardingNote.fulfilled, (state, action) => {
        state.offboardingNotes = state.offboardingNotes.filter(n => n.id !== action.payload)
      })

      // Settings
      .addCase(fetchOffboardingSettings.fulfilled, (state, action) => { state.offboardingSettings = action.payload })
      .addCase(upsertOffboardingSettings.fulfilled, (state, action) => { state.offboardingSettings = action.payload })
  },
})

export const selectAll = (state) => state.offboarding.data
export const selectSelected = (state) => state.offboarding.selected
export const selectLoading = (state) => state.offboarding.loading
export const selectPagination = (state) => state.offboarding.pagination
export const selectResignations = (state) => state.offboarding.resignations
export const selectExitReasons = (state) => state.offboarding.exitReasons
export const selectPlans = (state) => state.offboarding.plans
export const selectOffboardingStages = (state) => state.offboarding.offboardingStages
export const selectEmployeeTasks = (state) => state.offboarding.employeeTasks
export const selectOffboardingNotes = (state) => state.offboarding.offboardingNotes
export const selectOffboardingSettings = (state) => state.offboarding.offboardingSettings
export default offboardingSlice.reducer
