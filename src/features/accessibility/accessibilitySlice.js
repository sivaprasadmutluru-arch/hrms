import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchAccessibilities = createAsyncThunk('accessibility/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/accessibility')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch accessibility settings')
  }
})

export const createAccessibility = createAsyncThunk('accessibility/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/accessibility', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create accessibility setting')
  }
})

export const updateAccessibility = createAsyncThunk('accessibility/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/accessibility/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update accessibility setting')
  }
})

export const deleteAccessibility = createAsyncThunk('accessibility/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/accessibility/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete accessibility setting')
  }
})

export const addEmployeesToAccessibility = createAsyncThunk('accessibility/addEmployees', async ({ id, employeeIds }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/accessibility/${id}/employees`, { employeeIds })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add employees')
  }
})

const accessibilitySlice = createSlice({
  name: 'accessibility',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccessibilities.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchAccessibilities.fulfilled, (state, action) => { state.loading = false; state.items = action.payload })
      .addCase(fetchAccessibilities.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(createAccessibility.fulfilled, (state, action) => { state.items.push(action.payload) })
      .addCase(updateAccessibility.fulfilled, (state, action) => {
        const idx = state.items.findIndex(i => i.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(deleteAccessibility.fulfilled, (state, action) => {
        state.items = state.items.filter(i => i.id !== action.payload)
      })
      .addCase(addEmployeesToAccessibility.fulfilled, (state, action) => {
        const idx = state.items.findIndex(i => i.id === action.payload.id)
        if (idx !== -1) state.items[idx] = action.payload
      })
  },
})

export const selectAccessibilities = (state) => state.accessibility.items
export const selectAccessibilityLoading = (state) => state.accessibility.loading
export default accessibilitySlice.reducer
