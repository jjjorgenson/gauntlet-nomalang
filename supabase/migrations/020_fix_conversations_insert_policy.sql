-- Fix conversations INSERT policy by adding missing USING clause
-- The policy needs both USING and WITH CHECK for INSERT operations

DROP POLICY IF EXISTS "conversations_insert_authenticated" ON conversations;

CREATE POLICY "conversations_insert_authenticated"
ON conversations FOR INSERT
TO authenticated
USING (auth.uid() IS NOT NULL)  -- ADD THIS - was missing!
WITH CHECK (auth.uid() IS NOT NULL);

-- Verify the policy was created correctly
SELECT policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'conversations' AND cmd = 'INSERT';
