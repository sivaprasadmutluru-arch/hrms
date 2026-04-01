import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchAll = createAsyncThunk('performance/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/pms/cycles', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch performance cycles')
  }
})

export const create = createAsyncThunk('performance/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/pms/cycles', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create performance cycle')
  }
})

export const update = createAsyncThunk('performance/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/pms/cycles/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update performance cycle')
  }
})

export const fetchObjectives = createAsyncThunk('performance/fetchObjectives', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/pms/objectives', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch objectives')
  }
})

export const createObjective = createAsyncThunk('performance/createObjective', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/pms/objectives', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create objective')
  }
})

export const updateObjective = createAsyncThunk('performance/updateObjective', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/pms/objectives/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update objective')
  }
})

export const fetchFeedback = createAsyncThunk('performance/fetchFeedback', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/pms/feedback', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch feedback')
  }
})

export const createFeedback = createAsyncThunk('performance/createFeedback', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/pms/feedback', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create feedback')
  }
})

export const updateFeedback = createAsyncThunk('performance/updateFeedback', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/pms/feedback/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update feedback')
  }
})

export const fetchAnonymousFeedback = createAsyncThunk('performance/fetchAnonymousFeedback', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/pms/anonymous-feedback')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch anonymous feedback')
  }
})

export const createAnonymousFeedback = createAsyncThunk('performance/createAnonymousFeedback', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/pms/anonymous-feedback', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to submit anonymous feedback')
  }
})

export const deleteAnonymousFeedback = createAsyncThunk('performance/deleteAnonymousFeedback', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/pms/anonymous-feedback/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete anonymous feedback')
  }
})

export const fetchMeetings = createAsyncThunk('performance/fetchMeetings', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/pms/meetings')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch meetings')
  }
})

export const createMeeting = createAsyncThunk('performance/createMeeting', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/pms/meetings', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create meeting')
  }
})

export const deleteMeeting = createAsyncThunk('performance/deleteMeeting', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/pms/meetings/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete meeting')
  }
})

export const fetchBonusPoints = createAsyncThunk('performance/fetchBonusPoints', async (employeeId, { rejectWithValue }) => {
  try {
    const url = employeeId ? `/pms/bonus-points?employeeId=${employeeId}` : '/pms/bonus-points'
    const res = await api.get(url)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch bonus points')
  }
})

export const awardBonusPoints = createAsyncThunk('performance/awardBonusPoints', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/pms/bonus-points', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to award bonus points')
  }
})

// ─── Objective Comments ───────────────────────────────────────────────────────

export const fetchObjectiveComments = createAsyncThunk('performance/fetchObjectiveComments', async (objectiveId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/pms/objectives/${objectiveId}/comments`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch comments')
  }
})

export const addObjectiveComment = createAsyncThunk('performance/addObjectiveComment', async ({ objectiveId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/pms/objectives/${objectiveId}/comments`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add comment')
  }
})

export const deleteObjectiveComment = createAsyncThunk('performance/deleteObjectiveComment', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/pms/objective-comments/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete comment')
  }
})

// ─── Question Templates ───────────────────────────────────────────────────────

export const fetchQuestionTemplates = createAsyncThunk('performance/fetchQuestionTemplates', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/pms/question-templates')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch templates')
  }
})

export const createQuestionTemplate = createAsyncThunk('performance/createQuestionTemplate', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/pms/question-templates', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create template')
  }
})

export const updateQuestionTemplate = createAsyncThunk('performance/updateQuestionTemplate', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/pms/question-templates/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update template')
  }
})

export const deleteQuestionTemplate = createAsyncThunk('performance/deleteQuestionTemplate', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/pms/question-templates/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete template')
  }
})

// ─── Questions ────────────────────────────────────────────────────────────────

export const fetchQuestions = createAsyncThunk('performance/fetchQuestions', async (templateId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/pms/question-templates/${templateId}/questions`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch questions')
  }
})

export const addQuestion = createAsyncThunk('performance/addQuestion', async ({ templateId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/pms/question-templates/${templateId}/questions`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add question')
  }
})

export const deleteQuestion = createAsyncThunk('performance/deleteQuestion', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/pms/questions/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete question')
  }
})

