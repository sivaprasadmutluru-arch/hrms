import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchAll = createAsyncThunk('leave/fetchAll', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/leave/requests', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch leave requests')
  }
})

export const fetchById = createAsyncThunk('leave/fetchById', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/leave/requests/${id}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch leave request')
  }
})

export const create = createAsyncThunk('leave/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/leave/apply', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create leave request')
  }
})

export const update = createAsyncThunk('leave/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/leave/requests/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update leave request')
  }
})

export const remove = createAsyncThunk('leave/remove', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/leave/requests/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete leave request')
  }
})

export const fetchLeaveTypes = createAsyncThunk('leave/fetchLeaveTypes', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/leave/types')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch leave types')
  }
})

export const createLeaveType = createAsyncThunk('leave/createLeaveType', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/leave/types', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create leave type')
  }
})

export const updateLeaveType = createAsyncThunk('leave/updateLeaveType', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/leave/types/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update leave type')
  }
})

export const deleteLeaveType = createAsyncThunk('leave/deleteLeaveType', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/leave/types/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete leave type')
  }
})

export const approveLeave = createAsyncThunk('leave/approveLeave', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/leave/requests/${id}/approve`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to approve leave request')
  }
})

export const rejectLeave = createAsyncThunk('leave/rejectLeave', async ({ id, reason }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/leave/requests/${id}/reject`, reason ? { reason } : null)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reject leave request')
  }
})

export const allocateLeave = createAsyncThunk('leave/allocateLeave', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/leave/allocate', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to allocate leave')
  }
})

export const fetchLeaveAllocations = createAsyncThunk('leave/fetchLeaveAllocations', async (params, { rejectWithValue }) => {
  try {
    const res = await api.get('/leave/allocations', { params })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch leave allocations')
  }
})

export const fetchLeaveBalance = createAsyncThunk('leave/fetchLeaveBalance', async (employeeId, { rejectWithValue }) => {
  try {
    const url = employeeId ? `/leave/balance/employee/${employeeId}` : '/leave/balance'
    const res = await api.get(url)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch leave balance')
  }
})

export const creditLeaveBalance = createAsyncThunk('leave/creditLeaveBalance', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/leave/balance/credit', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to credit leave balance')
  }
})

export const fetchAllocationRequests = createAsyncThunk('leave/fetchAllocationRequests', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/leave/allocation-requests')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch allocation requests')
  }
})

export const createAllocationRequest = createAsyncThunk('leave/createAllocationRequest', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/leave/allocation-requests', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create allocation request')
  }
})

export const approveAllocationRequest = createAsyncThunk('leave/approveAllocationRequest', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/leave/allocation-requests/${id}/approve`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to approve allocation request')
  }
})

export const rejectAllocationRequest = createAsyncThunk('leave/rejectAllocationRequest', async ({ id, reason }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/leave/allocation-requests/${id}/reject`, null, { params: reason ? { reason } : undefined })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reject allocation request')
  }
})

export const fetchLeaveRestrictions = createAsyncThunk('leave/fetchLeaveRestrictions', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/leave/restrictions')
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch leave restrictions')
  }
})

export const createLeaveRestriction = createAsyncThunk('leave/createLeaveRestriction', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/leave/restrictions', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create leave restriction')
  }
})

export const updateLeaveRestriction = createAsyncThunk('leave/updateLeaveRestriction', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/leave/restrictions/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update leave restriction')
  }
})

export const deleteLeaveRestriction = createAsyncThunk('leave/deleteLeaveRestriction', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/leave/restrictions/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete leave restriction')
  }
})

// ─── Leave Request Comments ────────────────────────────────────────────────

export const fetchLeaveRequestComments = createAsyncThunk('leave/fetchLeaveRequestComments', async (requestId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/leave/requests/${requestId}/comments`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch comments')
  }
})

export const addLeaveRequestComment = createAsyncThunk('leave/addLeaveRequestComment', async ({ requestId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/leave/requests/${requestId}/comments`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add comment')
  }
})

