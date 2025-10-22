# Real-time Architecture
## Supabase Realtime & Presence

**Version:** 1.0  
**Last Updated:** October 22, 2025  
**Parent Doc:** [TECHNICAL_ARCHITECTURE.md](./TECHNICAL_ARCHITECTURE.md)

---

## Overview

Real-time features powered by Supabase Realtime (WebSocket-based) for live message delivery, typing indicators, and presence tracking.

---

## Supabase Realtime Components

### 1. Postgres Changes
- Subscribe to INSERT/UPDATE/DELETE on tables
- Filtered subscriptions per conversation
- Used for: Message delivery, edit notifications

### 2. Presence
- Ephemeral state tracking
- Used for: Typing indicators, online/offline status

### 3. Broadcast
- Not used in current design

---

## Message Delivery

### Subscription Pattern

**Client subscribes to conversation messages:**
```javascript
const channel = supabase
  .channel(`conversation:${conversationId}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    // New message received
    addMessage(payload.new)
  })
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'messages',
    filter: `conversation_id=eq.${conversationId}`
  }, (payload) => {
    // Message edited
    updateMessage(payload.new)
  })
  .subscribe()
```

### Flow
1. User A sends message → INSERT into `messages` table
2. Supabase broadcasts INSERT event to all subscribers
3. User B receives event via WebSocket
4. User B's app adds message to UI

---

## Typing Indicators

### Presence API

**Track typing state:**
```javascript
const channel = supabase.channel(`conversation:${conversationId}`, {
  config: { presence: { key: userId } }
})

// Start typing
channel.track({ 
  user_id: userId,
  username: 'Alice',
  typing: true 
})

// Stop typing (after 2.9s)
channel.track({ 
  user_id: userId,
  username: 'Alice',
  typing: false 
})

// Listen for presence changes
channel.on('presence', { event: 'sync' }, () => {
  const state = channel.presenceState()
  const typingUsers = Object.values(state)
    .flat()
    .filter(u => u.typing && u.user_id !== currentUserId)
  // Display: "Alice and Bob are typing..."
})
```

---

## Connection Management

### Automatic Reconnection
- Supabase client handles reconnection automatically
- Exponential backoff on failures
- No manual intervention needed

### Offline Handling
```javascript
// Detect connection status
channel.on('system', {}, (payload) => {
  if (payload.status === 'SUBSCRIBED') {
    setOnline(true)
  } else if (payload.status === 'CLOSED') {
    setOffline(true)
  }
})
```

---

## Message Delivery Guarantees

### At-Least-Once Delivery
- Messages persisted in database first
- Realtime broadcasts from database events
- If WebSocket fails, message still in DB
- Client refetches on reconnect

### Handling Duplicates
- Use message ID to dedupe
- Check if message already exists before adding to UI

---

## Performance Considerations

### Connection Pooling
- One channel per conversation
- Unsubscribe when leaving conversation
- Max ~10 active channels per client

### Bandwidth
- Each message event: ~500 bytes
- 100 messages/hour = 50 KB/hour
- Minimal bandwidth impact

---

## Security

### RLS on Realtime
- Supabase Realtime respects RLS policies
- Users only receive events for data they can access
- No need for additional authorization

---

## Summary

Realtime architecture provides:
- ✅ Sub-second message delivery
- ✅ Typing indicators via Presence
- ✅ Automatic reconnection
- ✅ Offline resilience
- ✅ At-least-once delivery guarantee

---

**End of Realtime Architecture Document**
