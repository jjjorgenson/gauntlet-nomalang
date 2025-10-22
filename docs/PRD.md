# Product Requirements Document (PRD)
## Multilingual Family Chat Application

**Version:** 1.0  
**Last Updated:** October 22, 2025  
**Project Type:** Class Project  
**Target Users:** 10-100 users  

---

## 1. Executive Summary

### 1.1 Product Overview
A real-time messaging mobile application designed for multilingual family communication. The app automatically detects languages, translates messages in real-time, provides cultural context, and explains slang to bridge communication gaps across generations and geographies.

### 1.2 Problem Statement
Families with members speaking different languages or living in different countries face communication barriers:
- Language differences prevent natural conversation flow
- Slang and generational language gaps create misunderstandings
- Cultural context (holidays, customs) is often missed
- Voice messages are inaccessible to non-native speakers
- Formality levels vary across cultures, causing awkwardness

### 1.3 Solution
An AI-powered chat application that:
- Automatically translates messages between any languages
- Transcribes and translates voice messages
- Explains slang terms on-demand
- Provides cultural hints about holidays and customs
- Adjusts message formality levels
- Works seamlessly across languages in real-time

### 1.4 Success Metrics
- All core features working in demo
- <2 second translation latency
- 95%+ translation accuracy (subjective evaluation)
- Voice transcription accuracy >90%
- Zero crashes during demo
- Positive professor/peer feedback

---

## 2. Product Scope

### 2.1 In Scope (MVP)
1. Real-time one-on-one and group chat (up to 10+ users)
2. Auto-detection and translation of messages
3. Voice message recording with auto-transcription and translation
4. On-demand slang explanation
5. Proactive cultural hints (holidays, customs)
6. Message formality adjustment (casual/neutral/formal)
7. Read receipts with status indicators
8. Message editing (with restrictions)
9. Typing indicators
10. Push notifications
11. Offline message persistence
12. Dark mode theme
13. User authentication and profiles

### 2.2 Out of Scope
- End-to-end encryption
- Image/GIF sharing
- Message reactions (emoji)
- Voice/video calls
- Message deletion
- Group admin features (kick/ban)
- Message search
- Advanced profile customization
- Message forwarding
- Disappearing messages

### 2.3 Future Considerations (Post-Class)
- Image translation (OCR + translation)
- Video messages
- Calendar integration for cultural events
- Language learning suggestions
- Conversation summaries
- Multi-device sync

---

## 3. User Personas

### Persona 1: "Grandma Maria" (Primary)
- **Age:** 68
- **Location:** Mexico City
- **Language:** Spanish (native), limited English
- **Tech Savvy:** Low
- **Use Case:** Wants to talk to grandchildren in the US but struggles with English
- **Pain Points:** Can't understand slang, misses cultural references, voice messages are hard
- **Needs:** Simple interface, automatic translation, voice-to-text

### Persona 2: "Alex" (Secondary)
- **Age:** 22
- **Location:** California, USA
- **Language:** English (native), some Spanish
- **Tech Savvy:** High
- **Use Case:** Stays in touch with family abroad, uses lots of slang
- **Pain Points:** Grandmother doesn't understand "no cap" or "fr fr"
- **Needs:** Slang explanations for recipients, formality adjustment

### Persona 3: "Yuki" (Tertiary)
- **Age:** 35
- **Location:** Tokyo, Japan
- **Language:** Japanese (native), English (intermediate)
- **Tech Savvy:** Medium
- **Use Case:** Communicates with international team and family
- **Pain Points:** Misses American holidays/customs, struggles with casual tone
- **Needs:** Cultural context, formality help

---

## 4. Core Features Specification

### 4.1 Messaging Core

#### 4.1.1 Real-Time Chat
**Description:** Users can send and receive text messages instantly.

**Requirements:**
- Messages appear in real-time (<500ms latency)
- Support for one-on-one conversations
- Support for group conversations (3-50 users)
- Messages persist across app restarts
- Optimistic UI updates (message appears before server confirmation)
- Message timestamps (relative: "2m ago" or absolute: "10:30 AM")

