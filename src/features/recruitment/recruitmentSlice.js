import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchAll = createAsyncThunk('recruitment/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/recruitment/posts', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch recruitment posts')
  }
})

export const fetchById = createAsyncThunk('recruitment/fetchById', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/recruitment/posts/${id}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch recruitment post')
  }
})

export const create = createAsyncThunk('recruitment/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/recruitment/posts', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create recruitment post')
  }
})

export const update = createAsyncThunk('recruitment/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/recruitment/posts/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update recruitment post')
  }
})

export const remove = createAsyncThunk('recruitment/remove', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/recruitment/posts/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete recruitment post')
  }
})

export const fetchApplicantsByPost = createAsyncThunk('recruitment/fetchApplicantsByPost', async (postId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/recruitment/posts/${postId}/applicants`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch applicants for post')
  }
})

export const createApplicant = createAsyncThunk('recruitment/createApplicant', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/recruitment/applicants', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create applicant')
  }
})

export const updateApplicantStage = createAsyncThunk('recruitment/updateApplicantStage', async ({ id, stageId }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/recruitment/applicants/${id}/stage`, null, { params: { stageId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update applicant stage')
  }
})

export const fetchApplicants = createAsyncThunk('recruitment/fetchApplicants', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/recruitment/applicants', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch applicants')
  }
})

export const hireApplicant = createAsyncThunk('recruitment/hireApplicant', async (id, { rejectWithValue }) => {
  try {
    const res = await api.put(`/recruitment/applicants/${id}/hire`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to hire applicant')
  }
})

export const rejectApplicant = createAsyncThunk('recruitment/rejectApplicant', async (id, { rejectWithValue }) => {
  try {
    const res = await api.put(`/recruitment/applicants/${id}/reject`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reject applicant')
  }
})

export const fetchInterviews = createAsyncThunk('recruitment/fetchInterviews', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/recruitment/interviews')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch interviews')
  }
})

export const createInterview = createAsyncThunk('recruitment/createInterview', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/recruitment/interviews', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create interview')
  }
})

