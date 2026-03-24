import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchAll = createAsyncThunk('projects/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/projects', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch projects')
  }
})

export const fetchById = createAsyncThunk('projects/fetchById', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/projects/${id}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch project')
  }
})

export const create = createAsyncThunk('projects/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/projects', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create project')
  }
})

export const update = createAsyncThunk('projects/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/projects/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update project')
  }
})

export const remove = createAsyncThunk('projects/remove', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/projects/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete project')
  }
})

export const fetchTasks = createAsyncThunk('projects/fetchTasks', async (projectId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/projects/${projectId}/tasks`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch tasks')
  }
})

export const createTask = createAsyncThunk('projects/createTask', async ({ projectId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/projects/${projectId}/tasks`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create task')
  }
})

export const updateTask = createAsyncThunk('projects/updateTask', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/tasks/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update task')
  }
})

export const deleteTask = createAsyncThunk('projects/deleteTask', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/tasks/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete task')
  }
})

export const fetchStages = createAsyncThunk('projects/fetchStages', async (projectId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/projects/${projectId}/stages`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch stages')
  }
})

export const createStage = createAsyncThunk('projects/createStage', async ({ projectId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/projects/${projectId}/stages`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create stage')
  }
})

export const deleteStage = createAsyncThunk('projects/deleteStage', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/projects/stages/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete stage')
  }
})

export const fetchTimesheets = createAsyncThunk('projects/fetchTimesheets', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/projects/timesheets')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch timesheets')
  }
})

export const createTimesheet = createAsyncThunk('projects/createTimesheet', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/projects/timesheets', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create timesheet')
  }
})

export const deleteTimesheet = createAsyncThunk('projects/deleteTimesheet', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/projects/timesheets/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete timesheet')
  }
})

const projectsSlice = createSlice({
  name: 'projects',
  initialState: {
    data: [],
    selected: {},
    tasks: [],
    stages: [],
    timesheets: [],
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

      .addCase(fetchTasks.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false
        state.tasks = action.payload.content || action.payload
      })
      .addCase(fetchTasks.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(createTask.pending, (state) => { state.loading = true; state.error = null })
      .addCase(createTask.fulfilled, (state, action) => { state.loading = false; state.tasks.push(action.payload) })
      .addCase(createTask.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(updateTask.pending, (state) => { state.loading = true; state.error = null })
      .addCase(updateTask.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.tasks.findIndex((task) => task.id === action.payload.id)
        if (idx !== -1) state.tasks[idx] = action.payload
      })
      .addCase(updateTask.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(deleteTask.pending, (state) => { state.loading = true; state.error = null })
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.loading = false
        state.tasks = state.tasks.filter((task) => task.id !== action.payload)
      })
      .addCase(deleteTask.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchStages.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchStages.fulfilled, (state, action) => { state.loading = false; state.stages = action.payload.content || action.payload })
      .addCase(fetchStages.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createStage.fulfilled, (state, action) => { state.stages.push(action.payload) })
      .addCase(deleteStage.fulfilled, (state, action) => {
        state.stages = state.stages.filter(s => s.id !== action.payload)
      })

      .addCase(fetchTimesheets.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchTimesheets.fulfilled, (state, action) => { state.loading = false; state.timesheets = action.payload.content || action.payload })
      .addCase(fetchTimesheets.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createTimesheet.fulfilled, (state, action) => { state.timesheets.unshift(action.payload) })
      .addCase(deleteTimesheet.fulfilled, (state, action) => {
        state.timesheets = state.timesheets.filter(t => t.id !== action.payload)
      })
  },
})

export const selectAll = (state) => state.projects.data
export const selectSelected = (state) => state.projects.selected
export const selectLoading = (state) => state.projects.loading
export const selectPagination = (state) => state.projects.pagination
export const selectTasks = (state) => state.projects.tasks
export const selectStages = (state) => state.projects.stages
export const selectTimesheets = (state) => state.projects.timesheets
export default projectsSlice.reducer