**Technical Notes:**
- Uses Supabase Realtime for live updates
- Local caching with AsyncStorage for offline support

---

#### 4.1.2 Message Editing
**Description:** Users can edit their sent text messages under specific conditions.

**Requirements:**
- **Editable if:**
  - Message type is TEXT (not voice)
  - Within 5 minutes of sending
  - No recipient has translated it yet
- **Not editable if:**
  - After 5 minutes
  - Any recipient already translated
  - Message is a voice message
- **When edited:**
  - Shows "edited" badge on message
  - All translations are invalidated
  - Re-triggers translation pipeline
  - Recipients receive notification of edit
- **UI:** Long-press message → "Edit" option → Edit mode with pre-filled text

**Edge Cases:**
- If translation is in progress when edit happens, cancel translation
- If multiple people try to translate simultaneously, first translation wins (blocks edit)

---

#### 4.1.3 Read Receipts
**Description:** Visual indicators showing message delivery and read status.

**Requirements:**
- **Status Types:**
  - **Sent:** Grey checkmark (✓) - message sent to server
  - **Delivered:** Blue checkmark (✓) - message delivered to recipient device
  - **Read:** Green checkmark (✓) - recipient opened and viewed message
- **One-on-One Chat:**
  - Single checkmark for sent
  - Double checkmark for delivered/read
- **Group Chat (<10 users):**
  - Grey checkmark: sent
  - Blue number badge: "3" = 3 people read
  - Green checkmark: all members read
- **Group Chat (≥10 users):**
  - Read receipts disabled (too noisy)
  - Only show sent/delivered status
- **Privacy:**
  - Show aggregated counts only (not individual names)
  - Users CANNOT disable sending read receipts (required for feature demo)

**Technical Notes:**
- `message_statuses` table tracks status per user
- Real-time updates via Supabase subscriptions

---

#### 4.1.4 Typing Indicators
**Description:** Real-time indicators showing when other users are typing.

**Requirements:**
- **Behavior:**
  - Appears on first keypress (no delay)
  - Disappears after 2.9 seconds of no typing
  - Shows "Alice is typing..." for one user
  - Shows "Alice and Bob are typing..." for multiple users
- **Display:**
  - At bottom of chat screen
  - Subtle animation (three dots)
  - Does not disrupt message reading
- **Privacy:**
  - Only shows in active conversation
  - Stops when user leaves chat screen

**Technical Notes:**
- Uses Supabase Realtime Presence API (ephemeral state)
- No database persistence needed

---

#### 4.1.5 Offline Support
**Description:** Messages persist locally and sync when connection restored.

**Requirements:**
- **Offline Actions:**
  - Read previously loaded messages
  - Compose new messages (queued)
  - View cached translations
- **When Back Online:**
  - Auto-send queued messages
  - Download new messages
  - Sync read receipts
- **Storage:**
  - Last 100 messages per conversation cached locally
  - User profile data cached
  - Translations cached while original message exists

**Technical Notes:**
- AsyncStorage for local persistence
- Supabase handles sync automatically on reconnection

---

### 4.2 AI-Powered Translation

#### 4.2.1 Automatic Message Translation
**Description:** Messages are automatically translated to each recipient's preferred language.

**Requirements:**
- **Detection:**
  - Client-side language detection using `franc` library
  - If confidence <80%, fallback to OpenAI API detection
  - Detected language stored in `messages.detected_language`
- **Translation:**
  - Async process (happens after message is saved)
  - Shows "Translating..." indicator briefly
  - One translation per target language (not per recipient)
  - Cached for 30 days or until original message deleted
- **Display:**
  - Default: Show translated version
  - Tap to toggle between original and translation
  - Original language indicator badge (e.g., "ES" for Spanish)
- **Supported Languages:**
  - All major languages supported by OpenAI
  - Minimum: English, Spanish, Mandarin, Japanese, French, German, Arabic, Hindi

**Edge Cases:**
- If translation fails, show original with error badge
- If message is already in recipient's language, no translation needed
- Mixed-language messages handled as single language (detect primary)

