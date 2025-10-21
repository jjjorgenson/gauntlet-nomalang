# 📁 NomaLang Canonical Project Structure

> **Purpose:** Prevent nested or misaligned scaffolds between Cursor, Expo, and Supabase. Keep a single project root with one `package.json`.

---

## 🧱 Root Layout

```
/Users/jasonjorgenson/Gauntlet/nomalang/gauntlet-nomalang/NomaLang/
├── app/
│   ├── (auth)/
│   │   ├── _layout.js
│   │   ├── login.js
│   │   └── signup.js
│   ├── (chat)/              # future messaging routes
│   ├── lib/                 # Supabase client + hooks
│   │   ├── supabase.js
│   │   └── auth.js
│   ├── components/          # Reusable UI (AuthForm, MessageList, etc.)
│   └── AppEntry.jsx         # (optional) entry wrapper if needed
│
├── assets/                  # images, fonts, icons
│
├── docs/                    # project documentation
│   ├── tech_stack.md
│   ├── realtime_architecture.md
│   ├── db_schema.mmd
│   ├── message_flow.md
│   ├── environment_setup.md
│   └── project_structure.md  ← this file
│
├── node_modules/
│
├── .env                     # contains EXPO_PUBLIC_SUPABASE_URL & ANON_KEY
├── .gitignore               # includes .expo/, node_modules/, .env
├── App.js                   # entry point for Expo app
├── app.json                 # Expo config
├── package.json             # single source of truth
└── README.md
```

---

## 🧭 Verification Commands

Run from inside the **NomaLang** directory (same level as `package.json`):

```bash
npx expo start -c
```

✅ Expected results:
- Expo detects the `app/` folder automatically.
- `npx expo doctor` reports *0 failed checks*.
- `.expo/` is ignored by Git.

---

## ⚙️ Cursor Guidance

- Cursor must always reference paths **relative to this NomaLang root**.  
  Example:
  ```
  app/lib/supabase.js
  app/(auth)/login.js
  docs/realtime_architecture.md
  ```

- Never scaffold outside of this root (e.g., no `/Gauntlet/nomalang/app`).

- When creating new modules, always use this root as the base import:
  ```js
  import { supabase } from '../../lib/supabase';
  ```

---

## 🧠 Troubleshooting Tips

| Symptom | Likely Cause | Fix |
|----------|--------------|-----|
| Expo can’t find `app/` | Folder nested in wrong directory | Move it under same level as `package.json` |
| “Metro can’t resolve module…” | Wrong relative import path | Adjust relative path (no cross-project imports) |
| `.expo` warning persists | `.expo/` not in `.gitignore` | Add `.expo/` and re-run `npx expo-doctor` |
| Cursor scaffolds into wrong folder | Opened parent directory instead of NomaLang root | Open `/NomaLang/` as project root in Cursor |

---

✅ **Summary:**
Keep `app/`, `docs/`, `.env`, and `package.json` inside the same **NomaLang** root. Run all commands from that directory, and open that folder as the project root in Cursor or VS Code.

