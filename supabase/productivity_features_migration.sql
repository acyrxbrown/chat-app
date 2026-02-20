-- Migration to add productivity features: Polls, Tasks, Calendar Events, and Reminders
-- Run this script in your Supabase SQL Editor

-- Create polls table
CREATE TABLE IF NOT EXISTS polls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  question TEXT NOT NULL,
  allow_multiple BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create poll_options table
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_text TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create poll_votes table
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE NOT NULL,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(poll_id, option_id, user_id)
);

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMP WITH TIME ZONE,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create calendar_events table
CREATE TABLE IF NOT EXISTS calendar_events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  location TEXT,
  is_all_day BOOLEAN DEFAULT FALSE,
  recurrence_rule TEXT, -- iCal RRULE format for recurring events
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create calendar_event_participants table (many-to-many relationship)
CREATE TABLE IF NOT EXISTS calendar_event_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES calendar_events(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  response_status TEXT NOT NULL DEFAULT 'pending' CHECK (response_status IN ('pending', 'accepted', 'declined', 'tentative')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(event_id, user_id)
);

-- Create reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL, -- Who the reminder is for
  reminder_text TEXT NOT NULL,
  remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_polls_chat_id ON polls(chat_id);
CREATE INDEX IF NOT EXISTS idx_polls_message_id ON polls(message_id);
CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status);
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON poll_options(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_poll_id ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_user_id ON poll_votes(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_chat_id ON tasks(chat_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_chat_id ON calendar_events(chat_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_event_participants_event_id ON calendar_event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_calendar_event_participants_user_id ON calendar_event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_id ON reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_remind_at ON reminders(remind_at);
CREATE INDEX IF NOT EXISTS idx_reminders_is_completed ON reminders(is_completed);

-- Enable Row Level Security
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Polls policies
CREATE POLICY "Users can view polls in their chats"
  ON polls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = polls.chat_id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create polls in their chats"
  ON polls FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = polls.chat_id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update polls they created"
  ON polls FOR UPDATE
  USING (auth.uid() = created_by);

-- Poll options policies
CREATE POLICY "Users can view poll options for polls in their chats"
  ON poll_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM polls
      JOIN chat_participants ON chat_participants.chat_id = polls.chat_id
      WHERE polls.id = poll_options.poll_id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create poll options for polls they created"
  ON poll_options FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM polls
      WHERE polls.id = poll_options.poll_id
      AND polls.created_by = auth.uid()
    )
  );

-- Poll votes policies
CREATE POLICY "Users can view poll votes in their chats"
  ON poll_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM polls
      JOIN chat_participants ON chat_participants.chat_id = polls.chat_id
      WHERE polls.id = poll_votes.poll_id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can vote on polls in their chats"
  ON poll_votes FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM polls
      JOIN chat_participants ON chat_participants.chat_id = polls.chat_id
      WHERE polls.id = poll_votes.poll_id
      AND chat_participants.user_id = auth.uid()
      AND polls.status = 'active'
    )
  );

CREATE POLICY "Users can update their own votes"
  ON poll_votes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own votes"
  ON poll_votes FOR DELETE
  USING (auth.uid() = user_id);

-- Tasks policies
CREATE POLICY "Users can view tasks in their chats"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = tasks.chat_id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks in their chats"
  ON tasks FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = tasks.chat_id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks they created or are assigned to"
  ON tasks FOR UPDATE
  USING (
    auth.uid() = created_by
    OR auth.uid() = assigned_to
  );

-- Calendar events policies
CREATE POLICY "Users can view calendar events in their chats"
  ON calendar_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = calendar_events.chat_id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create calendar events in their chats"
  ON calendar_events FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = calendar_events.chat_id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update calendar events they created"
  ON calendar_events FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can delete calendar events they created"
  ON calendar_events FOR DELETE
  USING (auth.uid() = created_by);

-- Calendar event participants policies
CREATE POLICY "Users can view calendar event participants"
  ON calendar_event_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM calendar_events
      JOIN chat_participants ON chat_participants.chat_id = calendar_events.chat_id
      WHERE calendar_events.id = calendar_event_participants.event_id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can be added as calendar event participants"
  ON calendar_event_participants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM calendar_events
      JOIN chat_participants ON chat_participants.chat_id = calendar_events.chat_id
      WHERE calendar_events.id = calendar_event_participants.event_id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own calendar event responses"
  ON calendar_event_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- Reminders policies
CREATE POLICY "Users can view their own reminders"
  ON reminders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create reminders for themselves or others in their chats"
  ON reminders FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = reminders.chat_id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own reminders"
  ON reminders FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete reminders they created"
  ON reminders FOR DELETE
  USING (auth.uid() = created_by);

-- Update message_type enum to include new types
ALTER TABLE messages 
DROP CONSTRAINT IF EXISTS messages_message_type_check;

ALTER TABLE messages
ADD CONSTRAINT messages_message_type_check 
CHECK (message_type IN ('text', 'gif', 'sticker', 'file', 'image', 'poll', 'task', 'calendar_event', 'reminder'));
