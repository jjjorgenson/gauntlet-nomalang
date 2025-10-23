-- Fix RLS Policy Recursion Issues
-- Run this in Supabase SQL Editor to fix the infinite recursion error
-- Version: 1.0
-- Date: October 23, 2025

-- Drop ALL conversation_participants policies to avoid conflicts
DROP POLICY IF EXISTS "conversation_participants_select_own" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_insert_participant" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_update_own" ON conversation_participants;
DROP POLICY IF EXISTS "conversation_participants_delete_own" ON conversation_participants;

-- Create fixed policies without recursion
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
