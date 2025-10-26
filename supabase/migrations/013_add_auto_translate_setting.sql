-- Add auto_translate_enabled column to users table
-- Run this in Supabase SQL Editor
-- Version: 1.0
-- Date: December 2024

-- Add auto_translate_enabled column to users table
ALTER TABLE users 
ADD COLUMN auto_translate_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN users.auto_translate_enabled IS 'Whether user wants automatic translation of foreign language messages';
