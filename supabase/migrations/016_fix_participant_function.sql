-- Quick Fix: Update participant function to allow conversation creator to add first participant
-- This fixes the chicken-and-egg problem when creating conversations

CREATE OR REPLACE FUNCTION add_conversation_participant(
  p_conversation_id uuid,
  p_user_id uuid
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER  -- This bypasses RLS for the function
SET search_path = public
AS $$
BEGIN
  -- Check if caller is already a participant OR if this is the first participant
  -- (conversation creator can add the first participant)
  IF NOT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
    AND user_id = auth.uid()
  ) AND EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = p_conversation_id
  ) THEN
    RAISE EXCEPTION 'Not authorized to add participants to this conversation';
  END IF;
  
  -- Check if user exists
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User does not exist';
  END IF;
  
  -- Add the new participant (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (p_conversation_id, p_user_id)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;
END;
$$;
