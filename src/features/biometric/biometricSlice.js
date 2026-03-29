import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchDevices = createAsyncThunk('biometric/fetchDevices', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/biometric/devices')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch devices')
  }
})

export const createDevice = createAsyncThunk('biometric/createDevice', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/biometric/devices', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create device')
  }
})

export const updateDevice = createAsyncThunk('biometric/updateDevice', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/biometric/devices/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update device')
  }
})

export const deleteDevice = createAsyncThunk('biometric/deleteDevice', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/biometric/devices/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete device')
  }
})

export const fetchBiometricEmployees = createAsyncThunk('biometric/fetchEmployees', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/biometric/employees')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch biometric employees')
  }
})

export const createBiometricEmployee = createAsyncThunk('biometric/createEmployee', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/biometric/employees', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create biometric employee')
  }
})

export const updateBiometricEmployee = createAsyncThunk('biometric/updateEmployee', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/biometric/employees/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update biometric employee')
  }
})

export const deleteBiometricEmployee = createAsyncThunk('biometric/deleteEmployee', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/biometric/employees/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete biometric employee')
  }
})

export const fetchCosecArgs = createAsyncThunk('biometric/fetchCosecArgs', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/biometric/cosec-arguments')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch COSEC arguments')
  }
})

export const saveCosecArgs = createAsyncThunk('biometric/saveCosecArgs', async (data, { rejectWithValue }) => {
  try {
    const endpoint = data.id ? `/biometric/cosec-arguments/${data.id}` : '/biometric/cosec-arguments'
    const method = data.id ? 'put' : 'post'
    const res = await api[method](endpoint, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save COSEC arguments')
  }
})

const biometricSlice = createSlice({
  name: 'biometric',
  initialState: {
    devices: [],
    biometricEmployees: [],
    cosecArgs: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDevices.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchDevices.fulfilled, (state, action) => { state.loading = false; state.devices = action.payload })
      .addCase(fetchDevices.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(createDevice.fulfilled, (state, action) => { state.devices.push(action.payload) })
      .addCase(updateDevice.fulfilled, (state, action) => {
        const idx = state.devices.findIndex(d => d.id === action.payload.id)
        if (idx !== -1) state.devices[idx] = action.payload
      })
      .addCase(deleteDevice.fulfilled, (state, action) => {
        state.devices = state.devices.filter(d => d.id !== action.payload)
      })

      .addCase(fetchBiometricEmployees.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchBiometricEmployees.fulfilled, (state, action) => { state.loading = false; state.biometricEmployees = action.payload })
      .addCase(fetchBiometricEmployees.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(createBiometricEmployee.fulfilled, (state, action) => { state.biometricEmployees.push(action.payload) })
      .addCase(updateBiometricEmployee.fulfilled, (state, action) => {
        const idx = state.biometricEmployees.findIndex(e => e.id === action.payload.id)
        if (idx !== -1) state.biometricEmployees[idx] = action.payload
      })
      .addCase(deleteBiometricEmployee.fulfilled, (state, action) => {
        state.biometricEmployees = state.biometricEmployees.filter(e => e.id !== action.payload)
      })

      .addCase(fetchCosecArgs.fulfilled, (state, action) => { state.cosecArgs = action.payload })
      .addCase(saveCosecArgs.fulfilled, (state, action) => {
        const idx = state.cosecArgs.findIndex(a => a.id === action.payload.id)
        if (idx !== -1) state.cosecArgs[idx] = action.payload
        else state.cosecArgs.push(action.payload)
      })
  },
})

export const selectDevices = (state) => state.biometric.devices
export const selectBiometricEmployees = (state) => state.biometric.biometricEmployees
export const selectCosecArgs = (state) => state.biometric.cosecArgs
export const selectBiometricLoading = (state) => state.biometric.loading
export const selectBiometricError = (state) => state.biometric.error
export default biometricSlice.reducer
