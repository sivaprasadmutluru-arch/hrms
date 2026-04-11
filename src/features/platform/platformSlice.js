import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchAllCompaniesForScope = createAsyncThunk('platform/fetchCompanies', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/platform/scope/companies')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch companies')
  }
})

export const validateCompanyScope = createAsyncThunk('platform/validateScope', async (companyId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/platform/scope/validate/${companyId}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to validate company scope')
  }
})

const platformSlice = createSlice({
  name: 'platform',
  initialState: {
    companies: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllCompaniesForScope.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchAllCompaniesForScope.fulfilled, (state, action) => {
        state.loading = false
        state.companies = action.payload.content || action.payload
      })
      .addCase(fetchAllCompaniesForScope.rejected, (state, action) => { state.loading = false; state.error = action.payload })
  },
})

export const selectPlatformCompanies = (state) => state.platform.companies
export const selectPlatformLoading = (state) => state.platform.loading
export default platformSlice.reducer
