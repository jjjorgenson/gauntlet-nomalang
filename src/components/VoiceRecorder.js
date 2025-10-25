import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator } from 'react-native-paper';
import { Audio } from 'expo-av';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import Config from '../lib/config';
import VoiceService from '../services/voice';

export default function VoiceRecorder({ 
  conversationId, 
  onRecordingComplete, 
  onRecordingCancel,
  disabled = false,
  userLanguage = 'en' // User's preferred language for transcription
}) {
  const { user } = useAuth();
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  
  const durationInterval = useRef(null);
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const waveAnimation = useRef(new Animated.Value(0)).current;

  // Audio recording configuration as specified
  const recordingOptions = {
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

  // Request permissions and set audio mode
  const requestPermissions = async () => {
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

      return true;
    } catch (error) {
      console.error('Permission error:', error);
      Alert.alert(
        'Permission Required',
        'Microphone access is required to record voice messages. Please enable it in your device settings.',
        [{ text: 'OK' }]
      );
      return false;
    }
  };

  // Start recording
  const startRecording = async () => {
    if (disabled || isRecording || isUploading) return;

    try {
      setError(null);
      
      // Request permissions first
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      // Start recording with specified configuration
      const { recording: newRecording } = await Audio.Recording.createAsync(recordingOptions);
      
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Start duration counter
      durationInterval.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          // Auto-stop at 5 minutes (300 seconds)
          if (newDuration >= 300) {
            stopRecording();
          }
          return newDuration;
        });
      }, 1000);

      // Start visual animations
      startAnimations();

      console.log('🎤 Recording started');
    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording. Please try again.');
    }
  };

  // Stop recording
  const stopRecording = async () => {
    if (!recording || !isRecording) return;

    try {
      setIsRecording(false);
      clearInterval(durationInterval.current);
      stopAnimations();

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      console.log('🎤 Recording stopped, URI:', uri);
      
      // Upload the recording
      await uploadRecording(uri);
      
    } catch (error) {
      console.error('Error stopping recording:', error);
      setError('Failed to stop recording. Please try again.');
    }
  };

  // Cancel recording
  const cancelRecording = () => {
    if (recording) {
      recording.stopAndUnloadAsync();
    }
    
    setRecording(null);
    setIsRecording(false);
    setRecordingDuration(0);
    clearInterval(durationInterval.current);
    stopAnimations();
    setError(null);
    
    if (onRecordingCancel) {
      onRecordingCancel();
    }
    
    console.log('🎤 Recording cancelled');
  };

  // Upload recording to Supabase Storage
  const uploadRecording = async (audioUri) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Generate file path: {userId}/{conversationId}/{timestamp}.m4a
      const timestamp = Date.now();
      const fileName = `${user.id}/${conversationId}/${timestamp}.m4a`;

      console.log('📤 Uploading voice message:', fileName);

      // Create form data for upload
      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/m4a',
        name: fileName,
      });

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('voice-messages')
        .upload(fileName, formData, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      setUploadProgress(100);
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from('voice-messages')
        .getPublicUrl(fileName);

      const voiceUrl = urlData.publicUrl;
      const duration = recordingDuration;

      console.log('✅ Voice message uploaded successfully:', voiceUrl);

      // Start transcription process
      console.log('🎯 Starting transcription...');
      try {
        const transcriptionResult = await VoiceService.transcribeAudio(voiceUrl, userLanguage);
        
        if (transcriptionResult.success) {
          console.log('✅ Transcription completed:', transcriptionResult.transcription);
          
          // Notify parent component with transcription
          if (onRecordingComplete) {
            onRecordingComplete({
              voiceUrl,
              duration,
              fileName,
              timestamp: new Date(timestamp).toISOString(),
              transcription: transcriptionResult.transcription,
              transcriptionConfidence: transcriptionResult.confidence,
              transcriptionLanguage: transcriptionResult.language
            });
          }
        } else {
          console.warn('⚠️ Transcription failed, sending without transcription');
          
          // Notify parent component without transcription
          if (onRecordingComplete) {
            onRecordingComplete({
              voiceUrl,
              duration,
              fileName,
              timestamp: new Date(timestamp).toISOString(),
              transcription: null,
              transcriptionError: 'Transcription failed'
            });
          }
        }
      } catch (transcriptionError) {
        console.error('❌ Transcription error:', transcriptionError);
        
        // Notify parent component with transcription error
        if (onRecordingComplete) {
          onRecordingComplete({
            voiceUrl,
            duration,
            fileName,
            timestamp: new Date(timestamp).toISOString(),
            transcription: null,
            transcriptionError: 'Transcription service unavailable'
          });
        }
      }

      // Reset state
      setRecording(null);
      setRecordingDuration(0);
      setIsUploading(false);
      setUploadProgress(0);

    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload voice message. Please try again.');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Animation functions
  const startAnimations = () => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Wave animation
    Animated.loop(
      Animated.timing(waveAnimation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  };

  const stopAnimations = () => {
    pulseAnimation.stopAnimation();
    waveAnimation.stopAnimation();
    pulseAnimation.setValue(1);
    waveAnimation.setValue(0);
  };

  // Format duration as MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationInterval.current) {
        clearInterval(durationInterval.current);
      }
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, []);

  // Render recording state
  const renderRecordingState = () => {
    if (!isRecording) return null;

    return (
      <Card style={styles.recordingCard}>
        <Card.Content style={styles.recordingContent}>
          <View style={styles.recordingHeader}>
            <Animated.View style={[
              styles.recordingIndicator,
              { transform: [{ scale: pulseAnimation }] }
            ]}>
              <Text style={styles.recordingDot}>●</Text>
            </Animated.View>
            <Text style={styles.recordingText}>Recording...</Text>
            <Text style={styles.durationText}>
              {formatDuration(recordingDuration)}
            </Text>
          </View>
          
          <View style={styles.waveContainer}>
            {[...Array(5)].map((_, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.waveBar,
                  {
                    transform: [{
                      scaleY: waveAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.3, 1],
                      })
                    }],
                    opacity: waveAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }),
                  }
                ]}
              />
            ))}
          </View>

          <View style={styles.recordingControls}>
            <Button
              mode="outlined"
              onPress={cancelRecording}
              style={styles.cancelButton}
              labelStyle={styles.cancelButtonText}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={stopRecording}
              style={styles.stopButton}
              labelStyle={styles.stopButtonText}
            >
              Stop
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  // Render uploading state
  const renderUploadingState = () => {
    if (!isUploading) return null;

    return (
      <Card style={styles.uploadingCard}>
        <Card.Content style={styles.uploadingContent}>
          <ActivityIndicator size="small" color="#8B5CF6" />
          <Text style={styles.uploadingText}>
            Uploading voice message... {uploadProgress}%
          </Text>
        </Card.Content>
      </Card>
    );
  };

  // Render error state
  const renderErrorState = () => {
    if (!error) return null;

    return (
      <Card style={styles.errorCard}>
        <Card.Content style={styles.errorContent}>
          <Text style={styles.errorText}>{error}</Text>
          <Button
            mode="text"
            onPress={() => setError(null)}
            style={styles.dismissButton}
            labelStyle={styles.dismissButtonText}
          >
            Dismiss
          </Button>
        </Card.Content>
      </Card>
    );
  };

  // Render idle state (record button)
  const renderIdleState = () => {
    if (isRecording || isUploading) return null;

    return (
      <TouchableOpacity
        style={[
          styles.recordButton,
          disabled && styles.recordButtonDisabled
        ]}
        onPress={startRecording}
        disabled={disabled}
      >
        <Text style={[
          styles.recordButtonText,
          disabled && styles.recordButtonTextDisabled
        ]}>
          🎤
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {renderIdleState()}
      {renderRecordingState()}
      {renderUploadingState()}
      {renderErrorState()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  recordButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  recordButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  recordButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
  },
  recordButtonTextDisabled: {
    color: '#9CA3AF',
  },
  recordingCard: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
    minWidth: 280,
  },
  recordingContent: {
    padding: 16,
  },
  recordingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordingDot: {
    fontSize: 16,
    color: '#EF4444',
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    flex: 1,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#92400E',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    height: 32,
  },
  waveBar: {
    width: 4,
    height: 24, // Fixed height for scaleY animation
    backgroundColor: '#8B5CF6',
    marginHorizontal: 2,
    borderRadius: 2,
  },
  recordingControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    borderColor: '#EF4444',
    flex: 1,
    marginRight: 8,
  },
  cancelButtonText: {
    color: '#EF4444',
  },
  stopButton: {
    backgroundColor: '#8B5CF6',
    flex: 1,
    marginLeft: 8,
  },
  stopButtonText: {
    color: '#FFFFFF',
  },
  uploadingCard: {
    backgroundColor: '#DBEAFE',
    borderColor: '#3B82F6',
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
    minWidth: 280,
  },
  uploadingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  uploadingText: {
    fontSize: 14,
    color: '#1E40AF',
    marginLeft: 12,
    fontWeight: '500',
  },
  errorCard: {
    backgroundColor: '#FEE2E2',
    borderColor: '#EF4444',
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 8,
    minWidth: 280,
  },
  errorContent: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
    marginBottom: 8,
  },
  dismissButton: {
    paddingHorizontal: 0,
  },
  dismissButtonText: {
    color: '#DC2626',
    fontSize: 12,
  },
});
