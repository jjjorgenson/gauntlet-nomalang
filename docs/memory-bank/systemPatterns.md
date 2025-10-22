# NomaLang System Patterns

## Architecture Overview
NomaLang follows a modern, scalable serverless architecture designed for real-time multilingual messaging with AI integration. The system uses a mobile-first approach with offline capabilities and intelligent synchronization.

## Core Architecture Patterns

### 1. Real-Time Messaging Architecture
```
Mobile Client (React Native + Expo)
       ↕️ Real-time WebSocket
Supabase (PostgreSQL + Realtime)
       ↕️ REST API
Vercel Functions (AI Processing)
       ↕️ HTTP
OpenAI APIs (Translation/Voice)
```

### 2. Offline-First Message Queue
**Pattern**: Reliable message delivery with conflict resolution
- Messages assigned UUIDs before sending (client-generated)
- Local AsyncStorage for offline queue with status tracking
- Optimistic UI updates with rollback capability
- Server-side deduplication via UUID constraints
- Retry mechanism with exponential backoff

### 3. Real-Time State Management
**Pattern**: Presence + typing indicators + live cursors
- Supabase Realtime for live updates across all clients
- Presence tracking for online status and typing indicators
- Typing indicators with 2.9-second timeout and debouncing
- Immediate state broadcast with efficient change detection
- Connection state management with auto-reconnect

### 4. AI Integration Pipeline
**Pattern**: Asynchronous AI processing with comprehensive caching
- Vercel Functions triggered by database events (new messages)
- Translation caching to reduce API costs and improve speed
- Asynchronous processing to maintain UI responsiveness
- Fallback mechanisms for API failures with graceful degradation
- Cultural context enhancement via metadata analysis

## Component Relationships

### Frontend Architecture
```
App (Expo Router)
├── Authentication (Supabase Auth Context)
├── Message List (Virtualized FlatList)
├── Message Input (Real-time typing indicators)
├── Translation Display (Collapsible sections)
├── Voice Recording (expo-av integration)
├── Settings (User preferences and language settings)
└── Push Notifications (Foreground/background handling)
```

### Backend Architecture
```
Vercel Platform
├── Serverless Functions (Node.js 20.x)
│   ├── Webhook Handlers (message-created, message-edited)
│   ├── AI Orchestration (translation, transcription, slang)
│   ├── Push Notification Dispatch
│   └── Cron Jobs (cultural hints)
└── Supabase Integration
    ├── Database (PostgreSQL with RLS)
    │   ├── Tables: users, conversations, messages, message_translations, ai_annotations
    │   ├── RLS Policies: Row-level security for data isolation
    │   ├── Triggers: AI processing triggers on new messages
    │   └── Indexes: Optimized for conversation queries and real-time
    ├── Realtime (WebSocket with presence)
    │   ├── Broadcast: New messages, status updates, presence changes
    │   ├── Presence: Online status, typing indicators, last seen
    │   └── Channels: Per-conversation isolation for scalability
    └── Storage (Voice Memos)
        └── Private bucket for voice message audio files
```

## Design Patterns

### 1. Repository Pattern (Data Access)
```javascript
// Abstract data operations with error handling
class MessageRepository {
  async getMessages(conversationId) {
    // Fetch messages with pagination
  }
  
  async saveMessage(message) {
    // Save with optimistic UI support
  }
  
  async updateMessageStatus(id, status) {
    // Update read receipts
  }
  
  // Offline queue management
  async queueMessage(message) {
    // Queue for offline sending
  }
  
  async retryFailedMessages() {
    // Retry failed operations
  }
}
```

### 2. Observer Pattern (Real-time Updates)
```javascript
// Real-time subscription management with cleanup
class RealtimeManager {
  constructor() {
    this.subscriptions = new Map();
  }

  subscribe(conversationId, callback) {
    const subscription = supabase
      .channel(`conversation:${conversationId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, callback)
      .subscribe();

    this.subscriptions.set(conversationId, subscription);
    return subscription;
  }

  unsubscribe(conversationId) {
    const subscription = this.subscriptions.get(conversationId);
    subscription?.unsubscribe();
    this.subscriptions.delete(conversationId);
  }
}
```

### 3. Strategy Pattern (Translation Providers)
```javascript
// Multiple AI providers with fallback and caching
class TranslationService {
  async translate(text, from, to) {
    // Check cache first
    const cached = await this.getCachedTranslation(text, to);
    if (cached) return cached;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{
        role: "system",
        content: `Translate from ${from} to ${to}. Preserve tone, formality, and context.`
      }, {
        role: "user",
        content: text
      }]
    });

    const translation = response.choices[0].message.content;
    await this.cacheTranslation(text, to, translation);
    return translation;
  }
}
```

### 4. Circuit Breaker Pattern (External APIs)
```javascript
// Prevent cascade failures with automatic recovery
class AIService {
  constructor() {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.threshold = 5;
    this.timeout = 60000; // 1 minute
  }

