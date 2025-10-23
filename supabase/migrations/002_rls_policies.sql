-- NomaLang RLS Policies Migration
-- Run this AFTER 001_initial_schema.sql
-- Version: 1.0
-- Date: October 23, 2025

-- Users table policies
CREATE POLICY "users_select_all"
ON users FOR SELECT
USING (true);

CREATE POLICY "users_update_own"
ON users FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "users_insert_service"
ON users FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "users_insert_own"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

-- Conversations table policies
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

-- Conversation participants table policies
CREATE POLICY "conversation_participants_select_own"
ON conversation_participants FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "conversation_participants_insert_participant"
ON conversation_participants FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "conversation_participants_update_own"
ON conversation_participants FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY "conversation_participants_delete_own"
ON conversation_participants FOR DELETE
USING (user_id = auth.uid());

-- Messages table policies
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

-- Message translations table policies
CREATE POLICY "message_translations_select_own_conversations"
ON message_translations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages
    JOIN conversation_participants ON conversation_participants.conversation_id = messages.conversation_id
    WHERE messages.id = message_translations.message_id
    AND conversation_participants.user_id = auth.uid()
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

-- Message statuses table policies
CREATE POLICY "message_statuses_select_own_conversations"
ON message_statuses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages
    JOIN conversation_participants ON conversation_participants.conversation_id = messages.conversation_id
    WHERE messages.id = message_statuses.message_id
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "message_statuses_insert_own"
ON message_statuses FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "message_statuses_update_own"
ON message_statuses FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "message_statuses_insert_service"
ON message_statuses FOR INSERT
TO service_role
WITH CHECK (true);

-- AI annotations table policies
CREATE POLICY "ai_annotations_select_own_conversations"
ON ai_annotations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages
    JOIN conversation_participants ON conversation_participants.conversation_id = messages.conversation_id
    WHERE messages.id = ai_annotations.message_id
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "ai_annotations_insert_service"
ON ai_annotations FOR INSERT
TO service_role
WITH CHECK (true);
