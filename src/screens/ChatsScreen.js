import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, Text, RefreshControl } from 'react-native';
import { Card, Title, Paragraph, Button, FAB, Avatar, Badge } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import DatabaseService from '../services/database';
import MessagingService from '../services/messaging';
import StorageService from '../lib/storage';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { supabase } from '../lib/supabase';
import NewConversationModal from '../components/NewConversationModal';

export default function ChatsScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewConversationModal, setShowNewConversationModal] = useState(false);
  
  // Real-time subscription
  const messageSubscription = useRef(null);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    loadConversations();
    setupRealtimeSubscription();
    
    return () => {
      if (messageSubscription.current) {
        messageSubscription.current.unsubscribe();
      }
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
          
          return {
            id: item.conversation_id,
            name: conversation?.name || 'Direct Chat',
            type: conversation?.type || 'direct',
            created_at: conversation?.created_at,
            lastMessage: preview.previewText,
            lastMessageTime: preview.lastMessageTime,
            lastMessageTimestamp: preview.lastMessageTimestamp,
            unreadCount: 0 // TODO: Calculate unread count
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

  const renderConversation = ({ item }) => (
    <Card style={styles.conversationCard} onPress={() => {
      navigation.navigate('Conversation', {
        conversationId: item.id,
        conversationName: item.name || 'New Chat'
      });
    }}>
      <Card.Content style={styles.conversationContent}>
        <Avatar.Text 
          size={48} 
          label={item.name?.charAt(0) || '?'} 
          style={styles.avatar}
        />
        <View style={styles.conversationInfo}>
          <Title style={styles.conversationTitle}>{item.name || 'New Chat'}</Title>
          <Paragraph style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage || 'No messages yet'}
          </Paragraph>
        <Text style={styles.timestamp}>
          {item.lastMessageTime || 'Just now'}
        </Text>
        </View>
        {item.unreadCount > 0 && (
          <Badge style={styles.unreadBadge}>{item.unreadCount}</Badge>
        )}
      </Card.Content>
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading conversations...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <Text style={styles.emptySubtext}>
              Start a new chat to begin communicating across languages
            </Text>
          </View>
        }
      />
      
      <FAB
        style={styles.fab}
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
    backgroundColor: '#FFFFFF',
  },
  listContainer: {
    padding: 16,
  },
  conversationCard: {
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
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
  avatar: {
    backgroundColor: '#8B5CF6',
  },
  conversationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
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
