import { supabase } from '../lib/supabase';
import { Audio } from 'expo-av';
import Config from '../lib/config';

// Voice service for handling audio operations and Supabase Storage integration
export class VoiceService {
  constructor() {
    this.uploadQueue = [];
    this.retryAttempts = new Map();
    this.maxRetries = 3;
  }

  // Request microphone permissions
  async requestPermissions() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission is required to record voice messages');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      return { success: true };
    } catch (error) {
      console.error('Permission error:', error);
      return { 
        success: false, 
        error: 'Microphone access is required. Please enable it in your device settings.' 
      };
    }
  }

  // Get recording configuration
  getRecordingOptions() {
    return {
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 32000,
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.LOW,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 32000,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 32000,
      },
    };
  }

  // Create recording instance
  async createRecording() {
    try {
      const options = this.getRecordingOptions();
      const { recording } = await Audio.Recording.createAsync(options);
      return { success: true, recording };
    } catch (error) {
      console.error('Error creating recording:', error);
      return { success: false, error: 'Failed to start recording' };
    }
  }

  // Stop recording and get URI
  async stopRecording(recording) {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      return { success: true, uri };
    } catch (error) {
      console.error('Error stopping recording:', error);
      return { success: false, error: 'Failed to stop recording' };
    }
  }

  // Generate file path: {userId}/{conversationId}/{timestamp}.m4a
  generateFilePath(userId, conversationId, timestamp = null) {
    const ts = timestamp || Date.now();
    return `${userId}/${conversationId}/${ts}.m4a`;
  }

  // Upload audio file to Supabase Storage
  async uploadAudioFile(audioUri, userId, conversationId, onProgress = null) {
    try {
      const fileName = this.generateFilePath(userId, conversationId);
      
      console.log('📤 Uploading voice message:', fileName);

      // Create form data for upload
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: fileName,
      });

      // Upload to Supabase Storage with progress tracking
      const { data, error } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, formData, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(fileName);

      const voiceUrl = urlData.publicUrl;

      console.log('✅ Voice message uploaded successfully:', voiceUrl);

      return { 
        success: true, 
        voiceUrl, 
        fileName,
        publicUrl: voiceUrl
      };

    } catch (error) {
      console.error('Upload error:', error);
      return { 
        success: false, 
        error: this.getUploadErrorMessage(error) 
      };
    }
  }

  // Get user-friendly error message for upload failures
  getUploadErrorMessage(error) {
    if (error.message?.includes('413')) {
      return 'File too large. Please record a shorter message.';
    }
    if (error.message?.includes('401')) {
      return 'Authentication failed. Please log in again.';
    }
    if (error.message?.includes('400')) {
      return 'Invalid audio format. Please try recording again.';
    }
    if (error.message?.includes('network') || error.message?.includes('timeout')) {
      return 'Network error. Please check your connection and try again.';
    }
    return 'Upload failed. Please try again.';
  }

  // Upload with automatic retry and exponential backoff
  async uploadWithRetry(audioUri, userId, conversationId, onProgress = null) {
    const maxRetries = this.maxRetries;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        const result = await this.uploadAudioFile(audioUri, userId, conversationId, onProgress);
        
        if (result.success) {
          // Clear retry attempts on success
          this.retryAttempts.delete(`${userId}/${conversationId}`);
          return result;
        }

        // Check if error should trigger immediate user action
        if (this.shouldShowUserOptions(result.error)) {
          return result;
        }

        // Increment attempt and wait with exponential backoff
        attempt++;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`⏳ Retrying upload in ${delay}ms (attempt ${attempt}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

      } catch (error) {
        console.error(`Upload attempt ${attempt + 1} failed:`, error);
        attempt++;
        
        if (attempt >= maxRetries) {
          return { 
            success: false, 
            error: 'Upload failed after multiple attempts. Please try again.' 
          };
        }
      }
    }

    return { 
      success: false, 
      error: 'Upload failed after multiple attempts. Please try again.' 
    };
  }

  // Determine if error should show user options immediately
  shouldShowUserOptions(error) {
    const errorMessage = error?.message || error || '';
    
    // Show user options for these errors
    const userActionErrors = [
      'File too large',
      'Invalid audio format',
      'Authentication failed',
      'Out of storage quota'
    ];

    return userActionErrors.some(userError => 
      errorMessage.toLowerCase().includes(userError.toLowerCase())
    );
  }

  // Queue upload for later (offline support)
  async queueUpload(audioUri, userId, conversationId, metadata = {}) {
    const queueItem = {
      id: `voice_${Date.now()}`,
      audioUri,
      userId,
      conversationId,
      metadata,
      timestamp: new Date().toISOString(),
      retryCount: 0
    };

    this.uploadQueue.push(queueItem);
    
    // Save to local storage for persistence
    await this.saveQueueToStorage();
    
    console.log('📤 Voice message queued for upload');
    return queueItem;
  }

  // Process upload queue (called when network is available)
  async processUploadQueue() {
    if (this.uploadQueue.length === 0) return;

    console.log(`📤 Processing ${this.uploadQueue.length} queued voice messages`);

    const queueCopy = [...this.uploadQueue];
    this.uploadQueue = [];

    for (const item of queueCopy) {
      try {
        const result = await this.uploadWithRetry(
          item.audioUri, 
          item.userId, 
          item.conversationId
        );

        if (result.success) {
          console.log(`✅ Queued voice message uploaded: ${item.id}`);
          // Notify parent component of successful upload
          if (item.onSuccess) {
            item.onSuccess(result);
          }
        } else {
          // Re-queue if upload failed
          item.retryCount++;
          if (item.retryCount < this.maxRetries) {
            this.uploadQueue.push(item);
          } else {
            console.error(`❌ Voice message upload failed permanently: ${item.id}`);
            if (item.onError) {
              item.onError(result.error);
            }
          }
        }
      } catch (error) {
        console.error(`❌ Error processing queued voice message: ${item.id}`, error);
        // Re-queue on error
        this.uploadQueue.push(item);
      }
    }

    // Save updated queue
    await this.saveQueueToStorage();
  }

  // Save queue to local storage
  async saveQueueToStorage() {
    try {
      const { AsyncStorage } = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.setItem('voice_upload_queue', JSON.stringify(this.uploadQueue));
    } catch (error) {
      console.error('Error saving upload queue:', error);
    }
  }

  // Load queue from local storage
  async loadQueueFromStorage() {
    try {
      const { AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const queueData = await AsyncStorage.getItem('voice_upload_queue');
      if (queueData) {
        this.uploadQueue = JSON.parse(queueData);
        console.log(`📤 Loaded ${this.uploadQueue.length} queued voice messages`);
      }
    } catch (error) {
      console.error('Error loading upload queue:', error);
    }
  }

  // Delete audio file from storage
  async deleteAudioFile(fileName) {
    try {
      const { error } = await supabase.storage
        .from('voice-messages')
        .remove([fileName]);

      if (error) {
        console.error('Error deleting audio file:', error);
        return { success: false, error: 'Failed to delete audio file' };
      }

      console.log('🗑️ Audio file deleted:', fileName);
      return { success: true };
    } catch (error) {
      console.error('Error deleting audio file:', error);
      return { success: false, error: 'Failed to delete audio file' };
    }
  }

  // Get audio file info
  async getAudioFileInfo(fileName) {
    try {
      const { data, error } = await supabase.storage
        .from('voice-messages')
        .list(fileName.split('/')[0], {
          search: fileName.split('/').pop()
        });

      if (error) {
        return { success: false, error };
      }

      return { success: true, fileInfo: data[0] };
    } catch (error) {
      console.error('Error getting audio file info:', error);
      return { success: false, error };
    }
  }

  // Clean up old audio files (for storage management)
  async cleanupOldFiles(userId, olderThanDays = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // This would need to be implemented based on your storage cleanup strategy
      console.log(`🧹 Cleaning up audio files older than ${olderThanDays} days for user ${userId}`);
      
      return { success: true };
    } catch (error) {
      console.error('Error cleaning up old files:', error);
      return { success: false, error };
    }
  }

  // Get queue status
  getQueueStatus() {
    return {
      queueLength: this.uploadQueue.length,
      hasQueuedItems: this.uploadQueue.length > 0
    };
  }

  // Clear upload queue
  async clearQueue() {
    this.uploadQueue = [];
    await this.saveQueueToStorage();
    console.log('🧹 Upload queue cleared');
  }

  // Transcribe audio using backend API
  async transcribeAudio(audioUrl, language = 'en') {
    const apiUrl = Config.getEndpoint('transcribe');
    
    if (!apiUrl) {
      throw new Error('Transcription API endpoint not configured');
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioUrl,
          language
        }),
        timeout: Config.getApiConfig().timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Transcription API error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      
      // Validate response format
      if (!result.transcription) {
        throw new Error('Invalid transcription API response format');
      }

      return {
        success: true,
        transcription: result.transcription,
        confidence: result.confidence || 0.95,
        language: result.language || language,
        timestamp: result.timestamp || new Date().toISOString()
      };

    } catch (error) {
      console.error('Transcription API error:', error);
      return {
        success: false,
        error: error.message || 'Transcription failed',
        transcription: null
      };
    }
  }

  // Static methods for external use
  static async requestPermissions() {
    const service = new VoiceService();
    return await service.requestPermissions();
  }

  static async uploadAudioFile(audioUri, userId, conversationId, onProgress = null) {
    const service = new VoiceService();
    return await service.uploadAudioFile(audioUri, userId, conversationId, onProgress);
  }

  static async uploadWithRetry(audioUri, userId, conversationId, onProgress = null) {
    const service = new VoiceService();
    return await service.uploadWithRetry(audioUri, userId, conversationId, onProgress);
  }

  static async transcribeAudio(audioUrl, language = 'en') {
    const service = new VoiceService();
    return await service.transcribeAudio(audioUrl, language);
  }
}

export default VoiceService;
