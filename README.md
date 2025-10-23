# NomaLang - Multilingual Family Chat

A real-time messaging application that enables seamless communication across language barriers through intelligent AI-powered translation, cultural context awareness, and contextual features.

## Features

- **Real-time Messaging**: Instant message delivery with offline support
- **AI Translation**: Automatic message translation with language detection
- **Voice Messages**: Voice recording with transcription and translation
- **Cultural Context**: Slang explanations and cultural hints
- **Formality Adjustment**: Adjust message tone (casual/neutral/formal)
- **Dark Mode**: Beautiful dark theme optimized for messaging
- **Cross-Platform**: iOS and Android support via Expo

## Tech Stack

- **Frontend**: React Native + Expo
- **Backend**: Supabase (PostgreSQL + Realtime)
- **AI**: OpenAI GPT-4o-mini + Whisper
- **Language**: JavaScript (ES6+) - NO TypeScript
- **Deployment**: Vercel (serverless functions)

## Setup

### Prerequisites

- Node.js 20.x
- npm 10.x
- Expo CLI
- Supabase account
- OpenAI API key

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Create a `.env` file with your Supabase credentials:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Run on device:**
   - Install Expo Go app on your phone
   - Scan the QR code from the terminal
   - Or run `npm run android` / `npm run ios` for emulators

## Project Structure

```
src/
├── screens/           # App screens
│   ├── AuthScreen.js
│   ├── ChatsScreen.js
│   ├── ConversationScreen.js
│   └── SettingsScreen.js
├── contexts/          # React contexts
│   └── AuthContext.js
└── lib/              # Utilities and configurations
    └── supabase.js
```

## Development

### Key Features Implemented

- ✅ Basic app structure with navigation
- ✅ Authentication flow (sign up/sign in)
- ✅ Dark mode theme
- ✅ Chat interface with message bubbles
- ✅ Supabase client configuration
- ✅ Real-time messaging foundation

### Next Steps

- [ ] Database schema implementation
- [ ] Real-time message synchronization
- [ ] AI translation integration
- [ ] Voice message recording
- [ ] Push notifications
- [ ] Offline message queuing

## Architecture

The app follows a clean architecture pattern:

- **Screens**: UI components for each app screen
- **Contexts**: Global state management (authentication)
- **Lib**: Shared utilities and configurations
- **Navigation**: Stack + Tab navigation for smooth UX

## Contributing

This is a class project with a 4-week timeline. Focus on core features first:

1. **Week 1**: Core messaging and authentication
2. **Week 2**: AI translation features
3. **Week 3**: Voice messages and advanced features
4. **Week 4**: Polish and demo preparation

## License

Class project - not for commercial use.
