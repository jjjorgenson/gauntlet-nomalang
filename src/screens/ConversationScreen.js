import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { Text, Card, IconButton, FAB } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import MessagingService from '../services/messaging';
import DatabaseService from '../services/database';
import StorageService from '../lib/storage';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import TranslatedMessage from '../components/TranslatedMessage';
import VoiceMessage from '../components/VoiceMessage';
import VoiceRecorder from '../components/VoiceRecorder';

export default function ConversationScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { conversationId, conversationName } = route.params || {};
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  
  // Translation settings (will be loaded from user profile later)
  const [userLanguage, setUserLanguage] = useState('en');
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(false);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const scrollPositionRef = useRef(0);
  const contentHeightRef = useRef(0);
  
  // Network and offline queue hooks
  const { isOnline } = useNetworkStatus();
  const { queue, addToQueue, flushQueue } = useOfflineQueue();
  
  const messagingService = useRef(new MessagingService());
  const messageSubscription = useRef(null);
  const typingSubscription = useRef(null);
  const flatListRef = useRef(null);
  const shouldScrollToBottom = useRef(true);

  useEffect(() => {
    if (!conversationId || !user) return;

    // Reset scroll flag for new conversation
    shouldScrollToBottom.current = true;
    // console.log('🔄 New conversation loaded, should scroll to bottom');
    
    loadMessages();
    setupRealTimeSubscriptions();

    return () => {
      // Cleanup subscriptions
      if (messageSubscription.current) {
        messageSubscription.current.unsubscribe();
      }
      if (typingSubscription.current) {
        typingSubscription.current.unsubscribe();
      }
      messagingService.current.unsubscribeFromConversation(conversationId);
    };
  }, [conversationId, user]);
  
  // Auto-sync offline queue when network comes back online
  useEffect(() => {
    if (isOnline && queue.length > 0) {
      console.log(`🔄 Network restored: Flushing ${queue.length} queued messages`);
      flushQueue();
    }
  }, [isOnline, queue.length, flushQueue]);
  
  // Auto-scroll when messages are loaded - more robust approach
  useEffect(() => {
    if (shouldScrollToBottom.current && messages.length > 0 && !loading) {
      // console.log(`🔄 Messages loaded (${messages.length}), attempting scroll to bottom`);
      
      // Use multiple attempts with increasing delays
      const attemptScroll = (attempt = 1) => {
        if (flatListRef.current && shouldScrollToBottom.current) {
          flatListRef.current.scrollToEnd({ animated: false });
          // console.log(`✅ Scroll attempt ${attempt} completed`);
          
          // If this is the first attempt, try again after a longer delay
          if (attempt === 1) {
            setTimeout(() => attemptScroll(2), 300);
          } else {
            shouldScrollToBottom.current = false;
          }
        }
      };
      
      // Start with immediate attempt, then delayed attempts
      attemptScroll();
    }
  }, [messages.length, loading]);
  
  // Force scroll to bottom function with multiple methods
  const forceScrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      // console.log('🔄 Force scrolling to bottom');
      
      // Try scrollToEnd first
      flatListRef.current.scrollToEnd({ animated: false });
      
      // Also try scrollToIndex as fallback
      setTimeout(() => {
        if (flatListRef.current) {
          try {
            flatListRef.current.scrollToIndex({ 
              index: messages.length - 1, 
              animated: false,
              viewPosition: 1 // 1 = bottom of viewport
            });
            // console.log('✅ Used scrollToIndex as fallback');
          } catch (error) {
            // console.log('⚠️ scrollToIndex failed, using scrollToEnd');
            flatListRef.current.scrollToEnd({ animated: false });
          }
        }
      }, 100);
    }
  };
  
  // Smart scroll to bottom - only if user is near bottom
  const scrollToBottomIfNear = (animated = true) => {
    if (isNearBottom && flatListRef.current) {
      // console.log('📜 User near bottom, auto-scrolling');
      flatListRef.current.scrollToEnd({ animated });
    } else {
      // console.log('📜 User scrolled up, not auto-scrolling');
    }
  };
  
  // Force scroll regardless of position (for sending own messages)
  const scrollToBottomForce = (animated = true) => {
    if (flatListRef.current) {
      // console.log('📜 Force scrolling to bottom');
      flatListRef.current.scrollToEnd({ animated });
    }
  };
  
  // Handle scroll position tracking
  const handleScroll = (event) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    
    scrollPositionRef.current = contentOffset.y;
    contentHeightRef.current = contentSize.height;
    
    // Consider "near bottom" if within 100px of the bottom
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    setIsNearBottom(distanceFromBottom < 100);
    
    // Existing load more logic
    if (contentOffset.y < 100 && !loadingMore && messages.length > 0) {
      loadMoreMessages();
    }
  };
  
  // Handle content size change for reliable auto-scroll
  const handleContentSizeChange = () => {
    if (shouldScrollToBottom.current && flatListRef.current) {
      // console.log('🔄 onContentSizeChange triggered, scrolling to bottom');
      
      // Use multiple attempts with different delays
      const scrollAttempts = [50, 150, 300, 500];
      
      scrollAttempts.forEach((delay, index) => {
        setTimeout(() => {
          if (flatListRef.current && shouldScrollToBottom.current) {
            flatListRef.current.scrollToEnd({ animated: false });
            // console.log(`✅ Scroll attempt ${index + 1} (${delay}ms delay)`);
            
            // Only reset flag on the last attempt
            if (index === scrollAttempts.length - 1) {
              shouldScrollToBottom.current = false;
            }
          }
        }, delay);
      });
    }
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      
      // 1. Load from cache immediately (instant display)
      const cachedMessages = await StorageService.getMessages(conversationId);
      if (cachedMessages && cachedMessages.length > 0) {
        const formattedCached = formatMessages(cachedMessages);
        setMessages(formattedCached);
        setLoading(false); // Show cached immediately
        console.log(`📱 Loaded ${cachedMessages.length} cached messages`);
      }
      
      // 2. Fetch latest from server
      const { data, error } = await messagingService.current.getMessages(conversationId, 50);
      
      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      if (data) {
        // Save to cache and update UI
        await StorageService.saveMessages(conversationId, data);
        const formattedMessages = formatMessages(data);
        setMessages(formattedMessages);
        console.log(`🔄 Updated with ${data.length} fresh messages from server`);
        
        // Mark messages as read
        await markMessagesAsRead(data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
    setLoading(false);
      
      // Final fallback scroll attempt - more aggressive
      setTimeout(() => {
        if (shouldScrollToBottom.current) {
          // console.log('🔄 Final fallback scroll attempt');
          forceScrollToBottom();
          
          // Try again after another delay
          setTimeout(() => {
            if (shouldScrollToBottom.current) {
              console.log('🔄 Second final fallback attempt');
              forceScrollToBottom();
              shouldScrollToBottom.current = false;
            }
          }, 500);
        }
      }, 1000);
    }
  };
  
  const markMessagesAsRead = async (messages) => {
    try {
      // Mark all messages from other users as read
      const unreadMessages = messages.filter(msg => msg.sender_id !== user.id);
      
      for (const msg of unreadMessages) {
        await messagingService.current.markAsRead(msg.id, user.id);
      }
      
      if (unreadMessages.length > 0) {
        console.log(`📖 Marked ${unreadMessages.length} messages as read`);
      }
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  };
  
  const formatMessages = (messages) => {
    return messages.map(msg => ({
      id: msg.id,
      content: msg.content,
      senderId: msg.sender_id,
      senderName: msg.users?.username || 'Unknown',
      timestamp: new Date(msg.created_at),
      isOwn: msg.sender_id === user.id,
      messageType: msg.message_type,
      voiceUrl: msg.voice_url,
      voiceDuration: msg.voice_duration_seconds,
      detectedLanguage: msg.detected_language,
      isEdited: msg.is_edited,
      editedAt: msg.edited_at ? new Date(msg.edited_at) : null
    })).sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); // Sort oldest first
  };

  const setupRealTimeSubscriptions = () => {
    if (!conversationId || !user) return;
    
    // console.log('🔴 Setting up real-time subscriptions for conversation:', conversationId);
    // console.log('🔴 Current user:', user.id);
    // console.log('🔴 User email:', user.email);
    
    // Subscribe to new messages
    messageSubscription.current = messagingService.current.subscribeToMessages(
      conversationId,
      (payload) => {
        // console.log('🔴 New message received via real-time:', payload);
        // console.log('🔴 Message conversation_id:', payload.new?.conversation_id);
        // console.log('🔴 Message sender_id:', payload.new?.sender_id);
        // console.log('🔴 Current user_id:', user.id);
        
      // Get the full message data with user info (fetch the newest message)
      DatabaseService.getNewestMessage(conversationId).then(({ data: newMsg, error }) => {
        if (newMsg && !error) {
          // console.log('🔴 Fetched message data:', newMsg);
          // console.log('🔴 Message sender username:', newMsg.users?.username);
          // console.log('🔴 Message sender email:', newMsg.users?.email);
            
            const formattedMessage = {
              id: newMsg.id,
              content: newMsg.content,
              senderId: newMsg.sender_id,
              senderName: newMsg.users?.username || 'Unknown',
              timestamp: new Date(newMsg.created_at),
              isOwn: newMsg.sender_id === user.id,
              messageType: newMsg.message_type,
              voiceUrl: newMsg.voice_url,
              voiceDuration: newMsg.voice_duration_seconds,
              detectedLanguage: newMsg.detected_language,
              isEdited: newMsg.is_edited,
              editedAt: newMsg.edited_at ? new Date(newMsg.edited_at) : null
            };
            
            // Only add if message doesn't already exist and it's not our own message
            // (our own messages are handled via storage)
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === formattedMessage.id);
              // console.log('🔴 Message exists in state?', exists);
              
              if (exists) {
                // console.log('🔴 Message already exists, skipping');
                return prev;
              }
              
              // IMPORTANT: For group chats, we need to show messages from ALL users
              // Only skip if it's our own message (already added via storage)
              if (formattedMessage.senderId === user.id) {
                // console.log('🔴 Message is from current user, skipping (already in storage)');
                return prev;
              }
              
              // console.log('🔴 Adding new message to state');
              
              return [...prev, formattedMessage];
            });
            
            // Smart scroll for incoming messages (only if near bottom)
            setTimeout(() => {
              scrollToBottomIfNear(true); // Animated, only if user is near bottom
            }, 100);
            
            // Mark as delivered if not our own message
            if (newMsg.sender_id !== user.id) {
              messagingService.current.markAsDelivered(newMsg.id, user.id);
            }
          } else {
            // console.log('🔴 No message data returned from database');
          }
        }).catch(error => {
          console.error('Error fetching message data:', error);
        });
      }
    );

    // Subscribe to typing indicators
    typingSubscription.current = messagingService.current.subscribeToTyping(
      conversationId,
      (typingUsers) => {
        // console.log('🔴 Typing users update:', typingUsers);
        setTypingUsers(typingUsers.filter(u => u !== user.id));
      }
    );
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;
    
    // Sanitize message content
    const sanitizedContent = newMessage.trim().replace(/\u0000/g, '');
    
    if (!sanitizedContent) {
      console.error('❌ Message is empty after sanitization');
      return;
    }

    const messageContent = sanitizedContent;
    const tempId = `temp_${Date.now()}`;
    
    // Create temporary message for immediate display
    const tempMessage = {
      id: tempId,
      content: messageContent,
      sender_id: user.id,
      created_at: new Date().toISOString(),
      message_type: 'text',
      voice_url: null,
      voice_duration_seconds: null,
      detected_language: 'en',
      is_edited: false,
      edited_at: null,
      users: {
        username: user.email?.split('@')[0] || 'You'
      }
    };
    
    // 1. Save to local storage immediately
    await StorageService.addMessage(conversationId, tempMessage);
    const formattedTemp = formatMessages([tempMessage])[0];
    setMessages(prev => [...prev, formattedTemp]);
    setNewMessage('');
    
    // 2. Scroll to bottom after adding own message (ALWAYS, with animation)
    setTimeout(() => {
      scrollToBottomForce(true); // Animated scroll for smooth UX
    }, 100);
    
    setSending(true);
    
    // 2. Check network status
    if (!isOnline) {
      console.log('📤 Offline: Adding message to queue');
      await addToQueue({
        ...tempMessage,
        conversation_id: conversationId
      });
      setSending(false);
      return;
    }
    
    // 3. Send to server
    try {
      const { data, error } = await messagingService.current.sendMessage(
        conversationId,
        messageContent,
        user.id
      );
      
      if (error) {
        console.error('Error sending message:', error);
        // Queue for offline sync
        await addToQueue({
          ...tempMessage,
          conversation_id: conversationId
        });
        setSending(false);
        return;
      }
      
      // Replace temp message with real message
      if (data) {
        await StorageService.removeMessage(conversationId, tempId);
        await StorageService.addMessage(conversationId, data);
        
        const realMessage = formatMessages([data])[0];
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? realMessage : msg
        ));
        console.log('✅ Message sent and cached successfully');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Queue for offline sync
      await addToQueue({
        ...tempMessage,
        conversation_id: conversationId
      });
    } finally {
      setSending(false);
    }
  };

  const handleTyping = (text) => {
    setNewMessage(text);
    
    // Set typing status
    if (text.length > 0) {
      messagingService.current.setTypingStatus(conversationId, user.id, true);
    } else {
      messagingService.current.setTypingStatus(conversationId, user.id, false);
    }
  };

  // Handle voice recording completion
  const handleVoiceRecordingComplete = async (voiceData) => {
    try {
      setVoiceUploading(true);
      console.log('🎤 Voice recording completed:', voiceData);

      // Create temporary voice message for immediate display
      const tempId = `voice_temp_${Date.now()}`;
      const tempMessage = {
        id: tempId,
        content: '', // Empty transcription initially
        sender_id: user.id,
        created_at: new Date().toISOString(),
        message_type: 'voice',
        voice_url: voiceData.voiceUrl,
        voice_duration_seconds: voiceData.duration,
        detected_language: 'en',
        is_edited: false,
        edited_at: null,
        users: {
          username: user.email?.split('@')[0] || 'You'
        }
      };

      // Add to local storage and UI immediately
      await StorageService.addMessage(conversationId, tempMessage);
      const formattedTemp = formatMessages([tempMessage])[0];
      setMessages(prev => [...prev, formattedTemp]);

      // Scroll to bottom after adding voice message
      setTimeout(() => {
        scrollToBottomForce(true);
      }, 100);

      // Check network status
      if (!isOnline) {
        console.log('📤 Offline: Adding voice message to queue');
        await addToQueue({
          ...tempMessage,
          conversation_id: conversationId
        });
        setVoiceUploading(false);
        return;
      }

      // Send voice message to server
      const { data, error } = await messagingService.current.sendVoiceMessageWithUpload(
        voiceData.audioUri || voiceData.voiceUrl, // Use original URI if available
        conversationId,
        user.id
      );

      if (error) {
        console.error('Error sending voice message:', error);
        // Queue for offline sync
        await addToQueue({
          ...tempMessage,
          conversation_id: conversationId
        });
        setVoiceUploading(false);
        return;
      }

      // Replace temp message with real message
      if (data) {
        await StorageService.removeMessage(conversationId, tempId);
        await StorageService.addMessage(conversationId, data);
        
        const realMessage = formatMessages([data])[0];
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? realMessage : msg
        ));
        console.log('✅ Voice message sent and cached successfully');
      }

    } catch (error) {
      console.error('Error handling voice recording:', error);
      // Queue for offline sync
      await addToQueue({
        ...tempMessage,
        conversation_id: conversationId
      });
    } finally {
      setVoiceUploading(false);
    }
  };

  // Handle voice recording cancellation
  const handleVoiceRecordingCancel = () => {
    console.log('🎤 Voice recording cancelled');
    setIsRecording(false);
  };
  
  const loadMoreMessages = async () => {
    if (loadingMore) return;
    
    try {
      setLoadingMore(true);
      const newOffset = offset + 50;
      const { data, error } = await messagingService.current.getMessages(conversationId, 50, newOffset);
      
      if (error) {
        console.error('Error loading more messages:', error);
        return;
      }
      
      if (data && data.length > 0) {
        // Get existing messages from cache
        const existingMessages = await StorageService.getMessages(conversationId) || [];
        
        // Prepend older messages to existing cache (they should be older)
        const updatedMessages = [...data, ...existingMessages];
        await StorageService.saveMessages(conversationId, updatedMessages);
        
        // Format and prepend to current messages (older messages go at the beginning)
        const formattedMessages = formatMessages(data);
        setMessages(prev => [...formattedMessages, ...prev]);
        setOffset(newOffset);
        console.log(`📜 Loaded ${data.length} older messages`);
      } else {
        // No more messages to load
        console.log('📜 No more messages to load');
      }
    } catch (error) {
      console.error('Error loading more messages:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const renderMessage = ({ item }) => {
    // Handle voice messages
    if (item.messageType === 'voice') {
      return (
        <View style={[
          styles.messageContainer,
          item.isOwn ? styles.ownMessage : styles.otherMessage
        ]}>
          <VoiceMessage
            message={item}
            userLanguage={userLanguage}
            autoTranslateEnabled={autoTranslateEnabled}
            onTranslationComplete={(translation) => {
              console.log('Voice message translation completed:', translation);
              // TODO: Save translation to database in Phase 3
            }}
          />
        </View>
      );
    }

    // For own text messages, show simple message without translation
    if (item.isOwn) {
      return (
        <View style={[
          styles.messageContainer,
          styles.ownMessage
        ]}>
          <View style={[
            styles.messageCard,
            styles.ownMessageCard
          ]}>
            <Text style={[
              styles.messageContent,
              styles.ownMessageText
            ]}>
              {item.content}
            </Text>
            {item.isEdited && (
              <Text style={styles.editedLabel}>
                (edited)
              </Text>
            )}
            <Text style={styles.timestamp}>
              {item.timestamp.toLocaleTimeString()}
            </Text>
          </View>
        </View>
      );
    }

    // For other text messages, use TranslatedMessage component
    return (
      <View style={[
        styles.messageContainer,
        styles.otherMessage
      ]}>
        <TranslatedMessage
          message={item}
          userLanguage={userLanguage}
          autoTranslateEnabled={autoTranslateEnabled}
          onTranslationComplete={(translation) => {
            console.log('Translation completed:', translation);
            // TODO: Save translation to database in Phase 3
          }}
        />
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (typingUsers.length === 0) return null;
    
    return (
      <View style={styles.typingContainer}>
        <Text style={styles.typingText}>
          {typingUsers.length === 1 
            ? `${typingUsers[0]} is typing...`
            : `${typingUsers.length} people are typing...`
          }
        </Text>
      </View>
    );
  };
  
  const renderOfflineBanner = () => {
    if (isOnline) return null;
    
    return (
      <View style={styles.offlineBanner}>
        <Text style={styles.offlineText}>
          📡 Offline - Messages will be sent when connection is restored
        </Text>
      </View>
    );
  };
  
  const renderQueueIndicator = () => {
    if (queue.length === 0) return null;
    
    return (
      <View style={styles.queueIndicator}>
        <Text style={styles.queueText}>
          📤 {queue.length} message{queue.length > 1 ? 's' : ''} pending
        </Text>
      </View>
    );
  };
  
  const renderLoadingMore = () => {
    if (!loadingMore) return null;
    
    return (
      <View style={styles.loadingMoreContainer}>
        <Text style={styles.loadingMoreText}>Loading older messages...</Text>
    </View>
  );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading conversation...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderOfflineBanner()}
      {renderQueueIndicator()}
      
      {/* Temporary translation toggle for testing */}
      <View style={styles.translationToggle}>
        <TouchableOpacity 
          style={[
            styles.toggleButton,
            autoTranslateEnabled && styles.toggleButtonActive
          ]}
          onPress={() => setAutoTranslateEnabled(!autoTranslateEnabled)}
        >
          <Text style={[
            styles.toggleButtonText,
            autoTranslateEnabled && styles.toggleButtonTextActive
          ]}>
            {autoTranslateEnabled ? '🔄 Auto-translate ON' : '⏸️ Auto-translate OFF'}
          </Text>
        </TouchableOpacity>
      </View>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={handleContentSizeChange}
        onScroll={handleScroll}
        scrollEventThrottle={400}
        ListHeaderComponent={renderLoadingMore}
        ListFooterComponent={renderTypingIndicator}
      />

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={newMessage}
          onChangeText={handleTyping}
          placeholder="Type a message..."
          placeholderTextColor="#8696A0"
          multiline
          editable={!sending}
        />
        <TouchableOpacity 
          onPress={sendMessage} 
          style={[styles.sendButton, sending && styles.sendButtonDisabled]}
          disabled={sending}
        >
          <IconButton 
            icon={sending ? "loading" : "send"} 
            size={24} 
            iconColor={sending ? "#8696A0" : "#34B7F1"} 
          />
        </TouchableOpacity>
      </View>

      {/* Voice Recording UI */}
      <VoiceRecorder
        conversationId={conversationId}
        onRecordingComplete={handleVoiceRecordingComplete}
        onRecordingCancel={handleVoiceRecordingCancel}
        disabled={sending || voiceUploading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  messagesList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageContainer: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  messageCard: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ownMessageCard: {
    backgroundColor: '#8B5CF6', // Purple for sent messages
    borderBottomRightRadius: 4,
  },
  otherMessageCard: {
    backgroundColor: '#F3F4F6', // Light gray for received messages
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
    fontWeight: '500',
  },
  messageContent: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#FFFFFF',
  },
  otherMessageText: {
    color: '#1F2937',
  },
  translatedContent: {
    color: '#8B5CF6',
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  otherTimestamp: {
    color: '#6B7280',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#1F2937',
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 16,
  },
  sendButton: {
    marginLeft: 8,
    backgroundColor: '#8B5CF6',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  typingContainer: {
    padding: 8,
    paddingHorizontal: 16,
    alignItems: 'flex-start',
  },
  typingText: {
    color: '#8B5CF6',
    fontSize: 12,
    fontStyle: 'italic',
  },
  editedLabel: {
    color: '#9CA3AF',
    fontSize: 10,
    fontStyle: 'italic',
    marginTop: 2,
  },
  voiceFab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 80,
    backgroundColor: '#8B5CF6',
  },
  offlineBanner: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F59E0B',
  },
  offlineText: {
    color: '#92400E',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  queueIndicator: {
    backgroundColor: '#DBEAFE',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#3B82F6',
  },
  queueText: {
    color: '#1E40AF',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingMoreContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingMoreText: {
    color: '#6B7280',
    fontSize: 12,
    fontStyle: 'italic',
  },
  translationToggle: {
    padding: 8,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  toggleButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
  },
  toggleButtonActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#8B5CF6',
  },
  toggleButtonText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '500',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
});
