-- Drop ALL policies to start fresh and add detailed logging
-- This will help us trace execution order and identify circular dependencies

-- Drop all existing policies
DROP POLICY IF EXISTS "users_select_all" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;

DROP POLICY IF EXISTS "conversations_select_own" ON conversations;
DROP POLICY IF EXISTS "conversations_insert_authenticated" ON conversations;
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

-- Create logging function for debugging
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

-- Create a simple test policy for conversations that logs each step
CREATE POLICY "conversations_insert_debug"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (
  log_rls_check('conversations', 'INSERT', 1, 'Starting conversation insert check') IS NULL
  AND log_rls_check('conversations', 'INSERT', 2, 'Checking auth.uid() is not null') IS NULL
  AND auth.uid() IS NOT NULL
  AND log_rls_check('conversations', 'INSERT', 3, 'Auth check passed, allowing insert') IS NULL
);

-- Test the logging
SELECT 'Policies dropped and logging function created. Test by creating a conversation.';
