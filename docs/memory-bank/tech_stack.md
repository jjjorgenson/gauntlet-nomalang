# NomaLang Tech Stack and Version Lock

This file defines the core technologies, required versions, and compatibility notes for NomaLang. Use this as the single source of truth for environment setup and dependency updates.

---

## 📱 Frontend: React Native + Expo

| Component | Version | Notes |
|------------|----------|-------|
| **Expo SDK** | ^51.0.0 | Matches React Native 0.74; stable LTS (as of Oct 2025) |
| **React Native** | ^0.74.3 | Expo SDK 51 baseline |
| **Node.js** | ^20.x | Required by Expo CLI 7+ |
| **npm** | ^10.x | Matches Node 20 |
| **Expo Router** | ^3.5.0 | Navigation system for Expo apps |
| **React Native Paper** | ^5.12.0 | UI component library |
| **Expo SQLite** | ^13.3.0 | Local offline queue storage |
| **Expo Notifications** | ^0.29.0 | Push notifications via Expo service |
| **Expo File System** | ^16.0.0 | For voice/attachment features |
| **React Native Gesture Handler** | ^2.15.0 | Required dependency |
| **React Native Reanimated** | ^3.15.0 | Smooth UI animations |

### Dev Tools

| Tool | Version | Notes |
|------|----------|-------|
| **Expo CLI** | ^7.2.0 | `npx expo start` compatible |
| **Android Studio** | Arctic Fox (2024.3+) | For emulator and SDK tools |
| **Java JDK** | 17 LTS | Required by Gradle |
| **Watchman** | latest | For file change detection |

---

## ☁️ Backend: Supabase

| Component | Version | Notes |
|------------|----------|-------|
| **Supabase Project** | latest cloud | Hosted Supabase instance |
| **Supabase JS SDK** | ^2.45.0 | Compatible with Realtime v3 protocol |
| **Realtime Engine** | v3 | Postgres WAL mode |
| **Supabase Auth** | built-in | Email + password authentication |
| **Edge Functions Runtime** | Node 18 | Required for OpenAI calls |
| **PostgreSQL** | 15.x | Supabase default |
| **pgvector** | preinstalled | Optional for future AI embedding |

### Edge Function Dependencies

| Package | Version | Purpose |
|----------|----------|----------|
| **openai** | ^4.21.0 | GPT-4-turbo + Whisper APIs |
| **langchain** *(optional)* | ^0.3.x | RAG + multi-agent orchestration |
| **vercel/ai** *(optional)* | ^3.0.0 | Alternative agent SDK |

---

## 🤖 AI Integration (Post-MVP)

| Component | Version | Notes |
|------------|----------|-------|
| **OpenAI GPT-4-turbo** | gpt-4-turbo | Real-time translation + smart replies |
| **OpenAI Whisper** | whisper-1 | Voice transcription |
| **Edge Function Runtime** | Node 18 | Supabase-compatible |
| **AI Cache Table** | translations | Cached AI responses |

---

## 🧩 Tooling & Linting

| Tool | Version | Notes |
|------|----------|-------|
| **ESLint** | ^9.5.0 | Standard Expo config |
| **Prettier** | ^3.3.0 | Formatting |
| **dotenv** | ^16.4.0 | Environment variable parsing |
| **TypeScript** *(optional)* | ^5.6.0 | Optional if switching to TS later |
| **Babel** | ^7.24.0 | Expo default |

---

## 🧠 Compatibility Notes

- ✅ Expo SDK 51 requires Node 18+ → Node 20 recommended.
- ⚠️ Supabase JS v3 requires ESM imports (`import { createClient } from '@supabase/supabase-js'`).
- ⚠️ Avoid React Native Paper <5.0 — incompatible with Expo Router layouts.
- ⚙️ Edge Functions must use Node 18 runtime.
- 💾 SQLite is synchronous; use batched writes for message queues.

---

## 🧭 Setup Verification

```bash
node -v     # should be 20.x
npm -v      # should be 10.x
npx expo doctor
npx expo start
```

All checks should pass without warnings or version mismatch alerts.

---

**Maintainer Note:** Update this file before changing Expo SDK, Supabase SDK, or Node versions to prevent Cursor compatibility issues.

