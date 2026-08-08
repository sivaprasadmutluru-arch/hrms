import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchAll = createAsyncThunk('organizations/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/organizations', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch organizations')
  }
})

export const fetchById = createAsyncThunk('organizations/fetchById', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/organizations/${id}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch organization')
  }
})

export const create = createAsyncThunk('organizations/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/organizations', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create organization')
  }
})

export const update = createAsyncThunk('organizations/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/organizations/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update organization')
  }
})

export const fetchWithoutHeadOffice = createAsyncThunk('organizations/fetchWithoutHeadOffice', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/organizations/without-head-office')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch available organizations')
  }
})

export const remove = createAsyncThunk('organizations/remove', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/organizations/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete organization')
  }
})

export const fetchPlanLimits = createAsyncThunk('organizations/fetchPlanLimits', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/organizations/${id}/plan-limits`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch plan limits')
  }
})

export const uploadLogo = createAsyncThunk('organizations/uploadLogo', async ({ id, file }, { rejectWithValue }) => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post(`/organizations/${id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return { id, logoPath: res.data.logoPath }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to upload logo')
  }
})

const organizationsSlice = createSlice({
  name: 'organizations',
  initialState: {
    data: [],
    available: [],
    selected: {},
    planLimits: null,
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
      .addCase(create.fulfilled, (state, action) => {
        // Backend returns { organization, headOfficeCompanyId } so the caller can switch
        // the active org context right after creation — keep the table's `data` array as
        // plain Organization rows, matching every other reducer here.
        state.loading = false
        state.data.push(action.payload.organization)
      })
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

      .addCase(fetchWithoutHeadOffice.fulfilled, (state, action) => { state.available = action.payload })
      .addCase(fetchWithoutHeadOffice.rejected, (state) => { state.available = [] })

      .addCase(fetchPlanLimits.fulfilled, (state, action) => { state.planLimits = action.payload })
      .addCase(fetchPlanLimits.rejected, (state) => { state.planLimits = null })

      .addCase(uploadLogo.fulfilled, (state, action) => {
        const idx = state.data.findIndex(item => item.id === action.payload.id)
        if (idx !== -1) state.data[idx] = { ...state.data[idx], logoPath: action.payload.logoPath }
        if (state.selected?.id === action.payload.id) state.selected = { ...state.selected, logoPath: action.payload.logoPath }
      })
  },
})

export const selectAll = (state) => state.organizations.data
export const selectAvailable = (state) => state.organizations.available
export const selectSelected = (state) => state.organizations.selected
export const selectPlanLimits = (state) => state.organizations.planLimits
export const selectLoading = (state) => state.organizations.loading
export const selectPagination = (state) => state.organizations.pagination
export default organizationsSlice.reducer
