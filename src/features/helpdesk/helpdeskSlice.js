import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchAll = createAsyncThunk('helpdesk/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/helpdesk/tickets', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch helpdesk tickets')
  }
})

export const fetchById = createAsyncThunk('helpdesk/fetchById', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/helpdesk/tickets/${id}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch helpdesk ticket')
  }
})

export const create = createAsyncThunk('helpdesk/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/helpdesk/tickets', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create helpdesk ticket')
  }
})

export const update = createAsyncThunk('helpdesk/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/helpdesk/tickets/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update helpdesk ticket')
  }
})

export const remove = createAsyncThunk('helpdesk/remove', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/helpdesk/tickets/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete helpdesk ticket')
  }
})

export const resolve = createAsyncThunk('helpdesk/resolve', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/helpdesk/tickets/${id}/resolve`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to resolve helpdesk ticket')
  }
})

export const close = createAsyncThunk('helpdesk/close', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/helpdesk/tickets/${id}/close`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to close helpdesk ticket')
  }
})

export const fetchComments = createAsyncThunk('helpdesk/fetchComments', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/helpdesk/tickets/${id}/comments`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch comments')
  }
})

export const addComment = createAsyncThunk('helpdesk/addComment', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/helpdesk/tickets/${id}/comments`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add comment')
  }
})

export const fetchClaims = createAsyncThunk('helpdesk/fetchClaims', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/helpdesk/claims')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch claims')
  }
})

export const createClaim = createAsyncThunk('helpdesk/createClaim', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/helpdesk/claims', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create claim')
  }
})

export const approveClaim = createAsyncThunk('helpdesk/approveClaim', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/helpdesk/claims/${id}/approve`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to approve claim')
  }
})

export const rejectClaim = createAsyncThunk('helpdesk/rejectClaim', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/helpdesk/claims/${id}/reject`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reject claim')
  }
})

export const fetchFAQCategories = createAsyncThunk('helpdesk/fetchFAQCategories', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/helpdesk/faq-categories')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch FAQ categories')
  }
})

export const createFAQCategory = createAsyncThunk('helpdesk/createFAQCategory', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/helpdesk/faq-categories', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create FAQ category')
  }
})

export const fetchFAQs = createAsyncThunk('helpdesk/fetchFAQs', async (categoryId, { rejectWithValue }) => {
  try {
    const url = categoryId ? `/helpdesk/faqs?categoryId=${categoryId}` : '/helpdesk/faqs'
    const res = await api.get(url)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch FAQs')
  }
})

export const createFAQ = createAsyncThunk('helpdesk/createFAQ', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/helpdesk/faqs', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create FAQ')
  }
})

export const deleteFAQ = createAsyncThunk('helpdesk/deleteFAQ', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/helpdesk/faqs/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete FAQ')
  }
})

export const fetchDepartmentManagers = createAsyncThunk('helpdesk/fetchDepartmentManagers', async (departmentId, { rejectWithValue }) => {
  try {
    const url = departmentId ? `/helpdesk/department-managers?departmentId=${departmentId}` : '/helpdesk/department-managers'
    const res = await api.get(url)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch department managers')
  }
})

export const assignDepartmentManager = createAsyncThunk('helpdesk/assignDepartmentManager', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/helpdesk/department-managers', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to assign manager')
  }
})

export const removeDepartmentManager = createAsyncThunk('helpdesk/removeDepartmentManager', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/helpdesk/department-managers/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to remove manager')
  }
})

export const fetchTicketAttachments = createAsyncThunk('helpdesk/fetchTicketAttachments', async (ticketId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/helpdesk/tickets/${ticketId}/attachments`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch attachments')
  }
})

export const addTicketAttachment = createAsyncThunk('helpdesk/addTicketAttachment', async ({ ticketId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/helpdesk/tickets/${ticketId}/attachments`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add attachment')
  }
})

export const deleteTicketAttachment = createAsyncThunk('helpdesk/deleteTicketAttachment', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/helpdesk/ticket-attachments/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete attachment')
  }
})

