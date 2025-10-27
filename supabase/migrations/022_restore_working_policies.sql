-- Restore all working RLS policies from migration 018
-- This fixes the app after migration 021 dropped all policies
-- Includes the add_conversation_participant function from migration 016

-- Ensure the add_conversation_participant function exists
CREATE OR REPLACE FUNCTION add_conversation_participant(
  p_conversation_id uuid,
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- This bypasses RLS for the function
SET search_path = public
AS $$
BEGIN
  -- Check if caller is already a participant OR if this is the first participant
  -- (conversation creator can add the first participant)
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = auth.uid()
  ) AND EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
  ) THEN
    RAISE EXCEPTION 'Not authorized to add participants to this conversation';
  END IF;
  
  -- Check if user exists
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User does not exist';
  END IF;
  
  -- Add the new participant (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (p_conversation_id, p_user_id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION add_conversation_participant(uuid, uuid) TO authenticated;

-- Drop any existing policies to start clean
DROP POLICY IF EXISTS "users_select_all" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;

DROP POLICY IF EXISTS "conversations_select_own" ON conversations;
DROP POLICY IF EXISTS "conversations_insert_authenticated" ON conversations;
DROP POLICY IF EXISTS "conversations_insert_debug" ON conversations;
DROP POLICY IF EXISTS "conversations_update_own" ON conversations;

DROP POLICY IF EXISTS "conversation_participants_select_own" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert_own" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_update_own" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_delete_own" ON conversation_participants;

DROP POLICY IF EXISTS "messages_select_own_conversations" ON messages;
DROP POLICY IF EXISTS "messages_insert_own_conversations" ON messages;
DROP POLICY IF EXISTS "messages_update_own_with_restrictions" ON messages;

DROP POLICY IF EXISTS "message_translations_select_own_conversations" ON message_translations;

DROP POLICY IF EXISTS "message_statuses_select_own_conversations" ON message_statuses;
DROP POLICY IF EXISTS "message_statuses_insert_own" ON message_statuses;
DROP POLICY IF EXISTS "message_statuses_update_own" ON message_statuses;

DROP POLICY IF EXISTS "ai_annotations_select_own_conversations" ON ai_annotations;

-- Recreate all policies with TO authenticated

-- Users table policies (CRITICAL - these were missing!)
CREATE POLICY "users_select_all"
ON users FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "users_update_own"
ON users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "users_insert_own"
ON users FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Conversations table policies
CREATE POLICY "conversations_select_own"
ON conversations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "conversations_insert_authenticated"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "conversations_update_own"
ON conversations FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Conversation participants table policies
CREATE POLICY "conversation_participants_select_own"
ON conversation_participants FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "conversation_participants_insert_own"
ON conversation_participants FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "conversation_participants_update_own"
ON conversation_participants FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "conversation_participants_delete_own"
ON conversation_participants FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Messages table policies
CREATE POLICY "messages_select_own_conversations"
ON messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "messages_insert_own_conversations"
ON messages FOR INSERT
TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "messages_update_own_with_restrictions"
ON messages FOR UPDATE
TO authenticated
USING (
  auth.uid() = sender_id 
  AND message_type = 'text'
  AND (NOW() - created_at) < INTERVAL '5 minutes'
  AND NOT EXISTS (
    SELECT 1 FROM message_translations 
    WHERE message_translations.message_id = messages.id
  )
)
WITH CHECK (
  auth.uid() = sender_id 
  AND message_type = 'text'
  AND (NOW() - created_at) < INTERVAL '5 minutes'
  AND NOT EXISTS (
    SELECT 1 FROM message_translations 
    WHERE message_translations.message_id = messages.id
  )
);

-- Message translations table policies
CREATE POLICY "message_translations_select_own_conversations"
ON message_translations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_translations.message_id
    AND cp.user_id = auth.uid()
  )
);

-- Message statuses table policies
CREATE POLICY "message_statuses_select_own_conversations"
ON message_statuses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_statuses.message_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "message_statuses_insert_own"
ON message_statuses FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "message_statuses_update_own"
ON message_statuses FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- AI annotations table policies
CREATE POLICY "ai_annotations_select_own_conversations"
ON ai_annotations FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = ai_annotations.message_id
    AND cp.user_id = auth.uid()
  )
);

-- Keep the logging function for future debugging
CREATE OR REPLACE FUNCTION log_rls_check(
  table_name text,
  operation text,
  step_number int,
  description text
) RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE NOTICE 'RLS_LOG: Step % - % on % - % (auth.uid: %)', 
    step_number, operation, table_name, description, auth.uid();
END;
$$;

-- Verify policies were created
SELECT 'All RLS policies restored successfully. App should now work properly.';
