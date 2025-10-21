# NomaLang Project Brief

## Core Mission
NomaLang is a real-time messaging application that enables seamless communication across language barriers through intelligent AI-powered translation and cultural context awareness.

## Primary Goals
- **Cross-Language Communication**: Enable users to communicate naturally in their preferred languages with automatic translation
- **Real-Time Messaging**: Provide instant, reliable message delivery with offline queuing capabilities
- **Cultural Intelligence**: Incorporate context-aware translations that respect cultural nuances and formality levels
- **Group Conversations**: Support both direct messages and group chats with full feature parity

## Target Users
- International professionals and remote teams
- Multilingual families and friends
- Global communities and organizations
- Language learners and cultural exchange participants

## Success Metrics
- Message delivery reliability > 99.9%
- Translation accuracy > 95%
- Sub-second message delivery latency
- Support for 50+ languages at launch
- Cross-platform compatibility (iOS/Android/Web)

## Technical Foundation
- **Frontend**: React Native + Expo for cross-platform mobile apps
- **Backend**: Supabase for real-time database, authentication, and edge functions
- **AI Integration**: OpenAI GPT-4-turbo for translations, Whisper for voice
- **Architecture**: Real-time messaging with offline-first design and conflict resolution

## Project Scope
This project encompasses the complete messaging platform including mobile applications, backend infrastructure, AI integration, and supporting tooling. The implementation follows Expo SDK 51 standards with TypeScript throughout.

## MVP Requirements (24-hour target)
- Two users can send text messages in real-time
- Messages persist across app restarts
- Offline messages queue and send on reconnect
- Basic group chat (3+ users) works
- Push notifications fire (at least foreground)
- Read receipts track message state
- Online/offline status visible
- Typing indicators work

## Timeline
- **MVP**: Tuesday, Oct 20, 9:00pm CT (HARD GATE)
- **Early Submission**: Friday, Oct 22, 10:59pm CT (MVP + 2-3 AI features)
- **Final Submission**: Sunday, Oct 24, 11:59pm CT (All features + demo)
