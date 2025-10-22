# NomaLang Technical Context

## Technology Stack

### Frontend: React Native + Expo
| Component | Version | Purpose |
|-----------|---------|---------|
| **Expo SDK** | ^51.0.0 | Cross-platform mobile development framework |
| **React Native** | ^0.74.3 | Native mobile app framework |
| **Node.js** | ^20.x | JavaScript runtime for development |
| **npm** | ^10.x | Package manager |
| **Expo Router** | ^3.5.0 | Navigation system for Expo apps |
| **React Native Paper** | ^5.12.0 | Material Design UI component library |
| **Expo SQLite** | ^13.3.0 | Local database for offline message queue |
| **Expo Notifications** | ^0.29.0 | Push notifications via Expo service |
| **Expo File System** | ^16.0.0 | File handling for voice/attachments |
| **Expo AV** | ^14.0.0 | Audio recording and playback |
| **React Native Gesture Handler** | ^2.15.0 | Touch gesture handling |
| **React Native Reanimated** | ^3.15.0 | Smooth UI animations |
| **franc** | ^6.1.0 | Client-side language detection |

### Backend: Vercel + Supabase
| Component | Version | Purpose |
|-----------|---------|---------|
| **Vercel Functions** | latest | Serverless function hosting |
| **Node.js Runtime** | 20.x | Serverless function runtime |
| **Supabase Project** | latest | Hosted backend-as-a-service |
| **Supabase JS SDK** | ^2.45.0 | JavaScript client library |
| **Realtime Engine** | v3 | WebSocket-based real-time updates |
| **Supabase Auth** | built-in | Email + password authentication |
| **PostgreSQL** | 15.x | Primary database |
| **Supabase Storage** | built-in | File storage for voice memos |

### AI Integration
| Component | Version | Purpose |
|-----------|---------|---------|
| **OpenAI GPT-4o-mini** | gpt-4o-mini | Cost-effective language model for translations |
| **OpenAI Whisper** | whisper-1 | Speech-to-text transcription |
| **Vercel Functions** | Node 20 | Secure AI API integration |

### Development Tools
| Tool | Version | Purpose |
|------|---------|---------|
| **Expo CLI** | ^7.2.0 | Development server and build tools |
| **ESLint** | ^9.5.0 | Code linting and formatting |
| **Prettier** | ^3.3.0 | Code formatting |
| **JavaScript** | ES6+ | Language (NO TypeScript) |

## Development Environment Setup

### Prerequisites
- **Node.js** 20.x (required by Expo CLI 7+)
- **npm** 10.x (matches Node 20)
- **Expo CLI** (latest version)
- **Android Studio** for Android emulation
- **Xcode** for iOS development (macOS only)

### Installation Commands
```bash
# Install Node.js (via nvm recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 20 && nvm use 20

# Verify installation
node -v  # Should be 20.x
npm -v   # Should be 10.x

# Install Expo CLI globally
npm install -g @expo/cli

# Verify Expo installation
npx expo --version

# Install project dependencies
npm install
```

## Project Structure
```
gauntlet-nomalang/
├── app/                    # Expo Router app directory
│   ├── (auth)/            # Authentication screens
│   ├── (main)/            # Main app screens
│   └── _layout.js         # Root layout
├── components/            # Reusable UI components
├── lib/                   # Supabase client and utilities
├── hooks/                 # Custom React hooks
├── assets/               # Images and static assets
├── docs/                 # Project documentation
│   └── memory-bank/      # Memory bank files
├── .env                  # Environment variables
├── app.json              # Expo configuration
├── package.json          # Dependencies and scripts
└── README.md
```

## Database Schema

### Core Tables
- **users**: User profiles and preferences
- **conversations**: Direct and group chat containers
- **conversation_participants**: Many-to-many relationship for group chats
- **messages**: Chat messages with metadata
- **message_translations**: Cached translation results
- **message_statuses**: Read receipts and delivery status
- **ai_annotations**: Slang explanations and cultural hints

