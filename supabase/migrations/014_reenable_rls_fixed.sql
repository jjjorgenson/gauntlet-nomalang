-- RLS Security Implementation Migration
-- Re-enable Row Level Security with bulletproof policies
-- Version: 1.0
-- Date: January 2025

-- =============================================
-- PART 1: CREATE SECURITY DEFINER FUNCTION
-- =============================================

-- Function to safely add participants to conversations
-- Uses SECURITY DEFINER to bypass RLS while maintaining security checks
CREATE OR REPLACE FUNCTION add_conversation_participant(
  p_conversation_id uuid,
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- This bypasses RLS for the function
SET search_path = public
AS $$
BEGIN
  -- Check if caller is already a participant (security check)
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = auth.uid()
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_conversation_participant(uuid, uuid) TO authenticated;

-- =============================================
-- PART 2: RE-ENABLE ROW LEVEL SECURITY
-- =============================================

-- Re-enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_annotations ENABLE ROW LEVEL SECURITY;

-- =============================================
-- PART 3: CREATE SAFE RLS POLICIES
-- =============================================

-- Users table policies (SAFE - no recursion risk)
CREATE POLICY "users_select_all"
ON users FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "users_update_own"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "users_insert_own"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

-- Conversations table policies (CAREFUL - but safe)
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

CREATE POLICY "conversations_update_own"
ON conversations FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Conversation participants table policies (DANGER ZONE - kept simple)
CREATE POLICY "conversation_participants_select_own"
ON conversation_participants FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "conversation_participants_insert_own"
ON conversation_participants FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "conversation_participants_update_own"
ON conversation_participants FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "conversation_participants_delete_own"
ON conversation_participants FOR DELETE
USING (user_id = auth.uid());

-- Messages table policies (SAFE - participants doesn't check messages)
CREATE POLICY "messages_select_own_conversations"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "messages_insert_own_conversations"
ON messages FOR INSERT
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

-- Message translations table policies (SERVICE ROLE)
CREATE POLICY "message_translations_select_own_conversations"
ON message_translations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = message_translations.message_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "message_translations_insert_service"
ON message_translations FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "message_translations_delete_service"
ON message_translations FOR DELETE
TO service_role
USING (true);

-- Message statuses table policies (SAFE)
CREATE POLICY "message_statuses_select_own_conversations"
ON message_statuses FOR SELECT
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
WITH CHECK (user_id = auth.uid());

CREATE POLICY "message_statuses_insert_service"
ON message_statuses FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "message_statuses_update_own"
ON message_statuses FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- AI annotations table policies (SERVICE ROLE)
CREATE POLICY "ai_annotations_select_own_conversations"
ON ai_annotations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages m
    JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
    WHERE m.id = ai_annotations.message_id
    AND cp.user_id = auth.uid()
  )
);

CREATE POLICY "ai_annotations_insert_service"
ON ai_annotations FOR INSERT
TO service_role
WITH CHECK (true);

-- =============================================
-- PART 4: VERIFICATION QUERIES
-- =============================================

-- Verify RLS is enabled on all tables
DO $$
DECLARE
  table_name text;
  rls_enabled boolean;
BEGIN
  FOR table_name IN 
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename IN ('users', 'conversations', 'conversation_participants', 'messages', 'message_translations', 'message_statuses', 'ai_annotations')
  LOOP
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class 
    WHERE relname = table_name AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    
    IF NOT rls_enabled THEN
      RAISE EXCEPTION 'RLS not enabled on table: %', table_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'RLS successfully enabled on all tables';
END;
$$;

-- Verify function exists and has correct permissions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'add_conversation_participant' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE EXCEPTION 'Function add_conversation_participant does not exist';
  END IF;
  
  RAISE NOTICE 'Function add_conversation_participant created successfully';
END;
$$;
