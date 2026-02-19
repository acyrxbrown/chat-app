-- Create AI Assistant user profile
-- This allows AI messages to appear in chats with a proper profile

INSERT INTO profiles (id, email, full_name, avatar_url)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'assistant@ai.local',
  'AI Assistant',
  'https://api.dicebear.com/7.x/bottts/svg?seed=assistant'
)
ON CONFLICT (id) DO NOTHING;

-- Note: You may need to adjust the avatar URL or use a different service
-- The AI user ID is a special UUID that won't conflict with real users
