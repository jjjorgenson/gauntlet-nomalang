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
  const [isLoadingFresh, setIsLoadingFresh] = useState(false);
  const [lastContentHeight, setLastContentHeight] = useState(0);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  
  // Translation settings - get from user profile
  const [userLanguage, setUserLanguage] = useState(user?.user_metadata?.native_language || 'en');
  const [autoTranslateEnabled, setAutoTranslateEnabled] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Load user settings on mount
  useEffect(() => {
    const loadUserSettings = async () => {
      if (user?.id && !settingsLoaded) {
        const { data: profile } = await DatabaseService.getUserProfile(user.id);
        if (profile) {
          setAutoTranslateEnabled(profile.auto_translate_enabled || false);
          setUserLanguage(profile.native_language || 'en');
        }
        setSettingsLoaded(true);
      }
    };
    loadUserSettings();
  }, [user?.id, settingsLoaded]);
  
  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const scrollPositionRef = useRef(0);
  const contentHeightRef = useRef(0);
  
  // Network and offline queue hooks
  const { isOnline } = useNetworkStatus();
  const { queue, addToQueue, flushQueue, clearFailedMessages } = useOfflineQueue();
  
  const messagingService = useRef(new MessagingService());
  const messageSubscription = useRef(null);
  const typingSubscription = useRef(null);
  const flatListRef = useRef(null);
  const shouldScrollToBottom = useRef(true);
  const hasScrolledToBottom = useRef(false);

  useEffect(() => {
    if (!conversationId || !user) return;

    // Reset scroll flag for new conversation
    setLastContentHeight(0);
    setShouldAutoScroll(false); // Reset auto-scroll flag
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
  
  // Auto-scroll when messages are loaded - DISABLED to prevent bouncing
  // Since we load newest messages first, they're already at bottom
  // useEffect(() => {
  //   if (shouldScrollToBottom.current && messages.length > 0 && !loading && !isLoadingFresh) {
  //     setTimeout(() => {
  //       if (flatListRef.current && shouldScrollToBottom.current) {
  //         flatListRef.current.scrollToEnd({ animated: false });
  //         shouldScrollToBottom.current = false;
  //       }
  //     }, 300);
  //   }
  // }, [messages.length, loading, isLoadingFresh]);
  
  // Reset scroll flag when conversation changes
  useEffect(() => {
    hasScrolledToBottom.current = false;
  }, [conversationId]);
  
  // Initial scroll removed - with inverted FlatList, newest messages are already at bottom
  // No scroll needed - user starts at correct position naturally
  
  // Force scroll to bottom function
  const forceScrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      // Normal FlatList: scrollToEnd shows newest messages at bottom
      flatListRef.current.scrollToEnd({ animated: false });
      
      // Fallback with scrollToIndex
      setTimeout(() => {
        if (flatListRef.current) {
          try {
            flatListRef.current.scrollToIndex({ 
              index: messages.length - 1, 
              animated: false,
              viewPosition: 1 // 1 = bottom of viewport
            });
          } catch (error) {
            // scrollToIndex failed
          }
        }
      }, 100);
    }
  };
  
  // Smart scroll to bottom - only if user is near bottom
  const scrollToBottomIfNear = (animated = true) => {
    if (isNearBottom && flatListRef.current) {
      // Normal FlatList: scrollToEnd shows newest messages at bottom
      flatListRef.current.scrollToEnd({ animated });
    }
  };
  
  // Force scroll regardless of position (for sending own messages)
  const scrollToBottomForce = (animated = true) => {
    if (flatListRef.current) {
      // Normal FlatList: scrollToEnd shows newest messages at bottom
      flatListRef.current.scrollToEnd({ animated });
    }
  };
  
  // Handle scroll position tracking
  const handleScroll = (event) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    
    scrollPositionRef.current = contentOffset.y;
    contentHeightRef.current = contentSize.height;
    
    // Normal FlatList: "near bottom" means near actual bottom
    const distanceFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    const wasNearBottom = isNearBottom;
    setIsNearBottom(distanceFromBottom < 100);
    
    // Log scroll position changes
    if (wasNearBottom !== (distanceFromBottom < 100)) {
      console.log(`📱 DEBUG: Scroll position changed - isNearBottom: ${distanceFromBottom < 100}, distanceFromBottom: ${distanceFromBottom}`);
    }
    
    // Load more when scrolling up (towards top/older messages)
    if (contentOffset.y < 100 && !loadingMore && messages.length > 0) {
      loadMoreMessages();
    }
  };
  
  // Handle content size change - minimal logging
  const handleContentSizeChange = (contentWidth, contentHeight) => {
    // Minimal logging - just track when content changes
    if (contentHeight > lastContentHeight + 100) {
      console.log(`📱 DEBUG: Content growing - height: ${contentHeight}`);
    }
    setLastContentHeight(contentHeight);
  };

  const loadMessages = async () => {
    try {
      setLoading(true);
      
      // 1. Load newest messages from cache first (first 3 messages for instant display)
      const allCachedMessages = await StorageService.getMessages(conversationId);

      // Migrate old cache format if needed
      if (allCachedMessages && allCachedMessages.length > 0) {
        await StorageService.migrateCacheFormat(conversationId);
        // Re-fetch after migration
        const migratedMessages = await StorageService.getMessages(conversationId);
        if (migratedMessages) {
          allCachedMessages.splice(0, allCachedMessages.length, ...migratedMessages);
        }
      }

      if (allCachedMessages && allCachedMessages.length > 0) {
        // Take the newest 3 messages for instant display (cache is newest-first)
        const newestCached = allCachedMessages.slice(0, 3); // Get first 3 (newest from cache)
        
        console.log(`🔍 CACHE DEBUG: Raw cache order (first 3):`);
        newestCached.slice(0, 3).forEach((msg, i) => {
          console.log(`  [${i}] ${msg.created_at} - ${msg.content?.substring(0, 30)}...`);
        });
        
        const formattedCached = formatMessages(newestCached, false); // Don't sort - keep newest-first order
        
        console.log(`🔍 FORMAT DEBUG: After formatMessages (first 3):`);
        formattedCached.slice(0, 3).forEach((msg, i) => {
          console.log(`  [${i}] ${msg.timestamp} - ${msg.content?.substring(0, 30)}...`);
        });
        
        // Reverse to put newest at bottom (normal chat behavior) - reverse only the slice we're displaying
        const reversedCached = formattedCached.slice().reverse(); // Create copy and reverse only this slice
        
        console.log(`🔍 REVERSE DEBUG: After reverse (first 3):`);
        reversedCached.slice(0, 3).forEach((msg, i) => {
          console.log(`  [${i}] ${msg.timestamp} - ${msg.content?.substring(0, 30)}...`);
        });
        
        console.log(`🔍 UI DEBUG: Setting ${reversedCached.length} messages for display`);
        console.log(`🔍 UI DEBUG: First message (top): ${reversedCached[0]?.timestamp} - ${reversedCached[0]?.content?.substring(0, 30)}...`);
        console.log(`🔍 UI DEBUG: Last message (bottom): ${reversedCached[reversedCached.length - 1]?.timestamp} - ${reversedCached[reversedCached.length - 1]?.content?.substring(0, 30)}...`);
        
        setMessages(reversedCached);
        setLoading(false); // Show newest messages immediately
        setShouldAutoScroll(true); // Flag for onLayout to scroll
        
        // Load remaining messages in background
        setTimeout(() => {
          const remainingMessages = allCachedMessages.slice(3); // All except the newest 3
          if (remainingMessages.length > 0) {
            const formattedRemaining = formatMessages(remainingMessages, true); // Sort oldest-first for display
            console.log(`🔍 BACKGROUND DEBUG: Loading ${formattedRemaining.length} older messages`);
            setMessages(prev => [...formattedRemaining, ...prev]); // Prepend older messages (they go above newest)
            
            // Scroll back to bottom after loading older messages
            setTimeout(() => {
              if (flatListRef.current) {
                console.log(`🔍 BACKGROUND DEBUG: Scrolling back to bottom after loading older messages`);
                flatListRef.current.scrollToEnd({ animated: false });
              }
            }, 200); // Wait for messages to render
          }
        }, 100); // Small delay to let newest messages render first
      }
      
      // 2. Fetch latest from server (only if we have cached messages)
      if (allCachedMessages && allCachedMessages.length > 0) {
        setIsLoadingFresh(true);
        const { data, error } = await messagingService.current.getMessages(conversationId, 50);
        
        if (error) {
          console.error('Error loading messages:', error);
          return;
        }

        if (data) {
          // Check if we have newer messages than cache
          const newestCachedTime = allCachedMessages[0]?.created_at;
          const newestServerTime = data[data.length - 1]?.created_at; // Last item is newest in server response

          if (newestServerTime > newestCachedTime) {
            // Save updated messages to cache (server gives oldest-first, cache needs newest-first)
            await StorageService.saveMessages(conversationId, data);
            const formattedMessages = formatMessages(data); // Sort to newest-first for display and update cache
            setMessages(formattedMessages);
            console.log(`🔄 Updated with ${data.length} fresh messages from server`);

            // Only scroll if user is already near bottom (new messages arrived)
            if (isNearBottom) {
              shouldScrollToBottom.current = true;
              // Trigger scroll after a short delay to ensure messages are rendered
              setTimeout(() => {
                if (flatListRef.current && shouldScrollToBottom.current) {
                  // Normal FlatList: scrollToEnd shows newest messages at bottom
                  flatListRef.current.scrollToEnd({ animated: false });
                  shouldScrollToBottom.current = false;
                }
              }, 100);
            }
          } else {
            console.log(`📱 Cache is up to date, no server update needed`);
          }
        }
        setIsLoadingFresh(false);
      } else {
        // No cache - load from server normally
        const { data, error } = await messagingService.current.getMessages(conversationId, 50);
        
        if (error) {
          console.error('Error loading messages:', error);
          return;
        }

        if (data) {
          await StorageService.saveMessages(conversationId, data);
          const formattedMessages = formatMessages(data); // Sort to newest-first for display
          setMessages(formattedMessages);
          console.log(`📱 Loaded ${data.length} messages from server (no cache)`);
        }
        setLoading(false);
      }
      
    } catch (error) {
      console.error('Error loading messages:', error);
    } finally {
      setLoading(false);
      setIsLoadingFresh(false);
      
      // Fallback scroll removed - newest messages already at bottom
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
  
  const formatMessages = (messages, shouldSort = true) => {
    const formatted = messages.map(msg => ({
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
    }));
    
    // Sort oldest-first (ascending) for normal chat display - newest at bottom
    return shouldSort ? formatted.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)) : formatted;
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

              return [...prev, formattedMessage]; // Append new message (newest at bottom)
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
    setMessages(prev => [...prev, formattedTemp]); // Append temp message (newest at bottom)
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
        content: voiceData.transcription || '[Voice Message]', // Use transcription or default content
        sender_id: user.id,
        created_at: new Date().toISOString(),
        message_type: 'voice',
        voice_url: voiceData.voiceUrl,
        voice_duration_seconds: voiceData.duration,
        detected_language: voiceData.transcriptionLanguage || 'en',
        is_edited: false,
        edited_at: null,
        users: {
          username: user.email?.split('@')[0] || 'You'
        }
      };

      // Add to local storage and UI immediately
      await StorageService.addMessage(conversationId, tempMessage);
      const formattedTemp = formatMessages([tempMessage])[0];
      setMessages(prev => [formattedTemp, ...prev]); // Prepend temp message (newest first)

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
        user.id,
        null, // onProgress callback
        voiceData.transcription // Pass transcription data
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

  // Clear failed messages from queue
  const handleClearFailedMessages = async () => {
    try {
      console.log('🧹 Clearing failed messages from queue...');
      const result = await clearFailedMessages();
      console.log(`✅ Cleared ${result.removedCount} failed messages, ${result.remainingCount} remaining`);
      
      // Show a brief success message (you could add a toast here)
      if (result.removedCount > 0) {
        console.log('🎉 Failed messages cleared successfully!');
      }
    } catch (error) {
      console.error('❌ Error clearing failed messages:', error);
    }
  };
  
  const loadMoreMessages = async () => {
    if (loadingMore) return;
    
    try {
      setLoadingMore(true);
      
      // First try to load older messages from cache
      const allCachedMessages = await StorageService.getMessages(conversationId);

      // Migrate old cache format if needed
      if (allCachedMessages && allCachedMessages.length > 0) {
        await StorageService.migrateCacheFormat(conversationId);
        const migratedMessages = await StorageService.getMessages(conversationId);
        if (migratedMessages) {
          allCachedMessages.splice(0, allCachedMessages.length, ...migratedMessages);
        }
      }

      if (allCachedMessages && allCachedMessages.length > messages.length) {
        // Load more messages from cache (older ones) - cache is newest-first, so older are at the end
        const olderMessages = allCachedMessages.slice(messages.length);
        const formattedOlder = formatMessages(olderMessages);

        // Append older messages to current messages (they go below)
        setMessages(prevMessages => [...prevMessages, ...formattedOlder]);
        console.log(`📱 Loaded ${olderMessages.length} older messages from cache`);
        return;
      }
      
      // No more cached messages, load from server
      const newOffset = offset + 50;
      const { data, error } = await messagingService.current.getMessages(conversationId, 50, newOffset);
      
      if (error) {
        console.error('Error loading more messages:', error);
        return;
      }
      
      if (data && data.length > 0) {
        // Get existing messages from cache
        const existingMessages = await StorageService.getMessages(conversationId) || [];

        // Migrate cache format if needed before updating
        if (existingMessages.length > 0) {
          await StorageService.migrateCacheFormat(conversationId);
          const migratedMessages = await StorageService.getMessages(conversationId);
          if (migratedMessages) {
            existingMessages.splice(0, existingMessages.length, ...migratedMessages);
          }
        }

        // Prepend older messages to existing cache (server gives oldest-first, cache is newest-first)
        const updatedMessages = [...data, ...existingMessages];
        await StorageService.saveMessages(conversationId, updatedMessages);

        // Format and prepend to current messages (older messages go at the top)
        const formattedMessages = formatMessages(data);
        setMessages(prev => [...formattedMessages, ...prev]);
        setOffset(newOffset);
        console.log(`📜 Loaded ${data.length} older messages from server`);
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

  // Update toggle handler to persist to database
  const handleAutoTranslateToggle = async () => {
    const newValue = !autoTranslateEnabled;
    setAutoTranslateEnabled(newValue);
    
    if (user?.id) {
      await DatabaseService.updateAutoTranslateSetting(user.id, newValue);
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
            <View style={styles.messageFooter}>
              <Text style={styles.timestamp}>
                {item.timestamp.toLocaleTimeString()}
              </Text>
              {/* Read receipt indicators */}
              <View style={styles.readReceipts}>
                <Text style={styles.readReceiptText}>
                  {item.readCount > 0 ? '✓✓' : '✓'}
                </Text>
              </View>
            </View>
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
        {/* Development-only clear button */}
        <TouchableOpacity 
          style={styles.clearQueueButton}
          onPress={handleClearFailedMessages}
        >
          <Text style={styles.clearQueueButtonText}>Clear Failed</Text>
        </TouchableOpacity>
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

  const renderLoadingFresh = () => {
    if (!isLoadingFresh) return null;
    
    return (
      <View style={styles.loadingFreshContainer}>
        <Text style={styles.loadingFreshText}>Loading newer messages...</Text>
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
          onPress={handleAutoTranslateToggle}
        >
          <Text style={[
            styles.toggleButtonText,
            autoTranslateEnabled && styles.toggleButtonTextActive
          ]}>
            {autoTranslateEnabled ? '🔄 Auto-translate ON' : '⏸️ Auto-translate OFF'}
          </Text>
        </TouchableOpacity>
      </View>
      {renderLoadingFresh()}
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
        onLayout={() => {
          if (shouldAutoScroll && flatListRef.current && messages.length > 0) {
            console.log(`🔍 SCROLL DEBUG: onLayout triggered - scrolling to bottom`);
            console.log(`🔍 SCROLL DEBUG: Messages count: ${messages.length}`);
            console.log(`🔍 SCROLL DEBUG: First message: ${messages[0]?.timestamp} - ${messages[0]?.content?.substring(0, 30)}...`);
            console.log(`🔍 SCROLL DEBUG: Last message: ${messages[messages.length - 1]?.timestamp} - ${messages[messages.length - 1]?.content?.substring(0, 30)}...`);
            // Add small delay to ensure content is fully rendered before scrolling
            setTimeout(() => {
              flatListRef.current.scrollToEnd({ animated: false });
              setShouldAutoScroll(false);
              console.log(`🔍 SCROLL DEBUG: Scroll completed`);
            }, 50);
          }
        }}
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
        userLanguage={userLanguage}
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
    paddingBottom: 80, // Extra buffer for timestamp and delivery status
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
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  readReceipts: {
    marginLeft: 8,
  },
  readReceiptText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  queueText: {
    color: '#1E40AF',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  clearQueueButton: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  clearQueueButtonText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
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
  loadingFreshContainer: {
    padding: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#F0F9FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0F2FE',
  },
  loadingFreshText: {
    color: '#0369A1',
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
