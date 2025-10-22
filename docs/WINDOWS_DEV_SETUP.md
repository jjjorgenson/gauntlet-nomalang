# Windows Development Environment Setup Guide
## Multilingual Family Chat Application

**Last Updated:** October 22, 2025  
**For:** Windows 10/11 Development

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Core Tools Installation](#core-tools-installation)
3. [Node.js & Package Managers](#nodejs--package-managers)
4. [React Native & Expo Setup](#react-native--expo-setup)
5. [Vercel CLI Setup](#vercel-cli-setup)
6. [Supabase Setup](#supabase-setup)
7. [Code Editor Setup](#code-editor-setup)
8. [Environment Variables](#environment-variables)
9. [Testing Your Setup](#testing-your-setup)
10. [Troubleshooting](#troubleshooting)

---

## 1. Prerequisites

### System Requirements
- **OS:** Windows 10 (version 1903+) or Windows 11
- **RAM:** 8GB minimum, 16GB recommended
- **Storage:** 10GB free space
- **Internet:** Stable connection for downloads and API calls

### Required Accounts
- [ ] **GitHub Account** (for version control)
- [ ] **Vercel Account** (free tier) - https://vercel.com/signup
- [ ] **Supabase Account** (free tier) - https://supabase.com/signup
- [ ] **OpenAI Account** (with API access) - https://platform.openai.com/signup
- [ ] **Expo Account** (free) - https://expo.dev/signup

---

## 2. Core Tools Installation

### 2.1 Git for Windows
1. Download Git from: https://git-scm.com/download/win
2. Run installer with these settings:
   - ✅ Use Git from Windows Command Prompt
   - ✅ Use bundled OpenSSH
   - ✅ Use OpenSSL library
   - ✅ Checkout Windows-style, commit Unix-style line endings
3. Verify installation:
   ```bash
   git --version
   # Should show: git version 2.x.x
   ```

### 2.2 Windows Terminal (Optional but Recommended)
1. Install from Microsoft Store: "Windows Terminal"
2. Set as default terminal
3. Improves command line experience significantly

---

## 3. Node.js & Package Managers

### 3.1 Install Node.js v20.19.5

**Option A: Direct Install (Recommended for Beginners)**
1. Download Node.js v20.19.5 from: https://nodejs.org/download/release/v20.19.5/
2. Download: `node-v20.19.5-x64.msi` (64-bit Windows)
3. Run installer with default settings
4. Restart your terminal

**Option B: Using NVM for Windows (Recommended for Multiple Projects)**
1. Download NVM for Windows: https://github.com/coreybutler/nvm-windows/releases
2. Download and run `nvm-setup.exe`
3. Install Node.js 20.19.5:
   ```bash
   nvm install 20.19.5
   nvm use 20.19.5
   ```

### 3.2 Verify Installation
```bash
node --version
# Should show: v20.19.5

npm --version
# Should show: 10.8.2

npx --version
# Should show: 10.8.2
```

### 3.3 Configure npm (Optional but Recommended)
```bash
# Set npm to use faster registry (optional)
npm config set registry https://registry.npmjs.org/

# Increase memory limit for large projects
npm config set maxsockets 5
```

---

## 4. React Native & Expo Setup

### 4.1 Install Expo CLI Globally
```bash
npm install -g expo-cli@6.3.10
```

### 4.2 Verify Expo Installation
```bash
expo --version
# Should show: 6.3.10
```

### 4.3 Install EAS CLI (Expo Application Services)
```bash
npm install -g eas-cli
```

### 4.4 Login to Expo
```bash
expo login
# Enter your Expo credentials
```

### 4.5 Install Android Studio (for Android Development)

**If you plan to test on Android:**
1. Download Android Studio: https://developer.android.com/studio
2. Run installer with default settings
3. Open Android Studio → More Actions → SDK Manager
4. Install:
   - ✅ Android SDK Platform 34 (Android 14)
   - ✅ Android SDK Build-Tools 34.0.0
   - ✅ Android Emulator
   - ✅ Android SDK Platform-Tools

5. Set environment variables:
   - Add to System Environment Variables:
     ```
     ANDROID_HOME = C:\Users\[YourUsername]\AppData\Local\Android\Sdk
     ```
   - Add to Path:
     ```
     %ANDROID_HOME%\platform-tools
     %ANDROID_HOME%\tools
     %ANDROID_HOME%\tools\bin
     ```

6. Restart your terminal

### 4.6 Create Android Virtual Device (AVD)
1. Open Android Studio → More Actions → Virtual Device Manager
2. Create Device → Choose Pixel 5 or similar
3. Download System Image: Android 14 (API 34)
4. Finish and create AVD

### 4.7 Install Xcode (for iOS Development - Mac Only)
**Note:** iOS development requires a Mac. For Windows, you can:
- Use Expo Go app on physical iOS device
- Use cloud-based Mac services (e.g., MacStadium)
- Focus on Android development only

---

## 5. Vercel CLI Setup

### 5.1 Install Vercel CLI
```bash
npm install -g vercel@latest
```

### 5.2 Login to Vercel
```bash
vercel login
# Choose your preferred login method (GitHub recommended)
```

### 5.3 Verify Installation
```bash
vercel --version
# Should show: Vercel CLI 33.x.x or higher
```

---

## 6. Supabase Setup

### 6.1 Install Supabase CLI
```bash
npm install -g supabase
```

### 6.2 Login to Supabase
```bash
supabase login
# This will open browser for authentication
```

### 6.3 Verify Installation
```bash
supabase --version
# Should show: 1.x.x or higher
```

---

## 7. Code Editor Setup

### 7.1 Install Visual Studio Code
1. Download from: https://code.visualstudio.com/
2. Run installer with these options:
   - ✅ Add "Open with Code" action to Windows Explorer
   - ✅ Add to PATH
   - ✅ Register Code as editor for supported file types

### 7.2 Install Essential VS Code Extensions
Open VS Code and install:
- **ES7+ React/Redux/React-Native snippets** (dsznajder.es7-react-js-snippets)
- **ESLint** (dbaeumer.vscode-eslint)
- **Prettier - Code formatter** (esbenp.prettier-vscode)
- **React Native Tools** (msjsdiag.vscode-react-native)
- **GitLens** (eamodio.gitlens)
- **Expo Tools** (expo.vscode-expo-tools)
- **JavaScript (ES6) code snippets** (xabikos.JavaScriptSnippets)

### 7.3 Configure VS Code Settings
Create `.vscode/settings.json` in your project:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "javascript.preferences.quoteStyle": "single",
  "javascript.updateImportsOnFileMove.enabled": "always"
}
```

---

## 8. Environment Variables

### 8.1 Create Environment Files

Your project will need these `.env` files:

#### Frontend (React Native) - `.env`
```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Expo
EXPO_PUBLIC_APP_SLUG=multilingual-chat
```

#### Backend (Vercel) - `.env.local`
```env
# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# Expo Push Notifications
EXPO_ACCESS_TOKEN=your_expo_access_token
```

### 8.2 Get Your API Keys

**Supabase:**
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy:
   - Project URL → `SUPABASE_URL`
   - `anon` `public` key → `SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

**OpenAI:**
1. Go to: https://platform.openai.com/api-keys
2. Create new secret key
3. Copy → `OPENAI_API_KEY`

**Expo Access Token:**
1. Go to: https://expo.dev/accounts/[your-username]/settings/access-tokens
2. Create a new token
3. Copy → `EXPO_ACCESS_TOKEN`

### 8.3 Security Notes
- ✅ Never commit `.env` files to Git
- ✅ Add `.env*` to `.gitignore`
- ✅ Use `EXPO_PUBLIC_` prefix for client-side variables in Expo
- ✅ Keep service role keys in backend only
- ✅ Use environment variable management in Vercel dashboard for production

---

## 9. Testing Your Setup

### 9.1 Test Node.js & npm
```bash
node -e "console.log('Node.js works!')"
npm --version
```

### 9.2 Test Expo
```bash
# Create a test project
npx create-expo-app@latest test-app --template blank

cd test-app
npm start

# This should open Expo Dev Tools in browser
# Press 'a' for Android or 'i' for iOS (Mac only)
```

### 9.3 Test Vercel CLI
```bash
# In any directory
vercel --version
vercel whoami
# Should show your Vercel username
```

### 9.4 Test Supabase CLI
```bash
supabase --version
supabase projects list
# Should show your Supabase projects
```

---

## 10. Troubleshooting

### Issue: npm command not found
**Solution:**
1. Close and reopen terminal
2. Check if Node.js is in PATH:
   - Windows: System Properties → Environment Variables → Path
   - Add: `C:\Program Files\nodejs\`

### Issue: Expo not starting
**Solution:**
```bash
# Clear Expo cache
expo start -c

# Or clear npm cache
npm cache clean --force
```

### Issue: Android Emulator not starting
**Solution:**
1. Open Android Studio
2. Tools → Device Manager
3. Start emulator manually
4. Then run `expo start` and press 'a'

### Issue: Port 19000 already in use
**Solution:**
```bash
# Kill process on port 19000
netstat -ano | findstr :19000
taskkill /PID <PID_NUMBER> /F

# Or use a different port
expo start --port 19001
```

### Issue: EACCES permission errors (npm install)
**Solution:**
```bash
# Run as administrator
# Or fix npm permissions:
npm config set prefix %APPDATA%\npm
```

### Issue: Git SSL certificate errors
**Solution:**
```bash
# Temporarily disable SSL verification (not recommended for production)
git config --global http.sslVerify false

# Better: Update Git or use proper certificates
```

---

## Project Initialization Checklist

Once your environment is set up, initialize your project:

### Frontend (React Native + Expo)
```bash
# Create new Expo project
npx create-expo-app@latest multilingual-chat-app --template blank

cd multilingual-chat-app

# Install dependencies (based on your tech stack)
npm install react@19.2.0 react-native@0.81.5
npm install @supabase/supabase-js@latest
npm install expo-av@~14.0.0
npm install franc@latest
npm install @react-native-async-storage/async-storage@latest
npm install expo-notifications@~0.28.0

# Initialize Expo project
expo init
```

### Backend (Vercel Functions)
```bash
# In your project root, create backend folder
mkdir api

# Install Vercel CLI globally (already done)
# Link to Vercel project
vercel link

# Install backend dependencies
npm install openai@latest
npm install @supabase/supabase-js@latest
npm install expo-server-sdk@latest

# Create vercel.json configuration
```

### Database (Supabase)
```bash
# Initialize Supabase locally (optional)
supabase init

# Link to remote project
supabase link --project-ref your-project-ref

# Pull remote schema
supabase db pull
```

---

## Quick Start Commands

After setup is complete, you'll use these commands regularly:

### Development
```bash
# Start React Native app
npm start
# or
expo start

# Run Android
npm run android
# or press 'a' in Expo terminal

# Run iOS (Mac only)
npm run ios
# or press 'i' in Expo terminal

# Start Vercel backend locally
vercel dev
```

### Deployment
```bash
# Build Android APK
eas build --platform android

# Deploy Vercel backend
vercel --prod

# Push database changes
supabase db push
```

---

## Recommended Folder Structure

```
multilingual-chat-app/
├── api/                          # Vercel serverless functions
│   ├── webhook/
│   │   ├── message-created.js
│   │   └── message-edited.js
│   ├── transcribe-voice.js
│   ├── explain-slang.js
│   ├── adjust-formality.js
│   └── cron/
│       └── cultural-hints.js
├── src/                          # React Native source
│   ├── components/
│   ├── screens/
│   ├── contexts/
│   ├── services/
│   └── utils/
├── assets/                       # Images, fonts, etc.
├── supabase/                     # Database migrations
│   ├── migrations/
│   └── functions/
├── .env                          # Frontend environment variables
├── .env.local                    # Backend environment variables
├── .gitignore
├── app.json                      # Expo configuration
├── package.json
└── vercel.json                   # Vercel configuration
```

---

## Additional Resources

### Documentation
- **React Native:** https://reactnative.dev/docs/getting-started
- **Expo:** https://docs.expo.dev/
- **Vercel:** https://vercel.com/docs
- **Supabase:** https://supabase.com/docs
- **OpenAI:** https://platform.openai.com/docs

### Community
- **React Native Discord:** https://discord.gg/react-native
- **Expo Discord:** https://chat.expo.dev/
- **Supabase Discord:** https://discord.supabase.com/

### Learning Resources
- **React Native Tutorial:** https://reactnative.dev/docs/tutorial
- **Expo Tutorial:** https://docs.expo.dev/tutorial/introduction/
- **Vercel Functions Guide:** https://vercel.com/docs/functions

---

## Next Steps

1. ✅ Complete all installations in this guide
2. ✅ Create accounts on all required platforms
3. ✅ Test your setup with the verification steps
4. ✅ Initialize your project structure
5. ✅ Set up environment variables
6. 📚 Read the detailed architecture documents
7. 💻 Start building!

---

**You're now ready to develop your multilingual chat application on Windows!**

For architecture details, see:
- `TECHNICAL_ARCHITECTURE.md`
- `ARCHITECTURE_FRONTEND.md`
- `ARCHITECTURE_BACKEND.md`
- `DATABASE_SCHEMA.md`

Good luck! 🚀
