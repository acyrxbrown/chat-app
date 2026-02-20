'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Profile } from '@/lib/types'

interface CreateCalendarEventModalProps {
  isOpen: boolean
  onClose: () => void
  chatId: string
  userId: string
  messageId?: string
  participants: Profile[]
  onEventCreated: () => void
}

export default function CreateCalendarEventModal({
  isOpen,
  onClose,
  chatId,
  userId,
  messageId,
  participants,
  onEventCreated,
}: CreateCalendarEventModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [location, setLocation] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  if (!isOpen) return null

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipants(prev =>
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    )
  }

  const handleCreate = async () => {
    if (!title.trim() || !startTime) {
      alert('Please provide a title and start time')
      return
    }

    setCreating(true)
    try {
      // Create event
      const { data: event, error: eventError } = await supabase
        .from('calendar_events')
        .insert({
          chat_id: chatId,
          message_id: messageId || null,
          created_by: userId,
          title: title.trim(),
          description: description.trim() || null,
          start_time: startTime,
          end_time: endTime || null,
          location: location.trim() || null,
          is_all_day: isAllDay,
        })
        .select()
        .single()

      if (eventError) throw eventError

      // Add creator as accepted participant
      const participantsToAdd = [
        { event_id: event.id, user_id: userId, response_status: 'accepted' },
        ...selectedParticipants.map(userId => ({
          event_id: event.id,
          user_id: userId,
          response_status: 'pending',
        })),
      ]

      if (participantsToAdd.length > 0) {
        const { error: participantsError } = await supabase
          .from('calendar_event_participants')
          .insert(participantsToAdd)

        if (participantsError) throw participantsError
      }

      // Reset form
      setTitle('')
      setDescription('')
      setStartTime('')
      setEndTime('')
      setIsAllDay(false)
      setLocation('')
      setSelectedParticipants([])
      onEventCreated()
      onClose()
    } catch (error) {
      console.error('Error creating calendar event:', error)
      alert('Failed to create event. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Create Calendar Event
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Event title..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Event description..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAllDay"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isAllDay" className="text-sm text-gray-700 dark:text-gray-300">
              All day event
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start {isAllDay ? 'date' : 'time'} *
            </label>
            <input
              type={isAllDay ? 'date' : 'datetime-local'}
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {!isAllDay && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                End time
              </label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Location
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Event location..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Invite participants
            </label>
            <div className="space-y-2 max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2">
              {participants.map((participant) => (
                <label key={participant.id} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedParticipants.includes(participant.id)}
                    onChange={() => toggleParticipant(participant.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {participant.full_name || participant.email}
                  </span>
                </label>
              ))}
            </div>
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
            {creating ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </div>
    </div>
  )
}
