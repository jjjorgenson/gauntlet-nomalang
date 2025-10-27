-- Fix conversations INSERT policy - add missing USING clause
DROP POLICY IF EXISTS "conversations_insert_authenticated" ON conversations;

CREATE POLICY "conversations_insert_authenticated"
ON conversations FOR INSERT
TO authenticated
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);
