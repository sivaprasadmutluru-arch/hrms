import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchDocumentRequests = createAsyncThunk('documents/fetchRequests', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/documents/requests')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch document requests')
  }
})

export const createDocumentRequest = createAsyncThunk('documents/createRequest', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/documents/requests', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create document request')
  }
})

export const deleteDocumentRequest = createAsyncThunk('documents/deleteRequest', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/documents/requests/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete document request')
  }
})

export const fetchMyRequests = createAsyncThunk('documents/fetchMyRequests', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/documents/requests/my')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch your document requests')
  }
})

export const fetchMyDocuments = createAsyncThunk('documents/fetchMine', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/documents')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch documents')
  }
})

export const createDocument = createAsyncThunk('documents/create', async (data, { rejectWithValue }) => {
  try {
    const { requestConfig, ...document } = data
    const res = await api.post('/documents', document, requestConfig)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to submit document')
  }
})

export const approveDocument = createAsyncThunk('documents/approve', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/documents/${id}/approve`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to approve document')
  }
})

export const rejectDocument = createAsyncThunk('documents/reject', async ({ id, rejectReason }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/documents/${id}/reject`, { rejectReason })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reject document')
  }
})

export const fetchSubmissionStatus = createAsyncThunk('documents/fetchSubmissionStatus', async (requestId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/documents/requests/${requestId}/submissions`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch submission status')
  }
})

// ─── Generated Letters & Certificates ─────────────────────────────────────────

export const fetchLetters = createAsyncThunk('documents/fetchLetters', async (params = {}, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams()
    if (params.type) query.append('type', params.type)
    if (params.search) query.append('search', params.search)
    const queryString = query.toString() ? `?${query.toString()}` : ''
    const res = await api.get(`/documents/letters${queryString}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch letters')
  }
})

export const fetchMyLetters = createAsyncThunk('documents/fetchMyLetters', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/documents/letters/my')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch your letters')
  }
})

export const createLetter = createAsyncThunk('documents/createLetter', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/documents/letters', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create document')
  }
})

export const updateLetter = createAsyncThunk('documents/updateLetter', async ({ id, ...data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/documents/letters/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update document')
  }
})

export const deleteLetter = createAsyncThunk('documents/deleteLetter', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/documents/letters/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete document')
  }
})

export const sendLetterEmail = createAsyncThunk('documents/sendLetterEmail', async ({ id, to, subject, message }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/documents/letters/${id}/send-email`, { to, subject, message })
    return { id, data: res.data, to }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to send email')
  }
})

const documentsSlice = createSlice({
  name: 'documents',
  initialState: {
    requests: [],
    myRequests: [],
    documents: [],
    submissionStatus: [],
    submissionLoading: false,
    letters: [],
    myLetters: [],
    lettersLoading: false,
    lettersError: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchDocumentRequests.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchDocumentRequests.fulfilled, (state, action) => { state.loading = false; state.requests = action.payload.content || action.payload })
      .addCase(fetchDocumentRequests.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createDocumentRequest.fulfilled, (state, action) => { state.requests.push(action.payload) })
      .addCase(deleteDocumentRequest.fulfilled, (state, action) => {
        state.requests = state.requests.filter(r => r.id !== action.payload)
      })

      .addCase(fetchMyRequests.fulfilled, (state, action) => { state.myRequests = action.payload.content || action.payload })

      .addCase(fetchMyDocuments.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchMyDocuments.fulfilled, (state, action) => { state.loading = false; state.documents = action.payload.content || action.payload })
      .addCase(fetchMyDocuments.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createDocument.fulfilled, (state, action) => { state.documents.push(action.payload) })
      .addCase(approveDocument.fulfilled, (state, action) => {
        const idx = state.documents.findIndex(d => d.id === action.payload.id)
        if (idx !== -1) state.documents[idx] = action.payload
      })
      .addCase(rejectDocument.fulfilled, (state, action) => {
        const idx = state.documents.findIndex(d => d.id === action.payload.id)
        if (idx !== -1) state.documents[idx] = action.payload
      })

      .addCase(fetchSubmissionStatus.pending, (state) => { state.submissionLoading = true })
      .addCase(fetchSubmissionStatus.fulfilled, (state, action) => { state.submissionLoading = false; state.submissionStatus = action.payload })
      .addCase(fetchSubmissionStatus.rejected, (state) => { state.submissionLoading = false })

      // Letters & Certificates
      .addCase(fetchLetters.pending, (state) => { state.lettersLoading = true; state.lettersError = null })
      .addCase(fetchLetters.fulfilled, (state, action) => {
        state.lettersLoading = false
        state.letters = Array.isArray(action.payload) ? action.payload : (action.payload?.content || [])
      })
      .addCase(fetchLetters.rejected, (state, action) => { state.lettersLoading = false; state.lettersError = action.payload })

      .addCase(fetchMyLetters.fulfilled, (state, action) => {
        state.myLetters = Array.isArray(action.payload) ? action.payload : (action.payload?.content || [])
      })

      .addCase(createLetter.fulfilled, (state, action) => {
        state.letters.unshift(action.payload)
      })
      .addCase(updateLetter.fulfilled, (state, action) => {
        const idx = state.letters.findIndex(l => l.id === action.payload.id)
        if (idx !== -1) state.letters[idx] = action.payload
      })
      .addCase(deleteLetter.fulfilled, (state, action) => {
        state.letters = state.letters.filter(l => l.id !== action.payload)
      })
      .addCase(sendLetterEmail.fulfilled, (state, action) => {
        const { id, to } = action.payload
        const letter = state.letters.find(l => l.id === id)
        if (letter) {
          letter.status = 'SENT'
          letter.sentToEmail = to
          letter.sentAt = new Date().toISOString()
        }
      })
  },
})

export const selectDocumentRequests = (state) => state.documents.requests
export const selectMyRequests = (state) => state.documents.myRequests
export const selectDocuments = (state) => state.documents.documents
export const selectDocumentsLoading = (state) => state.documents.loading
export const selectSubmissionStatus = (state) => state.documents.submissionStatus
export const selectSubmissionLoading = (state) => state.documents.submissionLoading
export const selectLetters = (state) => state.documents.letters
export const selectMyLetters = (state) => state.documents.myLetters
export const selectLettersLoading = (state) => state.documents.lettersLoading
export default documentsSlice.reducer

