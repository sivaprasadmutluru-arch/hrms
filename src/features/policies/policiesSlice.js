import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchAll = createAsyncThunk('policies/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/hr-policies', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch policies')
  }
})

export const fetchById = createAsyncThunk('policies/fetchById', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/hr-policies/${id}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch policy')
  }
})

export const create = createAsyncThunk('policies/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/hr-policies', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create policy')
  }
})

export const update = createAsyncThunk('policies/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/hr-policies/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update policy')
  }
})

export const remove = createAsyncThunk('policies/remove', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/hr-policies/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete policy')
  }
})

export const publish = createAsyncThunk('policies/publish', async (id, { rejectWithValue }) => {
  try {
    const res = await api.put(`/hr-policies/${id}/publish`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to publish policy')
  }
})

export const unpublish = createAsyncThunk('policies/unpublish', async (id, { rejectWithValue }) => {
  try {
    const res = await api.put(`/hr-policies/${id}/unpublish`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to unpublish policy')
  }
})

export const makeOrgWide = createAsyncThunk('policies/makeOrgWide', async ({ id, companyId }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/hr-policies/${id}/make-organization-wide`, null, { params: { companyId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to make policy organization-wide')
  }
})

export const makeBranchOnly = createAsyncThunk('policies/makeBranchOnly', async ({ id, companyId }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/hr-policies/${id}/make-branch-only`, null, { params: { companyId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to make policy branch-only')
  }
})

export const fetchInheritedPolicies = createAsyncThunk('policies/fetchInheritedPolicies', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/hr-policies/inherited')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch inherited policies')
  }
})

const policiesSlice = createSlice({
  name: 'policies',
  initialState: {
    data: [],
    inherited: [],
    selected: {},
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

      .addCase(publish.pending, (state) => { state.loading = true; state.error = null })
      .addCase(publish.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.data.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
        if (state.selected?.id === action.payload.id) state.selected = action.payload
      })
      .addCase(publish.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(unpublish.pending, (state) => { state.loading = true; state.error = null })
      .addCase(unpublish.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.data.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
        if (state.selected?.id === action.payload.id) state.selected = action.payload
      })
      .addCase(unpublish.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(makeOrgWide.fulfilled, (state, action) => {
        const idx = state.data.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
      })
      .addCase(makeBranchOnly.fulfilled, (state, action) => {
        const idx = state.data.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
      })
      .addCase(fetchInheritedPolicies.fulfilled, (state, action) => {
        state.inherited = action.payload
      })
  },
})

export const selectAll = (state) => state.policies.data
export const selectInherited = (state) => state.policies.inherited
export const selectSelected = (state) => state.policies.selected
export const selectLoading = (state) => state.policies.loading
export const selectPagination = (state) => state.policies.pagination
export default policiesSlice.reducer
