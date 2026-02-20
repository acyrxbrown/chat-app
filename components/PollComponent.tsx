'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Poll, PollOption, PollVote, Profile } from '@/lib/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'

interface PollComponentProps {
  poll: Poll
  userId: string
  chatId: string
}

export default function PollComponent({ poll, userId, chatId }: PollComponentProps) {
  const queryClient = useQueryClient()
  const [voting, setVoting] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<string[]>([])

  // Fetch poll options and votes
  const { data: pollData, isLoading } = useQuery({
    queryKey: ['poll', poll.id],
    queryFn: async () => {
      const [optionsRes, votesRes] = await Promise.all([
        supabase
          .from('poll_options')
          .select('*')
          .eq('poll_id', poll.id)
          .order('order_index', { ascending: true }),
        supabase
          .from('poll_votes')
          .select('*')
          .eq('poll_id', poll.id)
      ])

      if (optionsRes.error) throw optionsRes.error
      if (votesRes.error) throw votesRes.error

      const options = optionsRes.data as PollOption[]
      const votes = votesRes.data as PollVote[]

      // Calculate vote counts
      const voteCounts: Record<string, number> = {}
      const userVotes: string[] = []
      
      votes.forEach((vote) => {
        voteCounts[vote.option_id] = (voteCounts[vote.option_id] || 0) + 1
        if (vote.user_id === userId) {
          userVotes.push(vote.option_id)
        }
      })

      return { options, votes, voteCounts, userVotes }
    },
    enabled: !!poll.id,
  })

  useEffect(() => {
    if (pollData?.userVotes) {
      setSelectedOptions(pollData.userVotes)
    }
  }, [pollData?.userVotes])

  const handleVote = async () => {
    if (selectedOptions.length === 0 || voting) return

    setVoting(true)
    try {
      // Remove existing votes if not allowing multiple
      if (!poll.allow_multiple && pollData?.userVotes.length) {
        await supabase
          .from('poll_votes')
          .delete()
          .eq('poll_id', poll.id)
          .eq('user_id', userId)
      }

      // Add new votes
      const votesToAdd = selectedOptions
        .filter(optId => !pollData?.userVotes.includes(optId))
        .map(optionId => ({
          poll_id: poll.id,
          option_id: optionId,
          user_id: userId,
        }))

      if (votesToAdd.length > 0) {
        const { error } = await supabase
          .from('poll_votes')
          .insert(votesToAdd)

        if (error) throw error
      }

      // Remove unselected votes
      const votesToRemove = pollData?.userVotes.filter(
        optId => !selectedOptions.includes(optId)
      ) || []

      if (votesToRemove.length > 0) {
        await supabase
          .from('poll_votes')
          .delete()
          .eq('poll_id', poll.id)
          .eq('user_id', userId)
          .in('option_id', votesToRemove)
      }

      queryClient.invalidateQueries({ queryKey: ['poll', poll.id] })
    } catch (error) {
      console.error('Error voting:', error)
      alert('Failed to vote. Please try again.')
    } finally {
      setVoting(false)
    }
  }

  const toggleOption = (optionId: string) => {
    if (poll.status === 'closed') return

    if (poll.allow_multiple) {
      setSelectedOptions(prev =>
        prev.includes(optionId)
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      )
    } else {
      setSelectedOptions([optionId])
    }
  }

  const totalVotes = pollData?.votes.length || 0
  const hasVoted = (pollData?.userVotes.length || 0) > 0
  const isExpired: boolean = poll.expires_at ? new Date(poll.expires_at) < new Date() : false

  if (isLoading) {
    return (
      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 animate-pulse">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mb-3"></div>
        <div className="space-y-2">
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
            {poll.question}
          </h3>
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span>{totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}</span>
            {poll.allow_multiple && <span>• Multiple choice</span>}
            {poll.expires_at && (
              <span>
                • {isExpired ? 'Expired' : `Expires ${new Date(poll.expires_at).toLocaleDateString()}`}
              </span>
            )}
            {poll.status === 'closed' && <span>• Closed</span>}
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        {pollData?.options.map((option) => {
          const voteCount = pollData.voteCounts[option.id] || 0
          const percentage = totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0
          const isSelected = selectedOptions.includes(option.id)
          const isUserVote = pollData.userVotes.includes(option.id)

          return (
            <div key={option.id} className="relative">
              <button
                onClick={() => toggleOption(option.id)}
                disabled={poll.status === 'closed' || isExpired}
                className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-500'
                } ${poll.status === 'closed' || isExpired ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {option.option_text}
                  </span>
                  {isUserVote && (
                    <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                      Your vote
                    </span>
                  )}
                </div>
                {hasVoted && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>{voteCount} {voteCount === 1 ? 'vote' : 'votes'}</span>
                      <span>{percentage.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          isUserVote
                            ? 'bg-blue-500'
                            : 'bg-gray-400 dark:bg-gray-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )}
              </button>
            </div>
          )
        })}
      </div>

      {poll.status === 'active' && !isExpired && (
        <div className="flex items-center gap-2">
          {!hasVoted && (
            <button
              onClick={handleVote}
              disabled={selectedOptions.length === 0 || voting}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {voting ? 'Voting...' : 'Vote'}
            </button>
          )}
          {hasVoted && selectedOptions.length > 0 && selectedOptions.some(id => !pollData?.userVotes.includes(id)) && (
            <button
              onClick={handleVote}
              disabled={voting}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              {voting ? 'Updating...' : 'Update Vote'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
