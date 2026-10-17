import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchUserRoles = createAsyncThunk('roles/fetchUserRoles', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/user-roles')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch user role assignments')
  }
})

export const fetchUsers = createAsyncThunk('roles/fetchUsers', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/user-roles/users')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch users')
  }
})

export const registerUser = createAsyncThunk('roles/registerUser', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/register', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create user')
  }
})

export const assignRole = createAsyncThunk('roles/assignRole', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/user-roles/assign', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to assign role')
  }
})

export const assignRoleToCompanies = createAsyncThunk('roles/assignRoleToCompanies', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/user-roles/assign-multiple', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to assign role to selected companies')
  }
})

export const revokeRole = createAsyncThunk('roles/revokeRole', async ({ userId, roleId, companyId }, { rejectWithValue }) => {
  try {
    await api.delete('/user-roles/revoke', { params: { userId, roleId, companyId } })
    return { userId, roleId, companyId }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to revoke role')
  }
})

export const fetchCrossAccess = createAsyncThunk('roles/fetchCrossAccess', async (userId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/cross-branch-access/user/${userId}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch cross-access records')
  }
})

export const grantAccess = createAsyncThunk('roles/grantAccess', async ({ userId, targetCompanyId, grantedByCompanyId, reason }, { rejectWithValue }) => {
  try {
    const res = await api.post('/cross-branch-access/grant', { userId, targetCompanyId, grantedByCompanyId, reason })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to grant cross-access')
  }
})

export const revokeAccess = createAsyncThunk('roles/revokeAccess', async ({ userId, targetCompanyId }, { rejectWithValue }) => {
  try {
    await api.delete('/cross-branch-access/revoke', { params: { userId, targetCompanyId } })
    return { userId, targetCompanyId }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to revoke cross-access')
  }
})

const rolesSlice = createSlice({
  name: 'roles',
  initialState: {
    userRoles: [],
    users: [],
    crossAccess: [],
    selected: {},
    pagination: { page: 0, size: 20, total: 0 },
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.fulfilled, (state, action) => { state.users = action.payload })

      .addCase(registerUser.pending, (state) => { state.loading = true; state.error = null })
      .addCase(registerUser.fulfilled, (state) => { state.loading = false })
      .addCase(registerUser.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchUserRoles.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchUserRoles.fulfilled, (state, action) => {
        state.loading = false
        state.userRoles = action.payload.content || action.payload
      })
      .addCase(fetchUserRoles.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(assignRole.pending, (state) => { state.loading = true; state.error = null })
      .addCase(assignRole.fulfilled, (state, action) => { state.loading = false; state.userRoles.push(action.payload) })
      .addCase(assignRole.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(revokeRole.pending, (state) => { state.loading = true; state.error = null })
      .addCase(revokeRole.fulfilled, (state, action) => {
        state.loading = false
        const { userId, roleId, companyId } = action.payload
        state.userRoles = state.userRoles.filter(
          ur => !(ur.userId === userId && ur.roleId === roleId && ur.companyId === companyId)
        )
      })
      .addCase(revokeRole.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchCrossAccess.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchCrossAccess.fulfilled, (state, action) => {
        state.loading = false
        state.crossAccess = action.payload.content || action.payload
      })
      .addCase(fetchCrossAccess.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(grantAccess.pending, (state) => { state.loading = true; state.error = null })
      .addCase(grantAccess.fulfilled, (state, action) => { state.loading = false; state.crossAccess.push(action.payload) })
      .addCase(grantAccess.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(revokeAccess.pending, (state) => { state.loading = true; state.error = null })
      .addCase(revokeAccess.fulfilled, (state, action) => {
        state.loading = false
        const { userId, targetCompanyId } = action.payload
        state.crossAccess = state.crossAccess.filter(
          (item) => !(item.userId === userId && item.targetCompanyId === targetCompanyId)
        )
      })
      .addCase(revokeAccess.rejected, (state, action) => { state.loading = false; state.error = action.payload })
  },
})

export const selectLoading = (state) => state.roles.loading
export const selectPagination = (state) => state.roles.pagination
export const selectUserRoles = (state) => state.roles.userRoles
export const selectUsers = (state) => state.roles.users
export const selectCrossAccess = (state) => state.roles.crossAccess
export default rolesSlice.reducer
