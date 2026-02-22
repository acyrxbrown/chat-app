-- End-to-end encryption (Signal-style): only sender and recipient can read messages.
-- Uses identity keys + ECDH; message body stored as ciphertext when encrypted.
-- Run after schema.sql and add_blocks_migration.sql.

-- Identity public keys (private key stays on client only)
CREATE TABLE IF NOT EXISTS user_identity_keys (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  public_key TEXT NOT NULL,
  key_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_identity_keys_user_id ON user_identity_keys(user_id);

ALTER TABLE user_identity_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view any identity public key"
  ON user_identity_keys FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own identity key"
  ON user_identity_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own identity key"
  ON user_identity_keys FOR UPDATE
  USING (auth.uid() = user_id);

-- Add E2EE columns to messages (content remains for backwards compatibility / unencrypted)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS encrypted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ciphertext TEXT,
  ADD COLUMN IF NOT EXISTS iv TEXT;

-- Notification trigger: do not expose encrypted message body
CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  participant RECORD;
  chat_name TEXT;
  sender_name TEXT;
  notif_body TEXT;
BEGIN
  SELECT name INTO chat_name FROM chats WHERE id = NEW.chat_id;
  SELECT full_name, email INTO sender_name FROM profiles WHERE id = NEW.sender_id;

  IF NEW.encrypted THEN
    notif_body := 'Encrypted message';
  ELSE
    notif_body := CASE
      WHEN NEW.message_type = 'gif' THEN 'Sent a GIF'
      WHEN NEW.message_type = 'sticker' THEN 'Sent a sticker'
      WHEN NEW.message_type = 'file' THEN COALESCE(NEW.file_name, 'Sent a file')
      WHEN NEW.message_type = 'image' THEN 'Sent an image'
      ELSE LEFT(NEW.content, 50)
    END;
  END IF;

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
      notif_body
    );
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
