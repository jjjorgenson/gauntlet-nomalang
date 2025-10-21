# NomaLang - Product Requirements Document

**Version:** 2.0  
**Last Updated:** Oct 19, 2025, 11:00pm CT  
**Product Managers:** [Your Team]  
**Status:** Ready for Implementation

---

## Executive Summary

**Product:** NomaLang - AI-powered messaging app for international communication  
**Tagline:** "Speak your language, connect with the world"  
**Target User:** International Communicator persona  
**Platform:** React Native + Expo (Android primary, iOS compatible)  
**Timeline:** 7 days (MVP in 24 hours)

---

## Timeline & Checkpoints

| Checkpoint | Deadline | Critical Requirements | Status |
|------------|----------|----------------------|--------|
| **MVP** | Tuesday, Oct 20, 9:00pm CT | Core messaging working (HARD GATE) | Pending |
| **Early Submission** | Friday, Oct 22, 10:59pm CT | MVP + 2-3 AI features | Pending |
| **Final Submission** | Sunday, Oct 24, 11:59pm CT | All features + demo | Pending |

---

## User Persona: International Communicator

### Who They Are
- People with friends/family/colleagues speaking different languages
- Travelers, digital nomads, expats
- International students
- Business people working across borders
- Language learners

### Core Pain Points
1. **Language barriers** - Can't communicate freely with non-native speakers
2. **Translation friction** - Copy-paste to Google Translate is tedious
3. **Context loss** - Literal translations miss nuance and tone
4. **Learning difficulty** - Hard to improve language skills in real conversations
5. **Formality confusion** - Don't know if message is too casual/formal

### How NomaLang Solves These
- **Inline translation** - Translate without leaving the app
- **Automatic detection** - App knows what language is being used
- **Context preservation** - AI maintains tone and cultural nuance
- **Learning assistance** - Explains idioms and cultural references
- **Formality control** - Adjust tone for different situations

---

## Success Criteria

### MVP (Pass/Fail Gate)
- ✅ Two users can send text messages in real-time
- ✅ Messages persist across app restarts
- ✅ Offline messages queue and send on reconnect
- ✅ Basic group chat (3+ users) works
- ✅ Push notifications fire (at least foreground)
- ✅ Read receipts track message state
- ✅ Online/offline status visible
- ✅ Typing indicators work

### Early Checkpoint (Friday)
- ✅ All MVP features stable
- ✅ Language Detection working
- ✅ Real-time Translation working
- ✅ Auto-Translate (optional setting) working
- ✅ Can demo AI features live

### Final Submission (Sunday)
- ✅ All 5 required AI features excellent
- ✅ 1 advanced AI feature working
- ✅ Polished UI/UX
- ✅ 5-7 minute demo video
- ✅ Deployed and testable

---

## Core Features

### MUST HAVE - MVP (Tuesday 9pm)

#### 1. One-on-One Chat
**Requirements:**
- Send/receive text messages
- Real-time delivery (< 2 second latency)
- Message timestamps (relative: "2m ago", "Yesterday")
- Sender attribution (name + avatar)
- Message bubbles (sender right, recipient left)

**Success Criteria:**
- User A sends message → User B sees it within 2 seconds
- Both users see same conversation history
- Messages ordered chronologically

---

#### 2. Message Persistence & Delivery Guarantee
**Requirements:**
- Messages survive app restart/crash
- At-least-once delivery guarantee
- No duplicate messages (idempotency)
- Local queue for offline messages
- Automatic retry on failure

**Architecture:**
```
Client generates UUID for message →
Store in local SQLite queue →
Send to Supabase with UUID →
Server: INSERT ON CONFLICT (id) DO NOTHING →
On success: Mark sent in local queue →
On failure: Retry with same UUID →
Result: Never lost, never duplicated ✅
```

**Success Criteria:**
- Send message → Kill app → Reopen → Message still sent
- Send offline → Go online → Message delivers automatically
- Rapid-fire 20 messages → All delivered, correct order, no duplicates

---

#### 3. Optimistic UI Updates
**Requirements:**
- Message appears instantly when sent
- Shows delivery state: Sending → Sent → Delivered → Read
- Visual feedback on each state
- Updates without refresh

