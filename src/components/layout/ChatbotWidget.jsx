import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  ChatBubbleLeftRightIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  ArrowPathIcon,
  SparklesIcon,
  ArrowRightIcon,
  BookOpenIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  QuestionMarkCircleIcon,
} from '@heroicons/react/24/outline'
import {
  askQuestion,
  addUserMessage,
  addBotMessage,
  resetChat,
  selectChatMessages,
  selectChatLoading,
} from '../../features/chatbot/chatbotSlice'
import {
  searchAssistantKnowledge,
  FEATURE_TOPICS,
  PERSONAL_INTENTS,
} from '../../features/chatbot/assistantKnowledge'

const CATEGORY_TABS = [
  { id: 'GUIDES', label: 'Feature Guides', icon: BookOpenIcon },
  { id: 'PERSONAL', label: 'My Records', icon: UserCircleIcon },
  { id: 'SYSTEM', label: 'System & Admin', icon: Cog6ToothIcon },
]

const QUICK_PROMPTS = {
  GUIDES: [
    { label: 'How to run payroll?', query: 'How to run payroll' },
    { label: 'How to add an employee?', query: 'How to add an employee' },
    { label: 'Setup shifts & 1hr grace time', query: 'attendance grace period and shifts' },
    { label: 'How do leave approvals work?', query: 'How do managers approve leave requests' },
    { label: 'Biometric device setup', query: 'Connect biometric fingerprint devices' },
    { label: 'Generate offer letters', query: 'Generate official offer letters' },
    { label: 'India statutory rules (PF/ESI)', query: 'Statutory deductions PF ESI TDS' },
    { label: 'Razorpay plans & 18% GST', query: 'Subscription plans and GST breakdown' },
  ],
  PERSONAL: [
    { label: 'My leave balance', intent: 'LEAVE_BALANCE' },
    { label: 'My latest payslip', intent: 'LATEST_PAYSLIP' },
    { label: 'Am I checked in today?', intent: 'ATTENDANCE_TODAY' },
    { label: 'Pending regularisations', intent: 'PENDING_REGULARISATION' },
    { label: 'Next upcoming holiday', intent: 'NEXT_HOLIDAY' },
    { label: 'Pending loan requests', intent: 'PENDING_LOAN' },
    { label: 'Pending reimbursements', intent: 'PENDING_REIMBURSEMENT' },
  ],
  SYSTEM: [
    { label: 'Company profile & branches', query: 'Company profile and branch setup' },
    { label: 'Roles & access permissions', query: 'Roles and permissions access control' },
    { label: 'Approval workflow conditions', query: 'Multi-level approval conditions' },
    { label: 'Automated email templates', query: 'Email templates and SMTP setup' },
    { label: 'System audit logs', query: 'System audit logs' },
  ],
}

/**
 * Lightweight formatting helper for assistant messages.
 * Formats bold text (**bold**), numbered lists (1. ...), bullet points (- ...), and code snippets (`code`).
 */
function FormattedMessage({ text }) {
  if (!text) return null
  const lines = text.split('\n')

  return (
    <div className="space-y-1.5 text-xs sm:text-sm leading-relaxed">
      {lines.map((line, idx) => {
        const trimmed = line.trim()
        if (!trimmed) {
          return <div key={idx} className="h-1" />
        }

        // Render numbered step: "1. Step description"
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/)
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-1">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[11px] font-bold text-indigo-700">
                {numMatch[1]}
              </span>
              <span className="flex-1 text-slate-700">{renderInline(numMatch[2])}</span>
            </div>
          )
        }

        // Render bullet point: "- item" or "* item"
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              <span className="flex-1 text-slate-700">{renderInline(trimmed.substring(2))}</span>
            </div>
          )
        }

        return (
          <p key={idx} className="text-slate-800">
            {renderInline(line)}
          </p>
        )
      })}
    </div>
  )
}

