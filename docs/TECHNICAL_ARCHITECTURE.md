# Technical Architecture Overview
## Multilingual Family Chat Application

**Version:** 1.0  
**Last Updated:** October 22, 2025  
**Architecture Style:** Serverless Microservices

---

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Principles](#architecture-principles)
3. [Technology Stack](#technology-stack)
4. [High-Level Architecture](#high-level-architecture)
5. [Component Overview](#component-overview)
6. [Data Flow](#data-flow)
7. [Detailed Architecture Documents](#detailed-architecture-documents)

---

## 1. System Overview

### 1.1 Purpose
Real-time multilingual messaging application enabling seamless communication across language barriers with AI-powered translation, transcription, and cultural context.

### 1.2 Scale & Constraints
- **Users:** 10-100 concurrent users (class project)
- **Messages:** ~10,000 messages/day
- **Budget:** <$30/month
- **Latency:** <500ms message delivery, <2s translation
- **Deployment:** Vercel (serverless) + Supabase (managed PostgreSQL)

### 1.3 Key Requirements
- Real-time bidirectional communication
- Offline-first mobile experience
- Automatic language translation
- Voice transcription and translation
- AI-powered contextual features (slang, cultural hints, formality)
- Push notifications
- Message editing with constraints

---

## 2. Architecture Principles

### 2.1 Design Decisions

**Serverless-First**
- No server management overhead
- Pay-per-use pricing model
- Auto-scaling built-in
- Perfect for variable class project workload

**Async-by-Default**
- Translation happens after message delivery (non-blocking)
- Voice transcription queued for background processing
- Cultural hints computed daily via cron

**Client-Side Intelligence**
- Language detection on device (franc library)
- Optimistic UI updates (instant feedback)
- Offline message queueing
- Reduces server load and costs

**Cache-Heavy**
- Translation results cached indefinitely
- Slang explanations cached per term
- Cultural hints cached per date/country
- Minimizes AI API calls (cost optimization)

**Security-First**
- Row Level Security (RLS) at database layer
- JWT-based authentication
- Service role separation (user vs backend)
- No sensitive data in client code

---

## 3. Technology Stack

### 3.1 Frontend
- **Framework:** React Native 0.74+
- **Runtime:** Expo SDK 51+
- **Language:** JavaScript (ES6+) - NO TypeScript
- **State Management:** React Context + Hooks
- **Local Storage:** @react-native-async-storage/async-storage
- **Real-time:** Supabase Realtime Client
- **Audio:** expo-av
- **Language Detection:** franc (client-side)

### 3.2 Backend
- **Hosting:** Vercel Serverless Functions (Node.js 20.x)
- **Runtime:** Node.js with ES Modules
- **Language:** JavaScript (ES6+) - NO TypeScript
- **Framework:** None (minimal - native Vercel functions)
- **Cron Jobs:** Vercel Cron

### 3.3 Database & Auth
- **Database:** PostgreSQL 15+ (Supabase managed)
- **Authentication:** Supabase Auth (email/password)
- **Real-time:** Supabase Realtime (WebSocket)
- **Storage:** Supabase Storage (voice memos)

### 3.4 AI Services
- **Translation:** OpenAI GPT-4o-mini
- **Transcription:** OpenAI Whisper API
- **Language Detection:** franc (client) → OpenAI (fallback)
- **Slang/Cultural:** OpenAI GPT-4o-mini with JSON mode

### 3.5 Infrastructure
- **Hosting:** Vercel (serverless functions)
- **CDN:** Vercel Edge Network (automatic)
- **Push Notifications:** Expo Push Notifications
- **Monitoring:** Vercel Analytics + Supabase Dashboard

---

## 4. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                     Mobile Clients                            │
│              (React Native + Expo)                            │
└─────────┬────────────────────────────────────┬───────────────┘
          │                                    │
          │ HTTPS/WSS                          │ HTTPS
          │                                    │
┌─────────▼──────────────┐         ┌──────────▼──────────────┐
│   Supabase Platform    │         │   Vercel Platform       │
│  ┌──────────────────┐  │         │  ┌──────────────────┐   │
│  │ Auth (JWT)       │  │         │  │ API Functions    │   │
│  ├──────────────────┤  │◄────────┤  │ - webhook/       │   │
│  │ PostgreSQL DB    │  │ Service │  │ - transcribe/    │   │
│  │ (with RLS)       │  │  Role   │  │ - formality/     │   │
│  ├──────────────────┤  │         │  │ - cron/          │   │
│  │ Realtime         │  │         │  └──────────────────┘   │
│  │ (WebSocket)      │  │         └──────────┬──────────────┘
│  ├──────────────────┤  │                    │
│  │ Storage          │  │                    │ HTTPS
│  │ (Voice Memos)    │  │                    │
│  └──────────────────┘  │         ┌──────────▼──────────────┐
└─────────────────────────┘         │   OpenAI Platform       │
                                    │  ┌──────────────────┐   │
                                    │  │ GPT-4o-mini      │   │
                                    │  │ (Translation)    │   │
                                    │  ├──────────────────┤   │
                                    │  │ Whisper API      │   │
                                    │  │ (Transcription)  │   │
                                    │  └──────────────────┘   │
                                    └─────────────────────────┘
                                    
┌─────────────────────────────────────────────────────────────┐
│                   Expo Push Service                          │
│             (Push Notifications)                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Component Overview

### 5.1 Mobile Application (React Native)

**Responsibilities:**
- User interface rendering
- User input handling
- Client-side language detection
- Optimistic UI updates
- Local message caching
- Real-time subscription management
- Voice recording and playback
- Push notification handling

**Key Libraries:**
- `@supabase/supabase-js` - Database and auth client
- `expo-av` - Audio recording/playback
- `franc` - Language detection
- `@react-native-async-storage/async-storage` - Offline storage
- `expo-notifications` - Push notifications

**See:** [ARCHITECTURE_FRONTEND.md](./ARCHITECTURE_FRONTEND.md)

---

### 5.2 Serverless Backend (Vercel Functions)

**Responsibilities:**
- Message processing webhooks
- AI orchestration (translation, slang, cultural hints)
- Voice transcription coordination
- Push notification dispatch
- Scheduled jobs (cultural hints cron)

**Endpoints:**
- `POST /api/webhook/message-created` - New message handler
- `POST /api/webhook/message-edited` - Edit message handler
- `POST /api/transcribe-voice` - Voice transcription trigger
- `POST /api/explain-slang` - On-demand slang explanation
- `POST /api/adjust-formality` - Formality adjustment
- `GET /api/cron/cultural-hints` - Daily cultural hints job

**See:** [ARCHITECTURE_BACKEND.md](./ARCHITECTURE_BACKEND.md)

---

### 5.3 Database Layer (Supabase PostgreSQL)

**Responsibilities:**
- Persistent data storage
- Row-level security enforcement
- Real-time change notifications
- User authentication (via Supabase Auth)
- File storage (voice memos)

**Key Tables:**
- `users` - User profiles
- `conversations` - Chat threads
- `messages` - All messages (text + voice)
- `message_translations` - Cached translations
- `message_statuses` - Read receipts
- `ai_annotations` - Slang/cultural hints

**See:** [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

---

### 5.4 Real-time Layer (Supabase Realtime)

**Responsibilities:**
- Live message delivery via WebSocket
- Typing indicators (Presence API)
- Online/offline status
- Read receipt updates

**Channels:**
- `conversation:{id}` - Per-conversation message stream
- Presence tracking for typing indicators

**See:** [ARCHITECTURE_REALTIME.md](./ARCHITECTURE_REALTIME.md)

---

### 5.5 AI Pipeline (OpenAI APIs)

**Responsibilities:**
- Language detection (fallback)
- Message translation
- Voice transcription
- Slang explanation
- Formality adjustment
- Cultural hint generation

**Models:**
- GPT-4o-mini: Translation, slang, cultural, formality
- Whisper: Voice transcription

**See:** [ARCHITECTURE_AI_PIPELINE.md](./ARCHITECTURE_AI_PIPELINE.md)

---

### 5.6 Push Notifications (Expo Push)

**Responsibilities:**
- Deliver notifications when app backgrounded
- Badge count updates
- Notification tap handling

**Triggers:**
- New message received
- Message edited
- Voice transcription complete

**See:** [ARCHITECTURE_BACKEND.md](./ARCHITECTURE_BACKEND.md) (Push Notifications section)

---

## 6. Data Flow

### 6.1 Send Text Message Flow

```
1. User types message in React Native app
2. Client detects language using franc library
3. Client inserts message into Supabase (optimistic UI)
4. Supabase returns confirmation
5. Supabase Realtime broadcasts message to recipients
6. Supabase trigger fires webhook to Vercel backend
7. Backend checks recipient languages
8. Backend calls OpenAI for translation (if needed)
9. Backend saves translation to Supabase
10. Backend sends push notifications to offline recipients
11. Recipients receive translated message via Realtime
```

### 6.2 Send Voice Message Flow

```
1. User records voice in React Native app
2. Client uploads audio to Supabase Storage
3. Client inserts message record (content = "[Voice message]")
4. Supabase webhook triggers backend
5. Backend calls OpenAI Whisper for transcription
6. Backend updates message with transcription
7. Backend detects transcription language
8. Backend translates transcription for recipients
9. Backend saves translation
10. Backend sends push notifications
11. Recipients receive voice message with transcription
```

### 6.3 Edit Message Flow

```
1. User long-presses message, taps "Edit"
2. Client checks: <5 min old? No translations exist?
3. Client updates message in Supabase (if conditions met)
4. Supabase RLS policy validates edit permission
5. Supabase trigger fires webhook to backend
6. Backend deletes all existing translations
7. Backend re-triggers translation pipeline
8. Backend sends "message edited" push notification
9. Recipients see updated message with "edited" badge
```

### 6.4 On-Demand Slang Explanation Flow

```
1. User taps "What does this mean?" on message
2. Client calls Vercel backend API
3. Backend checks if annotation exists in cache
4. If not cached, backend calls OpenAI with message
5. OpenAI analyzes and returns slang terms + explanations
6. Backend saves to ai_annotations table
7. Backend returns explanation to client
8. Client displays modal with explanation
```

### 6.5 Daily Cultural Hints Flow

```
1. Vercel Cron triggers at midnight UTC
2. Backend queries all active users
3. For each user, checks their language/country
4. Backend asks OpenAI about upcoming holidays (next 7 days)
5. OpenAI returns relevant cultural events
6. Backend saves to ai_annotations table
7. Next time user opens conversation, banner appears
```

---

## 7. Detailed Architecture Documents

### 7.1 Frontend Architecture
**File:** [ARCHITECTURE_FRONTEND.md](./ARCHITECTURE_FRONTEND.md)

**Contents:**
- React Native project structure
- Component hierarchy
- State management patterns
- Offline-first architecture
- Real-time subscription handling
- Voice recording implementation
- Theme system (dark mode)

---

### 7.2 Backend Architecture
**File:** [ARCHITECTURE_BACKEND.md](./ARCHITECTURE_BACKEND.md)

**Contents:**
- Vercel function structure
- Webhook handling
- AI orchestration logic
- Push notification dispatch
- Error handling and retry logic
- Cron job implementation

---

### 7.3 AI Pipeline Architecture
**File:** [ARCHITECTURE_AI_PIPELINE.md](./ARCHITECTURE_AI_PIPELINE.md)

**Contents:**
- OpenAI integration patterns
- Prompt engineering for each feature
- Translation strategy (context preservation)
- Voice transcription pipeline
- Slang detection algorithm
- Cultural hint generation
- Cost optimization techniques

---

### 7.4 Real-time Architecture
**File:** [ARCHITECTURE_REALTIME.md](./ARCHITECTURE_REALTIME.md)

**Contents:**
- Supabase Realtime subscription patterns
- Typing indicator implementation (Presence API)
- Message delivery guarantees
- Offline queue and sync strategy
- Connection recovery handling

---

### 7.5 Database Architecture
**File:** [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md)

**Contents:**
- Complete table definitions
- Index strategy
- RLS policies
- Triggers and webhooks
- Sample queries

---

### 7.6 Security Architecture
**File:** [ARCHITECTURE_SECURITY.md](./ARCHITECTURE_SECURITY.md)

**Contents:**
- Authentication flow
- RLS policy enforcement
- API key management
- Service role vs user role
- Data encryption (in-transit only)
- Privacy considerations

---

## 8. Cross-Cutting Concerns

### 8.1 Error Handling

**Client-Side:**
- Graceful degradation (show cached data if network fails)
- User-friendly error messages
- Retry mechanisms for failed operations
- Offline queue for pending messages

**Server-Side:**
- Try/catch blocks in all functions
- OpenAI API error handling (rate limits, timeouts)
- Supabase error handling
- Webhook retry logic (3 attempts with exponential backoff)

---

### 8.2 Performance Optimization

**Caching Strategy:**
- Translations cached indefinitely (while message exists)
- Slang explanations cached per term
- Cultural hints cached per date/country
- Client-side language detection (avoid API calls)

**Database Optimization:**
- Strategic indexes on high-query columns
- Limit query results (pagination)
- Use `SELECT` with specific columns (not `SELECT *`)

**Network Optimization:**
- Batch operations where possible
- Compress payloads (Vercel automatic gzip)
- CDN for static assets (Vercel Edge Network)

---

### 8.3 Monitoring & Observability

**Vercel:**
- Function execution logs (CloudWatch-like)
- Performance metrics (duration, errors)
- Real-time logs during development

**Supabase:**
- Database query performance
- Real-time connection count
- Storage usage
- Auth metrics

**OpenAI:**
- API usage dashboard
- Cost tracking per endpoint
- Rate limit monitoring

---

### 8.4 Cost Management

**Target:** <$30/month for 100 users

**Breakdown:**
- Supabase: Free tier (sufficient for 100 users)
- Vercel: Free tier (100 GB-hours/month)
- OpenAI: ~$20-25/month
  - Translation: GPT-4o-mini ($0.15/1M tokens) = ~$15/mo
  - Whisper: $0.006/minute = ~$5/mo (10% voice usage)
  - Slang/Cultural: ~$2/mo (on-demand only)
- Expo Push: Free

**Optimization Techniques:**
- Use franc for language detection (avoid OpenAI)
- Cache all translations
- On-demand slang detection only (not automatic)
- GPT-4o-mini instead of GPT-4 (10x cheaper)
- Batch cultural hints daily (not per-message)

---

## 9. Deployment Architecture

### 9.1 Development Environment
- **Frontend:** Expo Go on iOS/Android simulators
- **Backend:** Vercel CLI local development
- **Database:** Supabase local dev instance (optional)

### 9.2 Production Environment
- **Frontend:** 
  - iOS: TestFlight (beta testing)
  - Android: APK (direct install)
  - Expo Go: Also supported
- **Backend:** Vercel production deployment
- **Database:** Supabase cloud instance

### 9.3 CI/CD Pipeline
- **Frontend:** Manual build and upload (class project)
- **Backend:** Automatic deployment via Vercel (Git push to main)
- **Database:** Manual migrations via Supabase CLI

---

## 10. Scalability Considerations

### 10.1 Current Architecture (100 users)
- Single Vercel region (US)
- Single Supabase region (US)
- No load balancing needed
- No CDN optimization needed

### 10.2 Future Scaling (1000+ users)
- Upgrade Vercel to Pro ($20/mo) for better cold starts
- Add Redis cache (Upstash) for hot translations
- Use DynamoDB for high-write message storage
- Multi-region deployment (edge functions)
- Rate limiting per user

### 10.3 Bottlenecks
- **OpenAI API:** Rate limits (3500 req/min paid tier)
- **Supabase Realtime:** 500 concurrent connections (free tier)
- **Vercel Functions:** 10 concurrent executions (free tier)

**Mitigation:** Upgrade tiers as needed, but not required for class project.

---

## Summary

This architecture provides:
- ✅ **Serverless** for zero ops and cost efficiency
- ✅ **Real-time** via Supabase WebSocket
- ✅ **Offline-first** mobile experience
- ✅ **AI-powered** translation and context
- ✅ **Secure** with RLS and JWT
- ✅ **Scalable** to 100 users with free tiers
- ✅ **Maintainable** with clear separation of concerns

**For deeper dives, see the detailed architecture documents linked throughout.**

---

**End of Technical Architecture Overview**