const helpdeskSlice = createSlice({
  name: 'helpdesk',
  initialState: {
    data: [],
    selected: {},
    comments: [],
    claims: [],
    faqCategories: [],
    faqs: [],
    pagination: { page: 0, size: 20, total: 0 },
    loading: false,
    error: null,
    departmentManagers: [],
    ticketAttachments: [],
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
      })
      .addCase(fetchAll.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchById.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchById.fulfilled, (state, action) => { state.loading = false; state.selected = action.payload })
      .addCase(fetchById.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(create.pending, (state) => { state.loading = true; state.error = null })
      .addCase(create.fulfilled, (state, action) => { state.loading = false; state.data.push(action.payload) })
      .addCase(create.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(update.pending, (state) => { state.loading = true; state.error = null })
      .addCase(update.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.data.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
        if (state.selected?.id === action.payload.id) state.selected = action.payload
      })
      .addCase(update.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(remove.pending, (state) => { state.loading = true; state.error = null })
      .addCase(remove.fulfilled, (state, action) => {
        state.loading = false
        state.data = state.data.filter((item) => item.id !== action.payload)
      })
      .addCase(remove.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(resolve.pending, (state) => { state.loading = true; state.error = null })
      .addCase(resolve.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.data.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
        if (state.selected?.id === action.payload.id) state.selected = action.payload
      })
      .addCase(resolve.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(close.pending, (state) => { state.loading = true; state.error = null })
      .addCase(close.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.data.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
        if (state.selected?.id === action.payload.id) state.selected = action.payload
      })
      .addCase(close.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchComments.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.loading = false
        state.comments = action.payload.content || action.payload
      })
      .addCase(fetchComments.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(addComment.pending, (state) => { state.loading = true; state.error = null })
      .addCase(addComment.fulfilled, (state, action) => { state.loading = false; state.comments.push(action.payload) })
      .addCase(addComment.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchClaims.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchClaims.fulfilled, (state, action) => { state.loading = false; state.claims = action.payload.content || action.payload })
      .addCase(fetchClaims.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createClaim.fulfilled, (state, action) => { state.loading = false; state.claims.unshift(action.payload) })
      .addCase(approveClaim.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.claims.findIndex(c => c.id === action.payload.id)
        if (idx !== -1) state.claims[idx] = action.payload
      })
      .addCase(rejectClaim.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.claims.findIndex(c => c.id === action.payload.id)
        if (idx !== -1) state.claims[idx] = action.payload
      })

      .addCase(fetchFAQCategories.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchFAQCategories.fulfilled, (state, action) => { state.loading = false; state.faqCategories = action.payload.content || action.payload })
      .addCase(fetchFAQCategories.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createFAQCategory.fulfilled, (state, action) => { state.loading = false; state.faqCategories.push(action.payload) })

      .addCase(fetchFAQs.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchFAQs.fulfilled, (state, action) => { state.loading = false; state.faqs = action.payload.content || action.payload })
      .addCase(fetchFAQs.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createFAQ.fulfilled, (state, action) => { state.loading = false; state.faqs.push(action.payload) })
      .addCase(deleteFAQ.fulfilled, (state, action) => {
        state.loading = false
        state.faqs = state.faqs.filter(f => f.id !== action.payload)
      })

      // Department Managers
      .addCase(fetchDepartmentManagers.fulfilled, (state, action) => { state.departmentManagers = action.payload })
      .addCase(assignDepartmentManager.fulfilled, (state, action) => { state.departmentManagers.push(action.payload) })
      .addCase(removeDepartmentManager.fulfilled, (state, action) => {
        state.departmentManagers = state.departmentManagers.filter(m => m.id !== action.payload)
      })

      // Ticket Attachments
      .addCase(fetchTicketAttachments.fulfilled, (state, action) => { state.ticketAttachments = action.payload })
      .addCase(addTicketAttachment.fulfilled, (state, action) => { state.ticketAttachments.push(action.payload) })
      .addCase(deleteTicketAttachment.fulfilled, (state, action) => {
        state.ticketAttachments = state.ticketAttachments.filter(a => a.id !== action.payload)
      })
  },
})

export const selectAll = (state) => state.helpdesk.data
export const selectSelected = (state) => state.helpdesk.selected
export const selectLoading = (state) => state.helpdesk.loading
export const selectPagination = (state) => state.helpdesk.pagination
export const selectComments = (state) => state.helpdesk.comments
export const selectClaims = (state) => state.helpdesk.claims
export const selectFAQCategories = (state) => state.helpdesk.faqCategories
export const selectFAQs = (state) => state.helpdesk.faqs
export const selectDepartmentManagers = (state) => state.helpdesk.departmentManagers
export const selectTicketAttachments = (state) => state.helpdesk.ticketAttachments
export default helpdeskSlice.reducer
