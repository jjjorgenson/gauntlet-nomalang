# UI/UX Specification
## Multilingual Family Chat Application

**Version:** 1.0  
**Last Updated:** October 22, 2025  

---

## Table of Contents
1. [System Architecture Diagram](#1-system-architecture-diagram)
2. [User Flow Diagrams](#2-user-flow-diagrams)
3. [Screen Wireframes with User Flows](#3-screen-wireframes-with-user-flows)
4. [Component Hierarchy](#4-component-hierarchy)
5. [Design System](#5-design-system)

---

## 1. System Architecture Diagram

```mermaid
graph TB
    subgraph "Mobile Client Layer"
        A[React Native + Expo App]
        A1[UI Components]
        A2[State Management]
        A3[Offline Queue]
        A4[Real-time Subscriptions]
        A --> A1
        A --> A2
        A --> A3
        A --> A4
    end
    
    subgraph "Supabase Layer"
        B[PostgreSQL Database]
        C[Realtime WebSockets]
        D[Authentication JWT]
        E[Storage S3-compatible]
        F[Database Triggers]
    end
    
    subgraph "Vercel Serverless Layer"
        G[API Routes]
        H[Webhook Handlers]
        I[Background Jobs]
        J[Cron Jobs]
    end
    
    subgraph "External Services"
        K[OpenAI API]
        K1[GPT-4o-mini]
        K2[Whisper STT]
        L[Expo Push Service]
        K --> K1
        K --> K2
    end
    
    A1 --> D
    A2 --> B
    A3 --> B
    A4 --> C
    
    F --> H
    B --> F
    
    H --> G
    G --> I
    I --> K
    
    G --> L
    I --> B
    
    J -.Daily Cron.-> I
    
    style A fill:#e1f5ff
    style B fill:#ffe1e1
    style G fill:#e1ffe1
    style K fill:#fff4e1
```

**Architecture Layers:**

1. **Mobile Client:** React Native app with optimistic UI and offline support
2. **Supabase:** Managed PostgreSQL with real-time, auth, and storage
3. **Vercel Serverless:** API endpoints and background processing
4. **External Services:** OpenAI for AI features, Expo for push notifications

**Data Flow:**
- User action → Optimistic UI → Supabase insert → Trigger webhook → Vercel processes → OpenAI API → Update database → Push notification

---

## 2. User Flow Diagrams

### 2.1 Authentication Flow

```mermaid
flowchart TD
    Start([User Opens App]) --> CheckAuth{Authenticated?}
    CheckAuth -->|Yes| HomeScreen[Show Conversation List]
    CheckAuth -->|No| AuthScreen[Show Login/Signup Screen]
    
    AuthScreen --> ChooseAuth{Choose Action}
    ChooseAuth -->|Login| EnterLogin[Enter Email + Password]
    ChooseAuth -->|Signup| EnterSignup[Enter Email + Password + Username]
    
    EnterLogin --> ValidateLogin{Valid Credentials?}
    ValidateLogin -->|No| ShowError1[Show Error Message]
    ShowError1 --> EnterLogin
    ValidateLogin -->|Yes| GetToken[Supabase Auth Returns JWT]
    
    EnterSignup --> ValidateSignup{Valid Data?}
    ValidateSignup -->|No| ShowError2[Show Error Message]
    ShowError2 --> EnterSignup
    ValidateSignup -->|Yes| CreateAccount[Create Account]
    CreateAccount --> SelectLanguage[Select Native Language]
    SelectLanguage --> GetToken
    
    GetToken --> StoreToken[Store JWT in Secure Storage]
    StoreToken --> HomeScreen
    
    style Start fill:#e1f5ff
    style HomeScreen fill:#e1ffe1
    style GetToken fill:#fff4e1
```

### 2.2 Send Text Message Flow

```mermaid
flowchart TD
    Start([User Types Message]) --> TypeText[Text Input Updates]
    TypeText --> TriggerTyping[Send Typing Indicator]
    TriggerTyping --> PressedSend{User Presses Send?}
    
    PressedSend -->|No| TypeText
    PressedSend -->|Yes| DetectLang[Client Detects Language with franc]
    
    DetectLang --> OptimisticUI[Show Message Immediately Optimistic UI]
    OptimisticUI --> InsertDB[INSERT into messages table]
    
    InsertDB --> DBTrigger[Database Trigger Fires]
    DBTrigger --> Webhook[POST /api/webhook/message-created]
    
    Webhook --> FetchParticipants[Fetch Conversation Participants]
    FetchParticipants --> CheckTranslation{Need Translation?}
    
    CheckTranslation -->|Yes| CallOpenAI[Call OpenAI GPT-4o-mini]
    CheckTranslation -->|No| SkipTranslation[Skip Translation]
    
    CallOpenAI --> StoreTranslation[Store in message_translations]
    CallOpenAI --> QueueSlang[Queue Slang Detection Async]
    CallOpenAI --> CheckCultural[Check Cultural Hints Async]
    
    StoreTranslation --> SendPush[Send Push Notification]
    SkipTranslation --> SendPush
    
    SendPush --> RealtimeUpdate[Supabase Realtime Delivers to Recipients]
    RealtimeUpdate --> RecipientSees[Recipients See Message]
    
    RecipientSees --> ShowTranslation{Translation Available?}
    ShowTranslation -->|Yes| DisplayTranslated[Show Translated Version]
    ShowTranslation -->|No| DisplayOriginal[Show Original]
    
    DisplayTranslated --> UpdateReadReceipt[Update Read Receipt]
    DisplayOriginal --> UpdateReadReceipt
    UpdateReadReceipt --> End([Message Flow Complete])
    
    style Start fill:#e1f5ff
    style OptimisticUI fill:#fff4e1
    style CallOpenAI fill:#ffe1e1
    style End fill:#e1ffe1
```

### 2.3 Send Voice Message Flow

```mermaid
flowchart TD
    Start([User Holds Mic Button]) --> StartRecording[Start Recording with expo-av]
    StartRecording --> ShowWaveform[Show Waveform Animation]
    ShowWaveform --> Recording{User Action}
    
    Recording -->|Swipe Left| CancelRecording[Cancel Recording]
    Recording -->|Release Button| StopRecording[Stop Recording]
    
    CancelRecording --> DeleteAudio[Delete Audio File]
    DeleteAudio --> End1([Recording Cancelled])
    
    StopRecording --> GetAudioURI[Get Audio File URI]
    GetAudioURI --> UploadStorage[Upload to Supabase Storage]
    UploadStorage --> InsertMessage[INSERT message with voice_url]
    
    InsertMessage --> ShowVoiceBubble[Show Voice Message Bubble]
    ShowVoiceBubble --> CallTranscribe[Call POST /api/transcribe-voice]
    
    CallTranscribe --> DownloadAudio[Backend Downloads Audio]
    DownloadAudio --> CallWhisper[Call OpenAI Whisper API]
    CallWhisper --> GetTranscription[Get Transcription + Language]
    
    GetTranscription --> UpdateMessage[UPDATE message.content with transcription]
    UpdateMessage --> TriggerTranslation[Trigger Translation Pipeline]
    
    TriggerTranslation --> TranslateText[Translate Transcription]
    TranslateText --> SendPush[Send Push with Transcription]
    SendPush --> RecipientReceives[Recipients Receive]
    
    RecipientReceives --> ShowOptions[Show Play Button + Transcription + Translation]
    ShowOptions --> End2([Voice Message Complete])
    
    style Start fill:#e1f5ff
    style CallWhisper fill:#ffe1e1
    style ShowOptions fill:#e1ffe1
    style End1 fill:#ffe1e1
    style End2 fill:#e1ffe1
```

### 2.4 Edit Message Flow

```mermaid
flowchart TD
    Start([User Long-Presses Own Message]) --> CheckConditions{Can Edit?}
    
    CheckConditions -->|Check 1| IsOwner{Is Owner?}
    CheckConditions -->|Check 2| IsText{Is Text Message?}
    CheckConditions -->|Check 3| WithinTime{< 5 minutes?}
    CheckConditions -->|Check 4| NoTranslations{No Translations Exist?}
    
    IsOwner -->|No| ShowError1[Error: Not Your Message]
    IsText -->|No| ShowError2[Error: Cannot Edit Voice]
    WithinTime -->|No| ShowError3[Error: Time Expired]
    NoTranslations -->|No| ShowError4[Error: Already Translated]
    
    ShowError1 --> End1([Edit Blocked])
    ShowError2 --> End1
    ShowError3 --> End1
    ShowError4 --> End1
    
    IsOwner -->|Yes| AllChecks{All Checks Pass?}
    IsText -->|Yes| AllChecks
    WithinTime -->|Yes| AllChecks
    NoTranslations -->|Yes| AllChecks
    
    AllChecks -->|No| End1
    AllChecks -->|Yes| ShowEditOption[Show Edit Option]
    
    ShowEditOption --> UserTapsEdit[User Taps Edit]
    UserTapsEdit --> ShowEditModal[Show Edit Modal with Pre-filled Text]
    ShowEditModal --> UserEdits[User Edits Text]
    UserEdits --> UserSaves{User Saves?}
    
    UserSaves -->|No| CloseModal[Close Modal]
    CloseModal --> End2([Edit Cancelled])
    
    UserSaves -->|Yes| SendPatch[PATCH /api/messages/:id]
    SendPatch --> BackendValidates[Backend Re-validates Conditions]
    BackendValidates --> UpdateDB[UPDATE message content + edited_at]
    
    UpdateDB --> DeleteTranslations[DELETE old translations]
    DeleteTranslations --> TriggerRetranslation[Re-trigger Translation Pipeline]
    TriggerRetranslation --> SendNotification[Send Edited Push Notification]
    
    SendNotification --> RealtimeUpdate[Realtime UPDATE Event]
    RealtimeUpdate --> ShowEditedBadge[Show edited Badge on Message]
    ShowEditedBadge --> End3([Edit Complete])
    
    style Start fill:#e1f5ff
    style ShowError1 fill:#ffe1e1
    style ShowError2 fill:#ffe1e1
    style ShowError3 fill:#ffe1e1
    style ShowError4 fill:#ffe1e1
    style End1 fill:#ffe1e1
    style End2 fill:#fff4e1
    style End3 fill:#e1ffe1
```

### 2.5 Slang Explanation Flow

```mermaid
flowchart TD
    Start([User Sees Unfamiliar Message]) --> TapButton[Tap What does this mean? Button]
    TapButton --> ShowLoading[Show Loading Indicator]
    ShowLoading --> CallAPI[POST /api/explain-slang]
    
    CallAPI --> BackendAnalyze[Backend Analyzes with GPT-4o-mini]
    BackendAnalyze --> HasSlang{Slang Detected?}
    
    HasSlang -->|No| ShowNoSlang[Show No slang found]
    ShowNoSlang --> End1([Flow Complete])
    
    HasSlang -->|Yes| StoreAnnotation[Store in ai_annotations table]
    StoreAnnotation --> ReturnTerms[Return Slang Terms + Explanations]
    ReturnTerms --> ShowModal[Show Modal with Explanations]
    
    ShowModal --> DisplayTerms[Display Each Term:<br/>- Term highlighted<br/>- Plain explanation<br/>- Cultural context]
    DisplayTerms --> UserReads[User Reads Explanations]
    UserReads --> UserCloses[User Closes Modal]
    UserCloses --> End2([Flow Complete])
    
    style Start fill:#e1f5ff
    style BackendAnalyze fill:#ffe1e1
    style ShowModal fill:#e1ffe1
    style End1 fill:#fff4e1
    style End2 fill:#e1ffe1
```

### 2.6 Formality Adjustment Flow

```mermaid
flowchart TD
    Start([User Types Message]) --> UserTapsWand[User Taps Magic Wand Icon]
    UserTapsWand --> ShowLoading[Show Loading Indicator]
    ShowLoading --> CallAPI[POST /api/adjust-formality]
    
    CallAPI --> BackendGenerate[Backend Generates 3 Versions with GPT-4o-mini]
    BackendGenerate --> ReturnVersions[Return Casual + Neutral + Formal]
    ReturnVersions --> ShowModal[Show Modal with 3 Options]
    
    ShowModal --> DisplayOptions[Display All 3 Side-by-Side:<br/>- Casual<br/>- Neutral<br/>- Formal]
    DisplayOptions --> UserSelects{User Action}
    
    UserSelects -->|Selects One| UpdateInput[Update Message Input with Selected Version]
    UserSelects -->|Cancels| KeepOriginal[Keep Original Text]
    
    UpdateInput --> CloseModal[Close Modal]
    KeepOriginal --> CloseModal
    CloseModal --> UserSends{User Sends?}
    
    UserSends -->|Yes| SendMessage[Send Message Flow]
    UserSends -->|No| UserEditsMore[User Continues Editing]
    
    SendMessage --> End1([Message Sent])
    UserEditsMore --> End2([Flow Complete])
    
    style Start fill:#e1f5ff
    style BackendGenerate fill:#ffe1e1
    style ShowModal fill:#e1ffe1
    style End1 fill:#e1ffe1
    style End2 fill:#fff4e1
```

### 2.7 Cultural Hints Flow

```mermaid
flowchart TD
    Start([Daily Cron Job Midnight UTC]) --> FetchConversations[Fetch Active Conversations last 7 days]
    FetchConversations --> FilterCrossCultural[Filter Cross-Cultural Conversations]
    FilterCrossCultural --> LoopConversations{For Each Conversation}
    
    LoopConversations --> GetParticipants[Get Participant Languages/Countries]
    GetParticipants --> CheckHolidays[Check Next 7 Days for Holidays]
    CheckHolidays --> CallOpenAI[Call OpenAI: Is there a significant holiday?]
    
    CallOpenAI --> HolidayFound{Holiday Found?}
    HolidayFound -->|No| NextConversation[Move to Next Conversation]
    NextConversation --> LoopConversations
    
    HolidayFound -->|Yes| StoreHint[Store cultural_hint in ai_annotations]
    StoreHint --> NextConversation
    
    LoopConversations -->|All Done| JobComplete[Job Complete]
    JobComplete --> UserOpensApp([User Opens App])
    
    UserOpensApp --> FetchAnnotations[Fetch Recent cultural_hint Annotations]
    FetchAnnotations --> HintsExist{Hints Exist?}
    
    HintsExist -->|No| ShowNormalChat[Show Normal Chat]
    HintsExist -->|Yes| ShowBanner[Show Banner at Top of Chat]
    
    ShowBanner --> DisplayHint[Display:<br/>- 💡 Icon<br/>- Holiday Name<br/>- Brief Description<br/>- Dismissible]
    DisplayHint --> UserDismisses{User Dismisses?}
    
    UserDismisses -->|Yes| HideBanner[Hide Banner]
    UserDismisses -->|No| BannerStays[Banner Stays Visible]
    
    HideBanner --> ShowNormalChat
    BannerStays --> ShowNormalChat
    ShowNormalChat --> End([Flow Complete])
    
    style Start fill:#e1f5ff
    style CallOpenAI fill:#ffe1e1
    style ShowBanner fill:#fff4e1
    style End fill:#e1ffe1
```

---

## 3. Screen Wireframes with User Flows

### 3.1 Conversation List Screen

```mermaid
graph TB
    subgraph "Conversation List Screen"
        A[Top Bar: App Title + Settings Icon]
        B[Search Bar]
        C[Conversation Item 1<br/>- Avatar<br/>- Name<br/>- Last Message Preview<br/>- Timestamp<br/>- Unread Badge]
        D[Conversation Item 2]
        E[Conversation Item 3]
        F[New Chat FAB Bottom Right]
    end
    
    subgraph "User Interactions"
        G[Tap Conversation] --> H[Open Chat Screen]
        I[Tap FAB] --> J[Open New Conversation Modal]
        K[Tap Settings] --> L[Open Settings Screen]
        M[Pull to Refresh] --> N[Refresh Conversation List]
    end
    
    A --> G
    A --> K
    C --> G
    D --> G
    E --> G
    F --> I
    B --> N
    
    style A fill:#e1f5ff
    style F fill:#e1ffe1
```

**Wireframe Description:**
```
┌─────────────────────────────────────┐
│  Family Chat          [Settings ⚙️] │
├─────────────────────────────────────┤
│  🔍 Search conversations...          │
├─────────────────────────────────────┤
│  👤 Grandma Maria             (2)   │
│  Gracias! See you tomorrow           │
│  10:30 AM                            │
├─────────────────────────────────────┤
│  👥 Family Group                    │
│  Alice: Sounds good!                 │
│  Yesterday                           │
├─────────────────────────────────────┤
│  👤 Uncle Bob                        │
│  No problem                          │
│  Oct 20                              │
├─────────────────────────────────────┤
│                                      │
│                      [➕ New Chat]   │
└─────────────────────────────────────┘
```

### 3.2 Chat Screen

```mermaid
graph TB
    subgraph "Chat Screen"
        A[Top Bar: Back + Contact Name + Avatar]
        B[Cultural Hint Banner if applicable<br/>💡 Today is Diwali in India...]
        C[Message List Scrollable]
        D[Typing Indicator: Alice is typing...]
        E[Input Area: Text Input + Magic Wand + Mic]
        F[Send Button]
    end
    
    subgraph "Message Bubble Interactions"
        G[Tap Message] --> H[Show Translation Toggle Original/Translated]
        I[Long Press Own Message] --> J[Show Edit/Delete Options]
        K[Tap ? Button] --> L[Explain Slang Modal]
        M[Tap Voice Play] --> N[Play Audio]
    end
    
    subgraph "Compose Area Interactions"
        O[Type Text] --> P[Trigger Typing Indicator]
        Q[Tap Magic Wand] --> R[Show Formality Picker Modal]
        S[Hold Mic] --> T[Start Recording]
        U[Tap Send] --> V[Send Message Flow]
    end
    
    C --> G
    C --> I
    C --> K
    C --> M
    E --> O
    E --> Q
    E --> S
    F --> U
    
    style A fill:#e1f5ff
    style B fill:#fff4e1
    style E fill:#e1ffe1
```

**Wireframe Description:**
```
┌─────────────────────────────────────┐
│ ← Grandma Maria        👤           │
├─────────────────────────────────────┤
│ 💡 Today is Día de los Muertos in   │
│    Mexico... [Dismiss ✕]            │
├─────────────────────────────────────┤
│                                      │
│  ┌──────────────────────┐           │
│  │ Hola! ¿Cómo estás?   │           │
│  │ 10:30 AM        ✓✓   │           │
│  └──────────────────────┘           │
│  [Translation: Hi! How are you?]    │
│  [? Explain slang]                  │
│                                      │
│           ┌──────────────────────┐  │
│           │ I'm good, thanks!    │  │
│           │ 10:32 AM        ✓    │  │
│           └──────────────────────┘  │
│           [Traducción: ¡Estoy...]   │
│           [edited]                  │
│                                      │
│  ┌─ Voice Message ─────────┐        │
│  │ [▶️ Play] 0:45          │        │
│  │ Transcription: Let me... │        │
│  │ Translation: Déjame...   │        │
│  └─────────────────────────┘        │
│                                      │
│  Alice is typing...                 │
├─────────────────────────────────────┤
│ [Type a message...] [✨] [🎤]  [➤] │
└─────────────────────────────────────┘
```

### 3.3 Settings Screen

```mermaid
graph TB
    subgraph "Settings Screen"
        A[Top Bar: Back + Settings Title]
        B[Profile Section<br/>- Avatar<br/>- Username<br/>- Email]
        C[Language: Native Language Dropdown]
        D[Theme: System/Light/Dark Radio Buttons]
        E[Notifications: Push Toggle]
        F[About Section]
        G[Logout Button]
    end
    
    subgraph "User Interactions"
        H[Tap Profile] --> I[Edit Profile Modal]
        J[Change Language] --> K[Update user.native_language]
        L[Change Theme] --> M[Update user.theme_preference]
        N[Tap Logout] --> O[Confirm Logout Dialog]
    end
    
    B --> H
    C --> J
    D --> L
    G --> N
    
    style A fill:#e1f5ff
    style G fill:#ffe1e1
```

**Wireframe Description:**
```
┌─────────────────────────────────────┐
│ ← Settings                           │
├─────────────────────────────────────┤
│                                      │
│  ┌─────────────────────────────┐    │
│  │    👤                        │    │
│  │    Alex Johnson              │    │
│  │    alex@example.com          │    │
│  │    [Edit Profile]            │    │
│  └─────────────────────────────┘    │
│                                      │
│  Language                            │
│  [English ▼]                         │
│                                      │
│  Theme                               │
│  ○ System Default                    │
│  ○ Light                             │
│  ● Dark                              │
│                                      │
│  Notifications                       │
│  Push Notifications     [ON]         │
│                                      │
│  About                               │
│  Version 1.0.0                       │
│  Terms of Service                    │
│  Privacy Policy                      │
│                                      │
│  [Logout]                            │
│                                      │
└─────────────────────────────────────┘
```

### 3.4 Formality Picker Modal

```mermaid
graph TB
    subgraph "Formality Picker Modal"
        A[Modal Title: Choose Formality]
        B[Casual Option<br/>Preview Text]
        C[Neutral Option<br/>Preview Text]
        D[Formal Option<br/>Preview Text]
        E[Cancel Button]
    end
    
    subgraph "User Interactions"
        F[Tap Casual] --> G[Select Casual + Close]
        H[Tap Neutral] --> I[Select Neutral + Close]
        J[Tap Formal] --> K[Select Formal + Close]
        L[Tap Cancel] --> M[Close without Selection]
        N[Tap Outside] --> M
    end
    
    B --> F
    C --> H
    D --> J
    E --> L
    
    style A fill:#e1f5ff
    style B fill:#fff4e1
    style C fill:#e1ffe1
    style D fill:#ffe1e1
```

**Wireframe Description:**
```
┌─────────────────────────────────────┐
│  Choose Formality Level              │
├─────────────────────────────────────┤
│                                      │
│  😊 Casual                           │
│  ┌─────────────────────────────┐    │
│  │ Hey! Can you send that over? │    │
│  └─────────────────────────────┘    │
│                                      │
│  😐 Neutral                          │
│  ┌─────────────────────────────┐    │
│  │ Hello, could you please send │    │
│  │ that?                         │    │
│  └─────────────────────────────┘    │
│                                      │
│  🎩 Formal                           │
│  ┌─────────────────────────────┐    │
│  │ Good afternoon, would you    │    │
│  │ kindly send that document?   │    │
│  └─────────────────────────────┘    │
│                                      │
│           [Cancel]                   │
└─────────────────────────────────────┘
```

### 3.5 Slang Explanation Modal

```mermaid
graph TB
    subgraph "Slang Explanation Modal"
        A[Modal Title: Slang Explanations]
        B[Term 1:<br/>- Term highlighted<br/>- Explanation<br/>- Context]
        C[Term 2:<br/>- Term highlighted<br/>- Explanation<br/>- Context]
        D[Close Button]
    end
    
    subgraph "User Interactions"
        E[Tap Close] --> F[Close Modal]
        G[Tap Outside] --> F
    end
    
    D --> E
    
    style A fill:#e1f5ff
    style B fill:#fff4e1
    style C fill:#e1ffe1
```

**Wireframe Description:**
```
┌─────────────────────────────────────┐
│  Slang Explanations           [✕]   │
├─────────────────────────────────────┤
│                                      │
│  "no cap"                            │
│  ┌─────────────────────────────┐    │
│  │ Means: no lie, for real      │    │
│  │ Context: Gen Z slang, used   │    │
│  │ to emphasize truthfulness    │    │
│  └─────────────────────────────┘    │
│                                      │
│  "fr fr"                             │
│  ┌─────────────────────────────┐    │
│  │ Means: for real for real     │    │
│  │ (emphasis)                    │    │
│  │ Context: Internet slang,     │    │
│  │ repetition adds emphasis      │    │
│  └─────────────────────────────┘    │
│                                      │
│           [Got it]                   │
└─────────────────────────────────────┘
```

---

## 4. Component Hierarchy

```mermaid
graph TB
    App[App Root] --> Auth[Auth Provider]
    Auth --> Theme[Theme Provider]
    Theme --> Nav[Navigation Container]
    
    Nav --> ConvList[Conversation List Screen]
    Nav --> ChatScreen[Chat Screen]
    Nav --> Settings[Settings Screen]
    
    ConvList --> ConvItem1[Conversation Item]
    ConvList --> ConvItem2[Conversation Item]
    ConvList --> ConvItemN[Conversation Item ...]
    ConvList --> FAB[New Chat FAB]
    
    ChatScreen --> TopBar[Chat Header]
    ChatScreen --> CulturalBanner[Cultural Hint Banner]
    ChatScreen --> MessageList[Message List]
    ChatScreen --> TypingInd[Typing Indicator]
    ChatScreen --> ComposeArea[Compose Area]
    
    MessageList --> MessageBubble1[Message Bubble]
    MessageList --> MessageBubble2[Message Bubble]
    MessageList --> MessageBubbleN[Message Bubble ...]
    
    MessageBubble1 --> TextContent[Text Content]
    MessageBubble1 --> TranslationToggle[Translation Toggle]
    MessageBubble1 --> ReadReceipt[Read Receipt]
    MessageBubble1 --> EditedBadge[Edited Badge]
    MessageBubble1 --> SlangButton[Explain Slang Button]
    
    MessageBubble2 --> VoicePlayer[Voice Player]
    MessageBubble2 --> VoiceTranscription[Transcription]
    MessageBubble2 --> VoiceTranslation[Translation]
    
    ComposeArea --> TextInput[Text Input]
    ComposeArea --> MagicWand[Magic Wand Icon]
    ComposeArea --> MicButton[Mic Button]
    ComposeArea --> SendButton[Send Button]
    
    MagicWand --> FormalityModal[Formality Picker Modal]
    SlangButton --> SlangModal[Slang Explanation Modal]
    
    Settings --> ProfileSection[Profile Section]
    Settings --> LanguageSelect[Language Selector]
    Settings --> ThemeSelect[Theme Selector]
    Settings --> LogoutButton[Logout Button]
    
    style App fill:#e1f5ff
    style ChatScreen fill:#e1ffe1
    style MessageList fill:#fff4e1
```

---

## 5. Design System

### 5.1 Color Palette

**Light Mode:**
```mermaid
graph LR
    A[Background<br/>#FFFFFF] --> B[Text<br/>#000000]
    A --> C[Sent Bubble<br/>#DCF8C6]
    A --> D[Received Bubble<br/>#FFFFFF]
    A --> E[Input Background<br/>#F0F0F0]
    A --> F[Border<br/>#E0E0E0]
    
    G[Checkmark Sent<br/>#8696A0] --> H[Checkmark Delivered<br/>#53BDEB]
    H --> I[Checkmark Read<br/>#34B7F1]
    
    style C fill:#DCF8C6
    style H fill:#53BDEB
    style I fill:#34B7F1
```

**Dark Mode:**
```mermaid
graph LR
    A[Background<br/>#0B141A] --> B[Text<br/>#E9EDEF]
    A --> C[Sent Bubble<br/>#005C4B]
    A --> D[Received Bubble<br/>#1F2C34]
    A --> E[Input Background<br/>#2A3942]
    A --> F[Border<br/>#2A3942]
    
    G[Checkmark Sent<br/>#8696A0] --> H[Checkmark Delivered<br/>#53BDEB]
    H --> I[Checkmark Read<br/>#34B7F1]
    
    style A fill:#0B141A
    style B fill:#E9EDEF
    style C fill:#005C4B
    style D fill:#1F2C34
```

### 5.2 Typography

**Font Stack:**
- System Font (iOS: San Francisco, Android: Roboto)
- Font Sizes:
  - Headers: 20px
  - Body: 16px
  - Secondary: 14px
  - Caption: 12px

### 5.3 Spacing

**Spacing Scale:**
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px

### 5.4 Component States

```mermaid
stateDiagram-v2
    [*] --> Default
    Default --> Hover: Mouse Over / Touch Down
    Hover --> Active: Click / Tap
    Active --> Loading: Processing
    Loading --> Success: Complete
    Loading --> Error: Failed
    Success --> Default: Return
    Error --> Default: Retry
    
    Default --> Disabled: Condition Not Met
    Disabled --> Default: Condition Met
```

### 5.5 Animation Guidelines

**Timing:**
- Fast: 150ms (button press, toggle)
- Medium: 300ms (modal open/close, navigation)
- Slow: 500ms (page transitions)

**Easing:**
- Ease-out: For elements entering
- Ease-in: For elements exiting
- Ease-in-out: For elements moving

---

## Summary

This UI/UX specification provides:
- ✅ **System architecture diagram** showing all layers and connections
- ✅ **Comprehensive user flows** for all major features
- ✅ **Screen wireframes** with interaction points
- ✅ **Component hierarchy** for frontend structure
- ✅ **Design system** with colors, typography, and spacing

**Key Flows Documented:**
1. Authentication (Login/Signup)
2. Send Text Message (with translation)
3. Send Voice Message (with transcription)
4. Edit Message (with validation)
5. Slang Explanation (on-demand)
6. Formality Adjustment (magic wand)
7. Cultural Hints (daily cron + banner)

**Screens Defined:**
1. Conversation List
2. Chat Screen
3. Settings Screen
4. Formality Picker Modal
5. Slang Explanation Modal

---

**End of UI/UX Specification**
