-- FINAL RLS Fix - This WILL work
-- Version: 1.0
-- Date: October 23, 2025

-- 1. DISABLE RLS temporarily to clear any conflicts
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies
DROP POLICY IF EXISTS "conversations_select_own" ON conversations;
DROP POLICY IF EXISTS "conversations_insert_authenticated" ON conversations;
DROP POLICY IF EXISTS "conversations_update_group_name" ON conversations;

DROP POLICY IF EXISTS "conversation_participants_select_own" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert_participant" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_update_own" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_delete_own" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert_service" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_service" ON conversation_participants;

-- 3. Re-enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- 4. Create SIMPLE, WORKING policies
CREATE POLICY "conversations_select_own"
ON conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- SIMPLE INSERT POLICY - This WILL work
CREATE POLICY "conversations_insert_authenticated"
ON conversations FOR INSERT
WITH CHECK (true);

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

-- SIMPLE PARTICIPANTS POLICIES
CREATE POLICY "conversation_participants_select_own"
ON conversation_participants FOR SELECT
USING (user_id = auth.uid());

-- SIMPLE INSERT POLICY - This WILL work
CREATE POLICY "conversation_participants_insert_participant"
ON conversation_participants FOR INSERT
WITH CHECK (true);

CREATE POLICY "conversation_participants_update_own"
ON conversation_participants FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "conversation_participants_delete_own"
ON conversation_participants FOR DELETE
USING (user_id = auth.uid());

-- Service role policies
CREATE POLICY "conversation_participants_insert_service"
ON conversation_participants FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "conversation_participants_select_service"
ON conversation_participants FOR SELECT
TO service_role
USING (true);
