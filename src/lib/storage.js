import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage Service for Offline-First Message Caching
 * Handles local message storage and offline queue management
 */

class StorageService {
  // Storage keys
  static MESSAGES_PREFIX = 'messages_';
  static OFFLINE_QUEUE_KEY = 'offline_queue';

  /**
   * Save messages array for a conversation
   * @param {string} conversationId - The conversation ID
   * @param {Array} messages - Array of message objects
   */
  static async saveMessages(conversationId, messages) {
    try {
      const key = `${this.MESSAGES_PREFIX}${conversationId}`;
      // Sort messages newest-first before saving
      const sortedMessages = [...messages].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      await AsyncStorage.setItem(key, JSON.stringify(sortedMessages));
      console.log(`💾 Saved ${messages.length} messages for conversation ${conversationId} (newest-first)`);
    } catch (error) {
      console.error('Error saving messages to storage:', error);
    }
  }

  /**
   * Migrate old cache format (oldest-first) to new format (newest-first)
   * @param {string} conversationId - The conversation ID
   */
  static async migrateCacheFormat(conversationId) {
    try {
      const key = `${this.MESSAGES_PREFIX}${conversationId}`;
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const messages = JSON.parse(cached);

        // Check if already in newest-first format (first message is newer than last)
        if (messages.length > 1) {
          const firstTime = new Date(messages[0]?.created_at);
          const lastTime = new Date(messages[messages.length - 1]?.created_at);

          // If first message is older than last, it's in old format (oldest-first)
          if (firstTime < lastTime) {
            console.log(`🔄 Migrating cache format for conversation ${conversationId} from oldest-first to newest-first`);
            const sortedMessages = [...messages].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            await AsyncStorage.setItem(key, JSON.stringify(sortedMessages));
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      console.error('Error migrating cache format:', error);
      return false;
    }
  }

  /**
   * Get cached messages for a conversation
   * @param {string} conversationId - The conversation ID
   * @returns {Array|null} Array of messages or null if not found
   */
  static async getMessages(conversationId) {
    try {
      const key = `${this.MESSAGES_PREFIX}${conversationId}`;
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const messages = JSON.parse(cached);
        console.log(`📱 Retrieved ${messages.length} cached messages for conversation ${conversationId}`);
        return messages;
      }
      return null;
    } catch (error) {
      console.error('Error getting messages from storage:', error);
      return null;
    }
  }

  /**
   * Add a single message to cached messages
   * @param {string} conversationId - The conversation ID
   * @param {Object} message - The message object to add
   */
  static async addMessage(conversationId, message) {
    try {
      const key = `${this.MESSAGES_PREFIX}${conversationId}`;
      const existing = await this.getMessages(conversationId) || [];

      // Add new message at beginning (newest first) and keep only last 50
      const updated = [message, ...existing].slice(0, 50);
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      console.log(`➕ Added message to cache for conversation ${conversationId}`);
    } catch (error) {
      console.error('Error adding message to storage:', error);
    }
  }

  /**
   * Remove a message from cached messages
   * @param {string} conversationId - The conversation ID
   * @param {string} messageId - The message ID to remove
   */
  static async removeMessage(conversationId, messageId) {
    try {
      const key = `${this.MESSAGES_PREFIX}${conversationId}`;
      const existing = await this.getMessages(conversationId) || [];
      const updated = existing.filter(msg => msg.id !== messageId);
      await AsyncStorage.setItem(key, JSON.stringify(updated));
      console.log(`➖ Removed message ${messageId} from cache`);
    } catch (error) {
      console.error('Error removing message from storage:', error);
    }
  }

  /**
   * Clear all cached messages for a conversation
   * @param {string} conversationId - The conversation ID
   */
  static async clearConversationCache(conversationId) {
    try {
      const key = `${this.MESSAGES_PREFIX}${conversationId}`;
      await AsyncStorage.removeItem(key);
      console.log(`🗑️ Cleared cache for conversation ${conversationId}`);
    } catch (error) {
      console.error('Error clearing conversation cache:', error);
    }
  }

  /**
   * Get offline message queue
   * @returns {Array} Array of pending messages
   */
  static async getOfflineQueue() {
    try {
      const queue = await AsyncStorage.getItem(this.OFFLINE_QUEUE_KEY);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Error getting offline queue:', error);
      return [];
    }
  }

  /**
   * Add message to offline queue
   * @param {Object} message - The message object to queue
   */
  static async addToOfflineQueue(message) {
    try {
      const queue = await this.getOfflineQueue();
      
      // Sanitize message content
      const sanitizedMessage = {
        ...message,
        content: message.content ? message.content.replace(/\u0000/g, '').trim() : message.content
      };
      
      const updatedQueue = [...queue, sanitizedMessage];
      await AsyncStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
      console.log(`📤 Added message to offline queue. Queue size: ${updatedQueue.length}`);
    } catch (error) {
      console.error('Error adding to offline queue:', error);
    }
  }

  /**
   * Remove message from offline queue
   * @param {string} messageId - The message ID to remove
   */
  static async removeFromOfflineQueue(messageId) {
    try {
      const queue = await this.getOfflineQueue();
      const updatedQueue = queue.filter(msg => msg.id !== messageId);
      await AsyncStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(updatedQueue));
      console.log(`✅ Removed message ${messageId} from offline queue`);
    } catch (error) {
      console.error('Error removing from offline queue:', error);
    }
  }

  /**
   * Set offline queue to specific array of messages
   * @param {Array} messages - Array of messages to set as queue
   */
  static async setOfflineQueue(messages) {
    try {
      await AsyncStorage.setItem(this.OFFLINE_QUEUE_KEY, JSON.stringify(messages));
      console.log(`📝 Set offline queue to ${messages.length} messages`);
    } catch (error) {
      console.error('Error setting offline queue:', error);
    }
  }

  /**
   * Clear entire offline queue
   */
  static async clearOfflineQueue() {
    try {
      await AsyncStorage.removeItem(this.OFFLINE_QUEUE_KEY);
      console.log('🧹 Cleared offline queue');
    } catch (error) {
      console.error('Error clearing offline queue:', error);
    }
  }

  /**
   * Get all conversation IDs that have cached messages
   * @returns {Array} Array of conversation IDs
   */
  static async getCachedConversations() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const messageKeys = keys.filter(key => key.startsWith(this.MESSAGES_PREFIX));
      return messageKeys.map(key => key.replace(this.MESSAGES_PREFIX, ''));
    } catch (error) {
      console.error('Error getting cached conversations:', error);
      return [];
    }
  }
}

export default StorageService;