export const deleteLeaveRequestComment = createAsyncThunk('leave/deleteLeaveRequestComment', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/leave/requests/comments/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete comment')
  }
})

// ─── Leave Request Files ───────────────────────────────────────────────────

export const fetchLeaveRequestFiles = createAsyncThunk('leave/fetchLeaveRequestFiles', async (requestId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/leave/requests/${requestId}/files`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch files')
  }
})

export const deleteLeaveRequestFile = createAsyncThunk('leave/deleteLeaveRequestFile', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/leave/requests/files/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete file')
  }
})

export const uploadLeaveRequestFile = createAsyncThunk('leave/uploadLeaveRequestFile', async ({ requestId, file }, { rejectWithValue }) => {
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post(`/leave/requests/${requestId}/files/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to upload file')
  }
})

// ─── Allocation Request Comments ───────────────────────────────────────────

export const fetchAllocationRequestComments = createAsyncThunk('leave/fetchAllocationRequestComments', async (requestId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/leave/allocation-requests/${requestId}/comments`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch comments')
  }
})

export const addAllocationRequestComment = createAsyncThunk('leave/addAllocationRequestComment', async ({ requestId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/leave/allocation-requests/${requestId}/comments`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add comment')
  }
})

// ─── Condition Approvals ───────────────────────────────────────────────────

export const fetchConditionApprovals = createAsyncThunk('leave/fetchConditionApprovals', async (requestId, { rejectWithValue }) => {
  try {
    const res = await api.get(`/leave/requests/${requestId}/condition-approvals`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch condition approvals')
  }
})

export const addConditionApproval = createAsyncThunk('leave/addConditionApproval', async ({ requestId, data }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/leave/requests/${requestId}/condition-approvals`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add condition approval')
  }
})

export const approveConditionStep = createAsyncThunk('leave/approveConditionStep', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/leave/requests/condition-approvals/${id}/approve`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to approve step')
  }
})

