# Frontend Architecture
## React Native + Expo Mobile Application

**Version:** 1.0  
**Last Updated:** October 22, 2025  
**Parent Doc:** [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md)

---

## Overview

The mobile frontend is built with React Native and Expo, providing a cross-platform (iOS/Android) native experience with a single JavaScript codebase. **No TypeScript is used** - pure JavaScript (ES6+) with modern syntax.

---

## Project Structure

```
mobile/
├── app.json                    # Expo configuration
├── package.json
├── App.js                      # Root component
├── src/
│   ├── screens/                # Screen components
│   │   ├── AuthScreen.js
│   │   ├── ConversationListScreen.js
│   │   ├── ChatScreen.js
│   │   └── SettingsScreen.js
│   ├── components/             # Reusable UI components
│   │   ├── MessageBubble.js
│   │   ├── VoiceRecorder.js
│   │   ├── TypingIndicator.js
│   │   ├── FormalityPicker.js
│   │   └── SlangExplanationModal.js
│   ├── hooks/                  # Custom React hooks
│   │   ├── useMessages.js
│   │   ├── useTypingIndicator.js
│   │   ├── useOfflineQueue.js
│   │   └── useTheme.js
│   ├── context/                # React Context providers
│   │   ├── AuthContext.js
│   │   ├── ThemeContext.js
│   │   └── ConversationContext.js
│   ├── lib/                    # Utility libraries
│   │   ├── supabase.js         # Supabase client
│   │   ├── storage.js          # AsyncStorage wrapper
│   │   ├── languageDetection.js # franc integration
│   │   └── pushNotifications.js # Expo Push setup
│   ├── constants/              # App constants
│   │   ├── theme.js            # Color palette
│   │   └── config.js           # API endpoints
│   └── utils/                  # Helper functions
│       ├── timeFormat.js
│       └── validation.js
└── assets/                     # Images, fonts, etc.
```

---

## Component Hierarchy

```
App
├── AuthContext.Provider
│   ├── ThemeContext.Provider
│   │   └── NavigationContainer
│   │       ├── AuthScreen (if not logged in)
│   │       └── MainTabNavigator (if logged in)
│   │           ├── ConversationListScreen
│   │           │   └── ConversationList
│   │           │       └── ConversationListItem[]
│   │           ├── ChatScreen
│   │           │   ├── Header (with typing indicator)
│   │           │   ├── MessageList
│   │           │   │   └── MessageBubble[]
│   │           │   │       ├── TextMessage
│   │           │   │       ├── VoiceMessage
│   │           │   │       ├── EditedBadge
│   │           │   │       └── ReadReceiptIcons
│   │           │   ├── CulturalHintBanner
│   │           │   └── ComposeArea
│   │           │       ├── TextInput
│   │           │       ├── VoiceRecorder
│   │           │       ├── FormalityButton
│   │           │       └── SendButton
│   │           └── SettingsScreen
│   │               ├── ProfileSection
│   │               ├── ThemePicker
│   │               └── LanguageSelector
```

---

## State Management

### Global State (React Context)

**AuthContext:**
- Current user
- Login/logout functions
- JWT token management

**ThemeContext:**
- Current theme (light/dark/system)
- Theme toggle function
- Color palette

**ConversationContext** (optional, for optimization):
- Active conversations list
- Unread counts

### Local State (Component-level)

**ChatScreen:**
- Message list (from Supabase Realtime subscription)
- Compose text input value
- Voice recording state
- Offline message queue

**ComposeArea:**
- Text input value
- Is recording voice
- Formality picker modal state

---

## Data Layer

### Supabase Client

```javascript
// lib/supabase.js
import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage, // Persist auth session
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
)
```

### Real-time Subscriptions

**useMessages Hook:**
```javascript
// hooks/useMessages.js
export function useMessages(conversationId) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Initial fetch
    fetchMessages()

    // Subscribe to new messages
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, handleNewMessage)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, handleMessageUpdate)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [conversationId])

  async function fetchMessages() {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:users(username, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error) {
      setMessages(data.reverse())
      cacheMessages(conversationId, data) // Offline support
    }
    setLoading(false)
  }

  function handleNewMessage(payload) {
    setMessages(prev => [...prev, payload.new])
  }

  function handleMessageUpdate(payload) {
    setMessages(prev => prev.map(m => 
      m.id === payload.new.id ? payload.new : m
    ))
  }

  return { messages, loading, refetch: fetchMessages }
}
```

