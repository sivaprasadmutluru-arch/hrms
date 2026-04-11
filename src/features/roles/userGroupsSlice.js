import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'

export const fetchUserGroups = createAsyncThunk('userGroups/fetchAll', async (companyId, { rejectWithValue }) => {
  try {
    const res = await api.get('/user-groups', { params: { companyId } })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch user groups')
  }
})

export const createUserGroup = createAsyncThunk('userGroups/create', async (data, { rejectWithValue }) => {
  try {
    const res = await api.post('/user-groups', data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to create user group')
  }
})

export const updateUserGroup = createAsyncThunk('userGroups/update', async ({ id, data }, { rejectWithValue }) => {
  try {
    const res = await api.put(`/user-groups/${id}`, data)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to update user group')
  }
})

export const deleteUserGroup = createAsyncThunk('userGroups/delete', async (id, { rejectWithValue }) => {
  try {
    await api.delete(`/user-groups/${id}`)
    return id
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to delete user group')
  }
})

export const fetchGroupMembers = createAsyncThunk('userGroups/fetchMembers', async (id, { rejectWithValue }) => {
  try {
    const res = await api.get(`/user-groups/${id}/members`)
    return { id, members: res.data }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch group members')
  }
})

export const addGroupMember = createAsyncThunk('userGroups/addMember', async ({ groupId, userId }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/user-groups/${groupId}/members/${userId}`)
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to add member')
  }
})

export const removeGroupMember = createAsyncThunk('userGroups/removeMember', async ({ groupId, userId }, { rejectWithValue }) => {
  try {
    await api.delete(`/user-groups/${groupId}/members/${userId}`)
    return { groupId, userId }
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to remove member')
  }
})

export const bulkAssignGroupMembers = createAsyncThunk('userGroups/bulkAssign', async ({ groupId, userIds }, { rejectWithValue }) => {
  try {
    const res = await api.post(`/user-groups/${groupId}/members/bulk-assign`, { userIds })
    return res.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to bulk assign members')
  }
})

const userGroupsSlice = createSlice({
  name: 'userGroups',
  initialState: {
    data: [],
    members: {},
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserGroups.pending, (state) => { state.loading = true; state.error = null })
      .addCase(fetchUserGroups.fulfilled, (state, action) => {
        state.loading = false
        state.data = action.payload.content || action.payload
      })
      .addCase(fetchUserGroups.rejected, (state, action) => { state.loading = false; state.error = action.payload })
      .addCase(createUserGroup.fulfilled, (state, action) => { state.data.unshift(action.payload) })
      .addCase(updateUserGroup.fulfilled, (state, action) => {
        const idx = state.data.findIndex(g => g.id === action.payload.id)
        if (idx !== -1) state.data[idx] = action.payload
      })
      .addCase(deleteUserGroup.fulfilled, (state, action) => {
        state.data = state.data.filter(g => g.id !== action.payload)
      })
      .addCase(fetchGroupMembers.fulfilled, (state, action) => {
        state.members[action.payload.id] = action.payload.members
      })
      .addCase(removeGroupMember.fulfilled, (state, action) => {
        const { groupId, userId } = action.payload
        if (state.members[groupId]) {
          state.members[groupId] = state.members[groupId].filter(m => m.id !== userId)
        }
      })
  },
})

export const selectUserGroups = (state) => state.userGroups.data
export const selectGroupMembers = (id) => (state) => state.userGroups.members[id] || []
export const selectUserGroupsLoading = (state) => state.userGroups.loading
export default userGroupsSlice.reducer
