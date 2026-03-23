import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Sparkles } from 'lucide-react'
import { TopBar, SectionNav } from '@/components/layout'
import { useAuthStore } from '@/store/auth'
import { supabase } from '@/lib/supabase'

// ── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

// ── Suggested questions ──────────────────────────────────────────────────────

const SUGGESTIONS = [
  'When was our last mission?',
  "What's our best-rated steak?",
  'How many countries have we visited?',
  'Who has the most PS5 wins?',
  'When did all three of us last meet?',
  'What city have we visited the most?',
  'Give me a summary of our year so far.',
]

// ── Typing indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 max-w-[85%]">
      <div className="shrink-0 w-8 h-8 rounded-full bg-gold/15 flex items-center justify-center">
        <Sparkles size={14} className="text-gold" />
      </div>
      <div className="bg-slate-dark border border-gold/15 rounded-2xl rounded-tl-sm px-4 py-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-gold/60"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-gold/15 flex items-center justify-center mr-3 mt-1">
          <Sparkles size={14} className="text-gold" />
        </div>
      )}
      <div
        className={`max-w-[85%] px-4 py-3 text-sm font-body leading-relaxed whitespace-pre-wrap ${
          isUser
            ? 'bg-gold/15 border border-gold/25 text-ivory rounded-2xl rounded-tr-sm'
            : 'bg-slate-dark border border-gold/15 text-ivory/90 rounded-2xl rounded-tl-sm'
        }`}
      >
        {message.content}
      </div>
    </motion.div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function CodexAI() {
  const { gent } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
    }
  }, [input])

  async function handleSubmit(text?: string) {
    const question = (text || input).trim()
    if (!question || loading || !gent) return

    setInput('')

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMsg])
    setLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('codex-ai', {
        body: { question, gent_id: gent.id },
      })

      const answer = error
        ? 'I was unable to process that request. Try again shortly.'
        : data?.answer || 'No response received.'

      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: answer,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMsg])
    } catch {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Connection failed. Please try again.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isEmpty = messages.length === 0

  return (
    <>
      <TopBar />
      <SectionNav />

      {/* Chat area — fills available space between nav and input bar */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
          <AnimatePresence mode="popLayout">
            {isEmpty ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="flex flex-col items-center justify-center h-full min-h-[50vh] gap-6"
              >
                {/* Header */}
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center">
                    <Sparkles size={28} className="text-gold" />
                  </div>
                  <h1 className="font-display text-xl text-ivory">The Codex AI</h1>
                  <p className="text-ivory-dim text-xs font-body text-center max-w-[260px] leading-relaxed">
                    Ask anything about your chronicle history. I know every entry, every mission, every stat.
                  </p>
                </div>

                {/* Suggestion chips */}
                <div className="flex flex-wrap justify-center gap-2 max-w-sm">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSubmit(s)}
                      className="px-3 py-1.5 text-[11px] font-body text-gold/80 bg-gold/8 border border-gold/15 rounded-full hover:bg-gold/15 hover:text-gold transition-colors active:scale-95"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-4">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {loading && <TypingIndicator />}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Input bar — fixed at bottom */}
        <div className="shrink-0 border-t border-white/8 bg-obsidian/95 backdrop-blur-sm px-4 py-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask The Codex..."
              rows={1}
              className="flex-1 bg-slate-dark border border-white/10 rounded-xl px-4 py-2.5 text-sm font-body text-ivory placeholder:text-ivory-dim/50 resize-none focus:outline-none focus:border-gold/30 transition-colors"
            />
            <button
              onClick={() => handleSubmit()}
              disabled={!input.trim() || loading}
              className="shrink-0 w-10 h-10 rounded-xl bg-gold/20 border border-gold/30 flex items-center justify-center text-gold disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 transition-all hover:bg-gold/30"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