---

## Offline-First Architecture

### Strategy

1. **Read:** Load from cache first, then fetch from server
2. **Write:** Update local state immediately (optimistic), queue for sync
3. **Sync:** When online, flush queue to server

### Implementation

**AsyncStorage Structure:**
```
Keys:
- messages:{conversation_id} → Message[]
- conversations → Conversation[]
- user_profile → User
- offline_queue → PendingMessage[]
```

**useOfflineQueue Hook:**
```javascript
// hooks/useOfflineQueue.js
export function useOfflineQueue() {
  const [queue, setQueue] = useState([])
  const [isOnline, setIsOnline] = useState(true)

  // Listen for network status
  useEffect(() => {
    const subscription = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected)
      if (state.isConnected) {
        flushQueue()
      }
    })
    return () => subscription()
  }, [])

  async function addToQueue(message) {
    const queue = await AsyncStorage.getItem('offline_queue')
    const parsed = queue ? JSON.parse(queue) : []
    parsed.push(message)
    await AsyncStorage.setItem('offline_queue', JSON.stringify(parsed))
    setQueue(parsed)
  }

  async function flushQueue() {
    const queue = await AsyncStorage.getItem('offline_queue')
    if (!queue) return

    const messages = JSON.parse(queue)
    for (const msg of messages) {
      try {
        await supabase.from('messages').insert(msg)
      } catch (error) {
        console.error('Failed to sync message:', error)
        // Keep in queue, will retry
        return
      }
    }

    // Clear queue on success
    await AsyncStorage.removeItem('offline_queue')
    setQueue([])
  }

  return { queue, isOnline, addToQueue }
}
```

---

## Voice Recording

### expo-av Integration

**VoiceRecorder Component:**
```javascript
// components/VoiceRecorder.js
import { Audio } from 'expo-av'

export function VoiceRecorder({ onSend }) {
  const [recording, setRecording] = useState(null)
  const [isRecording, setIsRecording] = useState(false)

  async function startRecording() {
    await Audio.requestPermissionsAsync()
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    })

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    )
    setRecording(recording)
    setIsRecording(true)
  }

  async function stopRecording() {
    setIsRecording(false)
    await recording.stopAndUnloadAsync()
    const uri = recording.getURI()
    
    // Upload to Supabase Storage
    const fileName = `${user.id}/${Date.now()}.m4a`
    const { data, error } = await supabase.storage
      .from('voice-memos')
      .upload(fileName, {
        uri,
        type: 'audio/m4a',
        name: fileName,
      })
    
    if (!error) {
      onSend({ voice_url: fileName, message_type: 'voice' })
    }
  }

  return (
    <Pressable
      onPressIn={startRecording}
      onPressOut={stopRecording}
    >
      {/* UI */}
    </Pressable>
  )
}
```

---

## Language Detection

### Client-Side with franc

```javascript
// lib/languageDetection.js
import franc from 'franc-min'

export function detectLanguage(text) {
  // franc returns ISO 639-3, convert to 639-1
  const detected = franc(text, { minLength: 10 })
  
  const iso639_3to1 = {
    'eng': 'en',
    'spa': 'es',
    'cmn': 'zh',
    'jpn': 'ja',
    // ... more mappings
  }

  const languageCode = iso639_3to1[detected] || 'en'
  
  // Confidence check
  if (detected === 'und' || text.length < 10) {
    // Low confidence, will use OpenAI fallback on backend
    return null
  }

  return languageCode
}
```

---

## Typing Indicators

### Supabase Realtime Presence

