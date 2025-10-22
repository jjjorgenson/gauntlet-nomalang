# NomaLang Project Brief

## Core Mission
NomaLang is a real-time multilingual messaging application that enables seamless communication across language barriers through intelligent AI-powered translation, cultural context awareness, and contextual features like slang explanation and formality adjustment.

## Primary Goals
- **Cross-Language Communication**: Enable users to communicate naturally in their preferred languages with automatic translation
- **Real-Time Messaging**: Provide instant, reliable message delivery with offline queuing capabilities
- **Cultural Intelligence**: Incorporate context-aware translations that respect cultural nuances and formality levels
- **Voice Integration**: Transcribe and translate voice messages automatically
- **Contextual Features**: Explain slang, provide cultural hints, and adjust message formality

## Target Users
- **Primary**: Multilingual families (like Grandma Maria in Mexico communicating with grandchildren in the US)
- **Secondary**: International professionals and remote teams
- **Tertiary**: Language learners and cultural exchange participants

## Success Metrics
- Message delivery reliability > 99.9%
- Translation latency < 2 seconds
- Voice transcription accuracy > 90%
- Sub-second message delivery latency
- Support for 13+ languages at launch
- Cross-platform compatibility (iOS/Android via Expo)

## Technical Foundation
- **Frontend**: React Native + Expo SDK 51+ for cross-platform mobile apps
- **Backend**: Vercel serverless functions for AI orchestration
- **Database**: Supabase (PostgreSQL) for real-time database, authentication, and edge functions
- **AI Integration**: OpenAI GPT-4o-mini for translations, Whisper for voice transcription
- **Architecture**: Real-time messaging with offline-first design and comprehensive caching

## Project Scope
This project encompasses a complete multilingual messaging platform including:
- Mobile applications (iOS/Android via Expo)
- Backend infrastructure (Vercel serverless)
- AI integration (OpenAI APIs)
- Real-time messaging system
- Voice transcription and translation
- Cultural context features
- Supporting tooling and documentation

## MVP Requirements (4-week timeline)
- Real-time one-on-one and group chat (up to 50 users)
- Auto-detection and translation of messages
- Voice message recording with auto-transcription and translation
- On-demand slang explanation
- Proactive cultural hints (holidays, customs)
- Message formality adjustment (casual/neutral/formal)
- Read receipts with status indicators
- Message editing (with restrictions)
- Typing indicators
- Push notifications
- Offline message persistence
- Dark mode theme
- User authentication and profiles

## Key Constraints
- **Timeline**: 4 weeks to MVP
- **Budget**: <$30/month operating costs
- **Scale**: 10-100 users maximum (class project)
- **Language**: JavaScript only (NO TypeScript) - ES6+ with ES Modules
- **Team**: Solo project or small team

## Success Definition
NomaLang succeeds when users can have natural, meaningful conversations across language barriers without friction, building genuine connections that would otherwise be impossible due to linguistic differences, while providing cultural context and understanding that goes beyond simple translation.