// ─── Bonus Point Settings ─────────────────────────────────────────────────────

export const fetchBonusPointSettings = createAsyncThunk('performance/fetchBonusPointSettings', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/pms/bonus-point-settings')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch bonus settings')
  }
})

export const upsertBonusPointSettings = createAsyncThunk('performance/upsertBonusPointSettings', async (data, { rejectWithValue }) => {
  try {
    const res = await api.put('/pms/bonus-point-settings', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save bonus settings')
  }
})

export const fetchFeedbackOverview = createAsyncThunk('performance/fetchFeedbackOverview', async (params, { rejectWithValue }) => {
  try { const res = await api.get('/pms/feedback/overview', { params }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const bulkCreateFeedback = createAsyncThunk('performance/bulkCreateFeedback', async (feedbackList, { rejectWithValue }) => {
  try { const res = await api.post('/pms/feedback/bulk-create', feedbackList); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const archiveObjective = createAsyncThunk('performance/archiveObjective', async (id, { rejectWithValue }) => {
  try { const res = await api.post(`/pms/objectives/${id}/archive`); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const unarchiveObjective = createAsyncThunk('performance/unarchiveObjective', async (id, { rejectWithValue }) => {
  try { const res = await api.post(`/pms/objectives/${id}/unarchive`); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const fetchPerformanceDashboard = createAsyncThunk('performance/fetchDashboard', async (params, { rejectWithValue }) => {
  try { const res = await api.get('/pms/dashboard', { params }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

const performanceSlice = createSlice({
  name: 'performance',
  initialState: {
    cycles: [],
    objectives: [],
    feedback: [],
    anonymousFeedback: [],
    meetings: [],
    bonusPoints: [],
    selected: {},
    pagination: { page: 0, size: 20, total: 0 },
    loading: false,
    error: null,
    objectiveComments: [],
    questionTemplates: [],
    questions: [],
    bonusPointSettings: {},
    feedbackOverview: null,
    performanceDashboard: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAll.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchAll.fulfilled, (state, action) => {
        state.loading = false
        state.cycles = action.payload.content || action.payload
        if (action.payload.totalElements !== undefined) {
          state.pagination.total = action.payload.totalElements
          state.pagination.page = action.payload.number ?? state.pagination.page
          state.pagination.size = action.payload.size ?? state.pagination.size
        }
      })
      .addCase(fetchAll.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(create.pending, (state) => { state.loading = true; state.error = null })
      .addCase(create.fulfilled, (state, action) => { state.loading = false; state.cycles.push(action.payload) })
      .addCase(create.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(update.pending, (state) => { state.loading = true; state.error = null })
      .addCase(update.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.cycles.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.cycles[idx] = action.payload
        if (state.selected?.id === action.payload.id) state.selected = action.payload
      })
      .addCase(update.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchObjectives.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchObjectives.fulfilled, (state, action) => {
        state.loading = false
        state.objectives = action.payload.content || action.payload
      })
      .addCase(fetchObjectives.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(createObjective.pending, (state) => { state.loading = true; state.error = null })
      .addCase(createObjective.fulfilled, (state, action) => { state.loading = false; state.objectives.push(action.payload) })
      .addCase(createObjective.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(updateObjective.pending, (state) => { state.loading = true; state.error = null })
      .addCase(updateObjective.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.objectives.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.objectives[idx] = action.payload
      })
      .addCase(updateObjective.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchFeedback.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchFeedback.fulfilled, (state, action) => {
        state.loading = false
        state.feedback = action.payload.content || action.payload
      })
      .addCase(fetchFeedback.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(createFeedback.pending, (state) => { state.loading = true; state.error = null })
      .addCase(createFeedback.fulfilled, (state, action) => { state.loading = false; state.feedback.push(action.payload) })
      .addCase(createFeedback.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(updateFeedback.pending, (state) => { state.loading = true; state.error = null })
      .addCase(updateFeedback.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.feedback.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.feedback[idx] = action.payload
      })
      .addCase(updateFeedback.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchAnonymousFeedback.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchAnonymousFeedback.fulfilled, (state, action) => { state.loading = false; state.anonymousFeedback = action.payload.content || action.payload })
      .addCase(fetchAnonymousFeedback.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createAnonymousFeedback.fulfilled, (state, action) => { state.loading = false; state.anonymousFeedback.unshift(action.payload) })
      .addCase(deleteAnonymousFeedback.fulfilled, (state, action) => {
        state.loading = false
        state.anonymousFeedback = state.anonymousFeedback.filter(f => f.id !== action.payload)
      })

      .addCase(fetchMeetings.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchMeetings.fulfilled, (state, action) => { state.loading = false; state.meetings = action.payload.content || action.payload })
      .addCase(fetchMeetings.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createMeeting.fulfilled, (state, action) => { state.loading = false; state.meetings.unshift(action.payload) })
      .addCase(deleteMeeting.fulfilled, (state, action) => {
        state.loading = false
        state.meetings = state.meetings.filter(m => m.id !== action.payload)
      })

      .addCase(fetchBonusPoints.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchBonusPoints.fulfilled, (state, action) => { state.loading = false; state.bonusPoints = action.payload.content || action.payload })
      .addCase(fetchBonusPoints.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(awardBonusPoints.fulfilled, (state, action) => { state.loading = false; state.bonusPoints.unshift(action.payload) })

      // Objective Comments
      .addCase(fetchObjectiveComments.fulfilled, (state, action) => { state.objectiveComments = action.payload })
      .addCase(addObjectiveComment.fulfilled, (state, action) => { state.objectiveComments.push(action.payload) })
      .addCase(deleteObjectiveComment.fulfilled, (state, action) => {
        state.objectiveComments = state.objectiveComments.filter(c => c.id !== action.payload)
      })

      // Question Templates
      .addCase(fetchQuestionTemplates.fulfilled, (state, action) => { state.questionTemplates = action.payload })
      .addCase(createQuestionTemplate.fulfilled, (state, action) => { state.questionTemplates.push(action.payload) })
      .addCase(updateQuestionTemplate.fulfilled, (state, action) => {
        const idx = state.questionTemplates.findIndex(t => t.id === action.payload.id)
        if (idx !== -1) state.questionTemplates[idx] = action.payload
      })
      .addCase(deleteQuestionTemplate.fulfilled, (state, action) => {
        state.questionTemplates = state.questionTemplates.filter(t => t.id !== action.payload)
      })

      // Questions
      .addCase(fetchQuestions.fulfilled, (state, action) => { state.questions = action.payload })
      .addCase(addQuestion.fulfilled, (state, action) => { state.questions.push(action.payload) })
      .addCase(deleteQuestion.fulfilled, (state, action) => {
        state.questions = state.questions.filter(q => q.id !== action.payload)
      })

      // Bonus Point Settings
      .addCase(fetchBonusPointSettings.fulfilled, (state, action) => { state.bonusPointSettings = action.payload })
      .addCase(upsertBonusPointSettings.fulfilled, (state, action) => { state.bonusPointSettings = action.payload })
      .addCase(fetchFeedbackOverview.fulfilled, (state, action) => { state.feedbackOverview = action.payload })
      .addCase(fetchPerformanceDashboard.fulfilled, (state, action) => { state.performanceDashboard = action.payload })
  },
})

export const selectAll = (state) => state.performance.cycles
export const selectSelected = (state) => state.performance.selected
export const selectLoading = (state) => state.performance.loading
export const selectPagination = (state) => state.performance.pagination
export const selectObjectives = (state) => state.performance.objectives
export const selectFeedback = (state) => state.performance.feedback
export const selectAnonymousFeedback = (state) => state.performance.anonymousFeedback
export const selectMeetings = (state) => state.performance.meetings
export const selectBonusPoints = (state) => state.performance.bonusPoints
export const selectObjectiveComments = (state) => state.performance.objectiveComments
export const selectQuestionTemplates = (state) => state.performance.questionTemplates
export const selectQuestions = (state) => state.performance.questions
export const selectBonusPointSettings = (state) => state.performance.bonusPointSettings
export const selectFeedbackOverview = (state) => state.performance.feedbackOverview
export const selectPerformanceDashboard = (state) => state.performance.performanceDashboard
export default performanceSlice.reducer
