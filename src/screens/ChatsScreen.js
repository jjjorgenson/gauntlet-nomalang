import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Text, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Button, FAB, Avatar, Badge } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import DatabaseService from '../services/database';
import MessagingService from '../services/messaging';
import StorageService from '../lib/storage';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { supabase } from '../lib/supabase';
import NewConversationModal from '../components/NewConversationModal';
import OnlineStatusDot from '../components/OnlineStatusDot';

export default function ChatsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  const [onlineStatuses, setOnlineStatuses] = useState({});
  
  // Real-time subscription
  const messageSubscription = useRef(null);
  const onlineStatusSubscription = useRef(null);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    loadConversations();
    setupRealtimeSubscription();
    setupOnlineStatusSubscription();
    
    // Refresh online statuses every 30 seconds
    const statusInterval = setInterval(() => {
      refreshOnlineStatuses();
    }, 30000);
    
    return () => {
      if (messageSubscription.current) {
        messageSubscription.current.unsubscribe();
      }
      if (onlineStatusSubscription.current) {
        onlineStatusSubscription.current.unsubscribe();
      }
      clearInterval(statusInterval);
    };
  }, [user]);

  const loadConversations = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await DatabaseService.getUserConversations(user.id);
      
      if (error) {
        console.error('Error loading conversations:', error);
        return;
      }

      // Transform data with preview from DB or local storage
      const transformedConversations = await Promise.all(
        (data || []).map(async (item) => {
          const conversation = item.conversations;
          const dbLastMessage = conversation?.lastMessage;
          
          // Get preview with local storage fallback
          const preview = await getConversationPreview(
            item.conversation_id,
            dbLastMessage
          );
          
          // Use the display name and other_user from database service
          let displayName = conversation?.name || 'Direct Chat';
          let otherUser = conversation?.other_user || null;
          
          return {
            id: item.conversation_id,
            name: displayName,
            type: conversation?.type || 'direct',
            created_at: conversation?.created_at,
            lastMessage: preview.previewText,
            lastMessageTime: preview.lastMessageTime,
            lastMessageTimestamp: preview.lastMessageTimestamp,
            unreadCount: 0, // TODO: Calculate unread count
            otherUser: otherUser // Store for potential status indicator
          };
        })
      );
      
      // Sort by last message time
      const sortedConversations = transformedConversations.sort((a, b) => {
        const aTime = a.lastMessageTimestamp || new Date(a.created_at);
        const bTime = b.lastMessageTimestamp || new Date(b.created_at);
        return bTime - aTime;
      });

      setConversations(sortedConversations);
      
      // Load online statuses for direct conversations
      await refreshOnlineStatuses(sortedConversations);
      
      // Mark last messages as delivered (preview = delivered)
      for (const item of data || []) {
        const lastMessage = item.conversations?.lastMessage;
        if (lastMessage && lastMessage.sender_id !== user.id) {
          try {
            await MessagingService.markAsDelivered(lastMessage.id, user.id);
          } catch (error) {
            console.error('Error marking message as delivered:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
    setLoading(false);
    }
  };
  
  // Silent reload function that doesn't show loading state
  const loadConversationsSilently = async () => {
    if (!user) return;
    
    try {
      // Don't set loading to true - silent reload
      const { data, error } = await DatabaseService.getUserConversations(user.id);
      
      if (error) {
        console.error('Error loading conversations silently:', error);
        return;
      }

      // Transform data with preview from DB or local storage
      const transformedConversations = await Promise.all(
        (data || []).map(async (item) => {
          const conversation = item.conversations;
          const dbLastMessage = conversation?.lastMessage;
          
          // Get preview with local storage fallback
          const preview = await getConversationPreview(
            item.conversation_id,
            dbLastMessage
          );
          
          return {
            id: item.conversation_id,
            name: conversation?.name || 'Direct Chat',
            type: conversation?.type || 'direct',
            created_at: conversation?.created_at,
            lastMessage: preview.previewText,
            lastMessageTime: preview.lastMessageTime,
            lastMessageTimestamp: preview.lastMessageTimestamp,
            unreadCount: 0
          };
        })
      );
      
      // Sort by last message time
      const sortedConversations = transformedConversations.sort((a, b) => {
        const aTime = a.lastMessageTimestamp || new Date(a.created_at);
        const bTime = b.lastMessageTimestamp || new Date(b.created_at);
        return bTime - aTime;
      });

      setConversations(sortedConversations);
      
      // Mark last messages as delivered
      for (const item of data || []) {
        const lastMessage = item.conversations?.lastMessage;
        if (lastMessage && lastMessage.sender_id !== user.id) {
          try {
            await MessagingService.markAsDelivered(lastMessage.id, user.id);
          } catch (error) {
            console.error('Error marking message as delivered:', error);
          }
        }
      }
    } catch (error) {
      console.error('Error loading conversations silently:', error);
    }
  };
  
  // Setup real-time subscription to messages
  const setupRealtimeSubscription = () => {
    if (!user) return;
    
    messageSubscription.current = supabase
      .channel('conversations-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        async (payload) => {
          console.log('New message received in ChatsScreen:', payload);
          await updateConversationPreview(payload.new);
        }
      )
      .subscribe();
  };
  
  // Refresh online statuses for all conversation participants
  const refreshOnlineStatuses = async (conversationsList = conversations) => {
    if (!user) return;
    
    try {
      const directConversations = conversationsList.filter(conv => conv.type === 'direct' && conv.otherUser);
      const userIds = directConversations.map(conv => conv.otherUser.id);
      
      if (userIds.length > 0) {
        const { data: onlineStatuses } = await supabase
          .from('user_online_status')
          .select('user_id, is_online')
          .in('user_id', userIds);
        
        const statusMap = {};
        onlineStatuses?.forEach(status => {
          statusMap[status.user_id] = status.is_online;
        });
        
        setOnlineStatuses(prev => ({ ...prev, ...statusMap }));
        console.log('📊 Loaded online statuses:', statusMap);
        console.log('📊 Direct conversations:', directConversations.map(c => ({ name: c.name, otherUserId: c.otherUser?.id })));
      }
    } catch (error) {
      console.error('Error refreshing online statuses:', error);
    }
  };
  
  // Setup online status subscription
  const setupOnlineStatusSubscription = () => {
    if (!user) return;
    
    onlineStatusSubscription.current = supabase
      .channel('online-status')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'user_online_status'
        },
        (payload) => {
          console.log('📊 Online status update:', payload);
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            setOnlineStatuses(prev => ({
              ...prev,
              [payload.new.user_id]: payload.new.is_online
            }));
          } else if (payload.eventType === 'DELETE') {
            setOnlineStatuses(prev => ({
              ...prev,
              [payload.old.user_id]: false
            }));
          }
        }
      )
      .subscribe();
  };
  
  // Update conversation preview when new message arrives
  const updateConversationPreview = async (newMessage) => {
    try {
      // Find conversation in current list
      const conversationIndex = conversations.findIndex(
        conv => conv.id === newMessage.conversation_id
      );
      
      if (conversationIndex === -1) {
        // New conversation - reload silently without showing loading state
        console.log('New conversation detected, reloading silently');
        await loadConversationsSilently();
        return;
      }
      
      // Get sender info if not our message
      let senderName = 'You';
      if (newMessage.sender_id !== user.id) {
        const { data: sender } = await supabase
          .from('users')
          .select('username')
          .eq('id', newMessage.sender_id)
          .single();
        senderName = sender?.username || 'Unknown';
      }
      
      // Format preview
      let previewText = 'No messages yet';
      if (newMessage.message_type === 'voice') {
        previewText = '🎤 Voice message';
      } else {
        previewText = newMessage.content?.length > 50 
          ? newMessage.content.substring(0, 50) + '...'
          : newMessage.content || 'No messages yet';
      }
      
      // Format timestamp
      const messageDate = new Date(newMessage.created_at);
      const now = new Date();
      const diffMs = now - messageDate;
      const diffMins = Math.floor(diffMs / 60000);
      
      let lastMessageTime = 'Just now';
      if (diffMins >= 1 && diffMins < 60) {
        lastMessageTime = `${diffMins}m ago`;
      } else if (diffMins >= 60) {
        const diffHours = Math.floor(diffMins / 60);
        lastMessageTime = diffHours < 24 
          ? `${diffHours}h ago`
          : messageDate.toLocaleDateString();
      }
      
      // Update conversation in list
      setConversations(prev => {
        const updated = [...prev];
        updated[conversationIndex] = {
          ...updated[conversationIndex],
          lastMessage: previewText,
          lastMessageTime,
          lastMessageTimestamp: messageDate // For sorting
        };
        
        // Sort by last message time (most recent first)
        return updated.sort((a, b) => {
          const aTime = a.lastMessageTimestamp || new Date(a.created_at);
          const bTime = b.lastMessageTimestamp || new Date(b.created_at);
          return bTime - aTime;
        });
      });
      
      // Mark as delivered if from another user
      if (newMessage.sender_id !== user.id && isOnline) {
        await MessagingService.markAsDelivered(newMessage.id, user.id);
      }
    } catch (error) {
      console.error('Error updating conversation preview:', error);
    }
  };
  
  // Get conversation preview with local storage fallback
  const getConversationPreview = async (conversationId, dbLastMessage) => {
    let lastMessage = dbLastMessage;
    
    // If no DB message or offline, try local storage
    if (!lastMessage || !isOnline) {
      const cachedMessages = await StorageService.getMessages(conversationId);
      if (cachedMessages && cachedMessages.length > 0) {
        const sortedCache = cachedMessages.sort(
          (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );
        lastMessage = sortedCache[0];
        console.log(`📱 Using cached message for preview: ${conversationId}`);
      }
    }
    
    // Format preview
    if (!lastMessage) {
      return {
        previewText: 'No messages yet',
        lastMessageTime: 'Just now',
        lastMessageTimestamp: null
      };
    }
    
    let previewText = 'No messages yet';
    if (lastMessage.message_type === 'voice') {
      previewText = '🎤 Voice message';
    } else {
      const content = lastMessage.content || '';
      previewText = content.length > 50 
        ? content.substring(0, 50) + '...'
        : content;
    }
    
    // Format timestamp
    const messageDate = new Date(lastMessage.created_at);
    const now = new Date();
    const diffMs = now - messageDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    let lastMessageTime;
    if (diffMins < 1) {
      lastMessageTime = 'Just now';
    } else if (diffMins < 60) {
      lastMessageTime = `${diffMins}m ago`;
    } else if (diffHours < 24) {
      lastMessageTime = `${diffHours}h ago`;
    } else if (diffDays < 7) {
      lastMessageTime = `${diffDays}d ago`;
    } else {
      lastMessageTime = messageDate.toLocaleDateString();
    }
    
    return {
      previewText,
      lastMessageTime,
      lastMessageTimestamp: messageDate
    };
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  };

  const handleNewConversation = () => {
    setShowNewConversationModal(true);
  };

  const handleConversationCreated = (conversation) => {
    // Refresh conversations list
    loadConversations();
    
    // Navigate to the new conversation
    navigation.navigate('Conversation', {
      conversationId: conversation.id,
      conversationName: conversation.name || 'New Chat'
    });
  };

  const renderConversation = ({ item }) => {
    console.log('🔍 Rendering conversation:', { 
      name: item.name, 
      type: item.type, 
      otherUser: item.otherUser?.id,
      onlineStatus: onlineStatuses[item.otherUser?.id]
    });
    
    return (
    <Card style={[styles.conversationCard, { backgroundColor: theme.colors.card }]} onPress={() => {
      navigation.navigate('Conversation', {
        conversationId: item.id,
        conversationName: item.name || 'New Chat'
      });
    }}>
      <Card.Content style={styles.conversationContent}>
        <View style={styles.avatarContainer}>
          <Avatar.Text 
            size={48} 
            label={item.name?.charAt(0) || '?'} 
            style={styles.avatar}
          />
          {item.type === 'direct' && item.otherUser && (
            <OnlineStatusDot 
              isOnline={onlineStatuses[item.otherUser.id] || false}
              size="small"
              style={styles.statusDot}
            />
          )}
        </View>
        <View style={styles.conversationInfo}>
          <View style={styles.titleRow}>
            <Title style={[styles.conversationTitle, { color: theme.colors.text }]}>{item.name || 'New Chat'}</Title>
          </View>
          <Paragraph style={[styles.lastMessage, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {item.lastMessage || 'No messages yet'}
          </Paragraph>
        <Text style={[styles.timestamp, { color: theme.colors.textSecondary }]}>
          {item.lastMessageTime || 'Just now'}
        </Text>
        </View>
        {item.unreadCount > 0 && (
          <Badge style={styles.unreadBadge}>{item.unreadCount}</Badge>
        )}
      </Card.Content>
    </Card>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.colors.text }]}>No conversations yet</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              Start a new chat to begin communicating across languages
            </Text>
          </View>
        }
      />
      
      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.accent }]}
        icon="plus"
        onPress={handleNewConversation}
      />
      
      <NewConversationModal
        visible={showNewConversationModal}
        onDismiss={() => setShowNewConversationModal(false)}
        onConversationCreated={handleConversationCreated}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
  },
  conversationCard: {
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  conversationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    backgroundColor: '#8B5CF6',
  },
  statusIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statusOnline: {
    backgroundColor: '#10B981',
  },
  statusOffline: {
    backgroundColor: '#9CA3AF',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  titleStatusDot: {
    marginLeft: 8,
  },
  lastMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  unreadBadge: {
    backgroundColor: '#8B5CF6',
    color: '#FFFFFF',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    color: '#1F2937',
    marginBottom: 8,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#8B5CF6',
  },
});
