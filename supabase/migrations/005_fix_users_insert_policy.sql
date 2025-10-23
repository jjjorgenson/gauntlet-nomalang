-- Fix Users Table Insert Policy
-- Allow users to create their own profiles
-- Version: 1.0
-- Date: October 23, 2025

-- Add policy to allow users to insert their own profile
CREATE POLICY "users_insert_own"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);