**States:**
- **Sending:** Gray single check, message slightly transparent
- **Sent:** Gray single check, full opacity
- **Delivered:** Gray double check
- **Read:** Blue double check

**Success Criteria:**
- User sends message → Appears immediately in chat
- No "waiting" or "loading" state
- State updates visible in real-time

---

#### 4. Online/Offline Status
**Requirements:**
- Green dot = online (active in last 30 seconds)
- Gray dot = offline
- "Last seen" timestamp if offline
- Updates in real-time
- Presence tracked per user

**Implementation:**
- Heartbeat every 15 seconds while app active
- Supabase presence tracking
- Auto-cleanup after 30 seconds of inactivity

**Success Criteria:**
- User A opens app → User B sees green dot
- User A closes app → User B sees "Last seen 10s ago"
- Updates without refresh

---

#### 5. Typing Indicators
**Requirements:**
- "User is typing..." appears when they type
- Clears when they stop typing (3 second timeout)
- Shows in conversation header
- Real-time via Supabase

**Implementation:**
- Send typing event on keypress (debounced 500ms)
- Clear typing after 3 seconds of no activity
- Ephemeral (doesn't persist in DB)

**Success Criteria:**
- User A types → User B sees "typing..." within 1 second
- User A stops → Indicator clears after 3 seconds

---

#### 6. Read Receipts
**Requirements:**
- Track per message: Sent, Delivered, Read
- Visual indicators (check marks)
- Tracks per recipient (important for groups)
- Updates in real-time

**Implementation:**
- Message sent → Mark as sent
- Recipient app receives → Mark as delivered
- Recipient views conversation → Mark as read
- Store in `message_status` table

**Success Criteria:**
- Send message → See single check
- Recipient receives → See double check (gray)
- Recipient opens conversation → See double check (blue)

---

#### 7. Basic Group Chat
**Requirements:**
- Create group (name + participants)
- 3-100 participants
- Send message → All participants see it
- Shows who sent each message
- Read receipts per participant

**Implementation:**
- `conversations` table (type: "group")
- `participants` table (many-to-many)
- `message_status` tracks per participant
- Group messages have sender name/avatar

**Success Criteria:**
- Create group with 3 users → All see conversation
- User A sends message → Users B and C see it
- Shows "Read by 2 of 3"

---

#### 8. User Authentication & Profiles
**Requirements:**
- Email + password signup/login
- User profiles: name, avatar, preferred language
- Persistent sessions
- Secure (Supabase Auth)

**Profile Fields:**
- `id` (UUID)
- `email` (unique)
- `display_name`
- `avatar_url` (Supabase Storage)
- `preferred_language` (ISO code: en, es, fr, etc.)
- `auto_translate_enabled` (boolean)
- `push_token` (for notifications)

**Success Criteria:**
- User signs up → Account created
- User logs in → Access to conversations
- Session persists across app restarts

---

#### 9. Push Notifications
**Requirements:**
- Foreground: Toast notification in app
- Background: System notification
- Shows sender name + message preview
- Tapping opens conversation
- Works with Expo Push Notifications

**Implementation:**
- Store push tokens in users table
- Supabase Database Webhook triggers on new message
- Webhook calls Expo Push API
- Notification delivered to device

**Success Criteria:**
- Receive message while app open → Toast shows
- Receive message while app closed → System notification
- Tap notification → Opens to conversation

---

#### 10. Message Delivery States
**Visual States:**
- ⏳ Sending (pending in queue)
- ✓ Sent (delivered to server)
- ✓✓ Delivered (received by recipient device)
- ✓✓ Read (opened by recipient)

**Error States:**
- ❌ Failed (show retry button)
- ⚠️ Queued (offline, will send when online)

---

### SHOULD HAVE - AI Features

**Strategy:** Incremental implementation, each builds on previous

---

#### Feature #1: Language Detection
**Priority:** Foundation for all AI features  
**Difficulty:** 🟢 Low  
**Implementation Time:** 2-3 hours

**Requirements:**
- Detect language of any message automatically
- Support 20+ languages minimum
- Show language badge on message (small flag/code)
- Cache detection result (don't re-detect)

**Technical:**
```javascript
const detectLanguage = async (text) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [{
      role: "system",
      content: "Detect the language of the text. Respond with only the ISO 639-1 code (en, es, fr, etc.)"
    }, {
      role: "user",
      content: text
    }]
  });
  return response.choices[0].message.content.trim();
};
```

**Success Criteria:**
- English message → Shows "EN"
- Spanish message → Shows "ES"
- Mixed language → Detects primary language
- < 1 second response time

---

#### Feature #2: Real-time Translation
**Priority:** Core use case  
**Difficulty:** 🟢 Low  
**Implementation Time:** 3-4 hours  
**Depends On:** Feature #1

**Requirements:**
- Long-press message → "Translate" option
- Shows translation below original message
- Preserves original message
- Caches translation (instant on re-view)
- Translates to user's preferred language

**UI:**
```
┌─────────────────────────┐
│ Hola, ¿cómo estás?      │ ← Original
│ ─────────────────────   │
│ Hello, how are you?     │ ← Translation
└─────────────────────────┘
```

**Technical:**
```javascript
const translateMessage = async (text, sourceLang, targetLang) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [{
      role: "system",
      content: `Translate from ${sourceLang} to ${targetLang}. Preserve tone, formality, and context. Only return the translation, no explanations.`
    }, {
      role: "user",
      content: text
    }]
  });
  return response.choices[0].message.content;
};
```

**Caching:**
- Store in `translations` table: (message_id, target_lang, translation_text)
- Check cache before API call
- Saves API costs + instant results

**Success Criteria:**
- Long-press Spanish message → See English translation
- Translation appears in < 2 seconds
- Re-view message → Translation shows instantly (cached)
- Original message always visible

---

#### Feature #3: Auto-Translate
**Priority:** High - Removes friction  
**Difficulty:** 🟢 Low  
**Implementation Time:** 2-3 hours  
**Depends On:** Features #1 + #2

**Requirements:**
- Settings toggle: "Auto-translate messages"
- When enabled: Automatically translate incoming messages if different language
- Shows both original + translation
- Can be toggled per conversation or globally

**UI:**
```
Settings:
[✓] Auto-translate messages
    Preferred language: English

In chat (auto-translate ON):
┌─────────────────────────┐
│ Hola, ¿cómo estás?      │ ← Small/gray
│ Hello, how are you?     │ ← Large/primary
└─────────────────────────┘
```

**Logic:**
```javascript
// On message received
if (user.auto_translate_enabled && message.language !== user.preferred_language) {
  const translation = await translateMessage(
    message.text,
    message.language,
    user.preferred_language
  );
  display(message.text, translation); // Show both
}
```

**Success Criteria:**
- Enable auto-translate → All foreign messages auto-translated
- Disable → Messages show in original language only
- Toggle persists across sessions

---

#### Feature #4: Voice Transcription + Translation
**Priority:** Medium - Wow factor  
**Difficulty:** 🟡 Medium  
**Implementation Time:** 4-5 hours  
**Depends On:** Features #1 + #2

**Requirements:**
- Record voice message (hold button)
- Transcribe using Whisper API
- Auto-translate transcription
- Send as text message (not audio file)
- Show "🎤 Voice message" indicator

**Flow:**
```
User holds mic button →
Records audio →
Releases button →
Upload to Supabase Storage →
Call Whisper API (transcribe) →
Detect language (#1) →
Translate to recipient's language (#2) →
Send as text message →
Shows with 🎤 icon
```

**Technical:**
```javascript
const transcribeAudio = async (audioFile) => {
  const response = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
    language: "auto" // Auto-detect
  });
  return response.text;
};
```

**Success Criteria:**
- Record voice in Spanish → Recipient sees English text
- Transcription accurate (>90%)
- Works in noisy environment
- < 5 seconds from recording to message sent

---

#### Feature #5: Slang/Idiom Detection & Explanation
**Priority:** Medium - Helps learners  
**Difficulty:** 🟢 Low  
**Implementation Time:** 3-4 hours  
**Depends On:** Features #1 + #2

**Requirements:**
- Automatically detect slang, idioms, colloquialisms
- Show info icon (ℹ️) next to message
- Tap icon → See explanation + cultural context
- Helps language learners understand expressions

**Examples:**
- "break a leg" → "Means 'good luck' in English theater tradition"
- "piece of cake" → "Means something is very easy"
- "it's raining cats and dogs" → "Means it's raining heavily"

**UI:**
```
┌──────────────────────────────┐
│ Good luck, break a leg! ℹ️   │
└──────────────────────────────┘

Tap ℹ️ → Modal:
┌──────────────────────────────┐
│ "break a leg"                │
│                              │
│ Meaning: Good luck           │
│                              │
│ Context: Common expression   │
│ in theater. Saying "good     │
│ luck" is considered bad luck,│
│ so people say the opposite.  │
└──────────────────────────────┘
```

**Technical:**
```javascript
const detectIdioms = async (text, language) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [{
      role: "system",
      content: `Analyze the text for idioms, slang, or colloquialisms in ${language}. Return JSON: { hasIdioms: boolean, idioms: [{ phrase, meaning, culturalContext }] }`
    }, {
      role: "user",
      content: text
    }],
    response_format: { type: "json_object" }
  });
  return JSON.parse(response.choices[0].message.content);
};
```

**Success Criteria:**
- Detects common idioms accurately
- Explanations are culturally relevant
- Works for 10+ languages
- Helpful for non-native speakers

---

#### Feature #6: Formality Adjustment
**Priority:** High - Solves business use case  
**Difficulty:** 🟢 Low  
**Implementation Time:** 3-4 hours  
**Depends On:** Features #1 + #2

**Requirements:**
- Before sending, tap "Adjust Formality" button
- Choose level: Very Formal, Formal, Neutral, Casual, Very Casual
- AI rewrites message in selected tone
- Preview → Send rewritten version
- Preserves meaning, changes tone only

**UI:**
```
Message input:
┌──────────────────────────────┐
│ hey boss need that report    │
└──────────────────────────────┘
     ↓
Tap "Adjust Formality":
┌──────────────────────────────┐
│ ● Very Formal                │
│ ○ Formal                     │
│ ○ Neutral                    │
│ ○ Casual                     │
│ ○ Very Casual                │
└──────────────────────────────┘
     ↓
Preview:
┌──────────────────────────────┐
│ Dear Sir/Madam,              │
│                              │
│ I kindly request the report  │
│ at your earliest convenience.│
│                              │
│ Best regards                 │
└──────────────────────────────┘
[Cancel] [Send]
```

**Technical:**
```javascript
const adjustFormality = async (text, level, sourceLang, targetLang) => {
  const formalityPrompts = {
    "very-formal": "extremely polite, professional, deferential tone",
    "formal": "professional and respectful tone",
    "neutral": "standard, balanced tone",
    "casual": "friendly, relaxed tone",
    "very-casual": "very informal, using slang if appropriate"
  };
  
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [{
      role: "system",
      content: `Rewrite the message in ${targetLang} with a ${formalityPrompts[level]}. Preserve the core meaning. Only return the rewritten message.`
    }, {
      role: "user",
      content: text
    }]
  });
  return response.choices[0].message.content;
};
```

**Use Cases:**
- Texting boss → Very Formal
- Texting friend → Very Casual
- Professional networking → Formal
- Family chat → Casual

**Success Criteria:**
- "hey need help" → "I would appreciate your assistance"
- Meaning preserved
- Tone clearly different
- Works in multiple languages

---

#### Feature #7: Cultural Context Hints
**Priority:** Medium - Adds depth  
**Difficulty:** 🟡 Medium  
**Implementation Time:** 3-4 hours  
**Depends On:** Features #1 + #2 + #5

**Requirements:**
- Detect cultural references in messages
- Provide context about customs, holidays, traditions
- Helps users understand subtext
- Shows as expandable hint

**Examples:**
- "Happy Diwali!" → "Diwali is the Hindu festival of lights, celebrated in October/November"
- "We're having Thanksgiving dinner" → "US holiday on 4th Thursday of November, family gathering tradition"
- "Got omiyage for you" → "Japanese custom of bringing back gifts when traveling"

**UI:**
```
┌──────────────────────────────┐
│ Happy Diwali! 🪔 ℹ️          │
└──────────────────────────────┘

Tap ℹ️:
┌──────────────────────────────┐
│ Cultural Context             │
│                              │
│ Diwali (Festival of Lights)  │
│ is one of the most important │
│ Hindu festivals. It celebrates│
│ the victory of light over    │
│ darkness. People light lamps,│
│ exchange gifts, and share    │
│ sweets with family.          │
└──────────────────────────────┘
```

**Technical:**
```javascript
const detectCulturalContext = async (text, language) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [{
      role: "system",
      content: "Identify cultural references, holidays, traditions, or customs in the text. Provide brief explanations that would help someone from a different culture understand. Return JSON."
    }, {
      role: "user",
      content: text
    }],
    response_format: { type: "json_object" }
  });
  return JSON.parse(response.choices[0].message.content);
};
```

**Success Criteria:**
- Detects major holidays and customs
- Explanations are accurate and respectful
- Helps users avoid cultural misunderstandings
- Works for diverse cultures

---

### ADVANCED AI FEATURE (Choose 1)

#### Feature #8: Context-Aware Smart Replies ⭐ PRIMARY CHOICE
**Priority:** High - Great UX  
**Difficulty:** 🟡 Medium  
**Implementation Time:** 5-6 hours  
**Depends On:** All previous features

**Requirements:**
- Analyze conversation context
- Generate 3 contextually appropriate reply suggestions
- In user's preferred language
- One-tap to send
- Learns user's communication style over time

**UI:**
```
Received: "Want to grab lunch tomorrow?"

Smart Replies:
┌──────────────────────────────┐
│ Sure! What time?             │ ← Tap to send
├──────────────────────────────┤
│ Sorry, I'm busy tomorrow     │
├──────────────────────────────┤
│ Sounds great, where?         │
└──────────────────────────────┘
```

**Technical:**
```javascript
const generateSmartReplies = async (conversationHistory, userStyle) => {
  // Get last 10 messages for context
  const context = conversationHistory.slice(-10);
  
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [{
      role: "system",
      content: `Generate 3 short, contextually appropriate replies in ${userStyle.language}. Match the user's typical tone: ${userStyle.formality}. Consider conversation context. Return JSON array of reply strings.`
    }, {
      role: "user",
      content: JSON.stringify(context)
    }],
    response_format: { type: "json_object" }
  });
  
  return JSON.parse(response.choices[0].message.content).replies;
};
```

**Style Learning:**
- Track user's message length (short/long)
- Track formality level (formal/casual)
- Track emoji usage
- Store as user preferences
- Use in future suggestions

**Success Criteria:**
- Suggestions are contextually relevant
- Responses sound natural, not robotic
- Matches user's typical communication style
- < 2 seconds to generate suggestions

---

### BONUS "WOW FACTOR" FEATURES (Time Permitting)

#### Feature #9: Live Voice Translation (Streaming)
**Priority:** Low - Ultimate wow factor  
**Difficulty:** 🔴 High  
**Implementation Time:** 6-8 hours  
**Depends On:** All previous features

**Requirements:**
- Speak continuously
- Real-time transcription (streaming)
- Live translation as you speak
- Adjustable formality level
- Shows both transcription + translation in real-time

**Flow:**
```
You speak: "Hey, I wanted to ask if you could..."
↓ (streaming)
Transcription: "Hey, I wanted to ask if you could"
Translation: "Oye, quería preguntar si podrías"
↓ (continue)
You speak: "...help me with this project tomorrow"
↓
Transcription: "Hey, I wanted to ask if you could help me with this project tomorrow"
Translation: "Oye, quería preguntar si podrías ayudarme con este proyecto mañana"
```

**Technical:**
- Audio capture in 1-2 second chunks
- Whisper API for transcription (streaming)
- Debounce at sentence boundaries (detect pause)
- Translate complete sentences
- Apply formality adjustment
- Display both streams in real-time

**Why Debouncing Matters:**
- Don't translate mid-word or mid-sentence
- Wait for natural pauses
- More accurate context for translation
- Better formality application

**Success Criteria:**
- < 1 second delay from speech to translation
- Accurate transcription (>90%)
- Natural translation with correct formality
- Smooth streaming experience

---

## Technical Architecture

### Tech Stack

**Frontend:**
- React Native 0.74+
- Expo SDK 51+
- Expo Router (navigation)
- Expo SQLite (local storage)
- React Context + Hooks (state management)
- React Native Paper (UI components)

**Backend:**
- Supabase PostgreSQL (database)
- Supabase Realtime (WebSocket)
- Supabase Auth (authentication)
- Supabase Storage (images/audio)
- Supabase Edge Functions (AI integration)

**AI:**
- OpenAI GPT-4-turbo (translation, analysis)
- OpenAI Whisper (voice transcription)
- Called via Supabase Edge Functions (secure)

**Push Notifications:**
- Expo Push Notifications
- Triggered by Supabase Database Webhooks

**Development:**
- Primary: Android phone (physical device)
- Secondary: Android Emulator
- Testing: adb, Expo Go

---

### Database Schema

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  preferred_language TEXT DEFAULT 'en', -- ISO 639-1 code
  auto_translate_enabled BOOLEAN DEFAULT false,
  push_token TEXT,
  last_seen TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### conversations
```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL, -- 'direct' or 'group'
  name TEXT, -- Group name (null for direct)
  avatar_url TEXT, -- Group avatar (null for direct)
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### participants
```sql
CREATE TABLE participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(conversation_id, user_id)
);
```

