-- Test what auth.uid() returns during INSERT
-- This will help us debug the RLS issue

-- First, let's see what the current policy looks like
SELECT policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'conversations' AND cmd = 'INSERT';

-- Test the auth context
SELECT 
  auth.uid() as current_uid,
  auth.role() as current_role,
  auth.jwt() ->> 'sub' as jwt_sub,
  auth.jwt() ->> 'aud' as jwt_aud
;
