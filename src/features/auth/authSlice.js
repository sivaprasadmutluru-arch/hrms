import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

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
    loading: false,
    error: null,
  },
  reducers: {
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
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('roles')
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

      .addCase(fetchMe.fulfilled, (state, action) => {
        state.roles = action.payload.roles || []
        // Merge companyId into user object if backend returns it
        if (action.payload.companyId !== undefined && state.user) {
          state.user = { ...state.user, companyId: action.payload.companyId }
          localStorage.setItem('user', JSON.stringify(state.user))
        }
        localStorage.setItem('roles', JSON.stringify(action.payload.roles || []))
      })
  },
})

export const { setCredentials, logout } = authSlice.actions
export const selectAuth = (state) => state.auth
export const selectUser = (state) => state.auth.user
export const selectRoles = (state) => state.auth.roles?.length ? state.auth.roles : (state.auth.user?.roles || [])
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated
export default authSlice.reducer
