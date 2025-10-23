-- Comprehensive RLS Policy Fix
-- Fix ALL policy conflicts for conversation creation
-- Version: 1.0
-- Date: October 23, 2025

-- 1. Drop ALL existing policies on conversations table
DROP POLICY IF EXISTS "conversations_select_own" ON conversations;
DROP POLICY IF EXISTS "conversations_insert_authenticated" ON conversations;
DROP POLICY IF EXISTS "conversations_update_group_name" ON conversations;

-- 2. Drop ALL existing policies on conversation_participants table
DROP POLICY IF EXISTS "conversation_participants_select_own" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert_participant" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_update_own" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_delete_own" ON conversation_participants;

-- 3. Recreate conversations policies (FIXED)
CREATE POLICY "conversations_select_own"
ON conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "conversations_insert_authenticated"
ON conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

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

-- 4. Recreate conversation_participants policies (FIXED)
CREATE POLICY "conversation_participants_select_own"
ON conversation_participants FOR SELECT
USING (user_id = auth.uid());

-- FIXED: Allow authenticated users to insert ANY participants
CREATE POLICY "conversation_participants_insert_participant"
ON conversation_participants FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "conversation_participants_update_own"
ON conversation_participants FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "conversation_participants_delete_own"
ON conversation_participants FOR DELETE
USING (user_id = auth.uid());

-- 5. Add service role policies for backend operations
CREATE POLICY "conversation_participants_insert_service"
ON conversation_participants FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "conversation_participants_select_service"
ON conversation_participants FOR SELECT
TO service_role
USING (true);

-- 6. Ensure RLS is enabled on all tables
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_annotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
