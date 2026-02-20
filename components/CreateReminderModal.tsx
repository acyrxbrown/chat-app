'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'

interface CreateReminderModalProps {
  isOpen: boolean
  onClose: () => void
  chatId: string
  userId: string
  messageId: string
  participants: Profile[]
  onReminderCreated: () => void
}

export default function CreateReminderModal({
  isOpen,
  onClose,
  chatId,
  userId,
  messageId,
  participants,
  onReminderCreated,
}: CreateReminderModalProps) {
  const [reminderText, setReminderText] = useState('')
  const [remindAt, setRemindAt] = useState('')
  const [selectedUser, setSelectedUser] = useState(userId) // Default to self
  const [creating, setCreating] = useState(false)

  if (!isOpen) return null

  const handleCreate = async () => {
    if (!reminderText.trim() || !remindAt) {
      alert('Please provide reminder text and time')
      return
    }

    setCreating(true)
    try {
      const { error } = await supabase
        .from('reminders')
        .insert({
          chat_id: chatId,
          message_id: messageId,
          created_by: userId,
          user_id: selectedUser,
          reminder_text: reminderText.trim(),
          remind_at: remindAt,
          is_completed: false,
        })

      if (error) throw error

      // Reset form
      setReminderText('')
      setRemindAt('')
      setSelectedUser(userId)
      onReminderCreated()
      onClose()
    } catch (error) {
      console.error('Error creating reminder:', error)
      alert('Failed to create reminder. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Create Reminder
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Reminder text *
            </label>
            <textarea
              value={reminderText}
              onChange={(e) => setReminderText(e.target.value)}
              placeholder="What should be reminded?"
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Remind at *
            </label>
            <input
              type="datetime-local"
              value={remindAt}
              onChange={(e) => setRemindAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              For
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {participants.map((participant) => (
                <option key={participant.id} value={participant.id}>
                  {participant.id === userId ? 'Me' : participant.full_name || participant.email}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {creating ? 'Creating...' : 'Create Reminder'}
          </button>
        </div>
      </div>
    </div>
  )
}
