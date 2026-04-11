import { useState, useRef, useEffect } from 'react'
import { MessageSquare, Send, Loader2, Bot, User, Trash2, Sparkles } from 'lucide-react'
import { chatWithAI, type ChatMessage } from '../lib/api'

const QUICK_PROMPTS = [
  'Why did CNC-03 fail?',
  'Which machines need maintenance?',
  'Show anomaly report',
  'Health of CNC-01',
  'Explain tool wear failure',
  'What is Power Failure?',
]

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 animate-slide-up ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs ${
        isUser ? 'bg-shield-accent/20 text-shield-accent' : 'bg-purple-500/20 text-purple-400'
      }`}>
        {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
      </div>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        isUser
          ? 'bg-shield-accent/15 text-slate-200 border border-shield-accent/20 rounded-tr-sm'
          : 'glass text-slate-300 rounded-tl-sm'
      }`}>
        <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
      </div>
    </div>
  )
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role:    'assistant',
      content: "Hello! I'm **FactoryShield AI**, your industrial maintenance assistant.\n\nI can help you:\n• Analyse machine failures\n• Check anomaly reports\n• Recommend maintenance actions\n• Explain failure types\n\nHow can I assist you today?",
    },
  ])
  const [input,   setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || loading) return

    const userMsg: ChatMessage = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const reply = await chatWithAI(msg, messages.slice(-6))
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, {
        role:    'assistant',
        content: '⚠️ Backend offline. Please start the FastAPI server on port 8000.\n\nRun: `cd backend && uvicorn app.main:app --reload`',
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-[calc(100vh-140px)] flex gap-5 animate-fade-in">

      {/* Sidebar — quick prompts */}
      <div className="w-52 flex-shrink-0 space-y-3">
        <div className="glass p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-shield-accent" /> Quick Queries
          </h3>
          <div className="space-y-1.5">
            {QUICK_PROMPTS.map(q => (
              <button key={q} onClick={() => send(q)}
                disabled={loading}
                className="w-full text-left px-3 py-2 rounded-lg text-xs text-slate-400 
                           hover:text-slate-200 hover:bg-shield-600 transition-colors">
                {q}
              </button>
            ))}
          </div>
        </div>

        <div className="glass p-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Model</h3>
          <div className="text-xs text-slate-500 space-y-1">
            <div className="flex justify-between">
              <span>LLM</span>
              <span className="text-shield-accent font-mono">GPT/Groq</span>
            </div>
            <div className="flex justify-between">
              <span>Fallback</span>
              <span className="text-green-400 font-mono">Rules</span>
            </div>
            <div className="flex justify-between">
              <span>Machines</span>
              <span className="text-white font-mono">12</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setMessages([{
            role: 'assistant',
            content: "Chat cleared. How can I help you?",
          }])}
          className="btn-secondary w-full flex items-center justify-center gap-2 text-xs">
          <Trash2 className="w-3 h-3" /> Clear Chat
        </button>
      </div>

      {/* Chat window */}
      <div className="flex-1 flex flex-col glass">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5 border-b border-shield-600/50">
          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <Bot className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">FactoryShield AI</div>
            <div className="text-xs text-slate-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />
              Online — LangChain + RAG
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((m, i) => <Bubble key={i} msg={m} />)}
          {loading && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-purple-400" />
              </div>
              <div className="glass rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-shield-accent" />
                <span className="text-xs text-slate-400">Analysing…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3.5 border-t border-shield-600/50">
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask about machines, failures, anomalies…"
              className="input-field flex-1"
              disabled={loading}
            />
            <button onClick={() => send()} disabled={loading || !input.trim()}
              className="btn-primary flex items-center gap-2 px-4">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-1.5 text-center">
            Press Enter to send · Powered by LangChain + OpenAI / Groq
          </p>
        </div>
      </div>
    </div>
  )
}
