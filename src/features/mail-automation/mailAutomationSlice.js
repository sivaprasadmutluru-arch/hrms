import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchMailAutomations = createAsyncThunk('mailAutomation/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/mail-automations')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch mail automations')
  }
})

export const fetchActiveMailAutomations = createAsyncThunk('mailAutomation/fetchActive', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/mail-automations/active')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch active mail automations')
  }
})

export const createMailAutomation = createAsyncThunk('mailAutomation/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/mail-automations', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create mail automation')
  }
})

export const updateMailAutomation = createAsyncThunk('mailAutomation/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/mail-automations/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update mail automation')
  }
})

export const toggleMailAutomation = createAsyncThunk('mailAutomation/toggle', async (id, { rejectWithValue }) => {
  try {
    const res = await api.patch(`/mail-automations/${id}/toggle`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to toggle mail automation')
  }
})

export const deleteMailAutomation = createAsyncThunk('mailAutomation/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/mail-automations/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete mail automation')
  }
})

const mailAutomationSlice = createSlice({
  name: 'mailAutomation',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchMailAutomations.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchMailAutomations.fulfilled, (state, action) => { state.loading = false; state.items = action.payload })
      .addCase(fetchMailAutomations.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(fetchActiveMailAutomations.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchActiveMailAutomations.fulfilled, (state, action) => { state.loading = false; state.items = action.payload })
      .addCase(fetchActiveMailAutomations.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createMailAutomation.fulfilled, (state, action) => { state.items.unshift(action.payload) })
      .addCase(updateMailAutomation.fulfilled, (state, action) => {
        const idx = state.items.findIndex(i => i.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(toggleMailAutomation.fulfilled, (state, action) => {
        const idx = state.items.findIndex(i => i.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(deleteMailAutomation.fulfilled, (state, action) => {
        state.items = state.items.filter(i => i.id !== action.payload)
      })
  },
})

export const selectMailAutomations = (state) => state.mailAutomation.items
export const selectMailAutomationLoading = (state) => state.mailAutomation.loading
export default mailAutomationSlice.reducer
