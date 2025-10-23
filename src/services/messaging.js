import { supabase } from '../lib/supabase';
import DatabaseService from './database';

// Real-time messaging service
export class MessagingService {
  constructor() {
    this.subscriptions = new Map();
    this.typingTimeouts = new Map();
  }

  // Send a text message
  async sendMessage(conversationId, content, senderId) {
    try {
      const messageData = {
        conversation_id: conversationId,
        sender_id: senderId,
        content: content,
        message_type: 'text',
        detected_language: 'en' // TODO: Implement language detection
      };

      const { data, error } = await DatabaseService.sendMessage(messageData);
      
      if (error) throw error;

      // Create message statuses for all participants
      await this.createMessageStatuses(data.id, conversationId, senderId);

      return { data, error: null };
    } catch (error) {
      console.error('Error sending message:', error);
      return { data: null, error };
    }
  }

  // Send a voice message
  async sendVoiceMessage(conversationId, voiceUrl, duration, transcription, senderId) {
    try {
      const messageData = {
        conversation_id: conversationId,
        sender_id: senderId,
        content: transcription,
        message_type: 'voice',
        voice_url: voiceUrl,
        voice_duration_seconds: duration,
        detected_language: 'en' // TODO: Implement language detection
      };

      const { data, error } = await DatabaseService.sendMessage(messageData);
      
      if (error) throw error;

      // Create message statuses for all participants
      await this.createMessageStatuses(data.id, conversationId, senderId);

      return { data, error: null };
    } catch (error) {
      console.error('Error sending voice message:', error);
      return { data: null, error };
    }
  }

  // Create message statuses for all conversation participants
  async createMessageStatuses(messageId, conversationId, senderId) {
    try {
      const { data: participants } = await DatabaseService.getConversationParticipants(conversationId);
      
      if (!participants) return;

      const statuses = participants
        .filter(p => p.user_id !== senderId)
        .map(p => ({
          message_id: messageId,
          user_id: p.user_id,
          status: 'sent'
        }));

      if (statuses.length > 0) {
        const { error } = await supabase
          .from('message_statuses')
          .upsert(statuses, { 
            onConflict: 'message_id,user_id',
            ignoreDuplicates: true 
          });
        
        if (error) console.error('Error creating message statuses:', error);
      }
    } catch (error) {
      console.error('Error creating message statuses:', error);
    }
  }

  // Mark message as delivered
  async markAsDelivered(messageId, userId) {
    try {
      const { error } = await DatabaseService.updateMessageStatus(messageId, userId, 'delivered');
      if (error) console.error('Error marking message as delivered:', error);
    } catch (error) {
      console.error('Error marking message as delivered:', error);
    }
  }

  // Mark message as read
  async markAsRead(messageId, userId) {
    try {
      const { error } = await DatabaseService.updateMessageStatus(messageId, userId, 'read');
      if (error) console.error('Error marking message as read:', error);
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  }

  // Subscribe to messages in a conversation
  subscribeToMessages(conversationId, onMessage) {
    if (this.subscriptions.has(conversationId)) {
      this.subscriptions.get(conversationId).unsubscribe();
    }

    const subscription = DatabaseService.subscribeToMessages(conversationId, (payload) => {
      onMessage(payload);
    });

    this.subscriptions.set(conversationId, subscription);
    return subscription;
  }

  // Subscribe to typing indicators
  subscribeToTyping(conversationId, onTypingChange) {
    const subscription = DatabaseService.subscribeToTyping(conversationId, (state) => {
      const typingUsers = Object.values(state)
        .filter(user => user.typing)
        .map(user => user.user);
      
      onTypingChange(typingUsers);
    });

    return subscription;
  }

  // Set typing status
  setTypingStatus(conversationId, userId, isTyping) {
    // Clear existing timeout
    if (this.typingTimeouts.has(conversationId)) {
      clearTimeout(this.typingTimeouts.get(conversationId));
    }

    if (isTyping) {
      // Set typing to true
      DatabaseService.setTypingStatus(conversationId, userId, true);
      
      // Auto-clear typing after 3 seconds
      const timeout = setTimeout(() => {
        DatabaseService.setTypingStatus(conversationId, userId, false);
        this.typingTimeouts.delete(conversationId);
      }, 3000);
      
      this.typingTimeouts.set(conversationId, timeout);
    } else {
      // Clear typing immediately
      DatabaseService.setTypingStatus(conversationId, userId, false);
      this.typingTimeouts.delete(conversationId);
    }
  }

  // Get conversation messages
  async getMessages(conversationId, limit = 50, offset = 0) {
    try {
      const { data, error } = await DatabaseService.getMessages(conversationId, limit, offset);
      return { data, error };
    } catch (error) {
      console.error('Error getting messages:', error);
      return { data: null, error };
    }
  }

  // Get message translations
  async getTranslation(messageId, targetLanguage) {
    try {
      const { data, error } = await DatabaseService.getTranslation(messageId, targetLanguage);
      return { data, error };
    } catch (error) {
      console.error('Error getting translation:', error);
      return { data: null, error };
    }
  }

  // Save translation
  async saveTranslation(messageId, targetLanguage, translatedContent) {
    try {
      const { data, error } = await DatabaseService.saveTranslation(messageId, targetLanguage, translatedContent);
      return { data, error };
    } catch (error) {
      console.error('Error saving translation:', error);
      return { data: null, error };
    }
  }

  // Clean up subscriptions
  unsubscribeFromConversation(conversationId) {
    if (this.subscriptions.has(conversationId)) {
      this.subscriptions.get(conversationId).unsubscribe();
      this.subscriptions.delete(conversationId);
    }

    if (this.typingTimeouts.has(conversationId)) {
      clearTimeout(this.typingTimeouts.get(conversationId));
      this.typingTimeouts.delete(conversationId);
    }
  }

  // Clean up all subscriptions
  cleanup() {
    this.subscriptions.forEach(subscription => subscription.unsubscribe());
    this.subscriptions.clear();
    
    this.typingTimeouts.forEach(timeout => clearTimeout(timeout));
    this.typingTimeouts.clear();
  }
  
  // Static methods for external use
  static async markAsDelivered(messageId, userId) {
    const service = new MessagingService();
    return await service.markAsDelivered(messageId, userId);
  }
  
  static async markAsRead(messageId, userId) {
    const service = new MessagingService();
    return await service.markAsRead(messageId, userId);
  }
}

export default MessagingService;
