import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { ChatBubbleLeftRightIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { askQuestion, addUserMessage, addBotMessage, selectChatMessages, selectChatLoading } from '../../features/chatbot/chatbotSlice'

const SUGGESTED_QUESTIONS = [
  { intent: 'LEAVE_BALANCE', label: 'How many leave days do I have left?' },
  { intent: 'LATEST_PAYSLIP', label: "What's my latest payslip status?" },
  { intent: 'ATTENDANCE_TODAY', label: 'Am I checked in today?' },
  { intent: 'PENDING_REGULARISATION', label: 'Do I have any pending regularisation requests?' },
  { intent: 'PENDING_LOAN', label: 'Do I have a pending loan request?' },
  { intent: 'PENDING_REIMBURSEMENT', label: 'Do I have a pending reimbursement request?' },
  { intent: 'NEXT_HOLIDAY', label: "What's my next holiday?" },
]

// The backend only answers this fixed set of intents (deterministic, no free-form NLP), so
// free-typed questions are matched to one of them by keyword before hitting the API.
const INTENT_KEYWORDS = [
  { intent: 'LEAVE_BALANCE', keywords: ['leave balance', 'leave days', 'leaves left', 'pto', 'vacation'] },
  { intent: 'LATEST_PAYSLIP', keywords: ['payslip', 'pay slip', 'salary', 'net pay'] },
  { intent: 'ATTENDANCE_TODAY', keywords: ['checked in', 'check in', 'check-in', 'attendance'] },
  { intent: 'PENDING_REGULARISATION', keywords: ['regularisation', 'regularization'] },
  { intent: 'PENDING_LOAN', keywords: ['loan'] },
  { intent: 'PENDING_REIMBURSEMENT', keywords: ['reimbursement', 'reimburse', 'expense'] },
  { intent: 'NEXT_HOLIDAY', keywords: ['holiday'] },
]

function matchIntent(text) {
  const lower = text.toLowerCase()
  const hit = INTENT_KEYWORDS.find(({ keywords }) => keywords.some(k => lower.includes(k)))
  return hit?.intent ?? null
}

export default function ChatbotWidget() {
  const dispatch = useDispatch()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const messages = useSelector(selectChatMessages)
  const loading = useSelector(selectChatLoading)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const handleAsk = (q) => {
    dispatch(addUserMessage(q.label))
    dispatch(askQuestion(q.intent))
  }

  const handleSubmitDraft = (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || loading) return
    dispatch(addUserMessage(text))
    setDraft('')
    const intent = matchIntent(text)
    if (intent) {
      dispatch(askQuestion(intent))
    } else {
      dispatch(addBotMessage(
        "I'm not sure about that one — I can only answer questions about your leave balance, " +
        'payslip, attendance, regularisation, loan, reimbursement, and holiday requests. ' +
        'Try one of the buttons below.'
      ))
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
      {open && (
        <div className="mb-3 w-80 sm:w-96 h-[28rem] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white flex-shrink-0">
            <span className="text-sm font-semibold">Assistant</span>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white">
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.length === 0 && (
              <div className="text-sm text-gray-500">
                Hi! Ask me about your leave balance, latest payslip, today's attendance, or pending requests — pick a question below.
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-line ${
                  m.from === 'user' ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-700 rounded-bl-sm'
                }`}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-gray-400">
                  Thinking…
                </div>
              </div>
            )}
          </div>

          {/* Free-text input */}
          <form onSubmit={handleSubmitDraft} className="border-t border-gray-100 p-3 flex gap-2 bg-white flex-shrink-0">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={loading}
              placeholder="Type your question…"
              className="flex-1 text-sm rounded-full border border-gray-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-200 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !draft.trim()}
              className="w-8 h-8 flex-shrink-0 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center disabled:opacity-50 transition-colors"
              title="Send"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          </form>

          {/* Suggested questions */}
          <div className="border-t border-gray-100 p-3 flex gap-2 overflow-x-auto bg-white flex-shrink-0">
            {SUGGESTED_QUESTIONS.map(q => (
              <button
                key={q.intent}
                onClick={() => handleAsk(q)}
                disabled={loading}
                className="text-xs px-3 py-1.5 rounded-full border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 transition-colors whitespace-nowrap flex-shrink-0"
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Toggle bubble */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg flex items-center justify-center transition-colors"
        title="Ask the assistant"
      >
        {open ? <XMarkIcon className="h-6 w-6" /> : <ChatBubbleLeftRightIcon className="h-6 w-6" />}
      </button>
    </div>
  )
}
