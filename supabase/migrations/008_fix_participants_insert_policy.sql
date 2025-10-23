-- Fix Conversation Participants Insert Policy
-- Allow authenticated users to add any participants to conversations
-- Version: 1.0
-- Date: October 23, 2025

-- Drop the restrictive policy
DROP POLICY IF EXISTS "conversation_participants_insert_participant" ON conversation_participants;

-- Create a new policy that allows authenticated users to add participants
CREATE POLICY "conversation_participants_insert_participant"
ON conversation_participants FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
