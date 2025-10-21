# NomaLang Memory Bank (v3)

This document captures the current working state of NomaLang’s architecture, implementation plan, and development priorities.

---

## 🧭 Project Overview

**Project Name:** NomaLang  
**Type:** Multilingual messaging app with AI translation  
**Platform:** React Native + Expo (Android primary)  
**Backend:** Supabase (Auth, Realtime, DB, Edge Functions)  
**AI Layer:** OpenAI GPT-4-turbo, Whisper, via Supabase Edge Functions

---

## 📆 Timeline

| Phase | Deadline | Deliverables |
|--------|-----------|--------------|
| **MVP** | Tuesday, Oct 20, 9:00 PM CT | Core messaging, realtime, offline support, presence, read receipts, push notifications |
| **Early Submission** | Friday, Oct 22 | MVP + 2–3 AI features (language detection, real-time translation, auto-translate) |
| **Final Submission** | Sunday, Oct 24 | All AI features, smart replies, polished UI, demo video |

---

## 🧩 Architecture Summary

**Core Stack:**  
React Native (Expo SDK 51) + Supabase JS SDK v2.45 + SQLite (Expo) + Edge Functions (Node 18)

**Realtime Components:**
- `messages:<conversation_id>` for inserts and delivery/read updates  
- `typing:<conversation_id>` for debounced typing + 3s heartbeat + hold-open  
- `presence:<conversation_id>` for 15s heartbeats, 30s expiry

**Reliability:**
- At-least-once delivery via UUID deduplication
- Offline queue (SQLite) with retry on reconnect
- Idempotent message inserts (`INSERT ON CONFLICT DO NOTHING`)
- `message_status` table tracks per-recipient read/delivered

**Group Chat Support:**
- Realtime channels scoped by conversation ID  
- Aggregated typing indicators for large groups  
- Optimized presence sync for up to 100 participants

---

## ⚙️ Tech Stack Snapshot

| Layer | Tool/Version |
|-------|---------------|
| **Frontend** | Expo SDK 51, React Native 0.74, Node 20, npm 10 |
| **UI** | React Native Paper 5.12, Expo Router 3.5 |
| **Storage** | SQLite (Expo 13.3) |
| **Backend** | Supabase (Postgres 15, Realtime v3) |
| **Edge Functions** | Node 18, `openai@4.21.0` |
| **AI Models** | GPT-4-turbo (text), Whisper-1 (voice) |
| **Push** | Expo Notifications 0.29 |

---

## 📊 Project Artifacts

| File | Purpose |
|------|----------|
| `realtime_architecture.md` | Explains realtime logic + diagrams |
| `realtime_architecture.mmd` | Cursor-ready diagrams |
| `db_schema.mmd` | Supabase database ERD |
| `message_flow.md` | Client → backend → AI lifecycle |
| `message_flow.mmd` | Cursor-ready version |
| `tech_stack.md` | Version locks + compatibility notes |

---

## 🧱 Development Priorities

1. **Messaging Core** — real-time send/receive, persistence, queue, delivery states.  
2. **Presence + Typing** — low-traffic realtime via scoped channels.  
3. **Push Notifications** — test with Expo foreground delivery.  
4. **Offline Support** — SQLite queue + retry.  
5. **AI Phase (Post-MVP)** — language detection, translation, formality control, smart replies.

---

## 💡 Key Insights / Patterns

- **Non-duplicated reliable delivery:** Each message UUID ensures exactly-once insert and safe retries.
- **Debounced + heartbeat typing:** Combine leading-edge trigger + trailing debounce + 3s hold-open.
- **Group optimization:** Aggregate presence/typing to prevent event spam.
- **AI offload:** Edge Functions handle translations + context to keep client lean.
- **Docs-driven dev:** Cursor and human developers share same architecture via `/docs/` folder.

---

## 🔜 Next Steps

1. Initialize Supabase project and tables from `db_schema.mmd`.  
2. Scaffold Expo app folder structure per `tech_stack.md`.  
3. Integrate realtime subscriptions for messages, typing, and presence.  
4. Implement local queue + delivery states.  
5. Test MVP features on device + emulator.  
6. Deploy Edge Function stub for future AI features.

---

**Status:** Ready for build in Cursor. All architecture, schema, and tech stack confirmed and version-locked.

