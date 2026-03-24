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

const companiesSlice = createSlice({
  name: 'companies',
  initialState: {
    data: [],
    selected: {},
    branches: {},
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
      })
      .addCase(remove.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchBranches.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchBranches.fulfilled, (state, action) => {
        state.loading = false
        state.branches[action.meta.arg] = action.payload
      })
      .addCase(fetchBranches.rejected, (state, action) => { state.loading = false; state.error = action.payload })

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
  },
})

export const selectAll = (state) => state.companies.data
export const selectSelected = (state) => state.companies.selected
export const selectLoading = (state) => state.companies.loading
export const selectPagination = (state) => state.companies.pagination
export const selectBranches = (state) => state.companies.branches
export const selectApprovalConditions = (state) => state.companies.approvalConditions
export default companiesSlice.reducer
