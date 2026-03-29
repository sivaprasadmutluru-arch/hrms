import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchLocalBackup = createAsyncThunk('backup/fetchLocal', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/backup/local')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch local backup config')
  }
})

export const saveLocalBackup = createAsyncThunk('backup/saveLocal', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/backup/local', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save local backup config')
  }
})

export const fetchGdriveBackup = createAsyncThunk('backup/fetchGdrive', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/backup/gdrive')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch Google Drive backup config')
  }
})

export const saveGdriveBackup = createAsyncThunk('backup/saveGdrive', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/backup/gdrive', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save Google Drive backup config')
  }
})

const backupSlice = createSlice({
  name: 'backup',
  initialState: {
    localBackup: null,
    gdriveBackup: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLocalBackup.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchLocalBackup.fulfilled, (state, action) => { state.loading = false; state.localBackup = action.payload })
      .addCase(fetchLocalBackup.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(saveLocalBackup.pending, (state) => { state.loading = true; state.error = null })
      .addCase(saveLocalBackup.fulfilled, (state, action) => { state.loading = false; state.localBackup = action.payload })
      .addCase(saveLocalBackup.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchGdriveBackup.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchGdriveBackup.fulfilled, (state, action) => { state.loading = false; state.gdriveBackup = action.payload })
      .addCase(fetchGdriveBackup.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(saveGdriveBackup.pending, (state) => { state.loading = true; state.error = null })
      .addCase(saveGdriveBackup.fulfilled, (state, action) => { state.loading = false; state.gdriveBackup = action.payload })
      .addCase(saveGdriveBackup.rejected, (state, action) => { state.loading = false; state.error = action.payload })
  },
})

export const selectLocalBackup = (state) => state.backup.localBackup
export const selectGdriveBackup = (state) => state.backup.gdriveBackup
export const selectBackupLoading = (state) => state.backup.loading
export default backupSlice.reducer
