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
  message_type: 'text' | 'gif' | 'sticker' | 'file' | 'image' | 'poll' | 'task' | 'calendar_event' | 'reminder'
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

// Poll types
export interface Poll {
  id: string
  chat_id: string
  message_id: string
  created_by: string
  question: string
  allow_multiple: boolean
  expires_at?: string | null
  status: 'active' | 'closed'
  created_at: string
  updated_at: string
  creator?: Profile
  options?: PollOption[]
  votes?: PollVote[]
  vote_counts?: Record<string, number>
}

export interface PollOption {
  id: string
  poll_id: string
  option_text: string
  order_index: number
  created_at: string
}

export interface PollVote {
  id: string
  poll_id: string
  option_id: string
  user_id: string
  created_at: string
  user?: Profile
}

// Task types
export interface Task {
  id: string
  chat_id: string
  message_id?: string | null
  created_by: string
  assigned_to?: string | null
  title: string
  description?: string | null
  due_date?: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  completed_at?: string | null
  created_at: string
  updated_at: string
  creator?: Profile
  assignee?: Profile
}

// Calendar event types
export interface CalendarEvent {
  id: string
  chat_id: string
  message_id?: string | null
  created_by: string
  title: string
  description?: string | null
  start_time: string
  end_time?: string | null
  location?: string | null
  is_all_day: boolean
  recurrence_rule?: string | null
  created_at: string
  updated_at: string
  creator?: Profile
  participants?: CalendarEventParticipant[]
}

export interface CalendarEventParticipant {
  id: string
  event_id: string
  user_id: string
  response_status: 'pending' | 'accepted' | 'declined' | 'tentative'
  created_at: string
  user?: Profile
}

// Reminder types
export interface Reminder {
  id: string
  chat_id: string
  message_id: string
  created_by: string
  user_id: string
  reminder_text: string
  remind_at: string
  is_completed: boolean
  completed_at?: string | null
  created_at: string
  creator?: Profile
  user?: Profile
  message?: Message
}
