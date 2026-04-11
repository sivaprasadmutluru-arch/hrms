import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchUserPermissions = createAsyncThunk('userPermissions/fetchAll', async ({ userId, companyId }, { rejectWithValue }) => {
  try {
    const cfg = companyId ? { headers: { 'X-Company-Id': companyId } } : {}
    const res = await api.get(`/user-permissions/user/${userId}`, cfg)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch user permissions')
  }
})

export const grantPermission = createAsyncThunk('userPermissions/grant', async ({ data, companyId }, { rejectWithValue }) => {
  try {
    const cfg = companyId ? { headers: { 'X-Company-Id': companyId } } : {}
    const res = await api.post('/user-permissions/grant', data, cfg)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to grant permission')
  }
})

export const revokePermission = createAsyncThunk('userPermissions/revoke', async ({ data, companyId }, { rejectWithValue }) => {
  try {
    const cfg = companyId ? { headers: { 'X-Company-Id': companyId } } : {}
    const res = await api.post('/user-permissions/revoke', data, cfg)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to revoke permission')
  }
})

export const removePermissionOverride = createAsyncThunk('userPermissions/remove', async ({ userId, permissionCode, companyId }, { rejectWithValue }) => {
  try {
    const cfg = companyId ? { headers: { 'X-Company-Id': companyId } } : {}
    await api.delete(`/user-permissions/user/${userId}/permission/${permissionCode}`, cfg)
    return permissionCode
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to remove permission override')
  }
})

const userPermissionsSlice = createSlice({
  name: 'userPermissions',
  initialState: {
    data: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserPermissions.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchUserPermissions.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload.content || action.payload
      })
      .addCase(fetchUserPermissions.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(grantPermission.fulfilled, (state, action) => {
        state.data.push(action.payload)
      })
      .addCase(revokePermission.fulfilled, (state, action) => {
        state.data.push(action.payload)
      })
      .addCase(removePermissionOverride.fulfilled, (state, action) => {
        state.data = state.data.filter(p => p.permissionCode !== action.payload)
      })
  },
})

export const selectUserPermissions = (state) => state.userPermissions.data
export const selectUserPermissionsLoading = (state) => state.userPermissions.loading
export default userPermissionsSlice.reducer
