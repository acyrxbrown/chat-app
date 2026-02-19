-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create chats table (supports both one-to-one and group chats)
CREATE TABLE IF NOT EXISTS chats (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT, -- NULL for one-to-one chats, set for group chats
  type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create chat_participants table (junction table)
CREATE TABLE IF NOT EXISTS chat_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(chat_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'gif', 'sticker', 'file', 'image')),
  file_url TEXT,
  file_name TEXT,
  file_size BIGINT,
  file_type TEXT,
  reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- AI message topics (for highlights and clustering)
CREATE TABLE IF NOT EXISTS message_topics (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE NOT NULL,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  topic TEXT NOT NULL CHECK (topic IN ('football', 'food', 'gaming', 'event', 'random')),
  is_plan BOOLEAN DEFAULT FALSE,
  plan_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- AI channel / subgroup suggestions
CREATE TABLE IF NOT EXISTS channel_suggestions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE NOT NULL,
  topic TEXT NOT NULL,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('topic', 'plan', 'subgroup')),
  message_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'ignored')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('message', 'mention', 'reply')),
  title TEXT NOT NULL,
  body TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_participants_chat_id ON chat_participants(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_participants_user_id ON chat_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at);
CREATE INDEX IF NOT EXISTS idx_message_topics_chat_id ON message_topics(chat_id);
CREATE INDEX IF NOT EXISTS idx_message_topics_topic ON message_topics(topic);
CREATE INDEX IF NOT EXISTS idx_channel_suggestions_chat_id ON channel_suggestions(chat_id);
CREATE INDEX IF NOT EXISTS idx_channel_suggestions_status ON channel_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Chats policies
CREATE POLICY "Users can view chats they participate in"
  ON chats FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = chats.id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create chats"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = created_by);

-- Function to check if user is participant (bypasses RLS to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_chat_participant(chat_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM chat_participants
    WHERE chat_id = chat_uuid
    AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Chat participants policies
CREATE POLICY "Users can view participants of their chats"
  ON chat_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_chat_participant(chat_id, auth.uid())
  );

CREATE POLICY "Users can add participants to their chats"
  ON chat_participants FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = chat_participants.chat_id
      AND chats.created_by = auth.uid()
    )
  );

-- Messages policies
CREATE POLICY "Users can view messages in their chats"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = messages.chat_id
      AND chat_participants.user_id = auth.uid()
    )
  );

-- Message topics policies
CREATE POLICY "Users can view message topics in their chats"
  ON message_topics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = message_topics.chat_id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert message topics for their chats"
  ON message_topics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = message_topics.chat_id
      AND chat_participants.user_id = auth.uid()
    )
  );

-- Channel suggestions policies
CREATE POLICY "Users can view channel suggestions in their chats"
  ON channel_suggestions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = channel_suggestions.chat_id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update channel suggestions in their chats"
  ON channel_suggestions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = channel_suggestions.chat_id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their chats"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = messages.chat_id
      AND chat_participants.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own messages"
  ON messages FOR UPDATE
  USING (
    auth.uid() = sender_id
    AND deleted_at IS NULL
  )
  WITH CHECK (
    auth.uid() = sender_id
  );

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to create notification on new message
CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  participant RECORD;
  chat_name TEXT;
  sender_name TEXT;
BEGIN
  -- Get chat name and sender name
  SELECT name INTO chat_name FROM chats WHERE id = NEW.chat_id;
  SELECT full_name, email INTO sender_name FROM profiles WHERE id = NEW.sender_id;
  
  -- Create notifications for all participants except sender
  FOR participant IN 
    SELECT user_id FROM chat_participants 
    WHERE chat_id = NEW.chat_id AND user_id != NEW.sender_id
  LOOP
    INSERT INTO notifications (user_id, chat_id, message_id, type, title, body)
    VALUES (
      participant.user_id,
      NEW.chat_id,
      NEW.id,
      'message',
      COALESCE(chat_name, COALESCE(sender_name, 'Someone')),
      CASE 
        WHEN NEW.message_type = 'gif' THEN 'Sent a GIF'
        WHEN NEW.message_type = 'sticker' THEN 'Sent a sticker'
        WHEN NEW.message_type = 'file' THEN COALESCE(NEW.file_name, 'Sent a file')
        WHEN NEW.message_type = 'image' THEN 'Sent an image'
        ELSE LEFT(NEW.content, 50)
      END
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create notifications
DROP TRIGGER IF EXISTS on_message_created ON messages;
CREATE TRIGGER on_message_created
  AFTER INSERT ON messages
  FOR EACH ROW EXECUTE FUNCTION public.create_message_notification();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
