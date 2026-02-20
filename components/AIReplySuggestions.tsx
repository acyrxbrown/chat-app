'use client'

import { useState } from 'react'
import { ReplySuggestion } from '@/lib/aiSocialHelper'

interface AIReplySuggestionsProps {
  suggestions: ReplySuggestion[]
  onSelect: (suggestion: string) => void
  onClose: () => void
  isLoading?: boolean
}

export default function AIReplySuggestions({
  suggestions,
  onSelect,
  onClose,
  isLoading,
}: AIReplySuggestionsProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const getToneColor = (tone: ReplySuggestion['tone']) => {
    switch (tone) {
      case 'friendly':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
      case 'professional':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
      case 'casual':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300'
      case 'empathetic':
        return 'bg-pink-100 dark:bg-pink-900/20 text-pink-800 dark:text-pink-300'
      case 'playful':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-md">
        <div className="flex items-center gap-2 mb-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            AI is thinking...
          </span>
        </div>
      </div>
    )
  }

  if (suggestions.length === 0) {
    return null
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          💡 AI Reply Suggestions
        </h3>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <button
            key={index}
            onClick={() => onSelect(suggestion.suggestion)}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className="w-full text-left p-3 rounded-lg border-2 transition-all bg-gray-50 dark:bg-gray-700/50 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm text-gray-900 dark:text-gray-100 flex-1">
                {suggestion.suggestion}
              </p>
              <span className={`px-2 py-0.5 text-xs font-medium rounded ${getToneColor(suggestion.tone)}`}>
                {suggestion.tone}
              </span>
            </div>
            {suggestion.explanation && hoveredIndex === index && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {suggestion.explanation}
              </p>
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
        Click a suggestion to use it, or hover to see why it works
      </p>
    </div>
  )
}
