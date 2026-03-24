import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchAnnouncements = createAsyncThunk('announcements/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/announcements')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch announcements')
  }
})

export const createAnnouncement = createAsyncThunk('announcements/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/announcements', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create announcement')
  }
})

export const updateAnnouncement = createAsyncThunk('announcements/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/announcements/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update announcement')
  }
})

export const deleteAnnouncement = createAsyncThunk('announcements/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/announcements/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete announcement')
  }
})

export const fetchAnnouncementComments = createAsyncThunk('announcements/fetchComments', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/announcements/${id}/comments`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch comments')
  }
})

export const addAnnouncementComment = createAsyncThunk('announcements/addComment', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/announcements/${id}/comments`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add comment')
  }
})

const announcementsSlice = createSlice({
  name: 'announcements',
  initialState: {
    data: [],
    comments: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAnnouncements.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchAnnouncements.fulfilled, (state, action) => { state.loading = false; state.data = action.payload.content || action.payload })
      .addCase(fetchAnnouncements.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createAnnouncement.fulfilled, (state, action) => { state.data.unshift(action.payload) })
      .addCase(updateAnnouncement.fulfilled, (state, action) => {
        const idx = state.data.findIndex(a => a.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
      })
      .addCase(deleteAnnouncement.fulfilled, (state, action) => {
        state.data = state.data.filter(a => a.id !== action.payload)
      })
      .addCase(fetchAnnouncementComments.fulfilled, (state, action) => { state.comments = action.payload })
      .addCase(addAnnouncementComment.fulfilled, (state, action) => { state.comments.push(action.payload) })
  },
})

export const selectAnnouncements = (state) => state.announcements.data
export const selectAnnouncementComments = (state) => state.announcements.comments
export const selectAnnouncementsLoading = (state) => state.announcements.loading
export default announcementsSlice.reducer
