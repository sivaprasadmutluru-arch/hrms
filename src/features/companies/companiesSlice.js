import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchAll = createAsyncThunk('companies/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/companies', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch companies')
  }
})

export const updateCurrency = createAsyncThunk('companies/updateCurrency', async ({ id, currency }, { rejectWithValue }) => {
  try {
    const res = await api.patch(`/companies/${id}/currency`, { currency })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update currency')
  }
})

export const fetchById = createAsyncThunk('companies/fetchById', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/companies/${id}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch company')
  }
})

// Used by enterprise admin — fetches their own company by ID and puts it in the data list
export const fetchMyCompany = createAsyncThunk('companies/fetchMyCompany', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/companies/${id}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch company')
  }
})

export const create = createAsyncThunk('companies/create', async (data, { rejectWithValue }) => {
  try {
    const url = data.type === 'BRANCH'
      ? `/companies/${data.parentId}/branches`
      : '/companies/head-office'
    const res = await api.post(url, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create company')
  }
})

export const update = createAsyncThunk('companies/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/companies/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update company')
  }
})

export const remove = createAsyncThunk('companies/remove', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/companies/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete company')
  }
})

export const fetchBranches = createAsyncThunk('companies/fetchBranches', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/companies/${id}/branches`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch branches')
  }
})

export const fetchBranchesSummary = createAsyncThunk('companies/fetchBranchesSummary', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/companies/${id}/branches-summary`)
    return { headOfficeId: id, data: res.data }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch branches summary')
  }
})

export const fetchApprovalConditions = createAsyncThunk('companies/fetchApprovalConditions', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/approval-conditions')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch approval conditions')
  }
})

export const createApprovalCondition = createAsyncThunk('companies/createApprovalCondition', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/approval-conditions', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create approval condition')
  }
})

export const updateApprovalCondition = createAsyncThunk('companies/updateApprovalCondition', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/approval-conditions/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update approval condition')
  }
})

export const deleteApprovalCondition = createAsyncThunk('companies/deleteApprovalCondition', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/approval-conditions/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete approval condition')
  }
})

export const uploadLogo = createAsyncThunk('companies/uploadLogo', async ({ id, file }, { rejectWithValue }) => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post(`/companies/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return { id, logoPath: res.data.logoPath }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to upload logo')
  }
})

const companiesSlice = createSlice({
  name: 'companies',
  initialState: {
    data: [],
    selected: {},
    branches: {},
    branchesSummary: {},
    approvalConditions: [],
    pagination: { page: 0, size: 20, total: 0 },
    loading: false,
    error: null,
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
        // Also remove from branches cache (for branch deletions)
        for (const hoId of Object.keys(state.branches)) {
          state.branches[hoId] = state.branches[hoId].filter(b => b.id !== action.payload)
        }
      })
      .addCase(remove.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchBranches.fulfilled, (state, action) => {
        state.branches[action.meta.arg] = action.payload
      })
      .addCase(fetchBranches.rejected, (state, action) => { state.error = action.payload })

      .addCase(fetchBranchesSummary.fulfilled, (state, action) => {
        state.branchesSummary[action.payload.headOfficeId] = action.payload.data
      })

      .addCase(fetchMyCompany.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchMyCompany.fulfilled, (state, action) => {
        state.loading = false
        state.data = [action.payload]  // enterprise admin only has their own head office
      })
      .addCase(fetchMyCompany.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchApprovalConditions.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchApprovalConditions.fulfilled, (state, action) => { state.loading = false; state.approvalConditions = action.payload.content || action.payload })
      .addCase(fetchApprovalConditions.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createApprovalCondition.fulfilled, (state, action) => { state.approvalConditions.push(action.payload) })
      .addCase(updateApprovalCondition.fulfilled, (state, action) => {
        const idx = state.approvalConditions.findIndex(c => c.id === action.payload.id)
        if (idx !== -1) state.approvalConditions[idx] = action.payload
      })
      .addCase(deleteApprovalCondition.fulfilled, (state, action) => {
        state.approvalConditions = state.approvalConditions.filter(c => c.id !== action.payload)
      })

      .addCase(updateCurrency.fulfilled, (state, action) => {
        const idx = state.data.findIndex(item => item.id === action.payload.id)
        if (idx !== -1) state.data[idx] = { ...state.data[idx], currency: action.payload.currency }
        if (state.selected?.id === action.payload.id) state.selected = { ...state.selected, currency: action.payload.currency }
      })
      .addCase(uploadLogo.fulfilled, (state, action) => {
        const idx = state.data.findIndex(item => item.id === action.payload.id)
        if (idx !== -1) state.data[idx] = { ...state.data[idx], logoPath: action.payload.logoPath }
        if (state.selected?.id === action.payload.id) state.selected = { ...state.selected, logoPath: action.payload.logoPath }
        // Update logoPath in branches cache too
        for (const hoId of Object.keys(state.branches)) {
          const bIdx = state.branches[hoId]?.findIndex(b => b.id === action.payload.id)
          if (bIdx !== undefined && bIdx !== -1) {
            state.branches[hoId][bIdx] = { ...state.branches[hoId][bIdx], logoPath: action.payload.logoPath }
          }
        }
      })
  },
})

export const selectAll = (state) => state.companies.data
export const selectSelected = (state) => state.companies.selected
export const selectLoading = (state) => state.companies.loading
export const selectPagination = (state) => state.companies.pagination
export const selectBranches = (state) => state.companies.branches
export const selectBranchesSummary = (state) => state.companies.branchesSummary
export const selectApprovalConditions = (state) => state.companies.approvalConditions
export default companiesSlice.reducer
