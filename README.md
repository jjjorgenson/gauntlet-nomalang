# 🌍 NomaLang

A multilingual, real-time messaging app built with **Expo (React Native)** and **Supabase**. NomaLang enables global conversations with built-in translation, cultural context hints, and AI-powered smart replies.

---

## 🚀 Project Overview

**Stack:**  
- **Frontend:** Expo SDK 54 (React Native 0.76, JavaScript-only)  
- **Backend:** Supabase (Auth, Realtime, PostgreSQL, Edge Functions)  
- **AI Integration:** OpenAI GPT-4-turbo + Whisper via Supabase Edge Functions  
- **Storage:** Expo SQLite (offline queue + message persistence)

**Persona Focus:** International Communicator 🌐  
Simplifying multilingual communication for people chatting across languages and cultures.

---

## 🧱 Core Features

**MVP (Phase 1)**
- ✅ Real-time 1-on-1 and group messaging
- ✅ Reliable delivery (at-least-once, no duplicates)
- ✅ Offline queueing and automatic retry
- ✅ Read receipts + typing indicators
- ✅ Presence tracking (online/offline)
- ✅ Push notifications (foreground)

**Post-MVP (Phase 2 – AI Features)**
- 🌍 Real-time translation + language detection
- 💬 Formality adjustment + slang clarification
- 🧠 Smart replies and context summaries
- 🔊 Voice transcription (Whisper)

---

## 📂 Project Structure

```
NomaLang/
├── app/
│   ├── (auth)/                # login/signup UI
│   ├── (chat)/                # realtime messaging screens
│   ├── lib/                   # supabase.js + hooks
│   ├── components/            # reusable UI widgets
│   └── ...
│
├── docs/                      # architecture, schemas, and setup
│   ├── tech_stack.md
│   ├── realtime_architecture.md
│   ├── db_schema.mmd
│   ├── message_flow.md
│   ├── environment_setup.md
│   └── project_structure.md
│
├── .env                       # Supabase keys (anon + URL)
├── App.js                     # Expo entrypoint
├── app.json                   # Expo config
├── package.json               # Project dependencies
└── README.md
```

For full structure details, see [`docs/project_structure.md`](./docs/project_structure.md).

---

## ⚙️ Environment Setup

### Prerequisites
- Node **20.x**  
- npm **10.x**  
- Expo CLI **54.x** (local CLI)  
- Supabase account + project  
- Android Studio (optional for emulator)

### Steps
```bash
# 1. Install dependencies
npm install

# 2. Create your .env
EXPO_PUBLIC_SUPABASE_URL=https://yourproject.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# 3. Start Expo
npx expo start -c
```
Then scan the QR code with **Expo Go** on Android or iOS.

---

## 🧰 Development Guidelines

- All source files use **.js** (no TypeScript).
- Use **Supabase Realtime** for message + presence updates.
- Keep AI integrations in **Edge Functions** (Node 18 runtime).
- Always run `npx expo doctor` before commits.

---

## 🧠 Docs & Architecture

| File | Description |
|------|--------------|
| `docs/realtime_architecture.md` | Detailed realtime and offline design |
| `docs/db_schema.mmd` | Supabase ERD (messages, users, participants, etc.) |
| `docs/message_flow.md` | End-to-end client/server AI flow |
| `docs/tech_stack.md` | Version locks and dependencies |
| `docs/environment_setup.md` | Complete setup instructions |

---

## 💡 Next Steps
1. Implement Supabase Auth UI in `app/(auth)/`.
2. Scaffold chat UI + Realtime subscriptions.
3. Test offline queue + retry logic.
4. Add AI translation features (Edge Functions).

---

## 📄 License
This project is for educational and portfolio purposes. All rights reserved © 2025 Jason Jorgenson.

---

**Author:** Jason Jorgenson  
**Version:** 1.0.0 (MVP)  
**Updated:** October 2025