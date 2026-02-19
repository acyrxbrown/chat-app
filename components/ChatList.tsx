'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ChatWithParticipants } from '@/lib/types'
import CreateChatModal from './CreateChatModal'
import { ASSISTANT_CHAT_ID } from './AssistantChatPanel'
import { format, formatDistanceToNow } from 'date-fns'
import { useQuery, useQueryClient } from '@tanstack/react-query'

export { ASSISTANT_CHAT_ID }

interface ChatListProps {
  userId: string
  onSelectChat: (chatId: string) => void
  selectedChat: string | null
}

export default function ChatList({ userId, onSelectChat, selectedChat }: ChatListProps) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)

  const fetchChats = async () => {
    try {
      // Get all chats where user is a participant
      const { data: participants, error: participantsError } = await supabase
        .from('chat_participants')
        .select('chat_id')
        .eq('user_id', userId)

      if (participantsError) throw participantsError

      const chatIds = participants.map((p) => p.chat_id)

      if (chatIds.length === 0) {
        setLoading(false)
        return []
      }

      // Get chat details
      const { data: chatsData, error: chatsError } = await supabase
        .from('chats')
        .select('*')
        .in('id', chatIds)
        .order('updated_at', { ascending: false })

      if (chatsError) throw chatsError

      // Get participants for each chat
      const chatsWithParticipants = await Promise.all(
        chatsData.map(async (chat) => {
          const { data: participantsData } = await supabase
            .from('chat_participants')
            .select('*')
            .eq('chat_id', chat.id)

          // Fetch profiles for participants
          const participantsWithProfiles = await Promise.all(
            (participantsData || []).map(async (participant) => {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', participant.user_id)
                .single()

              return {
                ...participant,
                profile: profile || undefined,
              }
            })
          )

          // Get last message
          const { data: lastMessage } = await supabase
            .from('messages')
            .select('*')
            .eq('chat_id', chat.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          return {
            ...chat,
            participants: participantsWithProfiles,
            last_message: lastMessage || undefined,
          }
        })
      )

      return chatsWithParticipants
    } catch (error) {
      console.error('Error fetching chats:', error)
      return []
    } finally {
      setLoading(false)
    }
  }

  const { data: chats = [] } = useQuery<ChatWithParticipants[]>({
    queryKey: ['chats', userId],
    queryFn: fetchChats,
    enabled: !!userId,
  })

  useEffect(() => {
    if (!userId) return
    fetchChats().then((data) => {
      queryClient.setQueryData(['chats', userId], data)
    })

    // Subscribe to chat updates
    const chatSubscription = supabase
      .channel('chats_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
        },
        () => {
          fetchChats().then((data) => {
            queryClient.setQueryData(['chats', userId], data)
          })
        }
      )
      .subscribe()

    // Subscribe to participant changes
    const participantSubscription = supabase
      .channel('participants_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_participants',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchChats().then((data) => {
            queryClient.setQueryData(['chats', userId], data)
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(chatSubscription)
      supabase.removeChannel(participantSubscription)
    }
  }, [userId, queryClient])

  const getChatDisplayName = (chat: ChatWithParticipants) => {
    if (chat.type === 'group' && chat.name) {
      return chat.name
    }
    // For direct chats, show the other participant's name
    const otherParticipant = chat.participants.find(
      (p) => p.user_id !== userId
    )
    return otherParticipant?.profile?.full_name || otherParticipant?.profile?.email || 'Unknown User'
  }

  const getChatAvatar = (chat: ChatWithParticipants) => {
    if (chat.type === 'group') {
      return null // Group avatar logic can be added later
    }
    const otherParticipant = chat.participants.find(
      (p) => p.user_id !== userId
    )
    return otherParticipant?.profile?.avatar_url
  }

  const getChatPreview = (chat: ChatWithParticipants) => {
    if (chat.last_message) {
      return chat.last_message.content.length > 50 
        ? chat.last_message.content.substring(0, 50) + '...'
        : chat.last_message.content
    }
    return 'No messages yet'
  }

  const getTimeDisplay = (chat: ChatWithParticipants) => {
    if (chat.last_message) {
      const messageDate = new Date(chat.last_message.created_at)
      const now = new Date()
      const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60)
      
      if (diffInHours < 24) {
        return format(messageDate, 'h:mm a')
      } else if (diffInHours < 168) { // Less than a week
        return format(messageDate, 'EEE')
      } else {
        return format(messageDate, 'MMM d')
      }
    }
    return ''
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading chats...</div>
      </div>
    )
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {/* Assistant at top - click to chat with AI */}
        <button
          onClick={() => onSelectChat(ASSISTANT_CHAT_ID)}
          className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
            selectedChat === ASSISTANT_CHAT_ID ? 'bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30' : ''
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-lg shrink-0">
              AI
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">Assistant</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">Chat with AI</p>
            </div>
          </div>
        </button>
        <div className="border-b border-gray-100 dark:border-gray-800 my-1" />
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full p-4 bg-blue-500 text-white hover:bg-blue-600 transition-colors font-medium"
        >
          + New Chat
        </button>
        
        {chats.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <p>No chats yet</p>
            <p className="text-sm mt-2">Create a new chat to get started</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {chats.map((chat) => {
              const avatar = getChatAvatar(chat)
              const displayName = getChatDisplayName(chat)
              const preview = getChatPreview(chat)
              const timeDisplay = getTimeDisplay(chat)
              
              return (
                <button
                  key={chat.id}
                  onClick={() => onSelectChat(chat.id)}
                  className={`w-full p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                    selectedChat === chat.id ? 'bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30' : ''
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {avatar ? (
                        <img
                          src={avatar}
                          alt={displayName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-semibold text-lg">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    
                    {/* Chat Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
                          {displayName}
                        </h3>
                        {timeDisplay && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
                            {timeDisplay}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {preview}
                      </p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateChatModal
          userId={userId}
          onClose={() => setShowCreateModal(false)}
          onChatCreated={(chatId) => {
            setShowCreateModal(false)
            onSelectChat(chatId)
            fetchChats().then((data) => {
              queryClient.setQueryData(['chats', userId], data)
            })
          }}
        />
      )}
    </>
  )
}
