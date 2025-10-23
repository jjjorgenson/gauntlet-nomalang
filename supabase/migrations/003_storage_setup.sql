-- NomaLang Storage Setup Migration
-- Run this AFTER 002_rls_policies.sql
-- Version: 1.0
-- Date: October 23, 2025

-- Create voice-memos bucket for voice message storage
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('voice-memos', 'voice-memos', false, 26214400); -- 25MB limit

-- Storage RLS policies for voice-memos bucket
CREATE POLICY "voice_memos_upload_own"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voice-memos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "voice_memos_select_conversations"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'voice-memos'
  AND EXISTS (
    SELECT 1 FROM messages
    JOIN conversation_participants ON conversation_participants.conversation_id = messages.conversation_id
    WHERE messages.voice_url = storage.objects.name
    AND conversation_participants.user_id = auth.uid()
  )
);

CREATE POLICY "voice_memos_delete_own"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'voice-memos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "voice_memos_service_full_access"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'voice-memos');
