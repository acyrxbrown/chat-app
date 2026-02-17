-- Fix infinite recursion in chat_participants policy
-- Run this script in your Supabase SQL Editor

-- Drop existing problematic policy
DROP POLICY IF EXISTS "Users can view participants of their chats" ON chat_participants;

-- Create function to check if user is participant (bypasses RLS to avoid recursion)
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

-- Recreate the policy using the function to avoid recursion
CREATE POLICY "Users can view participants of their chats"
  ON chat_participants FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_chat_participant(chat_id, auth.uid())
  );

-- Also update the INSERT policy to allow users to add themselves
DROP POLICY IF EXISTS "Users can add participants to their chats" ON chat_participants;

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
