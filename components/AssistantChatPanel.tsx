'use client'

import { useEffect, useState, useRef } from 'react'
import { getAIResponse } from '@/lib/ai'
import { format } from 'date-fns'

export const ASSISTANT_CHAT_ID = 'assistant'

interface AIMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

interface AssistantChatPanelProps {
  userId: string
}

export default function AssistantChatPanel({ userId }: AssistantChatPanelProps) {
  const [messages, setMessages] = useState<AIMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [chatHistory, setChatHistory] = useState<Array<{ role: string; content: string }>>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (!userId) return
    const stored = localStorage.getItem(`ai_chat_history_${userId}`)
    if (stored) {
      try {
        const { messages: msgs, chatHistory: history } = JSON.parse(stored)
        setMessages(Array.isArray(msgs) ? msgs : [])
        setChatHistory(Array.isArray(history) ? history : [])
      } catch {
        setMessages([welcomeMessage()])
      }
    } else {
      setMessages([welcomeMessage()])
    }
  }, [userId])

  function welcomeMessage(): AIMessage {
    return {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I'm Assistant, your AI helper. How can I assist you today?",
      created_at: new Date().toISOString(),
    }
  }

  const saveHistory = (msgs: AIMessage[], history: Array<{ role: string; content: string }>) => {
    if (!userId) return
    try {
      localStorage.setItem(`ai_chat_history_${userId}`, JSON.stringify({ messages: msgs, chatHistory: history }))
    } catch (e) {
      console.error('Error saving AI chat history:', e)
    }
  }

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || sending || !userId) return

    const userMessage = input.trim()
    setInput('')
    setSending(true)

    const userMsg: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
    const newHistory = [...chatHistory, { role: 'user', content: userMessage }]
    setChatHistory(newHistory)

    try {
      const aiResponse = await getAIResponse(userMessage, chatHistory)
      const aiMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, aiMsg])
      const updatedHistory = [...newHistory, { role: 'assistant', content: aiResponse }]
      setChatHistory(updatedHistory)
      saveHistory([...messages, userMsg, aiMsg], updatedHistory)
    } catch (err) {
      console.error('AI error:', err)
      const errMsg: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again or check if the API key is configured.',
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  const handleClear = () => {
    if (!confirm('Clear chat history?')) return
    setMessages([welcomeMessage()])
    setChatHistory([])
    if (userId) localStorage.removeItem(`ai_chat_history_${userId}`)
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
            AI
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Assistant</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Powered by Gemini</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          Clear chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-lg px-3 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-none shadow-sm'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
              <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                {format(new Date(msg.created_at), 'h:mm a')}
              </p>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white dark:bg-gray-800 rounded-lg rounded-bl-none px-4 py-3 shadow-sm flex space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3">
        <form onSubmit={handleSend} className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 dark:text-white rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="p-2 bg-blue-500 text-white rounded-full hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