#### messages
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY, -- Generated client-side for idempotency
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  detected_language TEXT, -- ISO 639-1 code
  is_voice_message BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  server_created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_id ON messages(id); -- For idempotency check
```

#### message_status
```sql
CREATE TABLE message_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL, -- 'sent', 'delivered', 'read'
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, user_id)
);
```

#### translations (cache)
```sql
CREATE TABLE translations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  target_language TEXT NOT NULL,
  translation_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(message_id, target_language)
);

CREATE INDEX idx_translations_lookup ON translations(message_id, target_language);
```

#### typing_indicators (ephemeral - short TTL)
```sql
CREATE TABLE typing_indicators (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  updated_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY(conversation_id, user_id)
);

-- Auto-delete after 5 seconds
-- Implemented via Supabase Realtime (ephemeral)
```

---

### Message Flow Architecture

#### Sending a Message (At-Least-Once Delivery)

```
1. User types message, taps send
   ↓
2. Generate UUID client-side (e.g., crypto.randomUUID())
   ↓
3. Create message object:
   {
     id: UUID,
     text: "Hello",
     conversation_id: "...",
     sender_id: "...",
     created_at: Date.now()
   }
   ↓
4. Insert into local SQLite queue:
   status: 'pending'
   ↓
5. Display message optimistically in UI
   Show: "Sending..." (gray check)
   ↓
