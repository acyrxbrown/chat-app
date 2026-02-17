'use client'

import { Message } from '@/lib/types'

interface ReplyPreviewProps {
  message: Message
  onClose: () => void
}

export default function ReplyPreview({ message, onClose }: ReplyPreviewProps) {
  return (
    <div className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center justify-between">
      <div className="flex-1 flex items-center space-x-3">
        <div className="w-0.5 h-10 bg-blue-500 rounded-full" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {message.sender?.full_name || message.sender?.email || 'Unknown'}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{message.content}</p>
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
      >
        <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