  async processWithAI(text) {
    if (this.isCircuitOpen()) {
      throw new ServiceUnavailableError('Circuit breaker is OPEN');
    }

    try {
      const result = await this.openaiClient.process(text);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  isCircuitOpen() {
    const now = Date.now();
    return this.failureCount >= this.threshold &&
           (now - this.lastFailureTime) < this.timeout;
  }
}
```

## Data Flow Patterns

### Message Sending Flow (At-Least-Once Delivery)
1. **Client**: Generate UUID → Save to local AsyncStorage → Optimistic UI update
2. **Network**: Send to Supabase → Server deduplication → Broadcast to recipients
3. **Recipients**: Receive message → Update delivery status → Send read receipts
4. **AI Pipeline**: Trigger translation → Cache results → Broadcast enriched content

### Translation Flow (Cached & Efficient)
1. **Detection**: Analyze message language using franc library (client-side)
2. **Processing**: Send to AI service with conversation history for context
3. **Enhancement**: Add cultural context and formality adjustments
4. **Caching**: Store translation in PostgreSQL for instant reuse
5. **Delivery**: Broadcast translated content to relevant users

### Voice Message Flow (Async Processing)
1. **Recording**: User records voice message in React Native app
2. **Upload**: Audio file uploaded to Supabase Storage
3. **Transcription**: Vercel function calls OpenAI Whisper API
4. **Translation**: Transcription translated for recipients
5. **Delivery**: Voice message with transcription and translation sent

### Authentication Flow (Secure & Persistent)
1. **Signup**: Email/password → Supabase Auth → Profile creation
2. **Login**: Credentials → JWT tokens → Session establishment
3. **Persistence**: Refresh tokens stored securely → Auto-refresh
4. **Preferences**: Language settings and notification tokens stored

## Error Handling Patterns

### 1. Network Failure Recovery
- Automatic retry with exponential backoff (1s, 2s, 4s, 8s, 16s)
- Offline queue processing when connection restored
- Conflict resolution via UUID deduplication
- User feedback for failed operations with retry options

### 2. AI Service Degradation
- Fallback to basic translation if enhanced features fail
- Graceful degradation without breaking core functionality
- User notification for reduced functionality
- Retry mechanisms for transient failures

### 3. Real-Time Connection Issues
- Auto-reconnection with backoff strategy
- Queue management during disconnection
- State synchronization when connection restored
- User feedback for connection status

## Performance Patterns

### 1. Message Virtualization
- Render only visible messages in long conversations (FlatList)
- Recycle message components for smooth scrolling
- Background loading of adjacent messages
- Memory-efficient component cleanup

### 2. Audio Optimization
- Progressive audio loading with compression
- Automatic format selection (M4A for iOS, MP3 for Android)
- Caching strategies for frequently accessed audio
- Lazy loading for improved initial render time

### 3. Memory Management
- Cleanup subscriptions on screen unmount
- Debounced real-time updates to prevent excessive renders
- Efficient state updates with selective rendering
- Background task management for offline queue

## Security Patterns

### 1. Row Level Security (RLS)
- Database-level authorization enforcement
- User isolation at the data layer
- Service role separation for backend operations
- Secure data access patterns

### 2. Rate Limiting
- API rate limiting for translation services (per user/per minute)
- Spam detection and prevention mechanisms
- DDoS protection at edge function level

### 3. Data Privacy
- GDPR compliance for user data collection
- Data minimization principles (only necessary data stored)
- Secure data deletion capabilities
- Transparent privacy policies

## Database Patterns

### 1. UUID Primary Keys
- Client-generated UUIDs for offline-first architecture
- Enables conflict-free replicated data types
- Supports distributed systems without coordination

### 2. Status Tracking
- Separate status table for read receipts and delivery confirmation
- Per-recipient status for group conversations
- Efficient status queries and updates

### 3. Caching Strategy
- Translation results cached with automatic expiration
- Message content cached locally for offline access
- Intelligent cache invalidation strategies

## API Design Patterns

### 1. RESTful Endpoints
- Resource-based URLs (`/api/messages`, `/api/conversations`)
- Standard HTTP methods (GET, POST, PUT, DELETE)
- Consistent response formats with error handling

### 2. Real-Time Subscriptions
- WebSocket-based subscriptions for live updates
- Efficient filtering and aggregation
- Automatic cleanup and reconnection

### 3. Serverless Function Patterns
- Stateless functions for AI processing
- Secure API key management
- Comprehensive error handling and logging

## Testing Patterns

### 1. Unit Testing
- Repository pattern testing with mocked dependencies
- Utility function testing for translation helpers
- Component testing with React Testing Library

### 2. Integration Testing
- Real-time messaging flow testing
- Database operation testing
- Authentication flow testing

### 3. End-to-End Testing
- Complete user journey testing
- Offline/online transition testing
- Multi-device testing scenarios

This comprehensive pattern documentation ensures consistent, maintainable, and scalable development across the entire NomaLang platform.