export const completeInterview = createAsyncThunk('recruitment/completeInterview', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/recruitment/interviews/${id}/complete`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to complete interview')
  }
})

export const deleteInterview = createAsyncThunk('recruitment/deleteInterview', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/recruitment/interviews/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete interview')
  }
})

export const fetchSkillZones = createAsyncThunk('recruitment/fetchSkillZones', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/recruitment/skill-zones')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch skill zones')
  }
})

export const createSkillZone = createAsyncThunk('recruitment/createSkillZone', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/recruitment/skill-zones', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create skill zone')
  }
})

export const deleteSkillZone = createAsyncThunk('recruitment/deleteSkillZone', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/recruitment/skill-zones/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete skill zone')
  }
})

export const fetchRejectReasons = createAsyncThunk('recruitment/fetchRejectReasons', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/recruitment/reject-reasons')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch reject reasons')
  }
})

export const createRejectReason = createAsyncThunk('recruitment/createRejectReason', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/recruitment/reject-reasons', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create reject reason')
  }
})

export const updateRejectReason = createAsyncThunk('recruitment/updateRejectReason', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/recruitment/reject-reasons/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update reject reason')
  }
})

export const deleteRejectReason = createAsyncThunk('recruitment/deleteRejectReason', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/recruitment/reject-reasons/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete reject reason')
  }
})

// ─── Skills ──────────────────────────────────────────────────────────────────

export const fetchSkills = createAsyncThunk('recruitment/fetchSkills', async (companyId, { rejectWithValue }) => {
  try { const res = await api.get('/recruitment/skills', { params: companyId ? { companyId } : {} }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const createSkill = createAsyncThunk('recruitment/createSkill', async (data, { rejectWithValue }) => {
  try { const res = await api.post('/recruitment/skills', data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const deleteSkill = createAsyncThunk('recruitment/deleteSkill', async (id, { rejectWithValue }) => {
  try { await api.delete(`/recruitment/skills/${id}`); return id }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Survey Templates ─────────────────────────────────────────────────────────

export const fetchSurveyTemplates = createAsyncThunk('recruitment/fetchSurveyTemplates', async (companyId, { rejectWithValue }) => {
  try { const res = await api.get('/recruitment/survey-templates', { params: companyId ? { companyId } : {} }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const createSurveyTemplate = createAsyncThunk('recruitment/createSurveyTemplate', async (data, { rejectWithValue }) => {
  try { const res = await api.post('/recruitment/survey-templates', data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const updateSurveyTemplate = createAsyncThunk('recruitment/updateSurveyTemplate', async ({ id, data }, { rejectWithValue }) => {
  try { const res = await api.put(`/recruitment/survey-templates/${id}`, data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const deleteSurveyTemplate = createAsyncThunk('recruitment/deleteSurveyTemplate', async (id, { rejectWithValue }) => {
  try { await api.delete(`/recruitment/survey-templates/${id}`); return id }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Rejected Candidates ──────────────────────────────────────────────────────

export const fetchRejectedCandidates = createAsyncThunk('recruitment/fetchRejectedCandidates', async (params, { rejectWithValue }) => {
  try { const res = await api.get('/recruitment/rejected-candidates', { params }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const rejectCandidate = createAsyncThunk('recruitment/rejectCandidate', async (data, { rejectWithValue }) => {
  try { const res = await api.post('/recruitment/rejected-candidates', data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Candidate Documents ──────────────────────────────────────────────────────

export const fetchCandidateDocumentRequests = createAsyncThunk('recruitment/fetchCandidateDocumentRequests', async (candidateId, { rejectWithValue }) => {
  try { const res = await api.get(`/recruitment/candidates/${candidateId}/document-requests`); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const createCandidateDocumentRequest = createAsyncThunk('recruitment/createCandidateDocumentRequest', async ({ candidateId, data }, { rejectWithValue }) => {
  try { const res = await api.post(`/recruitment/candidates/${candidateId}/document-requests`, data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Recruitment General Settings ────────────────────────────────────────────

export const fetchRecruitmentSettings = createAsyncThunk('recruitment/fetchRecruitmentSettings', async (companyId, { rejectWithValue }) => {
  try { const res = await api.get('/recruitment/settings', { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const upsertRecruitmentSettings = createAsyncThunk('recruitment/upsertRecruitmentSettings', async ({ companyId, data }, { rejectWithValue }) => {
  try { const res = await api.put('/recruitment/settings', data, { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const fetchPipeline = createAsyncThunk('recruitment/fetchPipeline', async (postId, { rejectWithValue }) => {
  try { const res = await api.get(`/recruitment/posts/${postId}/pipeline`); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const closePost = createAsyncThunk('recruitment/closePost', async (id, { rejectWithValue }) => {
  try { const res = await api.post(`/recruitment/posts/${id}/close`); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const reopenPost = createAsyncThunk('recruitment/reopenPost', async (id, { rejectWithValue }) => {
  try { const res = await api.post(`/recruitment/posts/${id}/reopen`); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const archivePost = createAsyncThunk('recruitment/archivePost', async (id, { rejectWithValue }) => {
  try { const res = await api.post(`/recruitment/posts/${id}/archive`); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const unarchivePost = createAsyncThunk('recruitment/unarchivePost', async (id, { rejectWithValue }) => {
  try { const res = await api.post(`/recruitment/posts/${id}/unarchive`); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const convertToEmployee = createAsyncThunk('recruitment/convertToEmployee', async (id, { rejectWithValue }) => {
  try { const res = await api.post(`/recruitment/applicants/${id}/convert-employee`); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const bulkApplicantAction = createAsyncThunk('recruitment/bulkAction', async (body, { rejectWithValue }) => {
  try { const res = await api.post('/recruitment/applicants/bulk-action', body); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const sendMailToCandidate = createAsyncThunk('recruitment/sendMail', async ({ id, data }, { rejectWithValue }) => {
  try { const res = await api.post(`/recruitment/applicants/${id}/send-mail`, data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const fetchRecruitmentDashboard = createAsyncThunk('recruitment/fetchDashboard', async (params, { rejectWithValue }) => {
  try { const res = await api.get('/recruitment/dashboard', { params }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const setupLinkedIn = createAsyncThunk('recruitment/setupLinkedIn', async (data, { rejectWithValue }) => {
  try { const res = await api.post('/recruitment/linkedin/setup', data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

export const syncLinkedIn = createAsyncThunk('recruitment/syncLinkedIn', async (params, { rejectWithValue }) => {
  try { const res = await api.post('/recruitment/linkedin/sync', null, { params }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

const recruitmentSlice = createSlice({
  name: 'recruitment',
  initialState: {
    posts: [],
    pipeline: [],
    selected: {},
    applicants: [],
    interviews: [],
    skillZones: [],
    rejectReasons: [],
    skills: [],
    surveyTemplates: [],
    rejectedCandidates: [],
    candidateDocumentRequests: [],
    recruitmentSettings: null,
    pagination: { page: 0, size: 20, total: 0 },
    loading: false,
    pipelineLoading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAll.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchAll.fulfilled, (state, action) => {
        state.loading = false
        state.posts = action.payload.content || action.payload
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
      .addCase(create.fulfilled, (state, action) => { state.loading = false; state.posts.push(action.payload) })
      .addCase(create.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(update.pending, (state) => { state.loading = true; state.error = null })
      .addCase(update.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.posts.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.posts[idx] = action.payload
        if (state.selected?.id === action.payload.id) state.selected = action.payload
      })
      .addCase(update.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(remove.pending, (state) => { state.loading = true; state.error = null })
      .addCase(remove.fulfilled, (state, action) => {
        state.loading = false
        state.posts = state.posts.filter((item) => item.id !== action.payload)
      })
      .addCase(remove.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchApplicantsByPost.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchApplicantsByPost.fulfilled, (state, action) => {
        state.loading = false
        state.applicants = action.payload.content || action.payload
      })
      .addCase(fetchApplicantsByPost.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(createApplicant.pending, (state) => { state.loading = true; state.error = null })
      .addCase(createApplicant.fulfilled, (state, action) => { state.loading = false; state.applicants.push(action.payload) })
      .addCase(createApplicant.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(updateApplicantStage.pending, (state) => { state.loading = true; state.error = null })
      .addCase(updateApplicantStage.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.applicants.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.applicants[idx] = action.payload
        state.pipeline = state.pipeline.map(stage => ({
          ...stage,
          applicants: (stage.applicants || []).map(a => a.id === action.payload.id ? action.payload : a),
        }))
      })
      .addCase(updateApplicantStage.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchApplicants.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchApplicants.fulfilled, (state, action) => {
        state.loading = false
        state.applicants = action.payload.content || action.payload
      })
      .addCase(fetchApplicants.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(hireApplicant.pending, (state) => { state.loading = true; state.error = null })
      .addCase(hireApplicant.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.applicants.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.applicants[idx] = action.payload
        state.pipeline = state.pipeline.map(stage => ({
          ...stage,
          applicants: (stage.applicants || []).map(a => a.id === action.payload.id ? action.payload : a),
        }))
      })
      .addCase(hireApplicant.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(rejectApplicant.pending, (state) => { state.loading = true; state.error = null })
      .addCase(rejectApplicant.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.applicants.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.applicants[idx] = action.payload
        state.pipeline = state.pipeline.map(stage => ({
          ...stage,
          applicants: (stage.applicants || []).map(a => a.id === action.payload.id ? action.payload : a),
        }))
      })
      .addCase(rejectApplicant.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchInterviews.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchInterviews.fulfilled, (state, action) => { state.loading = false; state.interviews = action.payload.content || action.payload })
      .addCase(fetchInterviews.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createInterview.fulfilled, (state, action) => { state.loading = false; state.interviews.unshift(action.payload) })
      .addCase(completeInterview.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.interviews.findIndex(i => i.id === action.payload.id)
        if (idx !== -1) state.interviews[idx] = action.payload
      })
      .addCase(deleteInterview.fulfilled, (state, action) => {
        state.loading = false
        state.interviews = state.interviews.filter(i => i.id !== action.payload)
      })

      .addCase(fetchSkillZones.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchSkillZones.fulfilled, (state, action) => { state.loading = false; state.skillZones = action.payload.content || action.payload })
      .addCase(fetchSkillZones.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createSkillZone.fulfilled, (state, action) => { state.loading = false; state.skillZones.push(action.payload) })
      .addCase(deleteSkillZone.fulfilled, (state, action) => {
        state.loading = false
        state.skillZones = state.skillZones.filter(sz => sz.id !== action.payload)
      })

      .addCase(fetchRejectReasons.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchRejectReasons.fulfilled, (state, action) => { state.loading = false; state.rejectReasons = action.payload.content || action.payload })
      .addCase(fetchRejectReasons.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createRejectReason.fulfilled, (state, action) => { state.loading = false; state.rejectReasons.push(action.payload) })
      .addCase(updateRejectReason.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.rejectReasons.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.rejectReasons[idx] = action.payload
      })
      .addCase(deleteRejectReason.fulfilled, (state, action) => {
        state.loading = false
        state.rejectReasons = state.rejectReasons.filter(r => r.id !== action.payload)
      })

      .addCase(fetchSkills.fulfilled, (state, action) => { state.skills = action.payload })
      .addCase(createSkill.fulfilled, (state, action) => { state.skills.push(action.payload) })
      .addCase(deleteSkill.fulfilled, (state, action) => { state.skills = state.skills.filter(s => s.id !== action.payload) })

      .addCase(fetchSurveyTemplates.fulfilled, (state, action) => { state.surveyTemplates = action.payload })
      .addCase(createSurveyTemplate.fulfilled, (state, action) => { state.surveyTemplates.push(action.payload) })
      .addCase(updateSurveyTemplate.fulfilled, (state, action) => {
        const idx = state.surveyTemplates.findIndex(t => t.id === action.payload.id)
        if (idx !== -1) state.surveyTemplates[idx] = action.payload
      })
      .addCase(deleteSurveyTemplate.fulfilled, (state, action) => { state.surveyTemplates = state.surveyTemplates.filter(t => t.id !== action.payload) })

      .addCase(fetchRejectedCandidates.fulfilled, (state, action) => { state.rejectedCandidates = action.payload })
      .addCase(rejectCandidate.fulfilled, (state, action) => { state.rejectedCandidates.unshift(action.payload) })

      .addCase(fetchCandidateDocumentRequests.fulfilled, (state, action) => { state.candidateDocumentRequests = action.payload })
      .addCase(createCandidateDocumentRequest.fulfilled, (state, action) => { state.candidateDocumentRequests.push(action.payload) })

      .addCase(fetchRecruitmentSettings.fulfilled, (state, action) => { state.recruitmentSettings = action.payload })
      .addCase(upsertRecruitmentSettings.fulfilled, (state, action) => { state.recruitmentSettings = action.payload })

      .addCase(fetchPipeline.pending, (state) => { state.pipelineLoading = true })
      .addCase(fetchPipeline.fulfilled, (state, action) => { state.pipelineLoading = false; state.pipeline = action.payload })
      .addCase(fetchPipeline.rejected, (state) => { state.pipelineLoading = false })
  },
})

export const selectAll = (state) => state.recruitment.posts
export const selectSelected = (state) => state.recruitment.selected
export const selectLoading = (state) => state.recruitment.loading
export const selectPipelineLoading = (state) => state.recruitment.pipelineLoading
export const selectPagination = (state) => state.recruitment.pagination
export const selectApplicants = (state) => state.recruitment.applicants
export const selectInterviews = (state) => state.recruitment.interviews
export const selectSkillZones = (state) => state.recruitment.skillZones
export const selectRejectReasons = (state) => state.recruitment.rejectReasons
export const selectSkills = (state) => state.recruitment.skills
export const selectSurveyTemplates = (state) => state.recruitment.surveyTemplates
export const selectRejectedCandidates = (state) => state.recruitment.rejectedCandidates
export const selectCandidateDocumentRequests = (state) => state.recruitment.candidateDocumentRequests
export const selectRecruitmentSettings = (state) => state.recruitment.recruitmentSettings
export const selectPipeline = (state) => state.recruitment.pipeline
export default recruitmentSlice.reducer
