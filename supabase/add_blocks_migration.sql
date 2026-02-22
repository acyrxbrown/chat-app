-- Blocked users feature: users can block contacts; blocked users cannot send messages to the blocker
-- Run this migration after schema.sql

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  blocker_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker_id ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id ON blocked_users(blocked_id);

-- Enable RLS
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own block list
CREATE POLICY "Users can view their block list"
  ON blocked_users FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can block users"
  ON blocked_users FOR INSERT
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock users"
  ON blocked_users FOR DELETE
  USING (auth.uid() = blocker_id);

-- SECURITY DEFINER function: returns true if blocker has blocked blocked_user
CREATE OR REPLACE FUNCTION public.is_user_blocked(blocker_uuid UUID, blocked_user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM blocked_users
    WHERE blocker_id = blocker_uuid
    AND blocked_id = blocked_user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if sender is blocked by any participant in the chat (used in messages policy)
CREATE OR REPLACE FUNCTION public.is_sender_blocked_by_any_participant(chat_uuid UUID, sender_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM chat_participants cp
    WHERE cp.chat_id = chat_uuid
    AND cp.user_id != sender_uuid
    AND public.is_user_blocked(cp.user_id, sender_uuid)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing message insert policy and replace with block-aware version
DROP POLICY IF EXISTS "Users can send messages to their chats" ON messages;

CREATE POLICY "Users can send messages to their chats (unless blocked)"
  ON messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.chat_id = messages.chat_id
      AND chat_participants.user_id = auth.uid()
    )
    AND NOT public.is_sender_blocked_by_any_participant(messages.chat_id, auth.uid())
  );

-- Update notification trigger: do not create notifications for participants who blocked the sender
CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  participant RECORD;
  chat_name TEXT;
  sender_name TEXT;
BEGIN
  SELECT name INTO chat_name FROM chats WHERE id = NEW.chat_id;
  SELECT full_name, email INTO sender_name FROM profiles WHERE id = NEW.sender_id;

  -- Create notifications for participants except sender, and except those who blocked the sender
  FOR participant IN
    SELECT cp.user_id FROM chat_participants cp
    WHERE cp.chat_id = NEW.chat_id
    AND cp.user_id != NEW.sender_id
    AND NOT public.is_user_blocked(cp.user_id, NEW.sender_id)
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
