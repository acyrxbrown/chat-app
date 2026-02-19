'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ChannelSuggestion, MessageTopic } from '@/lib/types'

interface AIHighlightsPanelProps {
  chatId: string
}

export default function AIHighlightsPanel({ chatId }: AIHighlightsPanelProps) {
  const [topics, setTopics] = useState<MessageTopic[]>([])
  const [suggestions, setSuggestions] = useState<ChannelSuggestion[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        setLoading(true)
        const [topicsRes, suggRes] = await Promise.all([
          supabase
            .from('message_topics')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: false })
            .limit(200),
          supabase
            .from('channel_suggestions')
            .select('*')
            .eq('chat_id', chatId)
            .order('created_at', { ascending: false })
            .limit(20),
        ])

        if (!mounted) return
        setTopics((topicsRes.data as MessageTopic[]) || [])
        setSuggestions((suggRes.data as ChannelSuggestion[]) || [])
      } catch (err) {
        console.error('Error loading AI highlights:', err)
      } finally {
        if (mounted) setLoading(false)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [chatId])

  if (loading || topics.length === 0) {
    return null
  }

  const topicCounts: Record<string, number> = {}
  topics.forEach((t) => {
    topicCounts[t.topic] = (topicCounts[t.topic] || 0) + 1
  })

  const trendingTopic = Object.entries(topicCounts).sort((a, b) => b[1] - a[1])[0]

  const upcomingPlan = topics.find((t) => t.is_plan && t.plan_summary)

  return (
    <div className="fixed left-20 bottom-4 z-20 max-w-xs">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 text-xs space-y-2">
        <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-100 mb-1">
          AI Highlights
        </p>
        {trendingTopic && (
          <div>
            <p className="font-semibold text-red-500 text-[11px]">🔥 Trending topic</p>
            <p className="text-[11px] text-gray-800 dark:text-gray-200">
              {trendingTopic[0]} &mdash; {trendingTopic[1]} messages
            </p>
          </div>
        )}
        {upcomingPlan && (
          <div>
            <p className="font-semibold text-blue-500 text-[11px]">📅 Upcoming plan</p>
            <p className="text-[11px] text-gray-800 dark:text-gray-200">
              {upcomingPlan.plan_summary}
            </p>
          </div>
        )}
        {suggestions.length > 0 && (
          <div>
            <p className="font-semibold text-green-500 text-[11px]">🧑‍🤝‍🧑 New subgroups / channels</p>
            <ul className="list-disc list-inside space-y-1">
              {suggestions.map((s) => (
                <li key={s.id} className="text-[11px] text-gray-800 dark:text-gray-200">
                  #{s.topic} ({s.message_count} msgs) &mdash; {s.status}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

