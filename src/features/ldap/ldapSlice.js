import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchLdapSettings = createAsyncThunk('ldap/fetchSettings', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/ldap/settings')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch LDAP settings')
  }
})

export const saveLdapSettings = createAsyncThunk('ldap/saveSettings', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/ldap/settings', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to save LDAP settings')
  }
})

const ldapSlice = createSlice({
  name: 'ldap',
  initialState: {
    settings: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLdapSettings.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchLdapSettings.fulfilled, (state, action) => { state.loading = false; state.settings = action.payload })
      .addCase(fetchLdapSettings.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(saveLdapSettings.pending, (state) => { state.loading = true; state.error = null })
      .addCase(saveLdapSettings.fulfilled, (state, action) => { state.loading = false; state.settings = action.payload })
      .addCase(saveLdapSettings.rejected, (state, action) => { state.loading = false; state.error = action.payload })
  },
})

export const selectLdapSettings = (state) => state.ldap.settings
export const selectLdapLoading = (state) => state.ldap.loading
export default ldapSlice.reducer
