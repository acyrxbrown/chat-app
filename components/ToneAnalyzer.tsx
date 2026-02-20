'use client'

import { useState } from 'react'
import { ToneAnalysis } from '@/lib/aiSocialHelper'

interface ToneAnalyzerProps {
  analysis: ToneAnalysis | null
  isLoading?: boolean
  onClose: () => void
}

export default function ToneAnalyzer({ analysis, isLoading, onClose }: ToneAnalyzerProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-md">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Analyzing tone...
          </span>
        </div>
      </div>
    )
  }

  if (!analysis) return null

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'text-green-600 dark:text-green-400'
      case 'negative':
        return 'text-red-600 dark:text-red-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  const hasIssues = analysis.issues.length > 0

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4 max-w-md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          🎯 Tone Analysis
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

      <div className="space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Tone:</span>
            <span className={`text-xs font-semibold ${getSentimentColor(analysis.sentiment)}`}>
              {analysis.tone}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Sentiment:</span>
            <span className={`text-xs font-semibold capitalize ${getSentimentColor(analysis.sentiment)}`}>
              {analysis.sentiment}
            </span>
          </div>
          {analysis.confidence > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-gray-700 dark:text-gray-300">Confidence:</span>
                <span className="text-gray-600 dark:text-gray-400">{analysis.confidence}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${analysis.confidence}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {hasIssues && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-red-800 dark:text-red-300 mb-2">
              ⚠️ Potential Issues:
            </h4>
            <ul className="space-y-1">
              {analysis.issues.map((issue, index) => (
                <li key={index} className="text-xs text-red-700 dark:text-red-400">
                  • {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {analysis.suggestions.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <h4 className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2">
              💡 Suggestions:
            </h4>
            <ul className="space-y-1">
              {analysis.suggestions.map((suggestion, index) => (
                <li key={index} className="text-xs text-blue-700 dark:text-blue-400">
                  • {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!hasIssues && analysis.suggestions.length === 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-xs text-green-700 dark:text-green-400">
              ✅ Your message tone looks good! No issues detected.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
