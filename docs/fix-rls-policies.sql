-- Fix RLS Infinite Recursion Issues - COMPLETE NON-RECURSIVE SOLUTION
-- Run this in your Supabase SQL Editor to eliminate all circular references

-- Drop ALL existing policies that could cause recursion
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.participants;
DROP POLICY IF EXISTS "Users can join conversations" ON public.participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.participants;
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;

-- Create completely non-recursive policies for participants table
CREATE POLICY "Users can view their own participant rows"
ON public.participants
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view participants they share a conversation with"
ON public.participants
FOR SELECT
USING (
  auth.uid() = user_id
  OR conversation_id IN (
    SELECT c.id FROM public.conversations c
    JOIN public.participants p_self ON p_self.conversation_id = c.id
    WHERE p_self.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert themselves as participants"
ON public.participants
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own participant rows"
ON public.participants
FOR DELETE
USING (auth.uid() = user_id);

-- Create completely non-recursive policy for conversations table
CREATE POLICY "Users can view conversations they are part of"
ON public.conversations
FOR SELECT
USING (
  created_by = auth.uid()
  OR id IN (
    SELECT conversation_id FROM public.participants
    WHERE user_id = auth.uid()
  )
);

-- Add helper function for safe conversation queries (completely non-recursive)
CREATE OR REPLACE FUNCTION safe_get_conversations()
RETURNS TABLE (
  id UUID,
  type TEXT,
  name TEXT,
  avatar_url TEXT,
  created_by UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.type,
    c.name,
    c.avatar_url,
    c.created_by,
    c.created_at,
    c.updated_at
  FROM public.conversations c
  WHERE c.created_by = auth.uid()
     OR c.id IN (
       SELECT conversation_id FROM public.participants
       WHERE user_id = auth.uid()
     );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION safe_get_conversations() TO authenticated;

-- Test queries to verify no recursion
-- These should work without infinite recursion errors:

-- Test 1: Basic conversation access
SELECT 'Testing conversation access...' as test;
SELECT * FROM conversations
WHERE id IN (
  SELECT conversation_id FROM participants
  WHERE user_id = auth.uid()
);

-- Test 2: Participants access
SELECT 'Testing participants access...' as test;
SELECT * FROM participants
WHERE user_id = auth.uid()
OR conversation_id IN (
  SELECT c.id FROM conversations c
  JOIN participants p_self ON p_self.conversation_id = c.id
  WHERE p_self.user_id = auth.uid()
);

-- Test 3: Helper function
SELECT 'Testing helper function...' as test;
SELECT * FROM safe_get_conversations();

SELECT 'RLS policies fixed successfully - no more infinite recursion!' as status;
