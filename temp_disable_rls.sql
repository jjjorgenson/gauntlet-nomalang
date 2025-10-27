-- Temporarily disable RLS on conversations table to test
-- This will help us confirm the issue is with RLS, not the INSERT itself

ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
