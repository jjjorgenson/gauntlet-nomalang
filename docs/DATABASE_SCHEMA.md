# Database Schema Documentation
## Multilingual Family Chat Application

**Version:** 1.0  
**Last Updated:** October 22, 2025  
**Database:** PostgreSQL 15+ (Supabase)

---

## Table of Contents
1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Table Definitions](#table-definitions)
4. [Indexes](#indexes)
5. [Foreign Key Constraints](#foreign-key-constraints)
6. [Row Level Security Policies](#row-level-security-policies)
7. [Database Triggers](#database-triggers)
8. [Storage Buckets](#storage-buckets)
9. [Sample Queries](#sample-queries)
10. [Migration Scripts](#migration-scripts)

---

## 1. Overview

### 1.1 Database Technology
- **Engine:** PostgreSQL 15+
- **Hosting:** Supabase (managed PostgreSQL)
- **Extensions:** `uuid-ossp`, `pg_net` (for webhooks)
- **Real-time:** Supabase Realtime for live subscriptions

### 1.2 Design Principles
- **Normalized:** 3NF compliance for data integrity
- **Performance:** Strategic indexes on high-query columns
- **Security:** RLS policies enforce authorization at database level
- **Audit Trail:** Timestamps on all tables
- **Soft Deletes:** No hard deletes (CASCADE for referential integrity only)

### 1.3 Naming Conventions
- **Tables:** Plural, snake_case (e.g., `users`, `message_translations`)
- **Columns:** Singular, snake_case (e.g., `user_id`, `created_at`)
- **Primary Keys:** `id` (uuid)
- **Foreign Keys:** `{table}_id` (e.g., `conversation_id`, `sender_id`)
- **Timestamps:** `created_at`, `updated_at`, `edited_at`
- **Booleans:** `is_` or `has_` prefix (e.g., `is_edited`)

---

## 2. Entity Relationship Diagram

```
┌─────────────┐
│    users    │
└──────┬──────┘
       │
       │ 1:N
       │
       ▼
┌─────────────────────┐         ┌──────────────────┐
│ conversation_       │ N:1     │  conversations   │
│ participants        ├────────►│                  │
└──────┬──────────────┘         └────────┬─────────┘
       │                                  │
       │ 1:N                              │ 1:N
       │                                  │
       ▼                                  ▼
┌─────────────────────┐         ┌──────────────────┐
│ message_statuses    │         │    messages      │
└─────────────────────┘         └────────┬─────────┘
                                         │
                                         │ 1:N
                        ┌────────────────┼────────────────┐
                        │                │                │
                        ▼                ▼                ▼
              ┌──────────────────┐  ┌──────────┐  ┌──────────────┐
              │ message_         │  │ ai_      │  │ voice-memos  │
              │ translations     │  │ annota-  │  │ (Storage)    │
              └──────────────────┘  │ tions    │  └──────────────┘
                                    └──────────┘
```

**Key Relationships:**
- Users → Conversation Participants (1:N)
- Conversations → Conversation Participants (1:N)
- Conversations → Messages (1:N)
- Messages → Message Translations (1:N)
- Messages → Message Statuses (1:N)
- Messages → AI Annotations (1:N)
- Users (sender) → Messages (1:N)

---

## 3. Table Definitions

### 3.1 users

**Purpose:** Stores user account information and preferences.

```sql
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
  CONSTRAINT valid_language CHECK (char_length(native_language) = 2) -- ISO 639-1
);

COMMENT ON TABLE users IS 'User accounts and preferences';
COMMENT ON COLUMN users.native_language IS 'ISO 639-1 language code (e.g., en, es, zh)';
COMMENT ON COLUMN users.theme_preference IS 'UI theme: light, dark, or system default';
```

**Key Points:**
- `id` linked to Supabase Auth `auth.users.id`
- `email` must be unique and valid format
- `username` must be 3-30 characters
- `native_language` determines default translation target
- `theme_preference` stored for cross-device sync

---

### 3.2 conversations

**Purpose:** Represents chat threads (one-on-one or group).

```sql
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
```

**Key Points:**
- Direct chats have no name (derived from participant usernames)
- Group chats require explicit name
- Type enforced at database level

---

### 3.3 conversation_participants

**Purpose:** Many-to-many relationship between users and conversations.

```sql
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
```

**Key Points:**
- Composite primary key prevents duplicate participants
- `expo_push_token` stored per conversation (users may have multiple devices)
- `default_formality` allows per-conversation formality preferences
- Cascade delete removes participants when conversation deleted

---

### 3.4 messages

**Purpose:** Stores all chat messages (text and voice).

```sql
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
```

**Key Points:**
- `content` always populated (for voice, contains transcription)
- Voice messages have `voice_url` and `voice_duration_seconds`
- `detected_language` populated by client (franc) or backend (OpenAI)
- `edited_at` and `is_edited` track edit history
- Constraints ensure data integrity

---

### 3.5 message_translations

**Purpose:** Caches translated versions of messages.

```sql
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
```

**Key Points:**
- Unique constraint prevents duplicate translations
- One translation per language (not per recipient)
- Cascade delete removes translations when original message deleted
- Cached while original message exists (no TTL needed)

---

### 3.6 message_statuses

**Purpose:** Tracks delivery and read status per user.

```sql
CREATE TABLE message_statuses (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('sent', 'delivered', 'read')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  PRIMARY KEY (message_id, user_id)
);

COMMENT ON TABLE message_statuses IS 'Message delivery and read receipts per user';
COMMENT ON COLUMN message_statuses.status IS 'sent = server received, delivered = client received, read = user viewed';
```

**Key Points:**
- Composite primary key (one status per user per message)
- Status progression: sent → delivered → read
- `updated_at` tracks when status last changed
- Used to calculate read receipt counts

---

### 3.7 ai_annotations

**Purpose:** Stores AI-generated metadata (slang explanations, cultural hints).

```sql
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
```

**JSONB Content Structures:**

**Slang:**
```json
{
  "term": "no cap",
  "explanation": "no lie, for real",
  "context": "Gen Z slang, primarily US"
}
```

**Cultural Hint:**
```json
{
  "event": "Diwali",
  "description": "Festival of lights celebrating victory of light over darkness",
  "date": "2025-11-01",
  "country": "India"
}
```

**Formality (unused in current design, reserved):**
```json
{
  "original_formality": "casual",
  "suggested_formality": "formal",
  "reason": "Recipient prefers formal communication"
}
```

**Key Points:**
- JSONB allows flexible schema per annotation type
- Cascade delete removes annotations when message deleted
- Indexed on `message_id` for fast lookups

---

## 4. Indexes

### 4.1 Performance Indexes

```sql
-- Messages: Query by conversation (most common query)
CREATE INDEX idx_messages_conversation_created 
ON messages(conversation_id, created_at DESC);

-- Messages: Query by sender (for edit validation)
CREATE INDEX idx_messages_sender 
ON messages(sender_id);

-- Message Translations: Lookup by message + language (cache check)
CREATE INDEX idx_message_translations_lookup 
ON message_translations(message_id, target_language);

-- Message Statuses: Aggregate read counts
CREATE INDEX idx_message_statuses_message 
ON message_statuses(message_id);

-- Message Statuses: User's unread messages
CREATE INDEX idx_message_statuses_user_status 
ON message_statuses(user_id, status);

-- Conversation Participants: Reverse lookup (which conversations is user in?)
CREATE INDEX idx_conversation_participants_user 
ON conversation_participants(user_id);

-- AI Annotations: Lookup annotations for message
CREATE INDEX idx_ai_annotations_message 
ON ai_annotations(message_id);

-- AI Annotations: Find cultural hints by type
CREATE INDEX idx_ai_annotations_type 
ON ai_annotations(annotation_type) 
WHERE annotation_type = 'cultural_hint';
```

### 4.2 Index Rationale

| Index | Query Pattern | Impact |
|-------|---------------|--------|
| `idx_messages_conversation_created` | Fetch last N messages in conversation | High - every chat screen load |
| `idx_messages_sender` | Validate user owns message (for editing) | Medium - every edit attempt |
| `idx_message_translations_lookup` | Check if translation exists before API call | High - every message with different recipient language |
| `idx_message_statuses_message` | Count read receipts for message | High - every message display |
| `idx_message_statuses_user_status` | Unread message count badge | Medium - app launch, tab switch |
| `idx_conversation_participants_user` | List user's conversations | High - conversation list screen |
| `idx_ai_annotations_message` | Show slang/cultural hints for message | Medium - on-demand only |
| `idx_ai_annotations_type` | Daily cultural hints query | Low - cron job only |

---

## 5. Foreign Key Constraints

### 5.1 Constraint Definitions

```sql
-- Conversations → Participants
ALTER TABLE conversation_participants
ADD CONSTRAINT fk_conversation_participants_conversation
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

ALTER TABLE conversation_participants
ADD CONSTRAINT fk_conversation_participants_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Messages → Conversations
ALTER TABLE messages
ADD CONSTRAINT fk_messages_conversation
FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE;

-- Messages → Users (sender)
ALTER TABLE messages
ADD CONSTRAINT fk_messages_sender
FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;

-- Message Translations → Messages
ALTER TABLE message_translations
ADD CONSTRAINT fk_message_translations_message
FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE;

-- Message Statuses → Messages
ALTER TABLE message_statuses
ADD CONSTRAINT fk_message_statuses_message
FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE;

-- Message Statuses → Users
ALTER TABLE message_statuses
ADD CONSTRAINT fk_message_statuses_user
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- AI Annotations → Messages
ALTER TABLE ai_annotations
ADD CONSTRAINT fk_ai_annotations_message
FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE;
```

### 5.2 Cascade Behavior

**ON DELETE CASCADE:**
- When conversation deleted → all messages, participants, statuses deleted
- When message deleted → all translations, statuses, annotations deleted
- When user deleted → all their messages, participations, statuses deleted

**Rationale:** Clean up orphaned data automatically. No soft deletes needed for MVP.

---

## 6. Row Level Security Policies

### 6.1 Enable RLS

```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_annotations ENABLE ROW LEVEL SECURITY;
```

### 6.2 Users Table Policies

```sql
-- Users can view all profiles (needed to display usernames, avatars)
CREATE POLICY "Users can view all profiles"
ON users FOR SELECT
USING (true);

-- Users can only update their own profile
CREATE POLICY "Users can update own profile"
ON users FOR UPDATE
USING (auth.uid() = id);

-- Service role can insert users (handled by Supabase Auth)
CREATE POLICY "Service can insert users"
ON users FOR INSERT
WITH CHECK (true);
```

### 6.3 Conversations Table Policies

```sql
-- Users can only view conversations they're part of
CREATE POLICY "Users can view own conversations"
ON conversations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Any authenticated user can create conversations
CREATE POLICY "Users can create conversations"
ON conversations FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Participants can update conversation name (group chats only)
CREATE POLICY "Participants can update group names"
ON conversations FOR UPDATE
USING (
  type = 'group'
  AND EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  )
);
```

### 6.4 Conversation Participants Table Policies

```sql
-- Users can view participants in their conversations
CREATE POLICY "Users can view participants in own conversations"
ON conversation_participants FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants AS cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

-- Participants can add others to their conversations
CREATE POLICY "Participants can add others"
ON conversation_participants FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversation_participants AS cp
    WHERE cp.conversation_id = conversation_participants.conversation_id
    AND cp.user_id = auth.uid()
  )
);

-- Users can update their own participant record (push token, formality)
CREATE POLICY "Users can update own participant record"
ON conversation_participants FOR UPDATE
USING (user_id = auth.uid());

-- Users can remove themselves from conversations
CREATE POLICY "Users can leave conversations"
ON conversation_participants FOR DELETE
USING (user_id = auth.uid());
```

### 6.5 Messages Table Policies

```sql
-- Users can view messages in their conversations
CREATE POLICY "Users can view messages in own conversations"
ON messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Users can send messages to their conversations
CREATE POLICY "Users can send messages to own conversations"
ON messages FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = messages.conversation_id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Users can edit their own TEXT messages within 5 minutes
-- AND only if no translations exist yet
CREATE POLICY "Users can edit own messages with restrictions"
ON messages FOR UPDATE
USING (
  auth.uid() = sender_id 
  AND message_type = 'text'
  AND (NOW() - created_at) < INTERVAL '5 minutes'
  AND NOT EXISTS (
    SELECT 1 FROM message_translations 
    WHERE message_translations.message_id = messages.id
  )
)
WITH CHECK (
  auth.uid() = sender_id 
  AND message_type = 'text'
  AND (NOW() - created_at) < INTERVAL '5 minutes'
  AND NOT EXISTS (
    SELECT 1 FROM message_translations 
    WHERE message_translations.message_id = messages.id
  )
);
```

**Critical Note on Edit Policy:**
- `USING` clause checks if user CAN edit (authorization)
- `WITH CHECK` clause validates the UPDATE payload meets same conditions
- Both clauses needed to prevent privilege escalation

### 6.6 Message Translations Table Policies

```sql
-- Users can view translations for messages in their conversations
CREATE POLICY "Users can view translations in own conversations"
ON message_translations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages
    JOIN conversation_participants ON conversation_participants.conversation_id = messages.conversation_id
    WHERE messages.id = message_translations.message_id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Only service role can insert translations (backend only)
-- No policy for authenticated role = implicitly denied
CREATE POLICY "Service can insert translations"
ON message_translations FOR INSERT
TO service_role
WITH CHECK (true);

-- Only service role can delete translations (when message edited)
CREATE POLICY "Service can delete translations"
ON message_translations FOR DELETE
TO service_role
USING (true);
```

**Critical Note:**
- Regular users CANNOT insert/delete translations
- Only backend (using `service_role` key) can modify translations
- Prevents users from forging translations

### 6.7 Message Statuses Table Policies

```sql
-- Users can view statuses for messages in their conversations
CREATE POLICY "Users can view message statuses in own conversations"
ON message_statuses FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages
    JOIN conversation_participants ON conversation_participants.conversation_id = messages.conversation_id
    WHERE messages.id = message_statuses.message_id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Users can insert their own read status
CREATE POLICY "Users can insert own message status"
ON message_statuses FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can update their own read status
CREATE POLICY "Users can update own message status"
ON message_statuses FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Service role can insert statuses for push notification tracking
CREATE POLICY "Service can insert statuses"
ON message_statuses FOR INSERT
TO service_role
WITH CHECK (true);
```

### 6.8 AI Annotations Table Policies

```sql
-- Users can view annotations for messages in their conversations
CREATE POLICY "Users can view annotations in own conversations"
ON ai_annotations FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM messages
    JOIN conversation_participants ON conversation_participants.conversation_id = messages.conversation_id
    WHERE messages.id = ai_annotations.message_id
    AND conversation_participants.user_id = auth.uid()
  )
);

-- Only service role can insert annotations (backend only)
CREATE POLICY "Service can insert annotations"
ON ai_annotations FOR INSERT
TO service_role
WITH CHECK (true);
```

---

## 7. Database Triggers

### 7.1 Webhook Trigger for New Messages

```sql
-- Function to call Vercel webhook when message inserted
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM net.http_post(
    url := current_setting('app.settings.webhook_url')::text || '/api/webhook/message-created',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.webhook_secret')::text || '"}'::jsonb,
    body := json_build_object(
      'record', row_to_json(NEW),
      'type', 'INSERT',
      'table', 'messages'
    )::text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on messages table
CREATE TRIGGER on_message_created
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();
```

**Configuration:**
```sql
-- Set webhook URL and secret (run once during setup)
ALTER DATABASE postgres SET app.settings.webhook_url TO 'https://your-app.vercel.app';
ALTER DATABASE postgres SET app.settings.webhook_secret TO 'your-webhook-secret';
```

**Alternative (Supabase Dashboard):**
Use Supabase Database Webhooks UI instead of `pg_net` for easier configuration.

### 7.2 Webhook Trigger for Message Edits

```sql
-- Function to call webhook when message edited
CREATE OR REPLACE FUNCTION notify_message_edited()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger if content changed or edited flag set
  IF NEW.content <> OLD.content OR (NEW.is_edited AND NOT OLD.is_edited) THEN
    PERFORM net.http_post(
      url := current_setting('app.settings.webhook_url')::text || '/api/webhook/message-edited',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer ' || current_setting('app.settings.webhook_secret')::text || '"}'::jsonb,
      body := json_build_object(
        'old_record', row_to_json(OLD),
        'record', row_to_json(NEW),
        'type', 'UPDATE',
        'table', 'messages'
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on messages table
CREATE TRIGGER on_message_edited
  AFTER UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_message_edited();
```

### 7.3 Auto-Update Timestamps

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to message_statuses
CREATE TRIGGER update_message_statuses_updated_at
  BEFORE UPDATE ON message_statuses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## 8. Storage Buckets

### 8.1 voice-memos Bucket

**Purpose:** Store voice message audio files.

**Configuration:**
```sql
-- Create bucket (via Supabase Dashboard or API)
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-memos', 'voice-memos', false);
```

**Folder Structure:**
```
voice-memos/
  ├── {user_id_1}/
  │   ├── 1698012345678.m4a
  │   ├── 1698012456789.m4a
  │   └── ...
  ├── {user_id_2}/
  │   └── ...
```

**RLS Policies:**

```sql
-- Users can upload voice memos to their own folder
CREATE POLICY "Users can upload own voice memos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'voice-memos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Users can view voice memos in their conversations
CREATE POLICY "Users can view voice memos in own conversations"
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

-- Users can delete their own voice memos
CREATE POLICY "Users can delete own voice memos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'voice-memos'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Service role has full access
CREATE POLICY "Service has full access to voice memos"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'voice-memos');
```

**Storage Limits:**
- Max file size: 25MB per file
- File formats: M4A (iOS), MP3 (Android), WAV
- Retention: Files deleted when parent message deleted (manual cleanup job)

---

## 9. Sample Queries

### 9.1 Fetch Conversation List for User

```sql
-- Get all conversations for user, ordered by last message time
SELECT 
  c.id,
  c.name,
  c.type,
  c.created_at,
  (
    SELECT m.content
    FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS last_message,
  (
    SELECT m.created_at
    FROM messages m
    WHERE m.conversation_id = c.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) AS last_message_at,
  (
    SELECT COUNT(*)
    FROM messages m
    JOIN message_statuses ms ON ms.message_id = m.id
    WHERE m.conversation_id = c.id
    AND ms.user_id = $1 -- Current user ID
    AND ms.status != 'read'
  ) AS unread_count
FROM conversations c
JOIN conversation_participants cp ON cp.conversation_id = c.id
WHERE cp.user_id = $1 -- Current user ID
ORDER BY last_message_at DESC NULLS LAST;
```

**Performance:** Uses `idx_messages_conversation_created` and `idx_message_statuses_user_status`.

### 9.2 Fetch Messages in Conversation

```sql
-- Get last 50 messages in conversation with sender info
SELECT 
  m.id,
  m.content,
  m.message_type,
  m.voice_url,
  m.voice_duration_seconds,
  m.detected_language,
  m.created_at,
  m.edited_at,
  m.is_edited,
  m.sender_id,
  u.username AS sender_username,
  u.avatar_url AS sender_avatar
FROM messages m
JOIN users u ON u.id = m.sender_id
WHERE m.conversation_id = $1 -- Conversation ID
ORDER BY m.created_at DESC
LIMIT 50;
```

**Performance:** Uses `idx_messages_conversation_created`.

### 9.3 Get Translation for Message

```sql
-- Check if translation exists, otherwise return NULL
SELECT translated_content
FROM message_translations
WHERE message_id = $1 -- Message ID
AND target_language = $2 -- User's native language
LIMIT 1;
```

**Performance:** Uses `idx_message_translations_lookup`.

### 9.4 Count Read Receipts for Message

```sql
-- Get read receipt stats for message in group chat
SELECT 
  COUNT(*) FILTER (WHERE status = 'read') AS read_count,
  COUNT(*) AS total_recipients
FROM message_statuses
WHERE message_id = $1 -- Message ID
AND user_id != $2; -- Exclude sender
```

**Performance:** Uses `idx_message_statuses_message`.

### 9.5 Check if User Can Edit Message

```sql
-- Validate edit conditions before attempting UPDATE
SELECT 
  m.id,
  m.sender_id,
  m.message_type,
  m.created_at,
  (NOW() - m.created_at) < INTERVAL '5 minutes' AS within_time_limit,
  NOT EXISTS (
    SELECT 1 FROM message_translations mt
    WHERE mt.message_id = m.id
  ) AS no_translations_exist
FROM messages m
WHERE m.id = $1 -- Message ID
AND m.sender_id = $2; -- Current user ID
```

**Usage:** Check before showing "Edit" option in UI.

### 9.6 Get Slang Annotations for Message

```sql
-- Fetch slang explanations for message
SELECT 
  content->>'term' AS term,
  content->>'explanation' AS explanation,
  content->>'context' AS context
FROM ai_annotations
WHERE message_id = $1 -- Message ID
AND annotation_type = 'slang';
```

**Performance:** Uses `idx_ai_annotations_message`.

### 9.7 Get Cultural Hints for Conversation

```sql
-- Fetch recent cultural hints for conversation participants
SELECT DISTINCT ON (aa.id)
  aa.content->>'event' AS event,
  aa.content->>'description' AS description,
  aa.content->>'date' AS event_date,
  aa.content->>'country' AS country,
  aa.created_at
FROM ai_annotations aa
JOIN messages m ON m.id = aa.message_id
WHERE m.conversation_id = $1 -- Conversation ID
AND aa.annotation_type = 'cultural_hint'
AND aa.created_at > NOW() - INTERVAL '7 days'
ORDER BY aa.id, aa.created_at DESC;
```

**Usage:** Show cultural hints banner in chat.

### 9.8 Bulk Insert Message Statuses

```sql
-- Initialize statuses for all conversation participants when message sent
INSERT INTO message_statuses (message_id, user_id, status)
SELECT $1, cp.user_id, 'sent' -- Message ID
FROM conversation_participants cp
WHERE cp.conversation_id = $2 -- Conversation ID
AND cp.user_id != $3 -- Exclude sender
ON CONFLICT (message_id, user_id) DO NOTHING;
```

**Usage:** Called by backend after message inserted.

### 9.9 Clean Up Old Translations (Maintenance)

```sql
-- Delete translations for messages older than 30 days (cost savings)
DELETE FROM message_translations
WHERE message_id IN (
  SELECT id FROM messages
  WHERE created_at < NOW() - INTERVAL '30 days'
);
```

**Usage:** Optional cron job for cost optimization (not needed for MVP).

### 9.10 Get Typing Users in Conversation

**Note:** Typing state handled by Supabase Realtime Presence (ephemeral), not database queries.

```javascript
// Client-side example (not SQL)
const channel = supabase.channel(`conversation:${conversationId}`)
const presenceState = channel.presenceState()
const typingUsers = Object.values(presenceState)
  .filter(user => user.typing)
  .map(user => user.username)
```

---

## 10. Migration Scripts

### 10.1 Initial Migration (001_initial_schema.sql)

```sql
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

-- Conversation participants table
CREATE TABLE conversation_participants (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  expo_push_token text,
  default_formality text CHECK (default_formality IN ('casual', 'neutral', 'formal')),
  PRIMARY KEY (conversation_id, user_id)
);

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

-- Message statuses table
CREATE TABLE message_statuses (
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('sent', 'delivered', 'read')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

-- AI annotations table
CREATE TABLE ai_annotations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id uuid NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  annotation_type text NOT NULL CHECK (annotation_type IN ('slang', 'cultural_hint', 'formality')),
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT content_not_empty CHECK (jsonb_typeof(content) = 'object')
);

-- Create indexes
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_message_translations_lookup ON message_translations(message_id, target_language);
CREATE INDEX idx_message_statuses_message ON message_statuses(message_id);
CREATE INDEX idx_message_statuses_user_status ON message_statuses(user_id, status);
CREATE INDEX idx_conversation_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_ai_annotations_message ON ai_annotations(message_id);
CREATE INDEX idx_ai_annotations_type ON ai_annotations(annotation_type) WHERE annotation_type = 'cultural_hint';

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_annotations ENABLE ROW LEVEL SECURITY;
```

### 10.2 RLS Policies Migration (002_rls_policies.sql)

**Note:** See Section 6 for full policy definitions. Apply all policies in order.

### 10.3 Triggers Migration (003_triggers.sql)

**Note:** See Section 7 for trigger definitions. Apply after policies.

### 10.4 Storage Migration (004_storage.sql)

```sql
-- Create voice-memos bucket (if not using Supabase Dashboard)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('voice-memos', 'voice-memos', false, 26214400); -- 25MB limit

-- Apply storage RLS policies (see Section 8.1)
```

---

## Summary

This database schema provides:
- ✅ **Normalized structure** for data integrity
- ✅ **Performance indexes** on high-query columns
- ✅ **Comprehensive RLS policies** for security
- ✅ **Database triggers** for webhook automation
- ✅ **Flexible JSONB** for AI annotations
- ✅ **Cascade deletes** for clean data lifecycle
- ✅ **Migration scripts** for reproducible setup

**Total Tables:** 7 core tables + 1 storage bucket  
**Total Indexes:** 8 performance indexes  
**Total RLS Policies:** 25+ policies across all tables  
**Total Triggers:** 3 (message created, message edited, timestamp updates)

---

**End of Database Schema Document**
