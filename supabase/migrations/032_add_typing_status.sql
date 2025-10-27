-- Migration: Add typing status tracking
-- Created: 2025-01-27
-- Purpose: Track when users are typing in conversations for real-time typing indicators

-- Create typing_status table
CREATE TABLE IF NOT EXISTS typing_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, conversation_id)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_typing_status_conversation_id ON typing_status(conversation_id);
CREATE INDEX IF NOT EXISTS idx_typing_status_updated_at ON typing_status(updated_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_typing_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_typing_status_updated_at
  BEFORE UPDATE ON typing_status
  FOR EACH ROW
  EXECUTE FUNCTION update_typing_status_updated_at();

-- Enable RLS
ALTER TABLE typing_status ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view typing status in their conversations
CREATE POLICY "typing_status_select_conversation_participants" ON typing_status
  FOR SELECT
  USING (
    conversation_id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = auth.uid()
    )
  );

-- RLS Policy: Users can update their own typing status
CREATE POLICY "typing_status_update_own" ON typing_status
  FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policy: Users can insert their own typing status
CREATE POLICY "typing_status_insert_own" ON typing_status
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create function to set typing status
CREATE OR REPLACE FUNCTION set_typing_status(conversation_uuid UUID, is_typing BOOLEAN)
RETURNS VOID AS $$
BEGIN
  -- Check if user is participant in conversation
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants 
    WHERE conversation_id = conversation_uuid AND user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'User is not a participant in this conversation';
  END IF;

  INSERT INTO typing_status (user_id, conversation_id, is_typing)
  VALUES (auth.uid(), conversation_uuid, is_typing)
  ON CONFLICT (user_id, conversation_id) 
  DO UPDATE SET 
    is_typing = EXCLUDED.is_typing,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION set_typing_status(UUID, BOOLEAN) TO authenticated;

-- Create function to get typing users in a conversation
CREATE OR REPLACE FUNCTION get_conversation_typing_users(conversation_uuid UUID)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  is_typing BOOLEAN,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ts.user_id,
    u.username,
    ts.is_typing,
    ts.updated_at
  FROM typing_status ts
  JOIN users u ON ts.user_id = u.id
  WHERE ts.conversation_id = conversation_uuid
    AND ts.user_id != auth.uid() -- Exclude current user
    AND ts.is_typing = true
    AND ts.updated_at > NOW() - INTERVAL '10 seconds' -- Only recent typing
  ORDER BY ts.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_conversation_typing_users(UUID) TO authenticated;

-- Create function to clean up old typing statuses (run periodically)
CREATE OR REPLACE FUNCTION cleanup_old_typing_statuses()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM typing_status 
  WHERE updated_at < NOW() - INTERVAL '30 seconds';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_old_typing_statuses() TO authenticated;
