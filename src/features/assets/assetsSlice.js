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

// Backend: POST /assets/{id}/assign/{employeeId}
export const assign = createAsyncThunk('assets/assign', async ({ id, employeeId }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/assets/${id}/assign/${employeeId}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to assign asset')
  }
})

// Backend: POST /assets/{id}/return
export const returnAsset = createAsyncThunk('assets/return', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/assets/${id}/return`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to return asset')
  }
})

export const duplicateAsset = createAsyncThunk('assets/duplicate', async ({ id, companyId }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/assets/${id}/duplicate`, null, { params: { companyId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to duplicate asset')
  }
})

// ─── Asset Lots ────────────────────────────────────────────────────────────

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

export const updateAssetLot = createAsyncThunk('assets/updateAssetLot', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/assets/lots/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update lot')
  }
})

export const deleteAssetLot = createAsyncThunk('assets/deleteAssetLot', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/assets/lots/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete lot')
  }
})

// ─── Asset Assignment History ──────────────────────────────────────────────

export const fetchAssetAssignments = createAsyncThunk('assets/fetchAssetAssignments', async (assetId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/assets/${assetId}/assignments`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch assignments')
  }
})

export const recordAssignment = createAsyncThunk('assets/recordAssignment', async ({ assetId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/assets/${assetId}/assignments`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to record assignment')
  }
})

// Backend: PUT /assets/assignments/{id}/return
export const returnAssignment = createAsyncThunk('assets/returnAssignment', async (id, { rejectWithValue }) => {
  try {
    const res = await api.put(`/assets/assignments/${id}/return`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to return assignment')
  }
})

// ─── Asset Reports ─────────────────────────────────────────────────────────

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

// ─── Asset Documents ───────────────────────────────────────────────────────

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

export const deleteAssetDocument = createAsyncThunk('assets/deleteAssetDocument', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/assets/documents/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete document')
  }
})

// ─── Return Images ─────────────────────────────────────────────────────────

export const fetchReturnImages = createAsyncThunk('assets/fetchReturnImages', async (assetId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/assets/${assetId}/return-images`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch return images')
  }
})

export const addReturnImage = createAsyncThunk('assets/addReturnImage', async ({ assetId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/assets/${assetId}/return-images`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add return image')
  }
})

export const deleteReturnImage = createAsyncThunk('assets/deleteReturnImage', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/assets/return-images/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete return image')
  }
})

// ─── Asset Categories ──────────────────────────────────────────────────────

