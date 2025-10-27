import { supabase } from '../lib/supabase';
import DatabaseService from './database';
import VoiceService from './voice';

// Sanitize text to remove null bytes and problematic characters
const sanitizeText = (text) => {
  if (!text) return text;
  // Remove null bytes and other problematic characters
  return text.replace(/\u0000/g, '').trim();
};

// Real-time messaging service
export class MessagingService {
  constructor() {
    this.subscriptions = new Map();
    this.typingTimeouts = new Map();
  }

  // Send a text message
  async sendMessage(conversationId, content, senderId) {
    try {
      // Sanitize content before sending
      const sanitizedContent = sanitizeText(content);
      
      if (!sanitizedContent) {
        throw new Error('Message content is empty after sanitization');
      }

      const messageData = {
        conversation_id: conversationId,
        sender_id: senderId,
        content: sanitizedContent,
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
        content: transcription || '[Voice Message]', // Default content for voice messages
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

  // Send voice message with automatic upload and retry
  async sendVoiceMessageWithUpload(audioUri, conversationId, senderId, onProgress = null, transcription = null) {
    try {
      console.log('🎤 Starting voice message upload process');
      
      // Upload audio file with retry logic
      const uploadResult = await VoiceService.uploadWithRetry(
        audioUri, 
        senderId, 
        conversationId, 
        onProgress
      );

      if (!uploadResult.success) {
        return { 
          data: null, 
          error: uploadResult.error,
          needsUserAction: VoiceService.shouldShowUserOptions(uploadResult.error)
        };
      }

      // Send message to database
      const messageResult = await this.sendVoiceMessage(
        conversationId,
        uploadResult.voiceUrl,
        uploadResult.duration || 1, // Default to 1 second minimum for database constraint
        transcription || '', // Use provided transcription or empty string
        senderId
      );

      if (messageResult.error) {
        // If message creation fails, try to clean up uploaded file
        try {
          await VoiceService.deleteAudioFile(uploadResult.fileName);
        } catch (cleanupError) {
          console.error('Error cleaning up uploaded file:', cleanupError);
        }
        
        return messageResult;
      }

      console.log('✅ Voice message sent successfully');
      return { 
        data: messageResult.data, 
        error: null,
        voiceUrl: uploadResult.voiceUrl,
        fileName: uploadResult.fileName
      };

    } catch (error) {
      console.error('Error in voice message upload process:', error);
      return { data: null, error: 'Failed to send voice message' };
    }
  }

  // Update voice message transcription
  async updateVoiceTranscription(messageId, transcription, language = null) {
    try {
      const updateData = {
        content: transcription,
        ...(language && { detected_language: language })
      };

      const { data, error } = await DatabaseService.updateMessage(messageId, updateData);
      
      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      console.error('Error updating voice transcription:', error);
      return { data: null, error };
    }
  }

  // Get voice message details
  async getVoiceMessageDetails(messageId) {
    try {
      const { data, error } = await DatabaseService.getMessage(messageId);
      
      if (error) throw error;

      // If it's a voice message, get additional details
      if (data && data.message_type === 'voice') {
        const voiceDetails = {
          ...data,
          hasAudio: !!data.voice_url,
          duration: data.voice_duration_seconds,
          hasTranscription: !!(data.content && data.content.trim()),
          transcription: data.content
        };

        return { data: voiceDetails, error: null };
      }

      return { data, error: null };
    } catch (error) {
      console.error('Error getting voice message details:', error);
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

  // Online Status Methods
  async setOnlineStatus(userId, isOnline) {
    try {
      const result = await DatabaseService.setOnlineStatus(userId, isOnline);
      return result;
    } catch (error) {
      console.error('Error setting online status:', error);
      return { success: false, error };
    }
  }

  async getOnlineStatus(userId) {
    try {
      const { data, error } = await DatabaseService.getOnlineStatus(userId);
      return { data, error };
    } catch (error) {
      console.error('Error getting online status:', error);
      return { data: null, error };
    }
  }

  subscribeToOnlineStatus(onStatusChange) {
    return DatabaseService.subscribeToOnlineStatus((payload) => {
      onStatusChange(payload);
    });
  }

  // Enhanced Typing Status Methods
  async setTypingStatus(conversationId, userId, isTyping) {
    try {
      const result = await DatabaseService.setTypingStatus(conversationId, userId, isTyping);
      
      if (result.success) {
        // Clear existing timeout
        if (this.typingTimeouts.has(`${conversationId}-${userId}`)) {
          clearTimeout(this.typingTimeouts.get(`${conversationId}-${userId}`));
        }

        if (isTyping) {
          // Auto-clear typing after 3 seconds
          const timeout = setTimeout(() => {
            DatabaseService.setTypingStatus(conversationId, userId, false);
            this.typingTimeouts.delete(`${conversationId}-${userId}`);
          }, 3000);
          
          this.typingTimeouts.set(`${conversationId}-${userId}`, timeout);
        } else {
          this.typingTimeouts.delete(`${conversationId}-${userId}`);
        }
      }
      
      return result;
    } catch (error) {
      console.error('Error setting typing status:', error);
      return { success: false, error };
    }
  }

  async getTypingStatus(conversationId) {
    try {
      const { data, error } = await DatabaseService.getTypingStatus(conversationId);
      return { data, error };
    } catch (error) {
      console.error('Error getting typing status:', error);
      return { data: null, error };
    }
  }

  // Enhanced Read Receipt Methods
  async markMessageAsRead(messageId, userId) {
    try {
      const result = await DatabaseService.markMessageAsRead(messageId, userId);
      return result;
    } catch (error) {
      console.error('Error marking message as read:', error);
      return { success: false, error };
    }
  }

  async getMessageReadStatus(messageId) {
    try {
      const { data, error } = await DatabaseService.getMessageReadStatus(messageId);
      return { data, error };
    } catch (error) {
      console.error('Error getting message read status:', error);
      return { data: null, error };
    }
  }

  // Subscribe to typing indicators
  subscribeToTyping(conversationId, onTypingChange) {
    const subscription = DatabaseService.subscribeToTyping(conversationId, (payload) => {
      // Handle different event types
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        if (payload.new.is_typing) {
          // User started typing
          onTypingChange({
            type: 'typing_start',
            user: payload.new.users,
            userId: payload.new.user_id
          });
        } else {
          // User stopped typing
          onTypingChange({
            type: 'typing_stop',
            user: payload.new.users,
            userId: payload.new.user_id
          });
        }
      } else if (payload.eventType === 'DELETE') {
        // User left conversation or typing status was cleared
        onTypingChange({
          type: 'typing_stop',
          userId: payload.old.user_id
        });
      }
    });

    return subscription;
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

    // Clear all typing timeouts for this conversation
    const conversationTimeouts = Array.from(this.typingTimeouts.keys())
      .filter(key => key.startsWith(`${conversationId}-`));
    
    conversationTimeouts.forEach(key => {
      clearTimeout(this.typingTimeouts.get(key));
      this.typingTimeouts.delete(key);
    });
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
