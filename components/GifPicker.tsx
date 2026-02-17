'use client'

import { useState, useEffect, useRef } from 'react'
import axios from 'axios'

interface GifPickerProps {
  onGifSelect: (gifUrl: string) => void
  isOpen: boolean
  onClose: () => void
}

// Using Giphy API - you'll need to get a free API key from https://developers.giphy.com/
const GIPHY_API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY || 'YOUR_GIPHY_API_KEY'

export default function GifPicker({ onGifSelect, isOpen, onClose }: GifPickerProps) {
  const [gifs, setGifs] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      fetchTrendingGifs()
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const fetchTrendingGifs = async () => {
    if (!GIPHY_API_KEY || GIPHY_API_KEY === 'YOUR_GIPHY_API_KEY') {
      console.warn('Giphy API key not configured')
      return
    }

    setLoading(true)
    try {
      const response = await axios.get('https://api.giphy.com/v1/gifs/trending', {
        params: {
          api_key: GIPHY_API_KEY,
          limit: 20,
        },
      })
      setGifs(response.data.data)
    } catch (error) {
      console.error('Error fetching GIFs:', error)
    } finally {
      setLoading(false)
    }
  }

  const searchGifs = async (query: string) => {
    if (!GIPHY_API_KEY || GIPHY_API_KEY === 'YOUR_GIPHY_API_KEY') {
      return
    }

    if (!query.trim()) {
      fetchTrendingGifs()
      return
    }

    setLoading(true)
    try {
      const response = await axios.get('https://api.giphy.com/v1/gifs/search', {
        params: {
          api_key: GIPHY_API_KEY,
          q: query,
          limit: 20,
        },
      })
      setGifs(response.data.data)
    } catch (error) {
      console.error('Error searching GIFs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    const timeoutId = setTimeout(() => searchGifs(query), 500)
    return () => clearTimeout(timeoutId)
  }

  if (!isOpen) return null

  if (!GIPHY_API_KEY || GIPHY_API_KEY === 'YOUR_GIPHY_API_KEY') {
    return (
      <div
        ref={pickerRef}
        className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-50 w-80"
      >
        <p className="text-sm text-gray-600">
          Please configure GIPHY_API_KEY in your .env.local file
        </p>
        <p className="text-xs text-gray-500 mt-2">
          Get a free API key from{' '}
          <a
            href="https://developers.giphy.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline"
          >
            developers.giphy.com
          </a>
        </p>
      </div>
    )
  }

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50 w-80 h-96 flex flex-col"
    >
      <div className="p-3 border-b border-gray-200 dark:border-gray-700">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearch}
          placeholder="Search GIFs..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 dark:text-gray-400 text-sm">Loading GIFs...</div>
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500 dark:text-gray-400 text-sm">No GIFs found</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => {
                  onGifSelect(gif.images.original.url)
                  onClose()
                }}
                className="aspect-square rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
              >
                <img
                  src={gif.images.fixed_height_small.url}
                  alt={gif.title}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
