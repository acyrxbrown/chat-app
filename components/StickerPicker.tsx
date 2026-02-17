'use client'

import { useState, useRef, useEffect } from 'react'

interface StickerPickerProps {
  onStickerSelect: (stickerUrl: string) => void
  isOpen: boolean
  onClose: () => void
}

// Predefined sticker URLs - you can replace these with your own stickers
const STICKER_CATEGORIES = {
  emoji: [
    '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
    '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
    '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
  ],
  // You can add more sticker categories with image URLs
  // For example:
  // custom: [
  //   'https://example.com/sticker1.png',
  //   'https://example.com/sticker2.png',
  // ]
}

export default function StickerPicker({ onStickerSelect, isOpen, onClose }: StickerPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState<'emoji'>('emoji')
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const stickers = STICKER_CATEGORIES[selectedCategory]

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 w-80 h-96 flex flex-col"
    >
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedCategory('emoji')}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              selectedCategory === 'emoji'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Emoji
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-6 gap-2">
          {stickers.map((sticker, index) => (
            <button
              key={index}
              onClick={() => {
                onStickerSelect(sticker)
                onClose()
              }}
              className="text-3xl hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg p-2 transition-colors"
            >
              {sticker}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