**useTypingIndicator Hook:**
```javascript
// hooks/useTypingIndicator.js
export function useTypingIndicator(conversationId, currentUserId) {
  const [typingUsers, setTypingUsers] = useState([])
  const [channel, setChannel] = useState(null)
  const typingTimeoutRef = useRef(null)
  const isTypingRef = useRef(false)

  useEffect(() => {
    const presenceChannel = supabase.channel(`conversation:${conversationId}`, {
      config: { presence: { key: currentUserId } }
    })

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const typing = Object.values(state)
          .flat()
          .filter(user => user.typing && user.user_id !== currentUserId)
          .map(user => user.username)
        setTypingUsers(typing)
      })
      .subscribe()

    setChannel(presenceChannel)

    return () => {
      presenceChannel.unsubscribe()
    }
  }, [conversationId])

  const handleTyping = useCallback(() => {
    if (!isTypingRef.current) {
      channel?.track({ 
        user_id: currentUserId, 
        typing: true 
      })
      isTypingRef.current = true
    }

    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      channel?.track({ 
        user_id: currentUserId, 
        typing: false 
      })
      isTypingRef.current = false
    }, 2900) // 2.9 seconds
  }, [channel, currentUserId])

  const stopTyping = useCallback(() => {
    clearTimeout(typingTimeoutRef.current)
    channel?.track({ 
      user_id: currentUserId, 
      typing: false 
    })
    isTypingRef.current = false
  }, [channel, currentUserId])

  return { typingUsers, handleTyping, stopTyping }
}
```

---

## Dark Mode Theme

### Theme Context

```javascript
// context/ThemeContext.js
import { useColorScheme } from 'react-native'

const THEME = {
  light: {
    background: '#FFFFFF',
    text: '#000000',
    bubbleSent: '#DCF8C6',
    bubbleReceived: '#FFFFFF',
    inputBackground: '#F0F0F0',
    checkmarkSent: '#8696A0',
    checkmarkDelivered: '#53BDEB',
    checkmarkRead: '#34B7F1',
  },
  dark: {
    background: '#0B141A',
    text: '#E9EDEF',
    bubbleSent: '#005C4B',
    bubbleReceived: '#1F2C34',
    inputBackground: '#2A3942',
    checkmarkSent: '#8696A0',
    checkmarkDelivered: '#53BDEB',
    checkmarkRead: '#34B7F1',
  }
}

export function ThemeProvider({ children }) {
  const systemColorScheme = useColorScheme()
  const [themeMode, setThemeMode] = useState('system') // Loaded from Supabase

  const activeTheme = themeMode === 'system' ? systemColorScheme : themeMode
  const colors = THEME[activeTheme]

  return (
    <ThemeContext.Provider value={{ theme: activeTheme, colors, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  )
}
```

---

## Push Notifications

### Expo Push Setup

```javascript
// lib/pushNotifications.js
import * as Notifications from 'expo-notifications'

export async function registerForPushNotifications() {
  const { status } = await Notifications.requestPermissionsAsync()
  if (status !== 'granted') {
    return null
  }

  const token = (await Notifications.getExpoPushTokenAsync()).data

  // Save to Supabase
  await supabase
    .from('conversation_participants')
    .update({ expo_push_token: token })
    .eq('user_id', user.id)

  return token
}

// Handle notification tap
Notifications.addNotificationResponseReceivedListener(response => {
  const { senderId, conversationId } = response.notification.request.content.data
  navigation.navigate('Chat', { conversationId })
})
```

---

## Performance Optimizations

### Message List Virtualization
- Use `FlatList` with `getItemLayout` for efficient scrolling
- Render only visible messages (automatic with FlatList)

### Image/Avatar Caching
- Use `expo-image` for automatic caching
- Preload avatars in conversation list

### Debouncing
- Typing indicators debounced at 2.9s
- Search input debounced at 300ms

### Memoization
- Use `React.memo` for MessageBubble component
- Use `useMemo` for computed values (e.g., formatted timestamps)

---

## Error Handling

### Network Errors
- Show offline banner when connection lost
- Queue messages for sync when back online
- Retry failed operations with exponential backoff

### API Errors
- Display user-friendly error messages
- Log errors to console for debugging
- Fallback to cached data when possible

### User Input Validation
- Validate before sending to server
- Show inline error messages
- Prevent duplicate submissions

---

## Testing Strategy

### Unit Tests
- Language detection logic
- Time formatting utilities
- Validation functions

### Manual Testing
- Auth flow (signup, login, logout)
- Send message (text, voice)
- Edit message (within constraints)
- Typing indicators
- Read receipts
- Offline mode
- Dark mode toggle
- Push notifications

---

## Summary

Frontend architecture provides:
- ✅ Native iOS/Android experience with single codebase
- ✅ Offline-first with optimistic updates
- ✅ Real-time messaging via Supabase
- ✅ Voice recording and playback
- ✅ Client-side language detection
- ✅ Typing indicators with Presence
- ✅ Dark mode support
- ✅ Push notifications

---

**End of Frontend Architecture Document**
