import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchOutlookAuth = createAsyncThunk('outlookAuth/fetchSettings', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/outlook-auth')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch Outlook auth settings')
  }
})

export const fetchOutlookAuthList = createAsyncThunk('outlookAuth/fetchList', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/outlook-auth/list')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch Outlook auth list')
  }
})

export const saveOutlookAuth = createAsyncThunk('outlookAuth/saveSettings', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/outlook-auth', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save Outlook auth settings')
  }
})

export const deleteOutlookAuth = createAsyncThunk('outlookAuth/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/outlook-auth/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete Outlook auth')
  }
})

const outlookAuthSlice = createSlice({
  name: 'outlookAuth',
  initialState: {
    settings: null,
    list: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchOutlookAuth.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchOutlookAuth.fulfilled, (state, action) => { state.loading = false; state.settings = action.payload })
      .addCase(fetchOutlookAuth.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchOutlookAuthList.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchOutlookAuthList.fulfilled, (state, action) => { state.loading = false; state.list = action.payload })
      .addCase(fetchOutlookAuthList.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(saveOutlookAuth.pending, (state) => { state.loading = true; state.error = null })
      .addCase(saveOutlookAuth.fulfilled, (state, action) => {
        state.loading = false
        state.settings = action.payload
        const idx = state.list.findIndex(i => i.id === action.payload.id)
        if (idx !== -1) state.list[idx] = action.payload
        else state.list.push(action.payload)
      })
      .addCase(saveOutlookAuth.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(deleteOutlookAuth.fulfilled, (state, action) => {
        state.list = state.list.filter(i => i.id !== action.payload)
        if (state.settings?.id === action.payload) state.settings = null
      })
  },
})

export const selectOutlookAuthSettings = (state) => state.outlookAuth.settings
export const selectOutlookAuthList = (state) => state.outlookAuth.list
export const selectOutlookAuthLoading = (state) => state.outlookAuth.loading
export default outlookAuthSlice.reducer
