-- Migration to add reply_to field to messages table
-- Run this script in your Supabase SQL Editor if you already have the messages table

ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS reply_to UUID REFERENCES messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages(reply_to);
