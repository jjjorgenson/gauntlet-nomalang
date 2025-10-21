-- NomaLang Database Schema
-- Run this in your Supabase SQL Editor to set up the database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'en',
  auto_translate_enabled BOOLEAN DEFAULT false,
  push_token TEXT,
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
  name TEXT, -- Group name (null for direct messages)
  avatar_url TEXT, -- Group avatar (null for direct messages)
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Participants table (for group chats)
CREATE TABLE public.participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY, -- Client-generated UUID for idempotency
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  detected_language TEXT, -- ISO 639-1 code (en, es, fr, etc.)
  is_voice_message BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  server_created_at TIMESTAMP DEFAULT NOW()
);

-- Message status table (for read receipts)
CREATE TABLE public.message_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('sent', 'delivered', 'read')),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);

-- Translations cache table
CREATE TABLE public.translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  target_language TEXT NOT NULL,
  translation_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, target_language)
);

-- Typing indicators table (ephemeral - will be cleaned up)
CREATE TABLE public.typing_indicators (
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY(conversation_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_conversations_created_by ON public.conversations(created_by);
CREATE INDEX idx_participants_user ON public.participants(user_id);
CREATE INDEX idx_message_status_user ON public.message_status(user_id);
CREATE INDEX idx_translations_lookup ON public.translations(message_id, target_language);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can read/update their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Users can view all users (for displaying names/avatars in chat)
CREATE POLICY "Users can view all profiles" ON public.users
  FOR SELECT USING (true);

-- Conversations policies
CREATE POLICY "Users can view conversations they participate in" ON public.conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE conversation_id = conversations.id AND user_id = auth.uid()
    ) OR created_by = auth.uid()
  );

CREATE POLICY "Users can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Participants policies
CREATE POLICY "Users can view participants of their conversations" ON public.participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participants p
      WHERE p.conversation_id = participants.conversation_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join conversations" ON public.participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their conversations" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE conversation_id = messages.conversation_id AND user_id = auth.uid()
    )
  );

-- Message status policies
CREATE POLICY "Users can view message status in their conversations" ON public.message_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE conversation_id = (
        SELECT conversation_id FROM public.messages WHERE id = message_status.message_id
      ) AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update message status for their messages" ON public.message_status
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own message status" ON public.message_status
  FOR UPDATE USING (user_id = auth.uid());

-- Translations policies
CREATE POLICY "Users can view translations in their conversations" ON public.translations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE conversation_id = (
        SELECT conversation_id FROM public.messages WHERE id = translations.message_id
      ) AND user_id = auth.uid()
    )
  );

-- Typing indicators policies (short-lived)
CREATE POLICY "Users can view typing indicators in their conversations" ON public.typing_indicators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.participants
      WHERE conversation_id = typing_indicators.conversation_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their own typing indicators" ON public.typing_indicators
  FOR ALL USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, preferred_language)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to clean up old typing indicators (older than 10 seconds)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM public.typing_indicators
  WHERE updated_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql;

-- Create a function that can be called to set up a direct conversation between two users
CREATE OR REPLACE FUNCTION create_direct_conversation(user1_id UUID, user2_id UUID)
RETURNS UUID AS $$
DECLARE
  conversation_id UUID;
  existing_conversation_id UUID;
BEGIN
  -- Check if conversation already exists between these users
  SELECT c.id INTO existing_conversation_id
  FROM public.conversations c
  JOIN public.participants p1 ON c.id = p1.conversation_id
  JOIN public.participants p2 ON c.id = p2.conversation_id
  WHERE c.type = 'direct'
    AND p1.user_id = user1_id
    AND p2.user_id = user2_id;

  -- If exists, return it
  IF existing_conversation_id IS NOT NULL THEN
    RETURN existing_conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO public.conversations (type, created_by)
  VALUES ('direct', user1_id)
  RETURNING id INTO conversation_id;

  -- Add both users as participants
  INSERT INTO public.participants (conversation_id, user_id)
  VALUES (conversation_id, user1_id), (conversation_id, user2_id);

  RETURN conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
