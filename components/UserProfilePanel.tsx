'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Profile, Chat } from '@/lib/types'

interface UserProfilePanelProps {
  chatId: string
  userId: string
  onClose: () => void
}

export default function UserProfilePanel({ chatId, userId, onClose }: UserProfilePanelProps) {
  const [chat, setChat] = useState<Chat | null>(null)
  const [participants, setParticipants] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch chat
        const { data: chatData } = await supabase
          .from('chats')
          .select('*')
          .eq('id', chatId)
          .single()
        setChat(chatData)

        // Fetch participants
        const { data: participantsData } = await supabase
          .from('chat_participants')
          .select('user_id')
          .eq('chat_id', chatId)

        if (participantsData) {
          const profiles = await Promise.all(
            participantsData.map(async (p) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', p.user_id)
                .single()
              return profile
            })
          )
          setParticipants(profiles.filter(Boolean) as Profile[])
        }
      } catch (error) {
        console.error('Error fetching profile data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [chatId])

  const otherParticipant = chat?.type === 'direct' 
    ? participants.find(p => p.id !== userId)
    : null

  const displayProfile = otherParticipant || (chat?.type === 'group' ? null : participants[0])

  if (loading) {
    return (
      <div className="w-80 bg-white border-l border-gray-200 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="font-semibold dark:text-white">Profile</h2>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Profile Content */}
      <div className="flex-1 overflow-y-auto">
        {displayProfile && (
          <>
            {/* Avatar */}
            <div className="flex flex-col items-center py-6 px-4">
              {displayProfile.avatar_url ? (
                <img
                  src={displayProfile.avatar_url}
                  alt={displayProfile.full_name || ''}
                  className="w-24 h-24 rounded-full object-cover"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-3xl">
                  {(displayProfile.full_name || displayProfile.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <h3 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                {displayProfile.full_name || displayProfile.email || 'Unknown User'}
              </h3>
              {displayProfile.full_name && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{displayProfile.email}</p>
              )}
              {chat?.type === 'group' && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Head Of Design at Logoipsum</p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Bangladesh</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Local Time {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (UTC +06:00)</p>
            </div>

            {/* Tabs */}
            <div className="border-t border-gray-200 dark:border-gray-700">
              <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button className="flex-1 py-3 text-sm font-medium text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400">
                  Photos
                </button>
                <button className="flex-1 py-3 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                  Files
                </button>
              </div>

              {/* Photos Grid */}
              <div className="p-4">
                <div className="grid grid-cols-3 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                    <div
                      key={i}
                      className="aspect-square bg-gradient-to-br from-blue-200 to-purple-200 rounded-lg"
                    />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {chat?.type === 'group' && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold mb-3 dark:text-white">Participants ({participants.length})</h3>
            <div className="space-y-2">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center space-x-3">
                  {participant.avatar_url ? (
                    <img
                      src={participant.avatar_url}
                      alt={participant.full_name || ''}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold">
                      {(participant.full_name || participant.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {participant.full_name || participant.email || 'Unknown'}
                    </p>
                    {participant.id === userId && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">You</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
