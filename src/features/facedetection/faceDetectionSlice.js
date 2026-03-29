import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchFaceDetectionConfig = createAsyncThunk('faceDetection/fetchConfig', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/face-detection')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch face detection config')
  }
})

export const saveFaceDetectionConfig = createAsyncThunk('faceDetection/saveConfig', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/face-detection', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save face detection config')
  }
})

export const fetchFaceDetectionEmployees = createAsyncThunk('faceDetection/fetchEmployees', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/face-detection/employees')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch face detection employees')
  }
})

export const createFaceDetectionEmployee = createAsyncThunk('faceDetection/createEmployee', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/face-detection/employees', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to register employee')
  }
})

export const deleteFaceDetectionEmployee = createAsyncThunk('faceDetection/deleteEmployee', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/face-detection/employees/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to remove employee')
  }
})

const faceDetectionSlice = createSlice({
  name: 'faceDetection',
  initialState: {
    config: null,
    employees: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchFaceDetectionConfig.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchFaceDetectionConfig.fulfilled, (state, action) => { state.loading = false; state.config = action.payload })
      .addCase(fetchFaceDetectionConfig.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(saveFaceDetectionConfig.fulfilled, (state, action) => { state.config = action.payload })

      .addCase(fetchFaceDetectionEmployees.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchFaceDetectionEmployees.fulfilled, (state, action) => { state.loading = false; state.employees = action.payload })
      .addCase(fetchFaceDetectionEmployees.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(createFaceDetectionEmployee.fulfilled, (state, action) => { state.employees.push(action.payload) })
      .addCase(deleteFaceDetectionEmployee.fulfilled, (state, action) => {
        state.employees = state.employees.filter(e => e.id !== action.payload)
      })
  },
})

export const selectFaceDetectionConfig = (state) => state.faceDetection.config
export const selectFaceDetectionEmployees = (state) => state.faceDetection.employees
export const selectFaceDetectionLoading = (state) => state.faceDetection.loading
export default faceDetectionSlice.reducer
