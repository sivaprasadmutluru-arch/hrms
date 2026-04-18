import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchAll = createAsyncThunk('notifications/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/notifications', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch notifications')
  }
})

export const markRead = createAsyncThunk('notifications/markRead', async (id, { rejectWithValue }) => {
  try {
    await api.post(`/notifications/${id}/read`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to mark notification as read')
  }
})

export const markAllRead = createAsyncThunk('notifications/markAllRead', async (_, { rejectWithValue }) => {
  try {
    await api.post('/notifications/mark-all-read')
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to mark all notifications as read')
  }
})

export const deleteNotification = createAsyncThunk('notifications/deleteOne', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/notifications/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete notification')
  }
})

export const deleteAllNotifications = createAsyncThunk('notifications/deleteAll', async (_, { rejectWithValue }) => {
  try {
    await api.delete('/notifications')
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete all notifications')
  }
})

export const fetchUnreadCount = createAsyncThunk('notifications/fetchUnreadCount', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/notifications/unread-count')
    return res.data.count
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch unread count')
  }
})

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    data: [],
    unreadCount: 0,
    pagination: { page: 0, size: 20, total: 0 },
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAll.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchAll.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload.content || action.payload
        if (action.payload.totalElements !== undefined) {
          state.pagination.total = action.payload.totalElements
          state.pagination.page = action.payload.number ?? state.pagination.page
          state.pagination.size = action.payload.size ?? state.pagination.size
        }
        state.unreadCount = state.data.filter((n) => !n.isRead).length
      })
      .addCase(fetchAll.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(markRead.pending, (state) => { state.loading = true; state.error = null })
      .addCase(markRead.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.data.findIndex((item) => item.id === action.payload)
        if (idx !== -1) state.data[idx] = { ...state.data[idx], isRead: true }
        state.unreadCount = state.data.filter((n) => !n.isRead).length
      })
      .addCase(markRead.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(markAllRead.pending, (state) => { state.loading = true; state.error = null })
      .addCase(markAllRead.fulfilled, (state) => {
        state.loading = false
        state.data = state.data.map((n) => ({ ...n, isRead: true }))
        state.unreadCount = 0
      })
      .addCase(markAllRead.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(deleteNotification.fulfilled, (state, action) => {
        state.data = state.data.filter((n) => n.id !== action.payload)
        state.unreadCount = state.data.filter((n) => !n.isRead).length
      })

      .addCase(deleteAllNotifications.fulfilled, (state) => {
        state.data = []
        state.unreadCount = 0
      })

      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload
      })
  },
})

export const selectAll = (state) => state.notifications.data
export const selectLoading = (state) => state.notifications.loading
export const selectPagination = (state) => state.notifications.pagination
export const selectUnreadCount = (state) => state.notifications.unreadCount
export default notificationsSlice.reducer
