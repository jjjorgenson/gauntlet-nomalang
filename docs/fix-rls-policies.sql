-- FINAL RLS SOLUTION - Non-recursive policies with SECURITY DEFINER RPCs
-- Clean implementation that avoids all circular references

-- 1) RLS POLICIES — CLEAN & NON-RECURSIVE
-- Drop ALL existing policies first

-- Conversations table
DROP POLICY IF EXISTS "conversations_insert_creator" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_participant" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_created_by" ON public.conversations;
DROP POLICY IF EXISTS "conversations_allow_creator_and_participants" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_creator" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update_creator" ON public.conversations;
DROP POLICY IF EXISTS "conversations_delete_creator" ON public.conversations;
DROP POLICY IF EXISTS "conversations_allow_creator" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_by_authenticated" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_visible_to_participants" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select_visible" ON public.conversations;
DROP POLICY IF EXISTS "conversations_insert_by_creator" ON public.conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON public.conversations;

-- Participants table
DROP POLICY IF EXISTS "participants_delete_own" ON public.participants;
DROP POLICY IF EXISTS "participants_insert_own" ON public.participants;
DROP POLICY IF EXISTS "participants_select_own" ON public.participants;
DROP POLICY IF EXISTS "participants_allow_own_management" ON public.participants;
DROP POLICY IF EXISTS "participants_allow_own_and_creator_management" ON public.participants;
DROP POLICY IF EXISTS "participants_allow_own_only" ON public.participants;
DROP POLICY IF EXISTS "participants_insert_self_only" ON public.participants;
DROP POLICY IF EXISTS "participants_select_own" ON public.participants;
DROP POLICY IF EXISTS "participants_insert_self" ON public.participants;
DROP POLICY IF EXISTS "participants_update_own" ON public.participants;
DROP POLICY IF EXISTS "participants_delete_own" ON public.participants;
DROP POLICY IF EXISTS "participants_allow_creator_management" ON public.participants;
DROP POLICY IF EXISTS "participants_allow_own_only" ON public.participants;
DROP POLICY IF EXISTS "Users can view participants of their conversations" ON public.participants;
DROP POLICY IF EXISTS "Users can join conversations" ON public.participants;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.participants;

-- Messages table
DROP POLICY IF EXISTS "messages_select_own_conversations" ON public.messages;
DROP POLICY IF EXISTS "messages_insert_own_conversations" ON public.messages;
DROP POLICY IF EXISTS "messages_allow_conversation_participants" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;

-- Message Status table
DROP POLICY IF EXISTS "Users can update message status for their messages" ON public.message_status;
DROP POLICY IF EXISTS "Users can update their own message status" ON public.message_status;
DROP POLICY IF EXISTS "Users can view message status in their conversations" ON public.message_status;

-- Users table
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "users_select_for_search" ON public.users;
DROP POLICY IF EXISTS "users_update_own" ON public.users;
DROP POLICY IF EXISTS "users_insert_own" ON public.users;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Typing indicators table
DROP POLICY IF EXISTS "Users can manage their own typing indicators" ON public.typing_indicators;
DROP POLICY IF EXISTS "Users can view typing indicators in their conversations" ON public.typing_indicators;

-- Translations table
DROP POLICY IF EXISTS "Users can view translations in their conversations" ON public.translations;

-- Ensure RLS is enabled
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Fix messages table schema to include all required columns
-- Drop and recreate messages table with correct schema
DROP TABLE IF EXISTS public.messages CASCADE;

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  type text DEFAULT 'text' CHECK (type IN ('text', 'image', 'voice')),
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Conversations: users can see conversations they created or participate in
CREATE POLICY "conversations_select_visible"
ON public.conversations
FOR SELECT
USING (
  created_by = auth.uid()
  OR id IN (
    SELECT conversation_id
    FROM public.participants
    WHERE user_id = auth.uid()
  )
);

-- Conversations: only the creator can create the conversation
CREATE POLICY "conversations_insert_by_creator"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Participants: users can select their own participant rows
CREATE POLICY "participants_select_own"
ON public.participants
FOR SELECT
USING (user_id = auth.uid());