6. Send to Supabase:
   INSERT INTO messages (id, ...) VALUES (UUID, ...)
   ON CONFLICT (id) DO NOTHING  ← Idempotency!
   ↓
7a. Success:
    - Mark as 'sent' in local queue
    - Update UI: "Sent" (gray check)
    - Delete from queue
   ↓
7b. Failure (network error):
    - Keep in queue with status: 'retry'
    - Show: "Queued" (clock icon)
    - Retry every 5 seconds
    - Same UUID ensures no duplicates
   ↓
8. Supabase Realtime broadcasts to recipients
   ↓
9. Recipients receive, mark as 'delivered'
   ↓
10. Sender sees: "Delivered" (double gray check)
```

#### Receiving a Message

```
1. Supabase Realtime emits INSERT event
   ↓
2. Client receives message object
   ↓
3. Check: Is this my own message? (sender_id === my_id)
   Yes: Ignore (already displayed optimistically)
   No: Continue
   ↓
4. Insert into local SQLite (cache)
   ↓
5. Render in conversation UI
   ↓
6. If conversation is currently open:
   - Send 'read' status to server
   - Update message_status: status='read'
   Else:
   - Send 'delivered' status
   - Show notification
   ↓
7. Supabase broadcasts status update
   ↓
8. Sender receives status update
   ↓
9. Sender sees: "Read" (blue double check)
```

---

### Realtime Subscriptions

```javascript
// Subscribe to messages in conversation
const subscription = supabase
  .channel(`conversation:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, handleNewMessage)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'message_status',
    filter: `message_id=in.(${messageIds})`
  }, handleStatusUpdate)
  .on('presence', { event: 'sync' }, handle