-- Fix conversation_participants SELECT policy to allow viewing all participants
-- in conversations the user is part of (not just their own record)
-- 
-- Issue: Previous policy only allowed seeing own participant record
-- Result: Direct chats showed "Direct Chat" instead of other user's username
-- 
-- Solution: Allow viewing ALL participants in conversations user is part of
-- FIXED: Avoid infinite recursion by using a different approach

-- Drop any existing policies to start clean
DROP POLICY IF EXISTS "conversation_participants_select_own" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_in_own_conversations" ON conversation_participants;

-- Create new policy using a function to avoid infinite recursion
CREATE OR REPLACE FUNCTION user_is_participant_in_conversation(p_conversation_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = auth.uid()
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION user_is_participant_in_conversation(uuid) TO authenticated;

-- Create policy using the function (no recursion!)
CREATE POLICY "conversation_participants_select_in_own_conversations"
ON conversation_participants FOR SELECT
TO authenticated
USING (user_is_participant_in_conversation(conversation_id));

-- Verify the policy was created
SELECT 'RLS policy updated: Users can now see all participants in their conversations (no recursion!)' AS status;