**Technical Notes:**
- OpenAI GPT-4o-mini for cost-effective translation
- Preserves tone, formality, and cultural context
- `message_translations` table for caching

---

#### 4.2.2 Voice Message Transcription & Translation
**Description:** Voice messages are automatically transcribed to text and translated.

**Requirements:**
- **Recording:**
  - Tap-and-hold to record (max 2 minutes)
  - Visual waveform animation during recording
  - Cancel by swiping left, send by releasing
- **Processing:**
  - Auto-upload to Supabase Storage (`voice-memos` bucket)
  - Auto-transcribe using OpenAI Whisper API
  - Auto-translate transcription to recipient languages
- **Display:**
  - Play button for original audio
  - Transcription text shown below (in original language)
  - Translated text shown (in recipient's language)
  - Duration indicator (e.g., "0:45")
- **Editing:**
  - Voice messages CANNOT be edited
  - Only option is delete and re-record

**Edge Cases:**
- If transcription fails, show "Transcription unavailable" with play button
- Low audio quality → notify sender to re-record
- Background noise detection → warn user

**Technical Notes:**
- OpenAI Whisper API with automatic language detection
- Audio format: M4A (iOS), MP3 (Android)
- Max file size: 25MB (approx 2 min at high quality)

---

#### 4.2.3 Slang Detection & Explanation
**Description:** Users can request explanations of slang terms in messages.

**Requirements:**
- **Trigger:** User taps "What does this mean?" button on any message
- **Detection:**
  - OpenAI analyzes message for slang/colloquialisms
  - Identifies specific terms and their meanings
  - Provides cultural context if relevant
- **Display:**
  - Inline tooltip or modal showing:
    - Slang term highlighted
    - Plain language explanation
    - Usage example
    - Regional/generational context
- **Caching:**
  - Explanations stored in `ai_annotations` table
  - Same slang explanation reused across conversations

**Examples:**
- "no cap" → "no lie, for real (Gen Z slang)"
- "¿Qué onda?" → "What's up? (Mexican Spanish, casual)"
- "やばい (yabai)" → "Awesome/terrible (Japanese, context-dependent)"

**Edge Cases:**
- If no slang detected, show "No slang found in this message"
- Multiple slang terms → show all explanations
- Ambiguous terms → provide multiple meanings

**Technical Notes:**
- OpenAI GPT-4o-mini with JSON response format
- On-demand only (not automatic) to reduce API costs

---

#### 4.2.4 Formality Adjustment
**Description:** Users can rewrite messages at different formality levels before sending.

**Requirements:**
- **Trigger:** Tap magic wand icon (✨) in compose area
- **Options:**
  - **Casual:** Informal, friendly, uses contractions
  - **Neutral:** Standard, polite, balanced
  - **Formal:** Professional, respectful, no slang
- **Display:**
  - Modal showing all 3 versions side-by-side
  - User taps preferred version to use it
  - Original text preserved if user cancels
- **Settings:**
  - Per-conversation default formality level
  - E.g., "Always use Formal with Boss"

**Examples:**
- Original: "Hey, can u send that?"
- Casual: "Hey! Can you send that over?"
- Neutral: "Hello, could you please send that?"
- Formal: "Good afternoon, would you kindly send that document?"

**Edge Cases:**
- Very short messages (<5 words) may have minimal changes
- Already formal messages → formal option unchanged
- Emoji/punctuation preserved when appropriate

**Technical Notes:**
- OpenAI GPT-4o-mini generates all 3 versions in one call
- Preserves meaning and original language

---

#### 4.2.5 Cultural Hints
**Description:** Proactive notifications about holidays and cultural events relevant to conversation participants.

**Requirements:**
- **Detection:**
  - Daily cron job (Vercel Cron at midnight UTC)
  - Checks upcoming holidays (next 7 days) for all user countries/languages
  - Stored in `ai_annotations` table with `cultural_hint` type
- **Display:**
  - Banner at top of chat (dismissible)
  - Icon: 💡 or 🌍
  - Example: "Today is Día de los Muertos in Mexico - a day to honor deceased loved ones with altars and offerings"
- **Trigger Conditions:**
  - Conversation has participants from different countries
  - Holiday is significant (major national/cultural holiday)
  - User hasn't dismissed this hint yet
- **Content:**
  - Holiday/event name
  - Brief description (1-2 sentences)
  - Cultural significance
  - Location/region

**Examples:**
- "Today is Diwali in India - the festival of lights celebrating the victory of light over darkness"
- "Tomorrow is Thanksgiving in the US - a day for family gatherings and gratitude"
- "Today is 七夕 (Tanabata) in Japan - a festival celebrating the meeting of two star-crossed lovers"

**Edge Cases:**
- Multiple holidays on same day → show most relevant to participant
- Holidays with different dates each year (lunar calendar) → dynamically calculated
- Regional variations (US vs. Canada Thanksgiving) → show both if relevant

**Technical Notes:**
- OpenAI API checks holiday databases + generates descriptions
- Cached per country per date
- Vercel Cron triggers daily job

---

### 4.3 User Experience

#### 4.3.1 User Authentication
**Description:** Secure account creation and login.

**Requirements:**
- **Sign Up:**
  - Email + password
  - Username (unique)
  - Native language selection (required)
  - Optional: Profile picture
- **Login:**
  - Email + password
  - Remember me option
- **Profile:**
  - Editable: Username, avatar, native language, timezone
  - Read-only: Email (can't change post-signup)

**Technical Notes:**
- Supabase Auth with email/password
- JWT tokens for session management

---

#### 4.3.2 Conversation Management
**Description:** Create and manage one-on-one and group conversations.

**Requirements:**
- **Create Conversation:**
  - One-on-one: Select one contact → starts chat
  - Group: Select 2+ contacts → enter group name → create
- **Conversation List:**
  - Shows all conversations sorted by last message time
  - Preview of last message (translated if needed)
  - Unread message count badge
  - Typing indicator if someone typing
- **Conversation Settings:**
  - Group name (editable by any member)
  - Add participants (any member can add)
  - Leave conversation (removes self from participants)
  - Default formality level for this conversation

**UI:**
- Bottom tab navigation: Chats | Settings
- Swipe right on conversation → Delete/Archive (out of scope for MVP)

---

#### 4.3.3 Push Notifications
**Description:** Real-time notifications for new messages when app is in background.

**Requirements:**
- **Triggers:**
  - New message received
  - Message edited by sender
  - Voice message transcription complete
- **Content:**
  - Sender name
  - Message preview (first 100 characters)
  - Conversation name (if group)
  - Translated version if recipient's language differs
- **Behavior:**
  - Tapping notification opens conversation
  - Sound + vibration (user can disable in OS settings)
  - Badge count on app icon

**Technical Notes:**
- Expo Push Notifications
- Push tokens stored in `conversation_participants.expo_push_token`
- Sent from Vercel backend after message processing

---

#### 4.3.4 Dark Mode
**Description:** Theme toggle between light, dark, and system default.

**Requirements:**
- **Options:**
  - System Default (follows OS setting)
  - Light Mode
  - Dark Mode
- **Settings Location:**
  - Settings screen → Theme selector
- **Persistence:**
  - Saved in Supabase `users.theme_preference`
- **Colors:**
  - Light: White background, green sent bubbles, grey received bubbles
  - Dark: Black background, dark green sent bubbles, dark grey received bubbles

**Technical Notes:**
- React Native `useColorScheme()` for system detection
- Theme context provider for app-wide access

---

## 5. Technical Requirements

### 5.1 Platform Support
- **Mobile:** iOS 13+ and Android 8+
- **Development:** Expo Go for testing
- **Deployment:** TestFlight (iOS) and APK (Android) for demo

### 5.2 Performance Requirements
- **Message Send Latency:** <500ms (optimistic UI)
- **Translation Latency:** <2 seconds
- **Voice Transcription:** <10 seconds for 1-minute audio
- **App Launch:** <3 seconds on mid-range device
- **Offline Support:** Last 100 messages per conversation

### 5.3 Security Requirements
- **Authentication:** Supabase Auth with secure JWT tokens
- **Data Access:** Row Level Security (RLS) policies on all tables
- **API Keys:** Stored in Vercel environment variables (never in code)
- **HTTPS:** All network traffic encrypted in transit
- **Storage:** Voice memos in private Supabase Storage bucket

### 5.4 Scalability Requirements
- **Users:** 10-100 active users (class project scale)
- **Messages:** Up to 10,000 messages/day
- **Concurrent Users:** Up to 50 simultaneous users
- **Storage:** Up to 5GB (voice memos + database)

### 5.5 API Rate Limits
- **OpenAI:**
  - Translation: 3,500 requests/minute (paid tier)
  - Whisper: 50 requests/minute
  - Total budget: $30/month
- **Supabase:**
  - Free tier limits: 500MB database, 1GB file storage, 2GB bandwidth
- **Vercel:**
  - Free tier: 100 GB-hours serverless execution/month

---

## 6. User Flows

### 6.1 Send Text Message Flow
1. User opens conversation
2. User types message in compose area
3. Typing indicator shows for other participants
4. User taps send button
5. Message appears immediately (optimistic UI)
6. Message sent to Supabase
7. Backend detects language
8. Backend checks recipient languages
9. Backend translates if needed
10. Recipients receive translated message + push notification
11. Read receipts update as recipients view message

### 6.2 Send Voice Message Flow
1. User taps and holds microphone icon
2. Recording starts with waveform animation
3. User speaks (max 2 minutes)
4. User releases to send (or swipes to cancel)
5. Audio uploads to Supabase Storage
6. Message appears with "Transcribing..." indicator
7. Backend transcribes with Whisper API
8. Backend translates transcription
9. Recipients receive voice message with transcription + translation
10. Recipients can play audio or read text

### 6.3 Edit Message Flow
1. User long-presses own message (sent <5 min ago)
2. "Edit" option appears if conditions met (no translations exist, text message)
3. User taps "Edit"
4. Compose area pre-fills with message text
5. User edits text
6. User taps send
7. Message updates with "edited" badge
8. Backend invalidates old translations
9. Backend re-translates for recipients
10. Recipients see updated message with "edited" indicator

### 6.4 Explain Slang Flow
1. User receives message with unfamiliar slang
2. User taps "What does this mean?" button
3. Loading indicator appears
4. Backend analyzes message with OpenAI
5. Modal appears with slang explanations
6. User reads explanation and closes modal
7. Explanation cached for future reference

### 6.5 Adjust Formality Flow
1. User types message in compose area
2. User taps magic wand (✨) icon
3. Loading indicator appears
4. Backend generates 3 formality versions
5. Modal shows casual, neutral, formal options
6. User taps preferred version
7. Compose area updates with selected version
8. User sends message

---

## 7. Data Model

### 7.1 Database Tables

#### users
- `id` (uuid, primary key)
- `email` (text, unique)
- `username` (text, unique)
- `avatar_url` (text, nullable)
- `native_language` (text, default 'en')
- `timezone` (text, nullable)
- `theme_preference` (text, default 'system')
- `created_at` (timestamp)

#### conversations
- `id` (uuid, primary key)
- `name` (text, nullable) - only for group chats
- `type` (enum: 'direct', 'group')
- `created_at` (timestamp)

#### conversation_participants
- `conversation_id` (uuid, foreign key)
- `user_id` (uuid, foreign key)
- `joined_at` (timestamp)
- `expo_push_token` (text, nullable)
- `default_formality` (enum: 'casual', 'neutral', 'formal', nullable)
- Primary key: (conversation_id, user_id)

#### messages
- `id` (uuid, primary key)
- `conversation_id` (uuid, foreign key)
- `sender_id` (uuid, foreign key)
- `content` (text)
- `message_type` (enum: 'text', 'voice')
- `voice_url` (text, nullable) - Supabase Storage path
- `voice_duration_seconds` (int, nullable)
- `detected_language` (text, nullable)
- `created_at` (timestamp)
- `edited_at` (timestamp, nullable)
- `is_edited` (boolean, default false)

#### message_translations
- `id` (uuid, primary key)
- `message_id` (uuid, foreign key)
- `target_language` (text)
- `translated_content` (text)
- `created_at` (timestamp)
- Unique constraint: (message_id, target_language)

#### message_statuses
- `message_id` (uuid, foreign key)
- `user_id` (uuid, foreign key)
- `status` (enum: 'sent', 'delivered', 'read')
- `updated_at` (timestamp)
- Primary key: (message_id, user_id)

#### ai_annotations
- `id` (uuid, primary key)
- `message_id` (uuid, foreign key)
- `annotation_type` (enum: 'slang', 'cultural_hint', 'formality')
- `content` (jsonb) - flexible structure
- `created_at` (timestamp)

### 7.2 Storage Buckets
- **voice-memos**: Private bucket for voice message audio files
  - Path structure: `{user_id}/{timestamp}.m4a`
  - Max file size: 25MB
  - Retention: While original message exists

---

## 8. API Endpoints

### 8.1 Webhooks (from Supabase)
- `POST /api/webhook/message-created` - Triggered when new message inserted
- `POST /api/webhook/message-edited` - Triggered when message updated

### 8.2 User-Facing Endpoints
- `POST /api/transcribe-voice` - Transcribe voice message
- `POST /api/adjust-formality` - Generate formality variations
- `POST /api/explain-slang` - Explain slang in message
- `PATCH /api/messages/:id` - Edit message (validates conditions)

### 8.3 Scheduled Jobs (Vercel Cron)
- `GET /api/cron/cultural-hints` - Daily job at midnight UTC

---

## 9. Non-Functional Requirements

### 9.1 Usability
- **Learning Curve:** New user can send first message within 2 minutes
- **Accessibility:** Font sizes respect OS settings, high contrast mode support
- **Error Messages:** Clear, actionable error messages (e.g., "Translation failed. Tap to retry.")

### 9.2 Reliability
- **Uptime:** 99%+ during demo period
- **Data Loss:** Zero message loss (all messages persisted)
- **Offline Resilience:** App works offline for reading/composing

### 9.3 Maintainability
- **Documentation:** All code documented, README with setup instructions
- **Code Quality:** Linted with ESLint, formatted with Prettier
- **Language:** JavaScript (ES6+) only - no TypeScript, no build/compile step
- **Testing:** Unit tests for translation logic, manual testing for UI

### 9.4 Cost Constraints
- **Total Budget:** <$30/month for 100 users
- **OpenAI API:** Primary cost driver (~$20-25/month)
- **Infrastructure:** Vercel + Supabase free tiers

---

## 10. Constraints & Assumptions

### 10.1 Constraints
- **Timeline:** 4 weeks to MVP
- **Team Size:** Solo project (or small team)
- **Budget:** <$30/month operating costs
- **Scale:** 10-100 users maximum
- **Scope:** Class project, not production app
- **Language:** JavaScript only (NO TypeScript) - ES6+ with ES Modules

### 10.2 Assumptions
- Users have smartphones with iOS 13+ or Android 8+
- Users have internet connection (3G or better)
- Users willing to create account (no guest mode)
- Users accept that translations are AI-generated (not perfect)
- Users understand this is a demo/class project (no SLA)

### 10.3 Dependencies
- **Supabase:** Database, auth, realtime, storage availability
- **OpenAI API:** Translation, transcription, slang detection
- **Vercel:** Serverless function hosting
- **Expo:** Push notification infrastructure

---

## 11. Success Criteria

### 11.1 Functional Success
- ✅ All 13 core features working in demo
- ✅ Zero critical bugs during demo
- ✅ Translation accuracy subjectively "good" (professor/peers agree)
- ✅ Voice transcription works for 3+ languages
- ✅ Real-time messaging with <500ms latency

### 11.2 Technical Success
- ✅ Clean, well-documented code
- ✅ Proper RLS policies (no security vulnerabilities)
- ✅ Efficient API usage (within budget)
- ✅ Smooth UI with no lag/jank

### 11.3 Demo Success
- ✅ Live demo shows 4-5 key features without failure
- ✅ Video backup prepared in case of technical issues
- ✅ Audience understands the value proposition
- ✅ Professor feedback is positive

---

## 12. Risks & Mitigations

### 12.1 Technical Risks

**Risk:** OpenAI API rate limits hit during demo  
**Mitigation:** Upgrade to paid tier ($5 min), pre-seed demo data with translations cached

**Risk:** Supabase Realtime connection drops during demo  
**Mitigation:** Have video backup, test connection stability beforehand

**Risk:** Vercel serverless function cold starts cause delays  
**Mitigation:** Pre-warm functions before demo, use Vercel Pro for faster cold starts

**Risk:** Translation quality is poor  
**Mitigation:** Test with native speakers, fine-tune prompts, add context to API calls

### 12.2 Scope Risks

**Risk:** Feature creep extends timeline  
**Mitigation:** Strict adherence to in-scope features only, defer "nice-to-haves"

**Risk:** Complexity of AI features underestimated  
**Mitigation:** Build simplest version first, iterate if time allows

### 12.3 Demo Risks

**Risk:** Live demo fails due to network issues  
**Mitigation:** Record video backup, test on-campus WiFi beforehand

**Risk:** Edge cases cause crashes during demo  
**Mitigation:** Pre-seed demo accounts with known-good data, avoid user input during critical moments

---

## 13. Timeline & Milestones

### Week 1: Core Chat (40 hours)
- ✅ Supabase setup + schema + RLS
- ✅ React Native app skeleton
- ✅ Basic chat UI with dark mode
- ✅ Real-time messaging
- ✅ Typing indicators
- ✅ Read receipts

### Week 2: AI Features (40 hours)
- ✅ Auto-translation (async)
- ✅ Language detection (franc + OpenAI)
- ✅ Slang detection button
- ✅ Formality adjustment magic wand
- ✅ Message editing logic

### Week 3: Voice & Advanced (40 hours)
- ✅ Voice recording + upload
- ✅ Whisper transcription
- ✅ Voice translation
- ✅ Cultural hints cron job
- ✅ Push notifications

### Week 4: Polish & Demo (40 hours)
- ✅ Offline support
- ✅ UI polish (animations, error states)
- ✅ Demo prep (seed data, test accounts)
- ✅ Video recording
- ✅ Documentation

**Total: 160 hours (4 weeks full-time or 8 weeks part-time)**

---

## 14. Appendices

### Appendix A: Color Palette

#### Light Mode
- Background: #FFFFFF
- Text: #000000
- Sent Bubble: #DCF8C6 (light green)
- Received Bubble: #FFFFFF
- Input Background: #F0F0F0
- Checkmark Sent: #8696A0 (grey)
- Checkmark Delivered: #53BDEB (blue)
- Checkmark Read: #34B7F1 (green)

#### Dark Mode
- Background: #0B141A
- Text: #E9EDEF
- Sent Bubble: #005C4B (dark green)
- Received Bubble: #1F2C34
- Input Background: #2A3942
- Checkmark Sent: #8696A0 (grey)
- Checkmark Delivered: #53BDEB (blue)
- Checkmark Read: #34B7F1 (green)

### Appendix B: Supported Languages (Initial)
- English (en)
- Spanish (es)
- Mandarin Chinese (zh)
- Japanese (ja)
- French (fr)
- German (de)
- Arabic (ar)
- Hindi (hi)
- Portuguese (pt)
- Russian (ru)
- Korean (ko)
- Italian (it)

### Appendix C: Error Messages
- "Translation failed. Tap to retry."
- "Voice transcription unavailable. Please try again."
- "Cannot edit message: time limit exceeded (5 min)"
- "Cannot edit message: already translated by recipient"
- "No internet connection. Messages will send when online."
- "Slang detection failed. Please try again later."

---

**End of PRD**
