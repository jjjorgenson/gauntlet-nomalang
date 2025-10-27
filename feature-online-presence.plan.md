# Online Presence Feature Implementation

## Overview
Implement real-time online presence indicators, typing indicators, and enhanced read receipts for group chats.

## Features to Implement

### 1. Typing Indicators
- **Location**: `src/screens/ConversationScreen.js`
- **Current State**: Basic typing subscription exists but needs UI implementation
- **Requirements**:
  - Show "User is typing..." indicator when someone is typing
  - Multiple users typing: "User1, User2, and 1 other are typing..."
  - Auto-hide after 3 seconds of inactivity
  - Only show for other users (not self)

### 2. Real-time Online Status Updates
- **Location**: `src/screens/ChatsScreen.js` 
- **Current State**: Has bubble/dot indicator but static
- **Requirements**:
  - Green dot: User is online
  - Grey dot: User is offline
  - Real-time updates via Supabase subscriptions
  - Update conversation list when users come online/offline

### 3. Enhanced Read Receipts for Group Chats
- **Location**: Message components
- **Current State**: Single checkmark for delivered
- **Requirements**:
  - Show number of read receipts: "3/5" (3 out of 5 members read)
  - White checkmark: All valid members have read the message
  - Individual read status per participant
  - Only count active/valid participants

## Technical Implementation

### Database Schema Updates
```sql
-- Add online status tracking
CREATE TABLE user_online_status (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  is_online BOOLEAN DEFAULT false,
  last_seen TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add typing status tracking  
CREATE TABLE typing_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  conversation_id UUID REFERENCES conversations(id),
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, conversation_id)
);

-- Enhanced message statuses for group read receipts
ALTER TABLE message_statuses ADD COLUMN read_count INTEGER DEFAULT 0;
```

### Real-time Subscriptions
```javascript
// Online status subscription
const onlineSubscription = supabase
  .channel('online-status')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'user_online_status'
  }, (payload) => {
    // Update online status in conversation list
  })
  .subscribe();

// Typing status subscription  
const typingSubscription = supabase
  .channel('typing-status')
  .on('postgres_changes', {
    event: '*',
    schema: 'public', 
    table: 'typing_status'
  }, (payload) => {
    // Update typing indicators
  })
  .subscribe();
```

### UI Components

#### Typing Indicator Component
```javascript
const TypingIndicator = ({ typingUsers, currentUserId }) => {
  const otherTypingUsers = typingUsers.filter(user => user.id !== currentUserId);
  
  if (otherTypingUsers.length === 0) return null;
  
  const getTypingText = () => {
    if (otherTypingUsers.length === 1) {
      return `${otherTypingUsers[0].username} is typing...`;
    } else if (otherTypingUsers.length === 2) {
      return `${otherTypingUsers[0].username} and ${otherTypingUsers[1].username} are typing...`;
    } else {
      return `${otherTypingUsers[0].username}, ${otherTypingUsers[1].username}, and ${otherTypingUsers.length - 2} other are typing...`;
    }
  };
  
  return (
    <View style={styles.typingIndicator}>
      <Text style={styles.typingText}>{getTypingText()}</Text>
    </View>
  );
};
```

#### Online Status Dot Component
```javascript
const OnlineStatusDot = ({ isOnline, size = 8 }) => {
  return (
    <View style={[
      styles.statusDot,
      { 
        backgroundColor: isOnline ? '#4CAF50' : '#9E9E9E',
        width: size,
        height: size
      }
    ]} />
  );
};
```

#### Group Read Receipt Component
```javascript
const GroupReadReceipt = ({ message, participants, readStatuses }) => {
  const validParticipants = participants.filter(p => p.is_active);
  const readCount = readStatuses.filter(status => status.read_at).length;
  const totalCount = validParticipants.length;
  
  if (totalCount <= 1) return null; // No read receipts for direct messages
  
  const isFullyRead = readCount === totalCount;
  
  return (
    <View style={styles.readReceipt}>
      {isFullyRead ? (
        <Text style={styles.whiteCheckmark}>✓</Text>
      ) : (
        <Text style={styles.readCount}>{readCount}/{totalCount}</Text>
      )}
    </View>
  );
};
```

## Implementation Steps

### Phase 1: Database Schema
1. Create migration for online status table
2. Create migration for typing status table  
3. Update message_statuses table for group read counts
4. Add RLS policies for new tables

### Phase 2: Backend Services
1. Update `MessagingService` with typing status methods
2. Add online status tracking methods
3. Implement read receipt counting logic
4. Add real-time subscription setup

### Phase 3: Frontend Components
1. Create `TypingIndicator` component
2. Create `OnlineStatusDot` component
3. Create `GroupReadReceipt` component
4. Update `ConversationScreen` with typing indicators
5. Update `ChatsScreen` with online status dots

### Phase 4: Real-time Integration
1. Set up online status subscriptions
2. Set up typing status subscriptions
3. Implement typing detection (debounced)
4. Add online status heartbeat

### Phase 5: Testing & Polish
1. Test typing indicators in group chats
2. Test online status updates
3. Test read receipt counting
4. Add loading states and error handling

## Files to Modify

### New Files
- `src/components/TypingIndicator.js`
- `src/components/OnlineStatusDot.js` 
- `src/components/GroupReadReceipt.js`
- `supabase/migrations/031_add_online_status.sql`
- `supabase/migrations/032_add_typing_status.sql`
- `supabase/migrations/033_enhance_read_receipts.sql`

### Modified Files
- `src/screens/ConversationScreen.js` - Add typing indicators
- `src/screens/ChatsScreen.js` - Add online status dots
- `src/services/messaging.js` - Add typing and online status methods
- `src/components/TranslatedMessage.js` - Add group read receipts
- `src/components/VoiceMessage.js` - Add group read receipts

## Success Criteria
- ✅ Typing indicators show when users are typing
- ✅ Online status dots update in real-time (green/grey)
- ✅ Group chats show read receipt counts (3/5 format)
- ✅ White checkmark appears when all members have read
- ✅ Real-time updates work reliably
- ✅ Performance is smooth with multiple users
