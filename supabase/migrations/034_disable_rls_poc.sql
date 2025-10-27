-- POC: Completely disable RLS for development/testing
-- This migration disables RLS on all tables to unblock POC development
-- Version: 1.0
-- Date: December 2024

-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_translations DISABLE ROW LEVEL SECURITY;
ALTER TABLE message_statuses DISABLE ROW LEVEL SECURITY;
ALTER TABLE ai_annotations DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_online_status DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_typing_status DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid any conflicts
DROP POLICY IF EXISTS "conversations_select_own" ON conversations;
DROP POLICY IF EXISTS "conversations_insert_authenticated" ON conversations;
DROP POLICY IF EXISTS "conversations_update_group_name" ON conversations;
DROP POLICY IF EXISTS "conversation_participants_select_own" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert_participant" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_update_own" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_delete_own" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert_service" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_select_service" ON conversation_participants;
DROP POLICY IF EXISTS "messages_select_own_conversations" ON messages;
DROP POLICY IF EXISTS "messages_insert_own_conversations" ON messages;
DROP POLICY IF EXISTS "messages_update_own_with_restrictions" ON messages;
DROP POLICY IF EXISTS "message_translations_select_own_conversations" ON message_translations;
DROP POLICY IF EXISTS "message_translations_insert_service" ON message_translations;
DROP POLICY IF EXISTS "message_translations_delete_service" ON message_translations;
DROP POLICY IF EXISTS "message_statuses_select_own_conversations" ON message_statuses;
DROP POLICY IF EXISTS "message_statuses_insert_own" ON message_statuses;
DROP POLICY IF EXISTS "message_statuses_update_own" ON message_statuses;
DROP POLICY IF EXISTS "message_statuses_insert_service" ON message_statuses;
DROP POLICY IF EXISTS "ai_annotations_select_own_conversations" ON ai_annotations;
DROP POLICY IF EXISTS "ai_annotations_insert_service" ON ai_annotations;
DROP POLICY IF EXISTS "users_select_all" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert_service" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;

-- Additional policies that might exist
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_authenticated" ON users;
DROP POLICY IF EXISTS "conversations_insert_own" ON conversations;
DROP POLICY IF EXISTS "conversations_delete_own" ON conversations;
DROP POLICY IF EXISTS "messages_delete_own" ON messages;
DROP POLICY IF EXISTS "message_statuses_delete_own" ON message_statuses;

-- Verify RLS is disabled (this will show in logs)
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'conversations', 'conversation_participants', 'messages', 'message_translations', 'message_statuses', 'ai_annotations', 'user_online_status', 'user_typing_status')
ORDER BY tablename;
