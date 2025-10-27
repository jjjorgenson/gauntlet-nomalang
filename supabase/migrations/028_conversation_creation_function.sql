-- Drop the INSERT policy that's causing the RLS error
-- We'll use a SECURITY DEFINER function instead
DROP POLICY IF EXISTS "conversations_insert_authenticated" ON conversations;

-- Create SECURITY DEFINER function for conversation creation
-- This bypasses the JWT transmission issue while maintaining security
CREATE OR REPLACE FUNCTION create_conversation_with_participants(
  p_type text,
  p_name text,
  p_participant_ids uuid[]
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
  v_creator_id uuid;
  v_existing_conversation_id uuid;
  v_participant_id uuid;
BEGIN
  -- Get the authenticated user
  v_creator_id := auth.uid();
  
  IF v_creator_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- For direct conversations, check if one already exists between these two users
  IF p_type = 'direct' AND array_length(p_participant_ids, 1) = 1 THEN
    SELECT c.id INTO v_existing_conversation_id
    FROM conversations c
    WHERE c.type = 'direct'
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp1
      WHERE cp1.conversation_id = c.id AND cp1.user_id = v_creator_id
    )
    AND EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = c.id AND cp2.user_id = p_participant_ids[1]
    )
    AND (
      SELECT COUNT(*) FROM conversation_participants cp3
      WHERE cp3.conversation_id = c.id
    ) = 2
    LIMIT 1;
    
    IF v_existing_conversation_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'conversation_id', v_existing_conversation_id,
        'existing', true
      );
    END IF;
  END IF;
  
  -- Create the conversation (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO conversations (type, name)
  VALUES (p_type, p_name)
  RETURNING id INTO v_conversation_id;
  
  -- Add creator as participant
  INSERT INTO conversation_participants (conversation_id, user_id)
  VALUES (v_conversation_id, v_creator_id);
  
  -- Add other participants
  FOREACH v_participant_id IN ARRAY p_participant_ids
  LOOP
    IF v_participant_id != v_creator_id THEN
      INSERT INTO conversation_participants (conversation_id, user_id)
      VALUES (v_conversation_id, v_participant_id)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END LOOP;
  
  RETURN jsonb_build_object(
    'conversation_id', v_conversation_id,
    'existing', false
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION create_conversation_with_participants(text, text, uuid[]) TO authenticated;

COMMENT ON FUNCTION create_conversation_with_participants IS 'Creates a conversation with participants atomically. Checks for existing 1-1 conversations to prevent duplicates. Groups can be duplicated.';