export const fetchCategories = createAsyncThunk('assets/fetchCategories', async (params, { rejectWithValue }) => {
  try { const res = await api.get('/assets/categories', { params }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const createCategory = createAsyncThunk('assets/createCategory', async ({ data, companyId }, { rejectWithValue }) => {
  try { const res = await api.post('/assets/categories', data, { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const updateCategory = createAsyncThunk('assets/updateCategory', async ({ id, data }, { rejectWithValue }) => {
  try { const res = await api.put(`/assets/categories/${id}`, data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const deleteCategory = createAsyncThunk('assets/deleteCategory', async (id, { rejectWithValue }) => {
  try { await api.delete(`/assets/categories/${id}`); return id }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const duplicateCategory = createAsyncThunk('assets/duplicateCategory', async ({ id, companyId }, { rejectWithValue }) => {
  try { const res = await api.post(`/assets/categories/${id}/duplicate`, null, { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Asset Requests ────────────────────────────────────────────────────────

export const fetchRequests = createAsyncThunk('assets/fetchRequests', async (params, { rejectWithValue }) => {
  try { const res = await api.get('/assets/requests', { params }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const createRequest = createAsyncThunk('assets/createRequest', async ({ data, companyId }, { rejectWithValue }) => {
  try { const res = await api.post('/assets/requests', data, { params: { companyId } }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const updateRequest = createAsyncThunk('assets/updateRequest', async ({ id, data }, { rejectWithValue }) => {
  try { const res = await api.put(`/assets/requests/${id}`, data); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const approveRequest = createAsyncThunk('assets/approveRequest', async (id, { rejectWithValue }) => {
  try { const res = await api.post(`/assets/requests/${id}/approve`); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})
export const rejectRequest = createAsyncThunk('assets/rejectRequest', async (id, { rejectWithValue }) => {
  try { const res = await api.post(`/assets/requests/${id}/reject`); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Asset Dashboard ───────────────────────────────────────────────────────

export const fetchAssetDashboard = createAsyncThunk('assets/fetchDashboard', async (params, { rejectWithValue }) => {
  try { const res = await api.get('/assets/dashboard', { params }); return res.data }
  catch (err) { return rejectWithValue(err.response?.data?.message || 'Failed') }
})

// ─── Export / Import ───────────────────────────────────────────────────────

export const exportAssets = createAsyncThunk('assets/export', async (companyId, { rejectWithValue }) => {
  try {
    const res = await api.get('/assets/export', { params: { companyId }, responseType: 'blob' })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to export')
  }
})

export const importAssets = createAsyncThunk('assets/import', async ({ file, companyId }, { rejectWithValue }) => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post('/assets/import', formData, {
      params: { companyId },
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to import')
  }
})

// ─── Slice ─────────────────────────────────────────────────────────────────

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
    returnImages: [],
    categories: [],
    requests: [],
    assetDashboard: null,
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

      .addCase(duplicateAsset.fulfilled, (state, action) => { state.data.push(action.payload) })

      // Asset Lots
      .addCase(fetchAssetLots.fulfilled, (state, action) => { state.assetLots = action.payload })
      .addCase(createAssetLot.fulfilled, (state, action) => { state.assetLots.push(action.payload) })
      .addCase(updateAssetLot.fulfilled, (state, action) => {
        const idx = state.assetLots.findIndex(l => l.id === action.payload.id)
        if (idx !== -1) state.assetLots[idx] = action.payload
      })
      .addCase(deleteAssetLot.fulfilled, (state, action) => {
        state.assetLots = state.assetLots.filter(l => l.id !== action.payload)
      })

      // Assignments
      .addCase(fetchAssetAssignments.fulfilled, (state, action) => { state.assetAssignments = action.payload })
      .addCase(recordAssignment.fulfilled, (state, action) => { state.assetAssignments.push(action.payload) })
      .addCase(returnAssignment.fulfilled, (state, action) => {
        const idx = state.assetAssignments.findIndex(a => a.id === action.payload.id)
        if (idx !== -1) state.assetAssignments[idx] = action.payload
      })

      // Reports
      .addCase(fetchAssetReports.fulfilled, (state, action) => { state.assetReports = action.payload })
      .addCase(submitAssetReport.fulfilled, (state, action) => { state.assetReports.push(action.payload) })

      // Documents
      .addCase(fetchAssetDocuments.fulfilled, (state, action) => { state.assetDocuments = action.payload })
      .addCase(addAssetDocument.fulfilled, (state, action) => { state.assetDocuments.push(action.payload) })
      .addCase(deleteAssetDocument.fulfilled, (state, action) => {
        state.assetDocuments = state.assetDocuments.filter(d => d.id !== action.payload)
      })

      // Return Images
      .addCase(fetchReturnImages.fulfilled, (state, action) => { state.returnImages = action.payload })
      .addCase(addReturnImage.fulfilled, (state, action) => { state.returnImages.push(action.payload) })
      .addCase(deleteReturnImage.fulfilled, (state, action) => {
        state.returnImages = state.returnImages.filter(i => i.id !== action.payload)
      })

      // Categories
      .addCase(fetchCategories.fulfilled, (state, action) => { state.categories = action.payload })
      .addCase(createCategory.fulfilled, (state, action) => { state.categories.push(action.payload) })
      .addCase(updateCategory.fulfilled, (state, action) => {
        const idx = state.categories.findIndex(c => c.id === action.payload.id)
        if (idx !== -1) state.categories[idx] = action.payload
      })
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.categories = state.categories.filter(c => c.id !== action.payload)
      })
      .addCase(duplicateCategory.fulfilled, (state, action) => { state.categories.push(action.payload) })

      // Requests
      .addCase(fetchRequests.fulfilled, (state, action) => {
        state.requests = action.payload.content || action.payload
      })
      .addCase(createRequest.fulfilled, (state, action) => { state.requests.push(action.payload) })
      .addCase(updateRequest.fulfilled, (state, action) => {
        const idx = state.requests.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.requests[idx] = action.payload
      })
      .addCase(approveRequest.fulfilled, (state, action) => {
        const idx = state.requests.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.requests[idx] = action.payload
      })
      .addCase(rejectRequest.fulfilled, (state, action) => {
        const idx = state.requests.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.requests[idx] = action.payload
      })

      // Asset Dashboard
      .addCase(fetchAssetDashboard.fulfilled, (state, action) => { state.assetDashboard = action.payload })
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
export const selectReturnImages = (state) => state.assets.returnImages
export const selectCategories = (state) => state.assets.categories
export const selectRequests = (state) => state.assets.requests
export const selectAssetDashboard = (state) => state.assets.assetDashboard
export default assetsSlice.reducer
