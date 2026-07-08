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

const documentsSlice = createSlice({
  name: 'documents',
  initialState: {
    requests: [],
    myRequests: [],
    documents: [],
    submissionStatus: [],
    submissionLoading: false,
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
  },
})

export const selectDocumentRequests = (state) => state.documents.requests
export const selectMyRequests = (state) => state.documents.myRequests
export const selectDocuments = (state) => state.documents.documents
export const selectDocumentsLoading = (state) => state.documents.loading
export const selectSubmissionStatus = (state) => state.documents.submissionStatus
export const selectSubmissionLoading = (state) => state.documents.submissionLoading
export default documentsSlice.reducer
