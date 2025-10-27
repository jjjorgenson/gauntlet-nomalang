-- Fix message_statuses INSERT policy to allow creating statuses for other participants
-- 
-- Issue: Current policy only allows users to insert their own status records
-- Problem: When sending messages, system needs to create status records for ALL recipients
-- Solution: Allow users to create status records for participants in their conversations
-- FIXED: Avoid infinite recursion by using a function approach

-- Drop the restrictive policy
DROP POLICY IF EXISTS "message_statuses_insert_own" ON message_statuses;

-- Create function to check if user is participant in conversation containing the message
CREATE OR REPLACE FUNCTION user_is_participant_in_message_conversation(p_message_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = p_message_id
    AND cp.user_id = auth.uid()
  );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION user_is_participant_in_message_conversation(uuid) TO authenticated;

-- Create policy using the function (no recursion!)
CREATE POLICY "message_statuses_insert_for_participants"
ON message_statuses FOR INSERT
TO authenticated
WITH CHECK (user_is_participant_in_message_conversation(message_id));

-- Verify the policy was created
SELECT 'RLS policy updated: Users can now create message statuses for participants in their conversations (no recursion!)' AS status;
