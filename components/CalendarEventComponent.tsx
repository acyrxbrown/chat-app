'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CalendarEvent, CalendarEventParticipant, Profile } from '@/lib/types'
import { useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'

interface CalendarEventComponentProps {
  event: CalendarEvent
  userId: string
  chatId: string
  participants: Profile[]
}

export default function CalendarEventComponent({
  event,
  userId,
  chatId,
  participants,
}: CalendarEventComponentProps) {
  const queryClient = useQueryClient()
  const [updating, setUpdating] = useState(false)
  const [eventParticipants, setEventParticipants] = useState<CalendarEventParticipant[]>([])

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        // First get participant records
        const { data: participantsData, error } = await supabase
          .from('calendar_event_participants')
          .select('*')
          .eq('event_id', event.id)
        
        if (error) throw error
        
        if (participantsData) {
          setEventParticipants(participantsData as CalendarEventParticipant[])
        }
      } catch (error) {
        console.error('Error fetching event participants:', error)
      }
    }

    fetchParticipants()
  }, [event.id])

  const isCreator = event.created_by === userId
  const userResponse = eventParticipants.find(p => p.user_id === userId)
  const responseStatus = userResponse?.response_status || 'pending'

  const handleResponse = async (status: CalendarEventParticipant['response_status']) => {
    if (updating) return

    setUpdating(true)
    try {
      if (userResponse) {
        // Update existing response
        const { error } = await supabase
          .from('calendar_event_participants')
          .update({ response_status: status })
          .eq('id', userResponse.id)

        if (error) throw error
      } else {
        // Create new response
        const { error } = await supabase
          .from('calendar_event_participants')
          .insert({
            event_id: event.id,
            user_id: userId,
            response_status: status,
          })

        if (error) throw error
      }

      queryClient.invalidateQueries({ queryKey: ['calendar-events', chatId] })
    } catch (error) {
      console.error('Error updating event response:', error)
      alert('Failed to update response. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const getResponseColor = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
      case 'declined':
        return 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
      case 'tentative':
        return 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
    }
  }

  const startDate = new Date(event.start_time)
  const endDate = event.end_time ? new Date(event.end_time) : null
  const isPast = startDate < new Date()

  return (
    <div className={`bg-gray-100 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 ${isPast ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {event.title}
          </h3>
          {event.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {event.description}
            </p>
          )}
        </div>
        {userResponse && (
          <span className={`px-2 py-1 text-xs font-medium rounded ${getResponseColor(responseStatus)}`}>
            {responseStatus}
          </span>
        )}
      </div>

      <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400 mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>
            {event.is_all_day
              ? format(startDate, 'MMM d, yyyy')
              : `${format(startDate, 'MMM d, yyyy h:mm a')}${endDate ? ` - ${format(endDate, 'h:mm a')}` : ''}`}
          </span>
          {event.is_all_day && <span className="text-xs">(All day)</span>}
        </div>
        {event.location && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{event.location}</span>
          </div>
        )}
        {eventParticipants.length > 0 && (
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span>
              {eventParticipants.filter(p => p.response_status === 'accepted').length} going
              {eventParticipants.filter(p => p.response_status === 'declined').length > 0 && 
                `, ${eventParticipants.filter(p => p.response_status === 'declined').length} declined`}
            </span>
          </div>
        )}
      </div>

      {!isPast && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleResponse('accepted')}
            disabled={updating || responseStatus === 'accepted'}
            className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Accept
          </button>
          <button
            onClick={() => handleResponse('tentative')}
            disabled={updating || responseStatus === 'tentative'}
            className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Maybe
          </button>
          <button
            onClick={() => handleResponse('declined')}
            disabled={updating || responseStatus === 'declined'}
            className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Decline
          </button>
        </div>
      )}
    </div>
  )
}
