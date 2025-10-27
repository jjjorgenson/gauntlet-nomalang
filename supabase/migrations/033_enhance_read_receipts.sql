-- Migration: Enhance read receipts for group chats
-- Created: 2025-01-27
-- Purpose: Add read count tracking and group read receipt functionality

-- Add read_count and read_at columns to message_statuses table
ALTER TABLE message_statuses 
ADD COLUMN IF NOT EXISTS read_count INTEGER DEFAULT 0;

ALTER TABLE message_statuses 
ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- Note: Removed trigger-based read count updates to avoid infinite recursion
-- Read counts will be calculated on-demand in the application layer

-- Create function to get message read status for group chats
CREATE OR REPLACE FUNCTION get_message_read_status(message_uuid UUID)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  read_at TIMESTAMP WITH TIME ZONE,
  total_participants INTEGER,
  read_count INTEGER
) AS $$
DECLARE
  conversation_uuid UUID;
BEGIN
  -- Get conversation_id from message
  SELECT conversation_id INTO conversation_uuid
  FROM messages 
  WHERE id = message_uuid;
  
  RETURN QUERY
  SELECT 
    cp.user_id,
    u.username,
    ms.read_at,
    (SELECT COUNT(*) FROM conversation_participants WHERE conversation_id = conversation_uuid) as total_participants,
    (SELECT read_count FROM message_statuses WHERE message_id = message_uuid LIMIT 1) as read_count
  FROM conversation_participants cp
  JOIN users u ON cp.user_id = u.id
  LEFT JOIN message_statuses ms ON ms.message_id = message_uuid AND ms.user_id = cp.user_id
  WHERE cp.conversation_id = conversation_uuid
    AND cp.user_id != auth.uid() -- Exclude current user
  ORDER BY ms.read_at DESC NULLS LAST, u.username;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_message_read_status(UUID) TO authenticated;

-- Create function to get conversation participant count
CREATE OR REPLACE FUNCTION get_conversation_participant_count(conversation_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  participant_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO participant_count
  FROM conversation_participants 
  WHERE conversation_id = conversation_uuid;
  
  RETURN participant_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_conversation_participant_count(UUID) TO authenticated;

-- Note: Read counts will be calculated on-demand rather than stored
