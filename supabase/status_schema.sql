-- Status/Stories schema
-- Run this in your Supabase SQL Editor

-- Create status table
CREATE TABLE IF NOT EXISTS status (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  caption TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create status_views table to track who viewed which status
CREATE TABLE IF NOT EXISTS status_views (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  status_id UUID REFERENCES status(id) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(status_id, viewer_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_status_user_id ON status(user_id);
CREATE INDEX IF NOT EXISTS idx_status_expires_at ON status(expires_at);
CREATE INDEX IF NOT EXISTS idx_status_views_status_id ON status_views(status_id);
CREATE INDEX IF NOT EXISTS idx_status_views_viewer_id ON status_views(viewer_id);

-- Enable RLS
ALTER TABLE status ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_views ENABLE ROW LEVEL SECURITY;

-- Status policies
CREATE POLICY "Users can view status from their contacts"
  ON status FOR SELECT
  USING (
    expires_at > NOW()
    AND (
      user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM chat_participants cp1
        JOIN chat_participants cp2 ON cp1.chat_id = cp2.chat_id
        WHERE cp1.user_id = status.user_id
        AND cp2.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create their own status"
  ON status FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own status"
  ON status FOR DELETE
  USING (auth.uid() = user_id);

-- Status views policies
CREATE POLICY "Users can view status view records"
  ON status_views FOR SELECT
  USING (
    viewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM status
      WHERE status.id = status_views.status_id
      AND status.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create status views"
  ON status_views FOR INSERT
  WITH CHECK (auth.uid() = viewer_id);