export const rejectConditionStep = createAsyncThunk('leave/rejectConditionStep', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/leave/requests/condition-approvals/${id}/reject`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to reject step')
  }
})

// ─── Cancel Leave ─────────────────────────────────────────────────────────

export const cancelLeave = createAsyncThunk('leave/cancelLeave', async (id, { rejectWithValue }) => {
  try {
    const res = await api.post(`/leave/requests/${id}/cancel`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to cancel leave request')
  }
})

// ─── Bulk Allocate ─────────────────────────────────────────────────────────

export const bulkAllocateLeave = createAsyncThunk('leave/bulkAllocateLeave', async (data, { rejectWithValue }) => {
  try {
    await api.post('/leave/allocate/bulk', data)
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Bulk allocation failed')
  }
})

// ─── Annual Reset ──────────────────────────────────────────────────────────

export const annualLeaveReset = createAsyncThunk('leave/annualLeaveReset', async (data, { rejectWithValue }) => {
  try {
    await api.post('/leave/reset/annual', data)
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Annual reset failed')
  }
})

// ─── Past Leave Restrict ───────────────────────────────────────────────────

export const fetchPastLeaveRestrict = createAsyncThunk('leave/fetchPastLeaveRestrict', async (companyId, { rejectWithValue }) => {
  try {
    const res = await api.get('/leave/past-leave-restrict', { params: { companyId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch past leave restrict')
  }
})

export const upsertPastLeaveRestrict = createAsyncThunk('leave/upsertPastLeaveRestrict', async ({ companyId, data }, { rejectWithValue }) => {
  try {
    const res = await api.put('/leave/past-leave-restrict', data, { params: { companyId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update past leave restrict')
  }
})

const leaveSlice = createSlice({
  name: 'leave',
  initialState: {
    data: [],
    selected: {},
    leaveTypes: [],
    leaveAllocations: [],
    leaveBalance: [],
    allocationRequests: [],
    leaveRestrictions: [],
    leaveRequestComments: [],
    leaveRequestFiles: [],
    allocationRequestComments: [],
    conditionApprovals: [],
    pastLeaveRestrict: null,
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

      .addCase(fetchLeaveTypes.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchLeaveTypes.fulfilled, (state, action) => {
        state.loading = false
        state.leaveTypes = action.payload
      })
      .addCase(fetchLeaveTypes.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(createLeaveType.fulfilled, (state, action) => {
        state.leaveTypes.push(action.payload)
      })
      .addCase(createLeaveType.rejected, (state, action) => { state.error = action.payload })

      .addCase(updateLeaveType.fulfilled, (state, action) => {
        const idx = state.leaveTypes.findIndex(lt => lt.id === action.payload.id)
        if (idx !== -1) state.leaveTypes[idx] = action.payload
      })
      .addCase(updateLeaveType.rejected, (state, action) => { state.error = action.payload })

      .addCase(deleteLeaveType.fulfilled, (state, action) => {
        state.leaveTypes = state.leaveTypes.filter(lt => lt.id !== action.payload)
      })
      .addCase(deleteLeaveType.rejected, (state, action) => { state.error = action.payload })

      .addCase(approveLeave.pending, (state) => { state.loading = true; state.error = null })
      .addCase(approveLeave.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.data.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
      })
      .addCase(approveLeave.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(rejectLeave.pending, (state) => { state.loading = true; state.error = null })
      .addCase(rejectLeave.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.data.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
      })
      .addCase(rejectLeave.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(allocateLeave.pending, (state) => { state.loading = true; state.error = null })
      .addCase(allocateLeave.fulfilled, (state, action) => {
        state.loading = false
        state.leaveAllocations.push(action.payload)
      })
      .addCase(allocateLeave.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchLeaveAllocations.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchLeaveAllocations.fulfilled, (state, action) => {
        state.loading = false
        state.leaveAllocations = action.payload.content || action.payload
      })
      .addCase(fetchLeaveAllocations.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(fetchLeaveBalance.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchLeaveBalance.fulfilled, (state, action) => {
        state.loading = false
        state.leaveBalance = action.payload.content || action.payload
      })
      .addCase(fetchLeaveBalance.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(creditLeaveBalance.fulfilled, (state) => { state.loading = false })

      .addCase(fetchAllocationRequests.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchAllocationRequests.fulfilled, (state, action) => {
        state.loading = false
        state.allocationRequests = action.payload.content || action.payload
      })
      .addCase(fetchAllocationRequests.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(createAllocationRequest.fulfilled, (state, action) => {
        state.loading = false; state.allocationRequests.unshift(action.payload)
      })
      .addCase(approveAllocationRequest.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.allocationRequests.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.allocationRequests[idx] = action.payload
      })
      .addCase(rejectAllocationRequest.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.allocationRequests.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.allocationRequests[idx] = action.payload
      })

      .addCase(fetchLeaveRestrictions.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchLeaveRestrictions.fulfilled, (state, action) => {
        state.loading = false
        state.leaveRestrictions = action.payload.content || action.payload
      })
      .addCase(fetchLeaveRestrictions.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      .addCase(createLeaveRestriction.fulfilled, (state, action) => {
        state.loading = false; state.leaveRestrictions.push(action.payload)
      })
      .addCase(updateLeaveRestriction.fulfilled, (state, action) => {
        state.loading = false
        const idx = state.leaveRestrictions.findIndex(r => r.id === action.payload.id)
        if (idx !== -1) state.leaveRestrictions[idx] = action.payload
      })
      .addCase(deleteLeaveRestriction.fulfilled, (state, action) => {
        state.loading = false
        state.leaveRestrictions = state.leaveRestrictions.filter(r => r.id !== action.payload)
      })

      // Leave Request Comments
      .addCase(fetchLeaveRequestComments.fulfilled, (state, action) => { state.leaveRequestComments = action.payload.content || action.payload })
      .addCase(addLeaveRequestComment.fulfilled, (state, action) => { state.leaveRequestComments.push(action.payload) })
      .addCase(deleteLeaveRequestComment.fulfilled, (state, action) => {
        state.leaveRequestComments = state.leaveRequestComments.filter(c => c.id !== action.payload)
      })

      // Leave Request Files
      .addCase(fetchLeaveRequestFiles.fulfilled, (state, action) => { state.leaveRequestFiles = action.payload.content || action.payload })
      .addCase(deleteLeaveRequestFile.fulfilled, (state, action) => {
        state.leaveRequestFiles = state.leaveRequestFiles.filter(f => f.id !== action.payload)
      })
      .addCase(uploadLeaveRequestFile.fulfilled, (state, action) => { state.leaveRequestFiles.push(action.payload) })

      // Allocation Request Comments
      .addCase(fetchAllocationRequestComments.fulfilled, (state, action) => { state.allocationRequestComments = action.payload.content || action.payload })
      .addCase(addAllocationRequestComment.fulfilled, (state, action) => { state.allocationRequestComments.push(action.payload) })

      // Condition Approvals
      .addCase(fetchConditionApprovals.fulfilled, (state, action) => { state.conditionApprovals = action.payload.content || action.payload })
      .addCase(addConditionApproval.fulfilled, (state, action) => { state.conditionApprovals.push(action.payload) })
      .addCase(approveConditionStep.fulfilled, (state, action) => {
        const idx = state.conditionApprovals.findIndex(s => s.id === action.payload.id)
        if (idx !== -1) state.conditionApprovals[idx] = action.payload
      })
      .addCase(rejectConditionStep.fulfilled, (state, action) => {
        const idx = state.conditionApprovals.findIndex(s => s.id === action.payload.id)
        if (idx !== -1) state.conditionApprovals[idx] = action.payload
      })

      // Cancel Leave
      .addCase(cancelLeave.fulfilled, (state, action) => {
        const idx = state.data.findIndex((item) => item.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
      })

      // Bulk Allocate + Annual Reset (no state mutation needed — triggers refetch)
      .addCase(bulkAllocateLeave.pending, (state) => { state.loading = true })
      .addCase(bulkAllocateLeave.fulfilled, (state) => { state.loading = false })
      .addCase(bulkAllocateLeave.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(annualLeaveReset.pending, (state) => { state.loading = true })
      .addCase(annualLeaveReset.fulfilled, (state) => { state.loading = false })
      .addCase(annualLeaveReset.rejected, (state, action) => { state.loading = false; state.error = action.payload })

      // Past Leave Restrict
      .addCase(fetchPastLeaveRestrict.fulfilled, (state, action) => { state.pastLeaveRestrict = action.payload })
      .addCase(upsertPastLeaveRestrict.fulfilled, (state, action) => { state.pastLeaveRestrict = action.payload })
  },
})

export const selectAll = (state) => state.leave.data
export const selectSelected = (state) => state.leave.selected
export const selectLoading = (state) => state.leave.loading
export const selectPagination = (state) => state.leave.pagination
export const selectLeaveTypes = (state) => state.leave.leaveTypes
export const selectLeaveAllocations = (state) => state.leave.leaveAllocations
export const selectLeaveBalance = (state) => state.leave.leaveBalance
export const selectAllocationRequests = (state) => state.leave.allocationRequests
export const selectLeaveRestrictions = (state) => state.leave.leaveRestrictions
export const selectLeaveRequestComments = (state) => state.leave.leaveRequestComments
export const selectLeaveRequestFiles = (state) => state.leave.leaveRequestFiles
export const selectAllocationRequestComments = (state) => state.leave.allocationRequestComments
export const selectConditionApprovals = (state) => state.leave.conditionApprovals
export const selectPastLeaveRestrict = (state) => state.leave.pastLeaveRestrict
export default leaveSlice.reducer
