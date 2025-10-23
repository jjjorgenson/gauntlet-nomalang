-- Fix Conversations Table Insert Policy
-- Allow authenticated users to create conversations
-- Version: 1.0
-- Date: October 23, 2025

-- Drop the existing policy and create a new one
DROP POLICY IF EXISTS "conversations_insert_authenticated" ON conversations;

-- Create a new policy that allows authenticated users to create conversations
CREATE POLICY "conversations_insert_authenticated"
ON conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Also ensure conversation_participants can be inserted
DROP POLICY IF EXISTS "conversation_participants_insert_participant" ON conversation_participants;

CREATE POLICY "conversation_participants_insert_participant"
ON conversation_participants FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
