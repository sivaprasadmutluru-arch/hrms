import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api'
import { login, logout } from '../auth/authSlice'

const STORAGE_KEY = 'chatbot_messages'

function loadStoredMessages() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

function persistMessages(messages) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
}

export const askQuestion = createAsyncThunk('chatbot/ask', async (intent, { rejectWithValue }) => {
  try {
    const res = await api.post('/chatbot/ask', { intent })
    return res.data.answer
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || "Sorry, I couldn't get an answer for that.")
  }
})

const chatbotSlice = createSlice({
  name: 'chatbot',
  initialState: {
    messages: loadStoredMessages(), // { from: 'user' | 'bot', text: string }
    loading: false,
  },
  reducers: {
    addUserMessage(state, action) {
      state.messages.push({ from: 'user', text: action.payload })
      persistMessages(state.messages)
    },
    addBotMessage(state, action) {
      state.messages.push({ from: 'bot', text: action.payload })
      persistMessages(state.messages)
    },
    resetChat(state) {
      state.messages = []
      persistMessages(state.messages)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(askQuestion.pending, (state) => { state.loading = true })
      .addCase(askQuestion.fulfilled, (state, action) => {
        state.loading = false
        state.messages.push({ from: 'bot', text: action.payload })
        persistMessages(state.messages)
      })
      .addCase(askQuestion.rejected, (state, action) => {
        state.loading = false
        state.messages.push({ from: 'bot', text: action.payload })
        persistMessages(state.messages)
      })
      .addCase(logout, (state) => {
        state.messages = []
        state.loading = false
        localStorage.removeItem(STORAGE_KEY)
      })
      .addCase(login.fulfilled, (state) => {
        state.messages = []
        state.loading = false
        localStorage.removeItem(STORAGE_KEY)
      })
  },
})

export const { addUserMessage, addBotMessage, resetChat } = chatbotSlice.actions
export const selectChatMessages = (state) => state.chatbot.messages
export const selectChatLoading = (state) => state.chatbot.loading
export default chatbotSlice.reducer
