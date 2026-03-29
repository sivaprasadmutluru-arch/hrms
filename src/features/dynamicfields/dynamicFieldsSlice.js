import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchDynamicFields = createAsyncThunk('dynamicFields/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/dynamic-fields')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch dynamic fields')
  }
})

export const createDynamicField = createAsyncThunk('dynamicFields/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/dynamic-fields', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create dynamic field')
  }
})

export const updateDynamicField = createAsyncThunk('dynamicFields/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/dynamic-fields/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update dynamic field')
  }
})

export const deleteDynamicField = createAsyncThunk('dynamicFields/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/dynamic-fields/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete dynamic field')
  }
})

export const fetchChoices = createAsyncThunk('dynamicFields/fetchChoices', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/dynamic-fields/choices')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch choices')
  }
})

export const createChoice = createAsyncThunk('dynamicFields/createChoice', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/dynamic-fields/choices', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create choice')
  }
})

export const deleteChoice = createAsyncThunk('dynamicFields/deleteChoice', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/dynamic-fields/choices/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete choice')
  }
})

const dynamicFieldsSlice = createSlice({
  name: 'dynamicFields',
  initialState: {
    fields: [],
    choices: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDynamicFields.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchDynamicFields.fulfilled, (state, action) => { state.loading = false; state.fields = action.payload })
      .addCase(fetchDynamicFields.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(createDynamicField.fulfilled, (state, action) => { state.fields.push(action.payload) })
      .addCase(updateDynamicField.fulfilled, (state, action) => {
        const idx = state.fields.findIndex(f => f.id === action.payload.id)
        if (idx !== -1) state.fields[idx] = action.payload
      })
      .addCase(deleteDynamicField.fulfilled, (state, action) => {
        state.fields = state.fields.filter(f => f.id !== action.payload)
      })

      .addCase(fetchChoices.fulfilled, (state, action) => { state.choices = action.payload })
      .addCase(createChoice.fulfilled, (state, action) => { state.choices.push(action.payload) })
      .addCase(deleteChoice.fulfilled, (state, action) => {
        state.choices = state.choices.filter(c => c.id !== action.payload)
      })
  },
})

export const selectDynamicFields = (state) => state.dynamicFields.fields
export const selectChoices = (state) => state.dynamicFields.choices
export const selectDynamicFieldsLoading = (state) => state.dynamicFields.loading
export default dynamicFieldsSlice.reducer
