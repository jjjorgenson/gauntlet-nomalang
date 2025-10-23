import { useState, useEffect } from 'react';
import StorageService from '../lib/storage';
import MessagingService from '../services/messaging';

/**
 * Hook for managing offline message queue
 * Based on architecture doc pattern with auto-flush when online
 * @returns {Object} Queue management functions and state
 */
export function useOfflineQueue() {
  const [queue, setQueue] = useState([]);
  const [isFlushing, setIsFlushing] = useState(false);

  // Load queue on mount
  useEffect(() => {
    loadQueue();
  }, []);

  /**
   * Load offline queue from storage
   */
  const loadQueue = async () => {
    try {
      const storedQueue = await StorageService.getOfflineQueue();
      setQueue(storedQueue);
      console.log(`📋 Loaded ${storedQueue.length} messages from offline queue`);
    } catch (error) {
      console.error('Error loading offline queue:', error);
    }
  };

  /**
   * Add message to offline queue
   * @param {Object} message - Message object to queue
   */
  const addToQueue = async (message) => {
    try {
      await StorageService.addToOfflineQueue(message);
      await loadQueue(); // Refresh queue state
      console.log(`📤 Added message to offline queue: ${message.id}`);
    } catch (error) {
      console.error('Error adding to offline queue:', error);
    }
  };

  /**
   * Remove message from offline queue
   * @param {string} messageId - Message ID to remove
   */
  const removeFromQueue = async (messageId) => {
    try {
      await StorageService.removeFromOfflineQueue(messageId);
      await loadQueue(); // Refresh queue state
      console.log(`✅ Removed message from offline queue: ${messageId}`);
    } catch (error) {
      console.error('Error removing from offline queue:', error);
    }
  };

  /**
   * Flush all queued messages to server
   */
  const flushQueue = async () => {
    if (isFlushing || queue.length === 0) return;

    setIsFlushing(true);
    console.log(`🔄 Flushing ${queue.length} messages from offline queue...`);

    const messagingService = new MessagingService();
    const results = [];

    for (const message of queue) {
      try {
        console.log(`📤 Sending queued message: ${message.id}`);
        
        // Send message to server
        const { data, error } = await messagingService.sendMessage(
          message.conversation_id,
          message.content,
          message.sender_id
        );

        if (error) {
          console.error(`❌ Failed to send queued message ${message.id}:`, error);
          results.push({ success: false, message, error });
        } else {
          console.log(`✅ Successfully sent queued message ${message.id}`);
          results.push({ success: true, message, data });
          
          // Remove from queue on success
          await removeFromQueue(message.id);
        }
      } catch (error) {
        console.error(`❌ Error sending queued message ${message.id}:`, error);
        results.push({ success: false, message, error });
      }
    }

    // Log results
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    console.log(`📊 Queue flush complete: ${successCount} sent, ${failCount} failed`);

    setIsFlushing(false);
    return results;
  };

  /**
   * Clear entire offline queue
   */
  const clearQueue = async () => {
    try {
      await StorageService.clearOfflineQueue();
      setQueue([]);
      console.log('🧹 Cleared offline queue');
    } catch (error) {
      console.error('Error clearing offline queue:', error);
    }
  };

  /**
   * Retry failed messages in queue
   */
  const retryFailedMessages = async () => {
    console.log('🔄 Retrying failed messages in queue...');
    return await flushQueue();
  };

  return {
    queue,
    isFlushing,
    addToQueue,
    removeFromQueue,
    flushQueue,
    clearQueue,
    retryFailedMessages,
    loadQueue
  };
}
