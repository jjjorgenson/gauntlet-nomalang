-- ROLLBACK: RLS Security Implementation Migration
-- This migration rolls back the RLS security changes
-- Version: 1.0
-- Date: January 2025

-- =============================================
-- PART 1: DROP ALL RLS POLICIES
-- =============================================

-- Drop all policies in reverse order of creation
DROP POLICY IF EXISTS "ai_annotations_insert_service" ON ai_annotations;
DROP POLICY IF EXISTS "ai_annotations_select_own_conversations" ON ai_annotations;

DROP POLICY IF EXISTS "message_statuses_update_own" ON message_statuses;
DROP POLICY IF EXISTS "message_statuses_insert_service" ON message_statuses;
DROP POLICY IF EXISTS "message_statuses_insert_own" ON message_statuses;
DROP POLICY IF EXISTS "message_statuses_select_own_conversations" ON message_statuses;

DROP POLICY IF EXISTS "message_translations_delete_service" ON message_translations;
DROP POLICY IF EXISTS "message_translations_insert_service" ON message_translations;
DROP POLICY IF EXISTS "message_translations_select_own_conversations" ON message_translations;

DROP POLICY IF EXISTS "messages_update_own_with_restrictions" ON messages;
DROP POLICY IF EXISTS "messages_insert_own_conversations" ON messages;
DROP POLICY IF EXISTS "messages_select_own_conversations" ON messages;

DROP POLICY IF EXISTS "conversation_participants_delete_own" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_update_own" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert_own" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_own" ON conversation_participants;

DROP POLICY IF EXISTS "conversations_update_own" ON conversations;
DROP POLICY IF EXISTS "conversations_insert_authenticated" ON conversations;
DROP POLICY IF EXISTS "conversations_select_own" ON conversations;

DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_select_all" ON users;

-- =============================================
-- PART 2: DISABLE ROW LEVEL SECURITY
-- =============================================

-- Disable RLS on all tables (same as migration 012)
ALTER TABLE ai_annotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_statuses DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_translations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- =============================================
-- PART 3: DROP SECURITY DEFINER FUNCTION
-- =============================================

-- Revoke permissions first
REVOKE EXECUTE ON FUNCTION add_conversation_participant(uuid, uuid) FROM authenticated;

-- Drop the function
DROP FUNCTION IF EXISTS add_conversation_participant(uuid, uuid);

-- =============================================
-- PART 4: VERIFICATION
-- =============================================

-- Verify RLS is disabled on all tables
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
    
    IF rls_enabled THEN
      RAISE EXCEPTION 'RLS still enabled on table: %', table_name;
    END IF;
  END LOOP;
  
  RAISE NOTICE 'RLS successfully disabled on all tables';
END;
$$;

-- Verify function is dropped
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'add_conversation_participant' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE EXCEPTION 'Function add_conversation_participant still exists';
  END IF;
  
  RAISE NOTICE 'Function add_conversation_participant successfully dropped';
END;
$$;
