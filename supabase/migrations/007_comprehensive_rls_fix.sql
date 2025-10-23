-- Comprehensive RLS Policy Fix
-- Fix all RLS policies to allow proper app functionality
-- Version: 1.0
-- Date: October 23, 2025

-- 1. Fix Users table policies
DROP POLICY IF EXISTS "users_insert_own" ON users;
CREATE POLICY "users_insert_own"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

-- 2. Fix Conversations table policies
DROP POLICY IF EXISTS "conversations_insert_authenticated" ON conversations;
CREATE POLICY "conversations_insert_authenticated"
ON conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Fix Conversation Participants table policies
DROP POLICY IF EXISTS "conversation_participants_insert_participant" ON conversation_participants;
CREATE POLICY "conversation_participants_insert_participant"
ON conversation_participants FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 4. Fix Messages table policies
DROP POLICY IF EXISTS "messages_insert_participants" ON messages;
CREATE POLICY "messages_insert_participants"
ON messages FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 5. Fix Message Translations table policies
DROP POLICY IF EXISTS "message_translations_insert_own_conversations" ON message_translations;
CREATE POLICY "message_translations_insert_own_conversations"
ON message_translations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Fix Message Statuses table policies
DROP POLICY IF EXISTS "message_statuses_insert_own" ON message_statuses;
CREATE POLICY "message_statuses_insert_own"
ON message_statuses FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 7. Fix AI Annotations table policies
DROP POLICY IF EXISTS "ai_annotations_insert_own_conversations" ON ai_annotations;
CREATE POLICY "ai_annotations_insert_own_conversations"
ON ai_annotations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
