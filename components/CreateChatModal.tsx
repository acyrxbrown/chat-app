'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'

interface CreateChatModalProps {
  userId: string
  onClose: () => void
  onChatCreated: (chatId: string) => void
}

export default function CreateChatModal({
  userId,
  onClose,
  onChatCreated,
}: CreateChatModalProps) {
  const [chatType, setChatType] = useState<'direct' | 'group'>('direct')
  const [chatName, setChatName] = useState('')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [searchQuery])

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .neq('id', userId)
        .limit(20)

      if (searchQuery) {
        query = query.or(
          `full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
        )
      }

      const { data, error } = await query
      if (error) throw error
      setAvailableUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleCreateChat = async () => {
    if (chatType === 'direct' && selectedUsers.length !== 1) {
      alert('Please select exactly one user for a direct chat')
      return
    }

    if (chatType === 'group' && (!chatName.trim() || selectedUsers.length === 0)) {
      alert('Please provide a group name and select at least one participant')
      return
    }

    setLoading(true)
    try {
      // Check if direct chat already exists
      if (chatType === 'direct') {
        const { data: existingChats } = await supabase
          .from('chat_participants')
          .select('chat_id')
          .eq('user_id', userId)

        if (existingChats) {
          for (const existingChat of existingChats) {
            const { data: participants } = await supabase
              .from('chat_participants')
              .select('user_id')
              .eq('chat_id', existingChat.chat_id)

            if (
              participants?.length === 2 &&
              participants.some((p) => p.user_id === selectedUsers[0]) &&
              participants.some((p) => p.user_id === userId)
            ) {
              // Check if it's a direct chat
              const { data: chat } = await supabase
                .from('chats')
                .select('type')
                .eq('id', existingChat.chat_id)
                .single()

              if (chat?.type === 'direct') {
                onChatCreated(existingChat.chat_id)
                onClose()
                return
              }
            }
          }
        }
      }

      // Create new chat
      const { data: chat, error: chatError } = await supabase
        .from('chats')
        .insert({
          name: chatType === 'group' ? chatName.trim() : null,
          type: chatType,
          created_by: userId,
        })
        .select()
        .single()

      if (chatError) throw chatError

      // Add participants
      const participants = [userId, ...selectedUsers]
      const { error: participantsError } = await supabase
        .from('chat_participants')
        .insert(
          participants.map((participantId) => ({
            chat_id: chat.id,
            user_id: participantId,
          }))
        )

      if (participantsError) throw participantsError

      onChatCreated(chat.id)
      onClose()
    } catch (error: any) {
      console.error('Error creating chat:', error)
      alert(error.message || 'Failed to create chat')
    } finally {
      setLoading(false)
    }
  }

  const toggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4 dark:text-white">Create New Chat</h2>

        {/* Chat Type Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Chat Type
            </label>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setChatType('direct')
                  setSelectedUsers([])
                  setChatName('')
                }}
                className={`px-4 py-2 rounded-md ${
                  chatType === 'direct'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Direct Chat
              </button>
              <button
                onClick={() => {
                  setChatType('group')
                  setSelectedUsers([])
                }}
                className={`px-4 py-2 rounded-md ${
                  chatType === 'group'
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Group Chat
              </button>
            </div>
          </div>

          {/* Group Name Input */}
          {chatType === 'group' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Group Name
              </label>
              <input
                type="text"
                value={chatName}
                onChange={(e) => setChatName(e.target.value)}
                placeholder="Enter group name"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* User Search */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {chatType === 'direct' ? 'Select User' : 'Select Participants'}
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            />
            <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md">
              {availableUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleUser(user.id)}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    selectedUsers.includes(user.id) ? 'bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="dark:text-white">
                      {user.full_name || user.email || 'Unknown User'}
                    </span>
                    {selectedUsers.includes(user.id) && (
                      <span className="text-blue-500 dark:text-blue-400">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateChat}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Chat'}
            </button>
          </div>
      </div>
    </div>
  )
}