### Key Features
- **UUID-based IDs**: Client-generated for offline-first architecture
- **Row Level Security**: PostgreSQL RLS policies for data protection
- **Real-time subscriptions**: Live updates via Supabase Realtime
- **Caching strategy**: Translation results cached to reduce API costs

## Authentication Flow
1. **Email + Password**: Standard Supabase Auth
2. **Session Management**: Persistent sessions across app restarts
3. **Profile Setup**: Language preferences and notification settings
4. **Secure Storage**: Refresh tokens stored securely

## Real-Time Architecture

### WebSocket Connections
- **Supabase Realtime**: WebSocket-based live updates
- **Channel Isolation**: Per-conversation real-time channels
- **Presence Tracking**: Online/offline status with heartbeats
- **Typing Indicators**: Ephemeral presence updates

### Message Delivery
- **At-least-once delivery**: Guaranteed delivery with deduplication
- **Offline Queue**: AsyncStorage-based local message storage
- **Optimistic Updates**: Immediate UI feedback with rollback
- **Conflict Resolution**: Server-side UUID deduplication

## AI Integration Strategy

### Vercel Functions
- **Secure API Calls**: OpenAI calls via serverless functions
- **Cost Optimization**: Translation caching and batching
- **Error Handling**: Graceful degradation on API failures
- **Rate Limiting**: Built-in protection against API abuse

### Translation Pipeline
1. **Language Detection**: franc library (client-side) with OpenAI fallback
2. **Context Analysis**: Conversation history for better accuracy
3. **Translation**: GPT-4o-mini with cultural context
4. **Caching**: Store results in message_translations table
5. **Fallback**: Basic translation if enhanced features fail

### Voice Processing Pipeline
1. **Recording**: expo-av for audio capture
2. **Upload**: Supabase Storage for audio files
3. **Transcription**: OpenAI Whisper API
4. **Translation**: GPT-4o-mini for transcription translation
5. **Delivery**: Voice message with transcription and translation

## Deployment Strategy

### Development
- **Expo Go**: Quick testing on physical devices
- **Android Emulator**: Primary development target
- **Web Browser**: Web version for broader testing

### Production
- **Expo Application Services (EAS)**: Build and deployment pipeline
- **Vercel**: Serverless function hosting
- **Supabase**: Database and real-time infrastructure
- **Updates**: Over-the-air updates via EAS Update

## Performance Considerations

### Optimization Targets
- **Bundle Size**: < 50MB for reasonable download times
- **Memory Usage**: Efficient list virtualization for long conversations
- **Battery Impact**: Optimized real-time subscriptions
- **Network Efficiency**: Compressed payloads and smart caching

### Monitoring
- **Error Tracking**: Comprehensive error logging and reporting
- **Performance Metrics**: Real-time performance monitoring
- **User Analytics**: Feature usage and engagement tracking

## Security Measures

### Data Protection
- **RLS Policies**: Row-level security at database layer
- **API Security**: Secure edge function authentication
- **Rate Limiting**: Protection against abuse and spam
- **Privacy Compliance**: GDPR compliance for user data

### Best Practices
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Prevention**: Parameterized queries only
- **XSS Protection**: Proper sanitization of user content
- **Secure Defaults**: Principle of least privilege throughout

## Cost Management

### Target Budget: <$30/month for 100 users

### Breakdown:
- **Supabase**: Free tier (sufficient for 100 users)
- **Vercel**: Free tier (100 GB-hours/month)
- **OpenAI**: ~$20-25/month
  - Translation: GPT-4o-mini ($0.15/1M tokens) = ~$15/mo
  - Whisper: $0.006/minute = ~$5/mo (10% voice usage)
  - Slang/Cultural: ~$2/mo (on-demand only)
- **Expo Push**: Free

### Optimization Techniques:
- Use franc for language detection (avoid OpenAI)
- Cache all translations
- On-demand slang detection only (not automatic)
- GPT-4o-mini instead of GPT-4 (10x cheaper)
- Batch cultural hints daily (not per-message)
