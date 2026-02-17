-- Migration to add new features: file attachments, message types, deletion, and notifications
-- Run this script in your Supabase SQL Editor if you already have the messages table

-- Add new columns to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'gif', 'sticker', 'file', 'image')),
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

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

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to);
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Add delete policy for messages
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;
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
