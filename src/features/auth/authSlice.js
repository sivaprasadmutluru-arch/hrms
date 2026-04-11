import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const changeUsername = createAsyncThunk('auth/changeUsername', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/change-username', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to change username')
  }
})

export const changePassword = createAsyncThunk('auth/changePassword', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/change-password', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to change password')
  }
})

export const forgotPassword = createAsyncThunk('auth/forgotPassword', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/forgot-password', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to send reset email')
  }
})

export const resetPassword = createAsyncThunk('auth/resetPassword', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/reset-password', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reset password')
  }
})

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/auth/me')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch user info')
  }
})

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/login', credentials)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed')
  }
})

const stored = localStorage.getItem('user')
const storedRoles = localStorage.getItem('roles')
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: stored ? JSON.parse(stored) : null,
    roles: storedRoles ? JSON.parse(storedRoles) : [],
    token: localStorage.getItem('token') || null,
    isAuthenticated: !!localStorage.getItem('token'),
    selectedCompanyId: localStorage.getItem('selectedCompanyId') || null,
    loading: false,
    error: null,
  },
  reducers: {
    setSelectedCompany: (state, action) => {
      state.selectedCompanyId = action.payload
      if (action.payload) {
        localStorage.setItem('selectedCompanyId', action.payload)
      } else {
        localStorage.removeItem('selectedCompanyId')
      }
    },
    setCredentials: (state, action) => {
      state.user = action.payload.user
      state.token = action.payload.token
      state.isAuthenticated = true
      localStorage.setItem('token', action.payload.token)
      localStorage.setItem('user', JSON.stringify(action.payload.user))
    },
    logout: (state) => {
      state.user = null
      state.roles = []
      state.token = null
      state.isAuthenticated = false
      state.selectedCompanyId = null
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('roles')
      localStorage.removeItem('selectedCompanyId')
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => { state.loading = true; state.error = null })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.user = action.payload
        state.roles = action.payload.roles || []
        state.token = action.payload.token
        state.isAuthenticated = true
        localStorage.setItem('token', action.payload.token)
        localStorage.setItem('user', JSON.stringify(action.payload))
        localStorage.setItem('roles', JSON.stringify(action.payload.roles || []))
      })
      .addCase(login.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(changeUsername.fulfilled, (state, action) => {
        if (state.user && action.payload?.username) {
          state.user = { ...state.user, username: action.payload.username }
          localStorage.setItem('user', JSON.stringify(state.user))
        }
      })

      .addCase(fetchMe.fulfilled, (state, action) => {
        state.roles = action.payload.roles || []
        // Merge companyId, organizationId and employeeId into user object if backend returns them
        if (state.user) {
          const updates = {}
          if (action.payload.companyId !== undefined) updates.companyId = action.payload.companyId
          if (action.payload.organizationId !== undefined) updates.organizationId = action.payload.organizationId
          if (action.payload.employeeId !== undefined) updates.employeeId = action.payload.employeeId
          if (Object.keys(updates).length > 0) {
            state.user = { ...state.user, ...updates }
            localStorage.setItem('user', JSON.stringify(state.user))
          }
        }
        localStorage.setItem('roles', JSON.stringify(action.payload.roles || []))
      })
  },
})

export const { setCredentials, logout, setSelectedCompany } = authSlice.actions
export const selectAuth = (state) => state.auth
export const selectUser = (state) => state.auth.user
export const selectRoles = (state) => state.auth.roles?.length ? state.auth.roles : (state.auth.user?.roles || [])
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated
export default authSlice.reducer
