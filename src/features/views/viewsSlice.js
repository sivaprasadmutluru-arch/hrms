import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchToggleColumns = createAsyncThunk('views/fetchToggleColumns', async (path, { rejectWithValue }) => {
  try {
    const res = await api.get('/views/toggle-columns', { params: { path } })
    return { path, data: res.data }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch column settings')
  }
})

export const saveToggleColumns = createAsyncThunk('views/saveToggleColumns', async ({ path, excludedColumns }, { rejectWithValue }) => {
  try {
    const res = await api.post('/views/toggle-columns', { path, excludedColumns })
    return { path, data: res.data }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save column settings')
  }
})

export const fetchActiveTab = createAsyncThunk('views/fetchActiveTab', async (path, { rejectWithValue }) => {
  try {
    const res = await api.get('/views/active-tabs', { params: { path } })
    return { path, data: res.data }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch active tab')
  }
})

export const saveActiveTab = createAsyncThunk('views/saveActiveTab', async ({ path, tabTarget }, { rejectWithValue }) => {
  try {
    const res = await api.post('/views/active-tabs', { path, tabTarget })
    return { path, data: res.data }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save active tab')
  }
})

export const fetchActiveGroup = createAsyncThunk('views/fetchActiveGroup', async (path, { rejectWithValue }) => {
  try {
    const res = await api.get('/views/active-groups', { params: { path } })
    return { path, data: res.data }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch active group')
  }
})

export const saveActiveGroup = createAsyncThunk('views/saveActiveGroup', async ({ path, groupTarget, groupByField }, { rejectWithValue }) => {
  try {
    const res = await api.post('/views/active-groups', { path, groupTarget, groupByField })
    return { path, data: res.data }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save active group')
  }
})

export const fetchSavedFilters = createAsyncThunk('views/fetchSavedFilters', async (path, { rejectWithValue }) => {
  try {
    const res = await api.get('/views/saved-filters', { params: { path } })
    return { path, data: res.data }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch saved filters')
  }
})

export const createSavedFilter = createAsyncThunk('views/createSavedFilter', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/views/saved-filters', data)
    return { path: data.path, data: res.data }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create saved filter')
  }
})

export const updateSavedFilter = createAsyncThunk('views/updateSavedFilter', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/views/saved-filters/${id}`, data)
    return { path: data.path, data: res.data }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update saved filter')
  }
})

export const deleteSavedFilter = createAsyncThunk('views/deleteSavedFilter', async ({ id, path }, { rejectWithValue }) => {
  try {
    await api.delete(`/views/saved-filters/${id}`)
    return { id, path }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete saved filter')
  }
})

export const fetchActiveView = createAsyncThunk('views/fetchActiveView', async (path, { rejectWithValue }) => {
  try {
    const res = await api.get('/views/active-views', { params: { path } })
    return { path, data: res.data }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch active view')
  }
})

export const saveActiveView = createAsyncThunk('views/saveActiveView', async ({ path, type }, { rejectWithValue }) => {
  try {
    const res = await api.post('/views/active-views', { path, type })
    return { path, data: res.data }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save active view')
  }
})

const viewsSlice = createSlice({
  name: 'views',
  initialState: {
    toggleColumns: {},
    activeTabs: {},
    activeGroups: {},
    savedFilters: {},
    activeViews: {},
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchToggleColumns.fulfilled, (state, action) => {
        state.toggleColumns[action.payload.path] = action.payload.data
      })
      .addCase(saveToggleColumns.fulfilled, (state, action) => {
        state.toggleColumns[action.payload.path] = action.payload.data
      })

      .addCase(fetchActiveTab.fulfilled, (state, action) => {
        state.activeTabs[action.payload.path] = action.payload.data
      })
      .addCase(saveActiveTab.fulfilled, (state, action) => {
        state.activeTabs[action.payload.path] = action.payload.data
      })

      .addCase(fetchActiveGroup.fulfilled, (state, action) => {
        state.activeGroups[action.payload.path] = action.payload.data
      })
      .addCase(saveActiveGroup.fulfilled, (state, action) => {
        state.activeGroups[action.payload.path] = action.payload.data
      })

      .addCase(fetchSavedFilters.fulfilled, (state, action) => {
        state.savedFilters[action.payload.path] = action.payload.data
      })
      .addCase(createSavedFilter.fulfilled, (state, action) => {
        const path = action.payload.path
        if (!state.savedFilters[path]) state.savedFilters[path] = []
        state.savedFilters[path].push(action.payload.data)
      })
      .addCase(updateSavedFilter.fulfilled, (state, action) => {
        const path = action.payload.path
        if (state.savedFilters[path]) {
          const idx = state.savedFilters[path].findIndex(f => f.id === action.payload.data.id)
          if (idx !== -1) state.savedFilters[path][idx] = action.payload.data
        }
      })
      .addCase(deleteSavedFilter.fulfilled, (state, action) => {
        const { id, path } = action.payload
        if (state.savedFilters[path]) {
          state.savedFilters[path] = state.savedFilters[path].filter(f => f.id !== id)
        }
      })

      .addCase(fetchActiveView.fulfilled, (state, action) => {
        state.activeViews[action.payload.path] = action.payload.data
      })
      .addCase(saveActiveView.fulfilled, (state, action) => {
        state.activeViews[action.payload.path] = action.payload.data
      })

      .addMatcher(
        (action) => action.type.startsWith('views/') && action.type.endsWith('/pending'),
        (state) => { state.loading = true; state.error = null }
      )
      .addMatcher(
        (action) => action.type.startsWith('views/') && (action.type.endsWith('/fulfilled') || action.type.endsWith('/rejected')),
        (state, action) => {
          state.loading = false
          if (action.type.endsWith('/rejected')) state.error = action.payload
        }
      )
  },
})

export const selectToggleColumns = (path) => (state) => state.views.toggleColumns[path]
export const selectActiveTab = (path) => (state) => state.views.activeTabs[path]
export const selectActiveGroup = (path) => (state) => state.views.activeGroups[path]
export const selectSavedFilters = (path) => (state) => state.views.savedFilters[path] || []
export const selectActiveView = (path) => (state) => state.views.activeViews[path]
export const selectViewsLoading = (state) => state.views.loading
export default viewsSlice.reducer
