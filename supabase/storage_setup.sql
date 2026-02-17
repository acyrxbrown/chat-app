-- Setup Supabase Storage for file uploads
-- Run this in your Supabase SQL Editor

-- Create storage bucket for chat files
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for chat-files bucket
CREATE POLICY "Users can upload files to their chats"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view files in their chats"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-files'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM chat_participants cp
      JOIN chats c ON c.id = cp.chat_id
      WHERE cp.user_id = auth.uid()
      AND c.id::text = (storage.foldername(name))[2]
    )
  )
);

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-files'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