-- Participants: users can only directly insert themselves (we will still use RPC for multi-insert)
CREATE POLICY "participants_insert_self_only"
ON public.participants
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Message Status - Allow users to manage status for their messages
CREATE POLICY "message_status_allow_own"
ON public.message_status
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- MESSAGE STATUS TABLE SCHEMA - Production-ready with proper constraints
-- Drop existing table if it exists to recreate with proper schema
DROP TABLE IF EXISTS public.message_status CASCADE;

-- Create message_status table with proper schema
CREATE TABLE public.message_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  delivered_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (message_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_message_status_message_id ON public.message_status(message_id);
CREATE INDEX idx_message_status_user_id ON public.message_status(user_id);
CREATE INDEX idx_message_status_status ON public.message_status(status);

-- Messages - Allow users to manage messages in conversations they participate in
CREATE POLICY "messages_allow_conversation_participants"
ON public.messages
FOR ALL
USING (
  auth.uid() = sender_id OR
  conversation_id IN (
    SELECT conversation_id FROM public.participants WHERE user_id = auth.uid()
  )
)
WITH CHECK (auth.uid() = sender_id);

-- 2) SECURE RPC FUNCTIONS — THE ONLY WAY TO CREATE CHATS
-- These run as SECURITY DEFINER and handle multi-table operations safely

-- DIRECT CHAT CREATION
CREATE OR REPLACE FUNCTION public.create_direct_conversation(
  p_creator uuid,
  p_other_user uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
BEGIN
  -- Insert conversation
  INSERT INTO public.conversations (type, created_by)
  VALUES ('direct', p_creator)
  RETURNING id INTO v_conversation_id;

  -- Insert participants for both users
  INSERT INTO public.participants (conversation_id, user_id)
  VALUES
    (v_conversation_id, p_creator),
    (v_conversation_id, p_other_user);

  RETURN v_conversation_id;
END;
$$;

-- GROUP CHAT CREATION
CREATE OR REPLACE FUNCTION public.create_group_conversation(
  p_creator uuid,
  p_participant_ids uuid[],
  p_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id uuid;
  v_uid uuid;
BEGIN
  -- Insert conversation
  INSERT INTO public.conversations (type, name, created_by)
  VALUES ('group', COALESCE(p_name, 'New Group'), p_creator)
  RETURNING id INTO v_conversation_id;

  -- Add creator as participant
  INSERT INTO public.participants (conversation_id, user_id)
  VALUES (v_conversation_id, p_creator);

  -- Add other participants (excluding creator if they're in the list)
  FOREACH v_uid IN ARRAY p_participant_ids
  LOOP
    IF v_uid IS DISTINCT FROM p_creator THEN
      INSERT INTO public.participants (conversation_id, user_id)
      VALUES (v_conversation_id, v_uid);
    END IF;
  END LOOP;

  RETURN v_conversation_id;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION public.create_direct_conversation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_group_conversation(uuid, uuid[], text) TO authenticated;

-- 3) MESSAGE STATUS AUTOMATION - Trigger-based system
-- Function to automatically create message statuses when messages are inserted

CREATE OR REPLACE FUNCTION public.create_message_statuses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  participant_record RECORD;
BEGIN
  -- For each participant in the conversation, create a message status record
  FOR participant_record IN
    SELECT user_id FROM public.participants WHERE conversation_id = NEW.conversation_id
  LOOP
    -- For the sender: status = 'sent'
    -- For all others: status = 'delivered' with delivered_at timestamp
    IF participant_record.user_id = NEW.sender_id THEN
      INSERT INTO public.message_status (message_id, user_id, status)
      VALUES (NEW.id, participant_record.user_id, 'sent');
    ELSE
      INSERT INTO public.message_status (message_id, user_id, status, delivered_at)
      VALUES (NEW.id, participant_record.user_id, 'delivered', now());
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Function to mark a message as read for the current user
CREATE OR REPLACE FUNCTION public.mark_message_read(p_message_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.message_status
  SET status = 'read', read_at = now(), updated_at = now()
  WHERE message_id = p_message_id AND user_id = auth.uid();
END;
$$;

-- Create the trigger that runs after message insertion
CREATE TRIGGER create_message_status_trigger
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.create_message_statuses();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.mark_message_read(uuid) TO authenticated;

-- End of policy definitions