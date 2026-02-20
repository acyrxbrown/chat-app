'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Task, Profile } from '@/lib/types'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'

interface TaskComponentProps {
  task: Task
  userId: string
  chatId: string
  participants: Profile[]
}

export default function TaskComponent({ task, userId, chatId, participants }: TaskComponentProps) {
  const queryClient = useQueryClient()
  const [updating, setUpdating] = useState(false)

  const isAssignedToMe = task.assigned_to === userId
  const isCreator = task.created_by === userId
  const canEdit = isCreator || isAssignedToMe

  const handleStatusChange = async (newStatus: Task['status']) => {
    if (!canEdit || updating) return

    setUpdating(true)
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      }

      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString()
      } else if (task.status === 'completed' && newStatus !== 'completed') {
        updateData.completed_at = null
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', task.id)

      if (error) throw error

      queryClient.invalidateQueries({ queryKey: ['tasks', chatId] })
    } catch (error) {
      console.error('Error updating task:', error)
      alert('Failed to update task. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700'
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-700'
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700'
      case 'low':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-300 dark:border-green-700'
    }
  }

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
      case 'in_progress':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300'
      case 'cancelled':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
    }
  }

  const assignee = participants.find(p => p.id === task.assigned_to)
  const isOverdue: boolean = task.due_date ? new Date(task.due_date) < new Date() && task.status !== 'completed' : false

  return (
    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {task.title}
            </h3>
            <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
            <span className={`px-2 py-0.5 text-xs font-medium rounded ${getStatusColor(task.status)}`}>
              {task.status.replace('_', ' ')}
            </span>
          </div>
          {task.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {task.description}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 dark:text-gray-400 mb-3">
        {assignee && (
          <div className="flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{assignee.full_name || assignee.email}</span>
          </div>
        )}
        {task.due_date && (
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 dark:text-red-400 font-semibold' : ''}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{format(new Date(task.due_date), 'MMM d, yyyy')}</span>
            {isOverdue && <span className="ml-1">(Overdue)</span>}
          </div>
        )}
      </div>

      {canEdit && task.status !== 'completed' && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleStatusChange('in_progress')}
            disabled={updating || task.status === 'in_progress'}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start
          </button>
          <button
            onClick={() => handleStatusChange('completed')}
            disabled={updating}
            className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Complete
          </button>
          {isCreator && (
            <button
              onClick={() => handleStatusChange('cancelled')}
              disabled={updating}
              className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {task.status === 'completed' && canEdit && (
        <button
          onClick={() => handleStatusChange('pending')}
          disabled={updating}
          className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reopen
        </button>
      )}
    </div>
  )
}