function renderInline(str) {
  // Regex to split **bold** segments
  const parts = str.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-slate-100 px-1 py-0.5 text-xs font-mono text-indigo-600">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

export default function ChatbotWidget() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [activeTab, setActiveTab] = useState('GUIDES')
  const messages = useSelector(selectChatMessages)
  const loading = useSelector(selectChatLoading)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  const handleAskKnowledge = (queryText) => {
    dispatch(addUserMessage(queryText))
    const result = searchAssistantKnowledge(queryText)

    if (!result) return

    if (result.type === 'PERSONAL_INTENT') {
      dispatch(askQuestion(result.intent))
      return
    }

    if (result.type === 'KNOWLEDGE_MATCH') {
      const topic = result.topic
      const lines = [
        `### ${topic.title}`,
        topic.summary,
        '',
        '**Follow these steps:**',
        ...topic.steps,
      ]
      dispatch(
        addBotMessage({
          text: lines.join('\n'),
          action: topic.action,
          related: result.related?.map((r) => ({
            label: r.title,
            query: r.keywords[0] || r.title,
          })),
        })
      )
      return
    }

    // Fallback: No direct match
    const suggestions = result.suggestions || []
    dispatch(
      addBotMessage({
        text:
          "I couldn't find an exact match for that specific phrase. Here are the most relevant topics and guides in AccrueHRMS:",
        suggestions: suggestions.map((s) => ({
          title: s.title,
          category: s.category,
          action: s.action,
          query: s.title,
        })),
        action: { label: 'Raise a Support Ticket in Helpdesk', path: '/helpdesk' },
      })
    )
  }

  const handleAskPersonal = (intent, label) => {
    dispatch(addUserMessage(label))
    dispatch(askQuestion(intent))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const text = draft.trim()
    if (!text || loading) return
    setDraft('')
    handleAskKnowledge(text)
  }

  const handleNavigate = (path) => {
    if (path) {
      navigate(path)
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
      {open && (
        <div className="mb-3 flex h-[32rem] w-84 sm:w-[26rem] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl transition-all animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 px-4 py-3.5 text-white shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                <SparklesIcon className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold tracking-tight">AccrueHRMS Assistant</span>
                  <span className="flex h-2 w-2 relative">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400"></span>
                  </span>
                </div>
                <p className="text-[11px] text-indigo-100">AI Help & Self-Service Guide</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => dispatch(resetChat())}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
                title="Clear conversation history"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/15 hover:text-white transition-colors"
                title="Close assistant"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick Category Switcher Tabs */}
          <div className="flex shrink-0 border-b border-slate-100 bg-slate-50/70 p-1.5 gap-1">
            {CATEGORY_TABS.map((tab) => {
              const Icon = tab.icon
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1 px-2 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>

          {/* Message List */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto bg-slate-50/50 p-4 space-y-3.5">
            {messages.length === 0 ? (
              <div className="space-y-4 py-2">
                <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-purple-50/40 p-4 shadow-xs">
                  <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                    <SparklesIcon className="h-4 w-4" />
                    <span>How can I assist you today?</span>
                  </div>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                    Ask me any question about <strong>using AccrueHRMS</strong> (running payroll, adding
                    employees, biometric configuration, shift scheduling, statutory compliance) or check
                    your <strong>personal self-service records</strong>.
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-2">
                    Suggested Questions
                  </p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {QUICK_PROMPTS[activeTab].map((p, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          if (p.intent) {
                            handleAskPersonal(p.intent, p.label)
                          } else {
                            handleAskKnowledge(p.query)
                          }
                        }}
                        disabled={loading}
                        className="flex items-center justify-between w-full rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-left text-xs font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40 hover:text-indigo-700 transition-colors shadow-2xs group"
                      >
                        <span>{p.label}</span>
                        <ArrowRightIcon className="h-3 w-3 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.from === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-150`}
                >
                  {m.from === 'user' ? (
                    <div className="max-w-[85%] rounded-2xl rounded-br-xs bg-indigo-600 px-3.5 py-2.5 text-xs sm:text-sm text-white shadow-sm font-medium">
                      {m.text}
                    </div>
                  ) : (
                    <div className="max-w-[90%] rounded-2xl rounded-tl-xs border border-slate-200/90 bg-white p-3.5 shadow-xs text-slate-800 space-y-2.5">
                      <FormattedMessage text={m.text} />

                      {/* Direct In-App Navigation Action Button */}
                      {m.action && (
                        <div className="pt-1.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => handleNavigate(m.action.path)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 shadow-2xs transition-colors"
                          >
                            <span>{m.action.label}</span>
                            <ArrowRightIcon className="h-3.5 w-3.5" />
                          </button>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {m.action.path}
                          </span>
                        </div>
                      )}

                      {/* Top Suggestions (when query had no exact match) */}
                      {m.suggestions && m.suggestions.length > 0 && (
                        <div className="pt-2 space-y-1.5">
                          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            Explore Related Topics:
                          </p>
                          <div className="flex flex-col gap-1.5">
                            {m.suggestions.map((sug, sIdx) => (
                              <button
                                key={sIdx}
                                onClick={() => handleAskKnowledge(sug.query)}
                                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
                              >
                                <span>{sug.title}</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  {sug.category}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Related Follow-up Questions */}
                      {m.related && m.related.length > 0 && (
                        <div className="pt-2 border-t border-slate-100">
                          <p className="text-[11px] font-semibold text-slate-400 mb-1.5">
                            Related Guides:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {m.related.map((rel, rIdx) => (
                              <button
                                key={rIdx}
                                onClick={() => handleAskKnowledge(rel.query)}
                                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                              >
                                {rel.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}

            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-tl-xs border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-500 shadow-2xs">
                  <div className="flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-600"></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-600 [animation-delay:0.2s]"></span>
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-indigo-600 [animation-delay:0.4s]"></span>
                  </div>
                  <span>Checking AccrueHRMS knowledge & records…</span>
                </div>
              </div>
            )}
          </div>

          {/* Horizontally Scrollable Topic Chips */}
          <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2 scrollbar-none">
            {QUICK_PROMPTS[activeTab].map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  if (p.intent) {
                    handleAskPersonal(p.intent, p.label)
                  } else {
                    handleAskKnowledge(p.query)
                  }
                }}
                disabled={loading}
                className="shrink-0 rounded-full border border-indigo-100 bg-indigo-50/60 px-2.5 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 hover:border-indigo-200 transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Free-text Input Bar */}
          <form
            onSubmit={handleSubmit}
            className="flex shrink-0 items-center gap-2 border-t border-slate-100 bg-white p-2.5"
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={loading}
              placeholder="Ask about any feature (e.g. how to run payroll)..."
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading || !draft.trim()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-2xs hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              title="Send question"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Bubble */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white shadow-xl hover:shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-all"
        title={open ? 'Close Assistant' : 'AccrueHRMS Assistant'}
      >
        {open ? (
          <XMarkIcon className="h-6 w-6 transition-transform group-hover:rotate-90 duration-200" />
        ) : (
          <>
            <ChatBubbleLeftRightIcon className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-600 text-[9px] font-bold text-white shadow-xs">
              <SparklesIcon className="h-2.5 w-2.5" />
            </span>
          </>
        )}
      </button>
    </div>
  )
}
