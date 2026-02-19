import { supabase } from './supabase'
import { getAIResponse } from './ai'
import type { Message } from './types'

type Topic = 'football' | 'food' | 'gaming' | 'event' | 'random'

interface MessageTopicResult {
  topic: Topic
  is_plan: boolean
  plan_summary?: string
}

export async function classifyMessageTopic(message: Message): Promise<MessageTopicResult | null> {
  try {
    const prompt = `
You are classifying a single chat message into a simple topic and optionally detecting if it contains a concrete future plan.

Allowed topics:
- football
- food
- gaming
- event
- random (anything else)

Return strict JSON ONLY in this shape:
{
  "topic": "football" | "food" | "gaming" | "event" | "random",
  "is_plan": boolean,
  "plan_summary": string | null
}

Message:
"${message.content}"
`

    const raw = await getAIResponse(prompt)
    const jsonStart = raw.indexOf('{')
    const jsonEnd = raw.lastIndexOf('}')
    if (jsonStart === -1 || jsonEnd === -1) return null
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1))

    const topic: Topic =
      parsed.topic === 'football' ||
      parsed.topic === 'food' ||
      parsed.topic === 'gaming' ||
      parsed.topic === 'event'
        ? parsed.topic
        : 'random'

    return {
      topic,
      is_plan: !!parsed.is_plan,
      plan_summary: parsed.plan_summary || undefined,
    }
  } catch (err) {
    console.error('Error classifying message topic:', err)
    return null
  }
}

export async function storeMessageTopicAndMaybeSuggestChannel(
  message: Message,
  chatId: string,
  threshold: number = 5
) {
  const classification = await classifyMessageTopic(message)
  if (!classification) return

  // Store topic for this message
  const { error: insertError } = await supabase.from('message_topics').insert({
    message_id: message.id,
    chat_id: chatId,
    topic: classification.topic,
    is_plan: classification.is_plan,
    plan_summary: classification.plan_summary || null,
  })
  if (insertError) {
    console.error('Error inserting message topic:', insertError)
    return
  }

  // Check how many messages in this chat share this topic
  const { data: countRows, error: countError } = await supabase
    .from('message_topics')
    .select('id', { count: 'exact', head: true })
    .eq('chat_id', chatId)
    .eq('topic', classification.topic)

  if (countError) {
    console.error('Error counting topic messages:', countError)
    return
  }

  const total = countRows?.length ?? 0

  if (total >= threshold) {
    // Upsert a pending channel suggestion for this topic
    const { error: suggestError } = await supabase.from('channel_suggestions').upsert(
      {
        chat_id: chatId,
        topic: classification.topic,
        suggestion_type: classification.is_plan ? 'plan' : 'topic',
        message_count: total,
        status: 'pending',
      },
      {
        onConflict: 'chat_id,topic',
      }
    )

    if (suggestError) {
      console.error('Error upserting channel suggestion:', suggestError)
    }
  }
}

