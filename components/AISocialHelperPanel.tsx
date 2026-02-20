'use client'

import { useState } from 'react'
import { getReplySuggestions, getConversationStarters, getFlirtingSuggestions, getConflictResolutionHelp } from '@/lib/aiSocialHelper'
import { Message } from '@/lib/types'
import AIReplySuggestions from './AIReplySuggestions'
import { ReplySuggestion } from '@/lib/aiSocialHelper'

interface AISocialHelperPanelProps {
  isOpen: boolean
  onClose: () => void
  messages: Message[]
  userId: string
  otherParticipantName?: string
  onSelectSuggestion: (text: string) => void
}

type HelperMode = 'reply' | 'starter' | 'flirting' | 'conflict' | null

export default function AISocialHelperPanel({
  isOpen,
  onClose,
  messages,
  userId,
  otherParticipantName,
  onSelectSuggestion,
}: AISocialHelperPanelProps) {
  const [mode, setMode] = useState<HelperMode>(null)
  const [loading, setLoading] = useState(false)
  const [replySuggestions, setReplySuggestions] = useState<ReplySuggestion[]>([])
  const [conversationStarters, setConversationStarters] = useState<string[]>([])
  const [flirtingSuggestions, setFlirtingSuggestions] = useState<ReplySuggestion[]>([])
  const [conflictHelp, setConflictHelp] = useState<any>(null)

  if (!isOpen) return null

  const handleGetReplySuggestions = async () => {
    setMode('reply')
    setLoading(true)
    try {
      const lastMessage = messages.filter(m => m.sender_id !== userId).slice(-1)[0]
      if (!lastMessage) {
        alert('No messages to reply to')
        setMode(null)
        return
      }

      const chatHistory = messages.slice(-10).map(m => ({
        role: m.sender_id === userId ? 'user' : 'assistant',
        content: m.content,
      }))

      const suggestions = await getReplySuggestions(
        lastMessage.content,
        chatHistory,
        `Chatting with ${otherParticipantName || 'someone'}`
      )
      setReplySuggestions(suggestions)
    } catch (error) {
      console.error('Error getting reply suggestions:', error)
      alert('Failed to get suggestions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGetConversationStarters = async () => {
    setMode('starter')
    setLoading(true)
    try {
      const starters = await getConversationStarters(
        otherParticipantName,
        'Starting a conversation'
      )
      setConversationStarters(starters)
    } catch (error) {
      console.error('Error getting conversation starters:', error)
      alert('Failed to get starters. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGetFlirtingSuggestions = async () => {
    setMode('flirting')
    setLoading(true)
    try {
      const lastMessage = messages.filter(m => m.sender_id !== userId).slice(-1)[0]
      if (!lastMessage) {
        alert('No messages to respond to')
        setMode(null)
        return
      }

      const chatHistory = messages.slice(-10).map(m => ({
        role: m.sender_id === userId ? 'user' : 'assistant',
        content: m.content,
      }))

      const suggestions = await getFlirtingSuggestions(
        lastMessage.content,
        chatHistory,
        `Romantic conversation with ${otherParticipantName || 'someone'}`
      )
      setFlirtingSuggestions(suggestions)
    } catch (error) {
      console.error('Error getting flirting suggestions:', error)
      alert('Failed to get suggestions. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGetConflictHelp = async () => {
    setMode('conflict')
    setLoading(true)
    try {
      const recentMessages = messages.slice(-10)
      const lastMessage = recentMessages[recentMessages.length - 1]
      if (!lastMessage) {
        alert('No messages to analyze')
        setMode(null)
        return
      }

      const chatHistory = recentMessages.map(m => ({
        role: m.sender_id === userId ? 'user' : 'assistant',
        content: m.content,
      }))

      const help = await getConflictResolutionHelp(
        lastMessage.content,
        chatHistory,
        `Conversation with ${otherParticipantName || 'someone'}`
      )
      setConflictHelp(help)
    } catch (error) {
      console.error('Error getting conflict help:', error)
      alert('Failed to get help. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            🤖 AI Social Helper
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4">
          {mode === null && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={handleGetReplySuggestions}
                className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
              >
                <div className="text-2xl mb-2">💬</div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  AI Reply Suggestions
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get AI-suggested replies to help you respond naturally
                </p>
              </button>

              <button
                onClick={handleGetConversationStarters}
                className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all text-left"
              >
                <div className="text-2xl mb-2">🚀</div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Conversation Starters
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get help starting conversations naturally
                </p>
              </button>

              <button
                onClick={handleGetFlirtingSuggestions}
                className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-pink-500 dark:hover:border-pink-600 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all text-left"
              >
                <div className="text-2xl mb-2">💕</div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Flirting Assistant
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get respectful, playful suggestions for romantic conversations
                </p>
              </button>

              <button
                onClick={handleGetConflictHelp}
                className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-orange-500 dark:hover:border-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all text-left"
              >
                <div className="text-2xl mb-2">🤝</div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  Conflict Resolution
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get help resolving misunderstandings and conflicts
                </p>
              </button>
            </div>
          )}

          {mode === 'reply' && (
            <div>
              <button
                onClick={() => setMode(null)}
                className="mb-4 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400"
              >
                ← Back
              </button>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <AIReplySuggestions
                  suggestions={replySuggestions}
                  onSelect={(suggestion) => {
                    onSelectSuggestion(suggestion)
                    onClose()
                  }}
                  onClose={() => setMode(null)}
                />
              )}
            </div>
          )}

          {mode === 'starter' && (
            <div>
              <button
                onClick={() => setMode(null)}
                className="mb-4 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400"
              >
                ← Back
              </button>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">
                    Conversation Starters
                  </h3>
                  {conversationStarters.map((starter, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        onSelectSuggestion(starter)
                        onClose()
                      }}
                      className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                    >
                      <p className="text-sm text-gray-900 dark:text-gray-100">{starter}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {mode === 'flirting' && (
            <div>
              <button
                onClick={() => setMode(null)}
                className="mb-4 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400"
              >
                ← Back
              </button>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : (
                <AIReplySuggestions
                  suggestions={flirtingSuggestions}
                  onSelect={(suggestion) => {
                    onSelectSuggestion(suggestion)
                    onClose()
                  }}
                  onClose={() => setMode(null)}
                />
              )}
            </div>
          )}

          {mode === 'conflict' && (
            <div>
              <button
                onClick={() => setMode(null)}
                className="mb-4 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400"
              >
                ← Back
              </button>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : conflictHelp ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Analysis
                    </h3>
                    <p className="text-sm text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                      {conflictHelp.analysis}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      Suggested Approach: {conflictHelp.approach}
                    </h3>
                    <div className="space-y-2">
                      {conflictHelp.suggestions.map((suggestion: string, index: number) => (
                        <button
                          key={index}
                          onClick={() => {
                            onSelectSuggestion(suggestion)
                            onClose()
                          }}
                          className="w-full text-left p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all"
                        >
                          <p className="text-sm text-gray-900 dark:text-gray-100">{suggestion}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
