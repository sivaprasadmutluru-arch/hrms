import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchGeoFencing = createAsyncThunk('geofencing/fetchConfig', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/geofencing')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch geofencing config')
  }
})

export const saveGeoFencing = createAsyncThunk('geofencing/saveConfig', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/geofencing', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save geofencing config')
  }
})

export const deleteGeoFencing = createAsyncThunk('geofencing/deleteConfig', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/geofencing/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete geofencing config')
  }
})

export const checkLocation = createAsyncThunk('geofencing/checkLocation', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/geofencing/check-location', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to check location')
  }
})

const geofencingSlice = createSlice({
  name: 'geofencing',
  initialState: {
    config: null,
    checkResult: null,
    loading: false,
    error: null,
  },
  reducers: {
    clearCheckResult: (state) => { state.checkResult = null },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGeoFencing.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchGeoFencing.fulfilled, (state, action) => { state.loading = false; state.config = action.payload })
      .addCase(fetchGeoFencing.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(saveGeoFencing.pending, (state) => { state.loading = true; state.error = null })
      .addCase(saveGeoFencing.fulfilled, (state, action) => { state.loading = false; state.config = action.payload })
      .addCase(saveGeoFencing.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(deleteGeoFencing.fulfilled, (state) => { state.config = null })

      .addCase(checkLocation.pending, (state) => { state.loading = true; state.error = null })
      .addCase(checkLocation.fulfilled, (state, action) => { state.loading = false; state.checkResult = action.payload })
      .addCase(checkLocation.rejected, (state, action) => { state.loading = false; state.error = action.payload })
  },
})

export const { clearCheckResult } = geofencingSlice.actions
export const selectGeoFencingConfig = (state) => state.geofencing.config
export const selectCheckResult = (state) => state.geofencing.checkResult
export const selectGeoFencingLoading = (state) => state.geofencing.loading
export default geofencingSlice.reducer
