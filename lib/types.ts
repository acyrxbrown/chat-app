export interface Profile {
  id: string
  email: string | null
  full_name: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface Chat {
  id: string
  name: string | null
  type: 'direct' | 'group'
  created_by: string
  created_at: string
  updated_at: string
}

export interface ChatParticipant {
  id: string
  chat_id: string
  user_id: string
  joined_at: string
  profile?: Profile
}

export interface Message {
  id: string
  chat_id: string
  sender_id: string
  content: string
  message_type: 'text' | 'gif' | 'sticker' | 'file' | 'image'
  file_url?: string | null
  file_name?: string | null
  file_size?: number | null
  file_type?: string | null
  reply_to: string | null
  deleted_at?: string | null
  created_at: string
  sender?: Profile
  replied_to_message?: Message
}

export interface Notification {
  id: string
  user_id: string
  chat_id: string | null
  message_id: string | null
  type: 'message' | 'mention' | 'reply'
  title: string
  body: string | null
  read: boolean
  created_at: string
}

export interface ChatWithParticipants extends Chat {
  participants: ChatParticipant[]
  last_message?: Message
}

export interface MessageTopic {
  id: string
  message_id: string
  chat_id: string
  topic: 'football' | 'food' | 'gaming' | 'event' | 'random'
  is_plan: boolean
  plan_summary?: string | null
  created_at: string
}

export interface ChannelSuggestion {
  id: string
  chat_id: string
  topic: string
  suggestion_type: 'topic' | 'plan' | 'subgroup'
  message_count: number
  status: 'pending' | 'accepted' | 'ignored'
  created_at: string
}
