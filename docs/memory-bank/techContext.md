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
| **React Native Gesture Handler** | ^2.15.0 | Touch gesture handling |
| **React Native Reanimated** | ^3.15.0 | Smooth UI animations |

### Backend: Supabase
| Component | Version | Purpose |
|-----------|---------|---------|
| **Supabase Project** | latest | Hosted backend-as-a-service |
| **Supabase JS SDK** | ^2.45.0 | JavaScript client library |
| **Realtime Engine** | v3 | WebSocket-based real-time updates |
| **Supabase Auth** | built-in | Email + password authentication |
| **Edge Functions Runtime** | Node 18 | Serverless functions for AI integration |
| **PostgreSQL** | 15.x | Primary database |
| **pgvector** | preinstalled | Vector embeddings (future AI features) |

### AI Integration
| Component | Version | Purpose |
|-----------|---------|---------|
| **OpenAI GPT-4-turbo** | gpt-4-turbo | Advanced language model for translations |
| **OpenAI Whisper** | whisper-1 | Speech-to-text transcription |
| **Edge Functions** | Node 18 | Secure AI API integration |

### Development Tools
| Tool | Version | Purpose |
|------|---------|---------|
| **Expo CLI** | ^7.2.0 | Development server and build tools |
| **ESLint** | ^9.5.0 | Code linting and formatting |
| **Prettier** | ^3.3.0 | Code formatting |
| **TypeScript** | ^5.6.0 | Type safety (optional) |

## Development Environment Setup

### Prerequisites
- **macOS** with developer tools (`xcode-select --install`)
- **Android Studio** Arctic Fox (2024.3+) for Android emulation
- **Java JDK** 17 LTS for Gradle builds
- **Watchman** for file system monitoring

### Installation Commands
```bash
# Install Node.js (via nvm)
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
cd gauntlet-nomalang/NomaLang
npm install
```

## Project Structure
```
gauntlet-nomalang/NomaLang/
├── app/                    # Expo Router app directory
│   ├── _layout.tsx        # Root layout
│   ├── (tabs)/            # Tab navigation
│   └── modal.tsx          # Modal screens
├── components/            # Reusable UI components
│   ├── ui/               # Design system components
│   └── ...               # Feature-specific components
├── constants/             # App constants and theme
├── hooks/                # Custom React hooks
├── assets/               # Images and static assets
└── scripts/              # Utility scripts
```

## Database Schema

### Core Tables
- **users**: User profiles and preferences
- **conversations**: Direct and group chat containers
- **participants**: Many-to-many relationship for group chats
- **messages**: Chat messages with metadata
- **message_status**: Read receipts and delivery status
- **translations**: Cached translation results

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
- **Offline Queue**: SQLite-based local message storage
- **Optimistic Updates**: Immediate UI feedback with rollback
- **Conflict Resolution**: Server-side UUID deduplication

## AI Integration Strategy

### Edge Functions
- **Secure API Calls**: OpenAI calls via serverless functions
- **Cost Optimization**: Translation caching and batching
- **Error Handling**: Graceful degradation on API failures
- **Rate Limiting**: Built-in protection against API abuse

### Translation Pipeline
1. **Language Detection**: GPT-4-turbo identifies source language
2. **Context Analysis**: Conversation history for better accuracy
3. **Translation**: GPT-4-turbo with cultural context
4. **Caching**: Store results in translations table
5. **Fallback**: Basic translation if enhanced features fail

## Deployment Strategy

### Development
- **Expo Go**: Quick testing on physical devices
- **Android Emulator**: Primary development target
- **Web Browser**: Web version for broader testing

### Production
- **Expo Application Services (EAS)**: Build and deployment pipeline
- **Code Signing**: Apple Developer Program for iOS
- **App Store**: Apple App Store and Google Play Store
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
- **Encryption**: End-to-end encryption for messages (future)
- **API Security**: Secure edge function authentication
- **Rate Limiting**: Protection against abuse and spam
- **Privacy Compliance**: GDPR compliance for user data

### Best Practices
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Prevention**: Parameterized queries only
- **XSS Protection**: Proper sanitization of user content
- **Secure Defaults**: Principle of least privilege throughout
