import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetch2FAStatus = createAsyncThunk('twoFactor/fetchStatus', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/2fa/status')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch 2FA status')
  }
})

export const setup2FA = createAsyncThunk('twoFactor/setup', async (_, { rejectWithValue }) => {
  try {
    const res = await api.post('/2fa/setup')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to setup 2FA')
  }
})

export const sendOTP = createAsyncThunk('twoFactor/sendOtp', async (_, { rejectWithValue }) => {
  try {
    const res = await api.post('/2fa/send-otp')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to send OTP')
  }
})

export const verify2FA = createAsyncThunk('twoFactor/verify', async (otp, { rejectWithValue }) => {
  try {
    const res = await api.post('/2fa/verify', { otp })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to verify OTP')
  }
})

export const disable2FA = createAsyncThunk('twoFactor/disable', async (otp, { rejectWithValue }) => {
  try {
    const res = await api.post('/2fa/disable', { otp })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to disable 2FA')
  }
})

export const fetchUser2FAStatus = createAsyncThunk('twoFactor/fetchUserStatus', async (userId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/2fa/admin/user/${userId}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch user 2FA status')
  }
})

export const adminDisable2FA = createAsyncThunk('twoFactor/adminDisable', async (userId, { rejectWithValue }) => {
  try {
    const res = await api.post(`/2fa/admin/user/${userId}/disable`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to disable 2FA for user')
  }
})

const twoFactorSlice = createSlice({
  name: 'twoFactor',
  initialState: {
    isEnabled: false,
    otpVerified: false,
    setupStep: 'idle', // idle | pending-otp | verified
    otp: null, // dev mode only
    loading: false,
    error: null,
  },
  reducers: {
    resetSetup: (state) => {
      state.setupStep = 'idle'
      state.otp = null
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetch2FAStatus.fulfilled, (state, action) => {
        state.isEnabled = action.payload.isEnabled
        state.otpVerified = action.payload.otpVerified
      })
      .addCase(setup2FA.pending, (state) => { state.loading = true; state.error = null })
      .addCase(setup2FA.fulfilled, (state, action) => {
        state.loading = false
        state.setupStep = 'pending-otp'
        state.otp = action.payload.otp || null
      })
      .addCase(setup2FA.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(verify2FA.pending, (state) => { state.loading = true; state.error = null })
      .addCase(verify2FA.fulfilled, (state) => {
        state.loading = false
        state.isEnabled = true
        state.setupStep = 'verified'
        state.otp = null
      })
      .addCase(verify2FA.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(disable2FA.pending, (state) => { state.loading = true; state.error = null })
      .addCase(disable2FA.fulfilled, (state) => {
        state.loading = false
        state.isEnabled = false
        state.setupStep = 'idle'
      })
      .addCase(disable2FA.rejected, (state, action) => { state.loading = false; state.error = action.payload })
  },
})

export const { resetSetup } = twoFactorSlice.actions
export const selectTwoFactor = (state) => state.twoFactor
export default twoFactorSlice.reducer
