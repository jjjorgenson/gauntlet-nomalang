-- NomaLang Database Schema Migration
-- Run this in Supabase SQL Editor
-- Version: 1.0
-- Date: October 23, 2025

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  username text UNIQUE NOT NULL,
  avatar_url text,
  native_language text NOT NULL DEFAULT 'en',
  timezone text,
  theme_preference text NOT NULL DEFAULT 'system' 
    CHECK (theme_preference IN ('light', 'dark', 'system')),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT username_length CHECK (char_length(username) >= 3 AND char_length(username) <= 30),
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_language CHECK (char_length(native_language) = 2)
);

COMMENT ON TABLE users IS 'User accounts and preferences';
COMMENT ON COLUMN users.native_language IS 'ISO 639-1 language code (e.g., en, es, zh)';
COMMENT ON COLUMN users.theme_preference IS 'UI theme: light, dark, or system default';

-- Conversations table
CREATE TABLE conversations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text,
  type text NOT NULL CHECK (type IN ('direct', 'group')),
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT group_must_have_name CHECK (
    (type = 'direct' AND name IS NULL) OR 
    (type = 'group' AND name IS NOT NULL)
  )
);

COMMENT ON TABLE conversations IS 'Chat conversations (one-on-one or group)';
COMMENT ON COLUMN conversations.name IS 'Group name (NULL for direct chats)';
COMMENT ON COLUMN conversations.type IS 'direct = 1:1 chat, group = 3+ participants';

-- Conversation participants table
CREATE TABLE conversation_participants (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  expo_push_token text,
  default_formality text CHECK (default_formality IN ('casual', 'neutral', 'formal')),
  
  PRIMARY KEY (conversation_id, user_id)
);

COMMENT ON TABLE conversation_participants IS 'Users participating in conversations';
COMMENT ON COLUMN conversation_participants.expo_push_token IS 'Expo push notification token for this user';
COMMENT ON COLUMN conversation_participants.default_formality IS 'User preference for formality in this conversation';

-- Messages table
CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content text NOT NULL,
  message_type text NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'voice')),
  voice_url text,
  voice_duration_seconds int,
  detected_language text,
  created_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  is_edited boolean NOT NULL DEFAULT false,
  
  CONSTRAINT voice_has_url CHECK (
    (message_type = 'text' AND voice_url IS NULL AND voice_duration_seconds IS NULL) OR
    (message_type = 'voice' AND voice_url IS NOT NULL AND voice_duration_seconds IS NOT NULL)
  ),
  CONSTRAINT valid_duration CHECK (voice_duration_seconds IS NULL OR voice_duration_seconds > 0),
  CONSTRAINT content_not_empty CHECK (char_length(content) > 0),
  CONSTRAINT edited_at_after_created CHECK (edited_at IS NULL OR edited_at > created_at)
);

COMMENT ON TABLE messages IS 'Chat messages (text and voice)';
COMMENT ON COLUMN messages.content IS 'Message text (or transcription for voice messages)';
COMMENT ON COLUMN messages.voice_url IS 'Supabase Storage path (e.g., {user_id}/{timestamp}.m4a)';
COMMENT ON COLUMN messages.detected_language IS 'ISO 639-1 language code detected by franc or OpenAI';
COMMENT ON COLUMN messages.is_edited IS 'True if message was edited after sending';

-- Message translations table
CREATE TABLE message_translations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  target_language text NOT NULL,
  translated_content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  UNIQUE (message_id, target_language),
  CONSTRAINT valid_target_language CHECK (char_length(target_language) = 2),
  CONSTRAINT translation_not_empty CHECK (char_length(translated_content) > 0)
);

COMMENT ON TABLE message_translations IS 'Cached message translations';
COMMENT ON COLUMN message_translations.target_language IS 'ISO 639-1 target language code';
COMMENT ON COLUMN message_translations.translated_content IS 'OpenAI-generated translation';

-- Message statuses table
CREATE TABLE message_statuses (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('sent', 'delivered', 'read')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  PRIMARY KEY (message_id, user_id)
);

COMMENT ON TABLE message_statuses IS 'Message delivery and read receipts per user';
COMMENT ON COLUMN message_statuses.status IS 'sent = server received, delivered = client received, read = user viewed';

-- AI annotations table
CREATE TABLE ai_annotations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  annotation_type text NOT NULL CHECK (annotation_type IN ('slang', 'cultural_hint', 'formality')),
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT content_not_empty CHECK (jsonb_typeof(content) = 'object')
);

COMMENT ON TABLE ai_annotations IS 'AI-generated message annotations';
COMMENT ON COLUMN ai_annotations.annotation_type IS 'slang = slang explanation, cultural_hint = holiday/custom, formality = formality suggestion';
COMMENT ON COLUMN ai_annotations.content IS 'JSON structure varies by type';

-- Create indexes for performance
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_message_translations_lookup ON message_translations(message_id, target_language);
CREATE INDEX idx_message_statuses_message ON message_statuses(message_id);
CREATE INDEX idx_message_statuses_user_status ON message_statuses(user_id, status);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_ai_annotations_message ON ai_annotations(message_id);
CREATE INDEX idx_ai_annotations_type ON ai_annotations(annotation_type) WHERE annotation_type = 'cultural_hint';

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_annotations ENABLE ROW LEVEL SECURITY;
