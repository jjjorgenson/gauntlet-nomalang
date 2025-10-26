import { supabase } from '../lib/supabase';

// Database service for all Supabase operations
export class DatabaseService {
  // User operations
  static async createUserProfile(userId, userData) {
    const { data, error } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: userData.email,
        username: userData.username,
        native_language: userData.native_language || 'en',
        theme_preference: userData.theme_preference || 'system'
      })
      .select()
      .single();
    
    return { data, error };
  }

  static async getUserProfile(userId) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    return { data, error };
  }

  static async updateUserProfile(userId, updates) {
    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    return { data, error };
  }

  static async updateAutoTranslateSetting(userId, enabled) {
    return await this.updateUserProfile(userId, { 
      auto_translate_enabled: enabled 
    });
  }

  static async searchUsers(query) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, native_language')
      .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(20);
    
    return { data, error };
  }

  // Conversation operations
  static async createConversation(conversationData) {
    console.log('🗄️ DatabaseService.createConversation called with:', conversationData);
    
    // Debug authentication context
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('🔐 Auth context - User:', user ? { id: user.id, email: user.email } : 'NULL');
    console.log('🔐 Auth context - Auth error:', authError);
    
    const { data, error } = await supabase
      .from('conversations')
      .insert(conversationData)
      .select()
      .single();
    
    if (error) {
      console.error('❌ DatabaseService.createConversation error:', error);
      console.error('❌ Full error details:', JSON.stringify(error, null, 2));
    } else {
      console.log('✅ DatabaseService.createConversation success:', data);
    }
    
    return { data, error };
  }

  static async addParticipantToConversation(conversationId, userId, participantData = {}) {
    const { data, error } = await supabase
      .from('conversation_participants')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        ...participantData
      })
      .select()
      .single();
    
    return { data, error };
  }

  static async addConversationParticipants(conversationId, userIds) {
    console.log('🗄️ DatabaseService.addConversationParticipants called with:', { conversationId, userIds });
    
    try {
      // Use the SECURITY DEFINER function for adding participants
      // This bypasses RLS while maintaining security checks
      const results = [];
      
      for (const userId of userIds) {
        console.log('👥 Adding participant:', userId);
        
        const { data, error } = await supabase.rpc('add_conversation_participant', {
          p_conversation_id: conversationId,
          p_user_id: userId
        });
        
        if (error) {
          console.error('❌ Error adding participant:', userId, error);
          // Continue with other participants even if one fails
        } else {
          console.log('✅ Successfully added participant:', userId);
          results.push({ user_id: userId, success: true });
        }
      }
      
      return { data: results, error: null };
    } catch (error) {
      console.error('❌ DatabaseService.addConversationParticipants error:', error);
      return { data: null, error };
    }
  }

  static async getUserConversations(userId) {
    const { data, error } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations (
          id,
          name,
          type,
          created_at
        )
      `)
      .eq('user_id', userId)
      .order('joined_at', { ascending: false });
    
    if (error) return { data, error };
    
    // For each conversation, get the last message and other participant info
    const enrichedData = await Promise.all(
      data.map(async (item) => {
        // Get the last message for this conversation
        const { data: lastMessage } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            message_type,
            created_at,
            sender_id,
            users!messages_sender_id_fkey (
              username
            )
          `)
          .eq('conversation_id', item.conversation_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (item.conversations.type === 'direct') {
          // Get the other participant's name for direct conversations
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select(`
              users (
                id,
                username,
                avatar_url
              )
            `)
            .eq('conversation_id', item.conversation_id)
            .neq('user_id', userId);
          
          if (participants && participants.length > 0) {
            return {
              ...item,
              conversations: {
                ...item.conversations,
                name: participants[0].users.username, // Use other participant's name
                other_user: participants[0].users,
                lastMessage
              }
            };
          }
        }
        
        return {
          ...item,
          conversations: {
            ...item.conversations,
            lastMessage
          }
        };
      })
    );
    
    return { data: enrichedData, error };
  }

  static async getConversationParticipants(conversationId) {
    const { data, error } = await supabase
      .from('conversation_participants')
      .select(`
        user_id,
        users (
          id,
          username,
          avatar_url,
          native_language
        )
      `)
      .eq('conversation_id', conversationId);
    
    return { data, error };
  }

  // Check if a direct conversation already exists between two users
  static async findExistingDirectConversation(userId1, userId2) {
    // Step 1: Get all conversation IDs for userId2
    const { data: user2Convs, error: user2Error } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId2);
    
    if (user2Error) return { data: null, error: user2Error };
    if (!user2Convs || user2Convs.length === 0) return { data: null, error: null };
    
    const user2ConvIds = user2Convs.map(c => c.conversation_id);
    
    // Step 2: Find conversations where userId1 is also a participant
    const { data, error } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations (
          id,
          type,
          name,
          created_at
        )
      `)
      .eq('user_id', userId1)
      .in('conversation_id', user2ConvIds);
    
    if (error) return { data: null, error };
    if (!data || data.length === 0) return { data: null, error: null };
    
    // Step 3: Filter for direct conversations and verify it's exactly 2 participants
    for (const item of data) {
      if (item.conversations?.type !== 'direct') continue;
      
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', item.conversation_id);
      
      if (participants && participants.length === 2) {
        const participantIds = participants.map(p => p.user_id);
        if (participantIds.includes(userId1) && participantIds.includes(userId2)) {
          return { data: item.conversations, error: null };
        }
      }
    }
    
    return { data: null, error: null };
  }

  // Message operations
  static async sendMessage(messageData) {
    const { data, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();
    
    return { data, error };
  }

  static async getMessages(conversationId, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        users!messages_sender_id_fkey (
          id,
          username,
          avatar_url
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })  // Changed to ascending for newest at bottom
      .range(offset, offset + limit - 1);
    
    return { data, error };
  }

  // Get the newest message in a conversation (for real-time updates)
  static async getNewestMessage(conversationId) {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        users!messages_sender_id_fkey (
          id,
          username,
          avatar_url
        )
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })  // Newest first
      .limit(1);
    
    return { data: data?.[0] || null, error };
  }

  static async updateMessageStatus(messageId, userId, status) {
    const { data, error } = await supabase
      .from('message_statuses')
      .upsert({
        message_id: messageId,
        user_id: userId,
        status: status,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    return { data, error };
  }

  static async getMessageStatuses(messageId) {
    const { data, error } = await supabase
      .from('message_statuses')
      .select(`
        *,
        users (
          id,
          username
        )
      `)
      .eq('message_id', messageId);
    
    return { data, error };
  }

  // Translation operations
  static async getTranslation(messageId, targetLanguage) {
    const { data, error } = await supabase
      .from('message_translations')
      .select('translated_content')
      .eq('message_id', messageId)
      .eq('target_language', targetLanguage)
      .single();
    
    return { data, error };
  }

  static async saveTranslation(messageId, targetLanguage, translatedContent) {
    const { data, error } = await supabase
      .from('message_translations')
      .insert({
        message_id: messageId,
        target_language: targetLanguage,
        translated_content: translatedContent
      })
      .select()
      .single();
    
    return { data, error };
  }

  // Real-time subscriptions
  static subscribeToMessages(conversationId, callback) {
    return supabase
      .channel(`messages:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, callback)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, callback)
      .subscribe();
  }

  static subscribeToTyping(conversationId, callback) {
    return supabase
      .channel(`typing:${conversationId}`)
      .on('presence', { event: 'sync' }, callback)
      .on('presence', { event: 'join' }, callback)
      .on('presence', { event: 'leave' }, callback)
      .subscribe();
  }

  static setTypingStatus(conversationId, userId, isTyping) {
    const channel = supabase.channel(`typing:${conversationId}`);
    
    if (isTyping) {
      return channel.track({
        user: userId,
        online_at: new Date().toISOString(),
        typing: true
      });
    } else {
      return channel.track({
        user: userId,
        online_at: new Date().toISOString(),
        typing: false
      });
    }
  }

  // Utility functions
  static async searchUsers(query) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, avatar_url, native_language')
      .ilike('username', `%${query}%`)
      .limit(10);
    
    return { data, error };
  }

  static async createDirectConversation(userId1, userId2) {
    // Check if direct conversation already exists
    const { data: existing } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .in('user_id', [userId1, userId2])
      .then(result => {
        // Find conversation that has both users
        const conversations = {};
        result.data?.forEach(participant => {
          const convId = participant.conversation_id;
          conversations[convId] = (conversations[convId] || 0) + 1;
        });
        
        const existingConvId = Object.keys(conversations).find(convId => 
          conversations[convId] === 2
        );
        
        return { data: existingConvId ? [{ conversation_id: existingConvId }] : null };
      });

    if (existing?.data?.length > 0) {
      return { data: existing.data[0], error: null };
    }

    // Create new direct conversation
    const { data: conversation, error: convError } = await this.createConversation({
      type: 'direct'
    });

    if (convError) return { data: null, error: convError };

    // Add both participants
    await this.addParticipantToConversation(conversation.id, userId1);
    await this.addParticipantToConversation(conversation.id, userId2);

    return { data: { conversation_id: conversation.id }, error: null };
  }
}

export default DatabaseService;
