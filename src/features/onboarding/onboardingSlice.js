import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

// ─── Legacy employee onboarding thunks ───────────────────────────────────────

export const fetchAll = createAsyncThunk('onboarding/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/onboarding', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch onboarding records')
  }
})

export const fetchById = createAsyncThunk('onboarding/fetchById', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/onboarding/${id}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch onboarding record')
  }
})

export const create = createAsyncThunk('onboarding/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/onboarding', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create onboarding record')
  }
})

export const update = createAsyncThunk('onboarding/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/onboarding/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update onboarding record')
  }
})

export const remove = createAsyncThunk('onboarding/remove', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/onboarding/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete onboarding record')
  }
})

// ─── Portals ──────────────────────────────────────────────────────────────────

export const fetchPortals = createAsyncThunk('onboarding/fetchPortals', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/onboarding/portals')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch portals')
  }
})

export const createPortal = createAsyncThunk('onboarding/createPortal', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/onboarding/portals', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create portal')
  }
})

export const updatePortal = createAsyncThunk('onboarding/updatePortal', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/onboarding/portals/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update portal')
  }
})

export const deletePortal = createAsyncThunk('onboarding/deletePortal', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/onboarding/portals/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete portal')
  }
})

// ─── Stages ───────────────────────────────────────────────────────────────────

export const fetchStages = createAsyncThunk('onboarding/fetchStages', async (portalId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/onboarding/portals/${portalId}/stages`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch stages')
  }
})

export const createStage = createAsyncThunk('onboarding/createStage', async ({ portalId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/onboarding/portals/${portalId}/stages`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create stage')
  }
})

export const updateStage = createAsyncThunk('onboarding/updateStage', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/onboarding/stages/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update stage')
  }
})

export const deleteStage = createAsyncThunk('onboarding/deleteStage', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/onboarding/stages/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete stage')
  }
})

// ─── Onboarding Candidates ────────────────────────────────────────────────────

export const fetchOnboardingCandidates = createAsyncThunk('onboarding/fetchOnboardingCandidates', async (portalId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/onboarding/portals/${portalId}/candidates`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch candidates')
  }
})

export const addOnboardingCandidate = createAsyncThunk('onboarding/addOnboardingCandidate', async ({ portalId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/onboarding/portals/${portalId}/candidates`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add candidate')
  }
})

export const completeOnboarding = createAsyncThunk('onboarding/completeOnboarding', async (id, { rejectWithValue }) => {
  try {
    const res = await api.put(`/onboarding/candidates/${id}/complete`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to complete onboarding')
  }
})

// ─── Candidate Stages ─────────────────────────────────────────────────────────

export const fetchCandidateStages = createAsyncThunk('onboarding/fetchCandidateStages', async (candidateId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/onboarding/candidates/${candidateId}/stages`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch candidate stages')
  }
})

export const addCandidateStage = createAsyncThunk('onboarding/addCandidateStage', async ({ candidateId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/onboarding/candidates/${candidateId}/stages`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add candidate stage')
  }
})

export const completeCandidateStage = createAsyncThunk('onboarding/completeCandidateStage', async (id, { rejectWithValue }) => {
  try {
    const res = await api.put(`/onboarding/candidate-stages/${id}/complete`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to complete stage')
  }
})

// ─── Candidate Tasks ──────────────────────────────────────────────────────────

export const fetchCandidateTasks = createAsyncThunk('onboarding/fetchCandidateTasks', async (candidateId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/onboarding/candidates/${candidateId}/tasks`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch candidate tasks')
  }
})

export const assignCandidateTask = createAsyncThunk('onboarding/assignCandidateTask', async ({ candidateId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/onboarding/candidates/${candidateId}/tasks`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to assign task')
  }
})

export const completeCandidateTask = createAsyncThunk('onboarding/completeCandidateTask', async (id, { rejectWithValue }) => {
  try {
    const res = await api.put(`/onboarding/candidate-tasks/${id}/complete`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to complete task')
  }
})

const onboardingSlice = createSlice({
  name: 'onboarding',
  initialState: {
    data: [],
    selected: {},
    pagination: { page: 0, size: 20, total: 0 },
    loading: false,
    error: null,
    portals: [],
    stages: [],
    onboardingCandidates: [],
    candidateStages: [],
    candidateTasks: [],
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

      // Portals
      .addCase(fetchPortals.fulfilled, (state, action) => { state.portals = action.payload })
      .addCase(createPortal.fulfilled, (state, action) => { state.portals.push(action.payload) })
      .addCase(updatePortal.fulfilled, (state, action) => {
        const idx = state.portals.findIndex(p => p.id === action.payload.id)
        if (idx !== -1) state.portals[idx] = action.payload
      })
      .addCase(deletePortal.fulfilled, (state, action) => {
        state.portals = state.portals.filter(p => p.id !== action.payload)
      })

      // Stages
      .addCase(fetchStages.fulfilled, (state, action) => { state.stages = action.payload })
      .addCase(createStage.fulfilled, (state, action) => { state.stages.push(action.payload) })
      .addCase(updateStage.fulfilled, (state, action) => {
        const idx = state.stages.findIndex(s => s.id === action.payload.id)
        if (idx !== -1) state.stages[idx] = action.payload
      })
      .addCase(deleteStage.fulfilled, (state, action) => {
        state.stages = state.stages.filter(s => s.id !== action.payload)
      })

      // Onboarding candidates
      .addCase(fetchOnboardingCandidates.fulfilled, (state, action) => { state.onboardingCandidates = action.payload })
      .addCase(addOnboardingCandidate.fulfilled, (state, action) => { state.onboardingCandidates.push(action.payload) })
      .addCase(completeOnboarding.fulfilled, (state, action) => {
        const idx = state.onboardingCandidates.findIndex(c => c.id === action.payload.id)
        if (idx !== -1) state.onboardingCandidates[idx] = action.payload
      })

      // Candidate stages
      .addCase(fetchCandidateStages.fulfilled, (state, action) => { state.candidateStages = action.payload })
      .addCase(addCandidateStage.fulfilled, (state, action) => { state.candidateStages.push(action.payload) })
      .addCase(completeCandidateStage.fulfilled, (state, action) => {
        const idx = state.candidateStages.findIndex(s => s.id === action.payload.id)
        if (idx !== -1) state.candidateStages[idx] = action.payload
      })

      // Candidate tasks
      .addCase(fetchCandidateTasks.fulfilled, (state, action) => { state.candidateTasks = action.payload })
      .addCase(assignCandidateTask.fulfilled, (state, action) => { state.candidateTasks.push(action.payload) })
      .addCase(completeCandidateTask.fulfilled, (state, action) => {
        const idx = state.candidateTasks.findIndex(t => t.id === action.payload.id)
        if (idx !== -1) state.candidateTasks[idx] = action.payload
      })
  },
})

export const selectAll = (state) => state.onboarding.data
export const selectSelected = (state) => state.onboarding.selected
export const selectLoading = (state) => state.onboarding.loading
export const selectPagination = (state) => state.onboarding.pagination
export const selectPortals = (state) => state.onboarding.portals
export const selectStages = (state) => state.onboarding.stages
export const selectOnboardingCandidates = (state) => state.onboarding.onboardingCandidates
export const selectCandidateStages = (state) => state.onboarding.candidateStages
export const selectCandidateTasks = (state) => state.onboarding.candidateTasks
export default onboardingSlice.reducer
