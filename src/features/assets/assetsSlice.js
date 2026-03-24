import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchAll = createAsyncThunk('assets/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/assets', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch assets')
  }
})

export const fetchById = createAsyncThunk('assets/fetchById', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/assets/${id}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch asset')
  }
})

export const create = createAsyncThunk('assets/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/assets', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create asset')
  }
})

export const update = createAsyncThunk('assets/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/assets/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update asset')
  }
})

export const remove = createAsyncThunk('assets/remove', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/assets/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete asset')
  }
})

export const assign = createAsyncThunk('assets/assign', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/assets/${id}/assign`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to assign asset')
  }
})

export const returnAsset = createAsyncThunk('assets/return', async (id, { rejectWithValue }) => {
  try {
    const res = await api.put(`/assets/${id}/return`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to return asset')
  }
})

export const fetchAssetLots = createAsyncThunk('assets/fetchAssetLots', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/assets/lots')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch lots')
  }
})

export const createAssetLot = createAsyncThunk('assets/createAssetLot', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/assets/lots', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create lot')
  }
})

export const fetchAssetAssignments = createAsyncThunk('assets/fetchAssetAssignments', async (assetId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/assets/${assetId}/assignments`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch assignments')
  }
})

export const fetchAssetReports = createAsyncThunk('assets/fetchAssetReports', async (assetId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/assets/${assetId}/reports`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch reports')
  }
})

export const submitAssetReport = createAsyncThunk('assets/submitAssetReport', async ({ assetId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/assets/${assetId}/reports`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to submit report')
  }
})

export const fetchAssetDocuments = createAsyncThunk('assets/fetchAssetDocuments', async (assetId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/assets/${assetId}/documents`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch documents')
  }
})

export const addAssetDocument = createAsyncThunk('assets/addAssetDocument', async ({ assetId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/assets/${assetId}/documents`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add document')
  }
})

const assetsSlice = createSlice({
  name: 'assets',
  initialState: {
    data: [],
    selected: {},
    pagination: { page: 0, size: 20, total: 0 },
    loading: false,
    error: null,
    assetLots: [],
    assetAssignments: [],
    assetReports: [],
    assetDocuments: [],
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

      .addCase(assign.pending, (state) => { state.loading = true; state.error = null })
      .addCase(assign.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.data.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
        if (state.selected?.id === action.payload.id) state.selected = action.payload
      })
      .addCase(assign.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(returnAsset.pending, (state) => { state.loading = true; state.error = null })
      .addCase(returnAsset.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.data.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
        if (state.selected?.id === action.payload.id) state.selected = action.payload
      })
      .addCase(returnAsset.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      // Asset Lots
      .addCase(fetchAssetLots.fulfilled, (state, action) => { state.assetLots = action.payload })
      .addCase(createAssetLot.fulfilled, (state, action) => { state.assetLots.push(action.payload) })

      // Assignments
      .addCase(fetchAssetAssignments.fulfilled, (state, action) => { state.assetAssignments = action.payload })

      // Reports
      .addCase(fetchAssetReports.fulfilled, (state, action) => { state.assetReports = action.payload })
      .addCase(submitAssetReport.fulfilled, (state, action) => { state.assetReports.push(action.payload) })

      // Documents
      .addCase(fetchAssetDocuments.fulfilled, (state, action) => { state.assetDocuments = action.payload })
      .addCase(addAssetDocument.fulfilled, (state, action) => { state.assetDocuments.push(action.payload) })
  },
})

export const selectAll = (state) => state.assets.data
export const selectSelected = (state) => state.assets.selected
export const selectLoading = (state) => state.assets.loading
export const selectPagination = (state) => state.assets.pagination
export const selectAssetLots = (state) => state.assets.assetLots
export const selectAssetAssignments = (state) => state.assets.assetAssignments
export const selectAssetReports = (state) => state.assets.assetReports
export const selectAssetDocuments = (state) => state.assets.assetDocuments
export default assetsSlice.reducer
