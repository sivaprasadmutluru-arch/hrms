import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'
import { updateCurrency } from '../companies/companiesSlice'

export const fetchPlatformStats = createAsyncThunk('platform/fetchStats', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/platform/stats')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch platform stats')
  }
})

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
    stats: null,
    statsLoading: false,
    loading: false,
    scopeValidating: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlatformStats.pending, (state) => { state.statsLoading = true })
      .addCase(fetchPlatformStats.fulfilled, (state, action) => { state.statsLoading = false; state.stats = action.payload })
      .addCase(fetchPlatformStats.rejected, (state) => { state.statsLoading = false })
      .addCase(fetchAllCompaniesForScope.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchAllCompaniesForScope.fulfilled, (state, action) => {
        state.loading = false
        state.companies = action.payload.content || action.payload
      })
      .addCase(fetchAllCompaniesForScope.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(validateCompanyScope.pending, (state) => { state.scopeValidating = true })
      .addCase(validateCompanyScope.fulfilled, (state) => { state.scopeValidating = false })
      .addCase(validateCompanyScope.rejected, (state) => { state.scopeValidating = false })
      .addCase(updateCurrency.fulfilled, (state, action) => {
        const idx = state.companies.findIndex(c => c.id === action.payload.id)
        if (idx !== -1) state.companies[idx] = { ...state.companies[idx], currency: action.payload.currency }
      })
  },
})

export const selectPlatformCompanies = (state) => state.platform.companies
export const selectPlatformLoading = (state) => state.platform.loading
export const selectScopeValidating = (state) => state.platform.scopeValidating
export const selectPlatformStats = (state) => state.platform.stats
export const selectPlatformStatsLoading = (state) => state.platform.statsLoading
export default platformSlice.reducer
