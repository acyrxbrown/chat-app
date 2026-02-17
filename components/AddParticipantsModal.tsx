'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'

interface AddParticipantsModalProps {
  chatId: string
  onClose: () => void
}

export default function AddParticipantsModal({
  chatId,
  onClose,
}: AddParticipantsModalProps) {
  const [availableUsers, setAvailableUsers] = useState<Profile[]>([])
  const [currentParticipants, setCurrentParticipants] = useState<string[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchCurrentParticipants()
    fetchUsers()
  }, [chatId, searchQuery])

  const fetchCurrentParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('chat_participants')
        .select('user_id')
        .eq('chat_id', chatId)

      if (error) throw error
      setCurrentParticipants(data?.map((p) => p.user_id) || [])
    } catch (error) {
      console.error('Error fetching participants:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('*')
        .limit(20)

      if (searchQuery) {
        query = query.or(
          `full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
        )
      }

      const { data, error } = await query
      if (error) throw error

      // Filter out current participants
      const filtered = (data || []).filter(
        (user) => !currentParticipants.includes(user.id)
      )
      setAvailableUsers(filtered)
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const handleAddParticipants = async () => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one user')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.from('chat_participants').insert(
        selectedUsers.map((userId) => ({
          chat_id: chatId,
          user_id: userId,
        }))
      )

      if (error) throw error

      onClose()
    } catch (error: any) {
      console.error('Error adding participants:', error)
      alert(error.message || 'Failed to add participants')
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
        <h2 className="text-xl font-bold mb-4 dark:text-white">Add Participants</h2>

        {/* User Search */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Search Users
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
          />
          <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md">
            {availableUsers.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No users found
              </div>
            ) : (
              availableUsers.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggleUser(user.id)}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    selectedUsers.includes(user.id) ? 'bg-blue-50 dark:bg-blue-900 dark:bg-opacity-30' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="dark:text-white">{user.full_name || user.email || 'Unknown User'}</span>
                    {selectedUsers.includes(user.id) && (
                      <span className="text-blue-500 dark:text-blue-400">✓</span>
                    )}
                  </div>
                </button>
              ))
            )}
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
            onClick={handleAddParticipants}
            disabled={loading || selectedUsers.length === 0}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add Participants'}
          </button>
        </div>
      </div>
    </div>
  )
}
