-- Migration: Add user online status tracking
-- Created: 2025-01-27
-- Purpose: Track user online/offline status for real-time presence indicators

-- Create user_online_status table
CREATE TABLE IF NOT EXISTS user_online_status (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_user_online_status_updated_at ON user_online_status(updated_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_online_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_user_online_status_updated_at
  BEFORE UPDATE ON user_online_status
  FOR EACH ROW
  EXECUTE FUNCTION update_user_online_status_updated_at();

-- Enable RLS
ALTER TABLE user_online_status ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view online status of users in their conversations
CREATE POLICY "user_online_status_select_conversation_participants" ON user_online_status
  FOR SELECT
  USING (
    user_id IN (
      SELECT DISTINCT cp.user_id 
      FROM conversation_participants cp
      WHERE cp.conversation_id IN (
        SELECT conversation_id 
        FROM conversation_participants 
        WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policy: Users can update their own online status
CREATE POLICY "user_online_status_update_own" ON user_online_status
  FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policy: Users can insert their own online status
CREATE POLICY "user_online_status_insert_own" ON user_online_status
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create function to set user online status
CREATE OR REPLACE FUNCTION set_user_online_status(is_online BOOLEAN)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_online_status (user_id, is_online, last_seen)
  VALUES (auth.uid(), is_online, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    is_online = EXCLUDED.is_online,
    last_seen = EXCLUDED.last_seen,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_user_online_status(BOOLEAN) TO authenticated;

-- Create function to get online status of conversation participants
CREATE OR REPLACE FUNCTION get_conversation_participants_online_status(conversation_uuid UUID)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  is_online BOOLEAN,
  last_seen TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.username,
    COALESCE(uos.is_online, false) as is_online,
    COALESCE(uos.last_seen, u.created_at) as last_seen
  FROM conversation_participants cp
  JOIN users u ON cp.user_id = u.id
  LEFT JOIN user_online_status uos ON u.id = uos.user_id
  WHERE cp.conversation_id = conversation_uuid
    AND cp.user_id != auth.uid() -- Exclude current user
  ORDER BY uos.is_online DESC, u.username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_conversation_participants_online_status(UUID) TO authenticated;
