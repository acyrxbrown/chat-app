'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Reminder, Profile } from '@/lib/types'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'

interface ReminderComponentProps {
  reminder: Reminder
  userId: string
}

export default function ReminderComponent({ reminder, userId }: ReminderComponentProps) {
  const queryClient = useQueryClient()
  const [completing, setCompleting] = useState(false)

  const isForMe = reminder.user_id === userId
  const remindAt = new Date(reminder.remind_at)
  const isOverdue = remindAt < new Date() && !reminder.is_completed

  const handleComplete = async () => {
    if (!isForMe || completing) return

    setCompleting(true)
    try {
      const { error } = await supabase
        .from('reminders')
        .update({
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', reminder.id)

      if (error) throw error

      queryClient.invalidateQueries({ queryKey: ['reminders', userId] })
    } catch (error) {
      console.error('Error completing reminder:', error)
      alert('Failed to complete reminder. Please try again.')
    } finally {
      setCompleting(false)
    }
  }

  return (
    <div className={`bg-gray-100 dark:bg-gray-700 rounded-lg p-4 border-2 ${
      isOverdue ? 'border-red-500 dark:border-red-600' : 'border-gray-200 dark:border-gray-600'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              Reminder
            </h3>
            {isOverdue && (
              <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded">
                Overdue
              </span>
            )}
            {reminder.is_completed && (
              <span className="px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded">
                Completed
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            {reminder.reminder_text}
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Remind at: {format(remindAt, 'MMM d, yyyy h:mm a')}</span>
          </div>
        </div>
      </div>

      {isForMe && !reminder.is_completed && (
        <button
          onClick={handleComplete}
          disabled={completing}
          className="mt-2 px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {completing ? 'Completing...' : 'Mark as Complete'}
        </button>
      )}
    </div>
  )
}
