-- Final Fix for Conversations RLS Policy
-- This will definitely fix the conversation creation issue
-- Version: 1.0
-- Date: October 23, 2025

-- Drop ALL existing policies on conversations table
DROP POLICY IF EXISTS "conversations_insert_authenticated" ON conversations;
DROP POLICY IF EXISTS "conversations_select_own" ON conversations;
DROP POLICY IF EXISTS "conversations_update_group_name" ON conversations;

-- Create new, working policies
CREATE POLICY "conversations_insert_authenticated"
ON conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "conversations_select_own"
ON conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "conversations_update_group_name"
ON conversations FOR UPDATE
USING (
  type = 'group'
  AND EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);
