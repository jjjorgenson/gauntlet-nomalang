import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text, Card, IconButton, ActivityIndicator, Button } from 'react-native-paper';
import { Audio } from 'expo-av';
import { useAuth } from '../contexts/AuthContext';

export default function VoiceMessage({ 
  message, 
  userLanguage, 
  autoTranslateEnabled, 
  onTranslationComplete 
}) {
  const { user } = useAuth();
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackError, setPlaybackError] = useState(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcription, setTranscription] = useState(null);
  const [translation, setTranslation] = useState(null);
  const [showTranslation, setShowTranslation] = useState(false);
  
  const positionInterval = useRef(null);
  const waveAnimation = useRef(new Animated.Value(0)).current;

  // Extract voice message data
  const voiceUrl = message.voiceUrl;
  const voiceDuration = message.voiceDuration || 0;
  const isOwn = message.isOwn;

  useEffect(() => {
    // Set initial duration from message data
    if (voiceDuration > 0) {
      setDuration(voiceDuration);
    }

    // Check if transcription is available
    if (message.content && message.content.trim()) {
      setTranscription(message.content);
    }

    // Check if this is a new voice message that needs transcription
    if (voiceUrl && !transcription && !isTranscribing) {
      // Trigger real transcription process
      performTranscription();
    }

    return () => {
      // Cleanup on unmount
      if (sound) {
        sound.unloadAsync();
      }
      if (positionInterval.current) {
        clearInterval(positionInterval.current);
      }
    };
  }, [voiceUrl, voiceDuration]);

  // Real transcription process using VoiceService
  const performTranscription = async () => {
    if (!voiceUrl) return;
    
    setIsTranscribing(true);
    
    try {
      console.log('🎯 Starting transcription for voice message:', voiceUrl);
      
      // Import VoiceService dynamically to avoid circular imports
      const VoiceService = (await import('../services/voice')).default;
      
      const result = await VoiceService.transcribeAudio(voiceUrl, userLanguage);
      
      if (result.success) {
        console.log('✅ Transcription completed:', result.transcription);
        setTranscription(result.transcription);
      } else {
        console.warn('⚠️ Transcription failed');
        setTranscription(null);
      }
    } catch (error) {
      console.error('❌ Transcription error:', error);
      setTranscription(null);
    } finally {
      setIsTranscribing(false);
    }
  };

  // Load and play audio
  const loadAndPlayAudio = async () => {
    if (!voiceUrl) {
      setPlaybackError('Audio file not available');
      return;
    }

    try {
      setIsLoading(true);
      setPlaybackError(null);

      // Unload previous sound if exists
      if (sound) {
        await sound.unloadAsync();
      }

      // Create new sound object
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: voiceUrl },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsPlaying(true);
      startWaveAnimation();

    } catch (error) {
      console.error('Error loading audio:', error);
      setPlaybackError('Failed to load audio. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle playback status updates
  const onPlaybackStatusUpdate = (status) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis / 1000); // Convert to seconds
      setDuration(status.durationMillis / 1000);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPosition(0);
        stopWaveAnimation();
      }
    }
  };

  // Toggle play/pause
  const togglePlayback = async () => {
    if (!sound) {
      await loadAndPlayAudio();
      return;
    }

    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
        stopWaveAnimation();
      } else {
        await sound.playAsync();
        setIsPlaying(true);
        startWaveAnimation();
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
      setPlaybackError('Playback error. Please try again.');
    }
  };

  // Seek to position
  const seekTo = async (positionSeconds) => {
    if (!sound) return;

    try {
      await sound.setPositionAsync(positionSeconds * 1000);
      setPosition(positionSeconds);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  // Start wave animation
  const startWaveAnimation = () => {
    Animated.loop(
      Animated.timing(waveAnimation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
  };

  // Stop wave animation
  const stopWaveAnimation = () => {
    waveAnimation.stopAnimation();
    waveAnimation.setValue(0);
  };

  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage
  const progressPercentage = duration > 0 ? (position / duration) * 100 : 0;

  // Handle translation (similar to TranslatedMessage)
  const handleTranslate = async () => {
    if (!transcription) return;
    
    // This would call the translation API
    // For now, simulate translation
    setTranslation({
      translatedText: "Esta es una transcripción simulada del mensaje de voz.",
      targetLanguage: userLanguage,
      sourceLanguage: "en",
      confidence: 0.95,
      isMock: true
    });
    setShowTranslation(true);
  };

  // Render voice message content
  const renderVoiceContent = () => (
    <Card style={[
      styles.voiceCard,
      isOwn ? styles.ownVoiceCard : styles.otherVoiceCard
    ]}>
      <Card.Content style={styles.voiceContent}>
        {/* Voice controls */}
        <View style={styles.voiceControls}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={togglePlayback}
            disabled={isLoading || !!playbackError}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#8B5CF6" />
            ) : (
              <Text style={styles.playButtonText}>
                {isPlaying ? '⏸️' : '▶️'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.voiceInfo}>
            <Text style={[
              styles.voiceLabel,
              isOwn ? styles.ownVoiceLabel : styles.otherVoiceLabel
            ]} numberOfLines={1}>
              🎤 Voice Message
            </Text>
            <Text style={[
              styles.durationLabel,
              isOwn ? styles.ownDurationLabel : styles.otherDurationLabel
            ]} numberOfLines={1}>
              {formatTime(duration)}
            </Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${progressPercentage}%` }
              ]} 
            />
          </View>
          <Text style={[
            styles.timeText,
            isOwn ? styles.ownTimeText : styles.otherTimeText
          ]}>
            {formatTime(position)} / {formatTime(duration)}
          </Text>
        </View>

        {/* Wave visualization - Hidden for now, can be toggled in settings later */}
        {/* <View style={styles.waveContainer}>
          {[...Array(8)].map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.waveBar,
                {
                  transform: [{
                    scaleY: isPlaying ? waveAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.3, 1],
                    }) : 0.3
                  }],
                  opacity: isPlaying ? waveAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }) : 0.3,
                }
              ]}
            />
          ))}
        </View> */}

        {/* Error state */}
        {playbackError && (
          <Text style={styles.errorText}>{playbackError}</Text>
        )}
      </Card.Content>
    </Card>
  );

  // Render transcription
  const renderTranscription = () => {
    if (!transcription && !isTranscribing) return null;

    return (
      <View style={styles.transcriptionContainer}>
        <Card style={styles.transcriptionCard}>
          <Card.Content>
            {isTranscribing ? (
              <View style={styles.transcribingContainer}>
                <ActivityIndicator size="small" color="#8B5CF6" />
                <Text style={styles.transcribingText}>Transcribing...</Text>
              </View>
            ) : (
              <View>
                <Text style={styles.transcriptionText}>{transcription}</Text>
                {!isOwn && (
                  <Button
                    mode="text"
                    onPress={handleTranslate}
                    style={styles.translateButton}
                    labelStyle={styles.translateButtonText}
                  >
                    Translate
                  </Button>
                )}
              </View>
            )}
          </Card.Content>
        </Card>
      </View>
    );
  };

  // Render translation
  const renderTranslation = () => {
    if (!translation || !showTranslation) return null;

    return (
      <View style={styles.translationContainer}>
        <Card style={styles.translationCard}>
          <Card.Content>
            <View style={styles.translationHeader}>
              <Text style={styles.translationLabel}>
                🔄 Translation
              </Text>
              {translation.isMock && (
                <Text style={styles.mockIndicator}>MOCK</Text>
              )}
            </View>
            <Text style={styles.translatedText}>
              {translation.translatedText}
            </Text>
            <View style={styles.translationControls}>
              <Button
                mode="text"
                onPress={() => setShowTranslation(!showTranslation)}
                style={styles.toggleButton}
                labelStyle={styles.toggleButtonText}
              >
                {showTranslation ? 'Hide Translation' : 'Show Translation'}
              </Button>
            </View>
          </Card.Content>
        </Card>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderVoiceContent()}
      {renderTranscription()}
      {renderTranslation()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  voiceCard: {
    borderRadius: 12,
    marginBottom: 8,
  },
  ownVoiceCard: {
    backgroundColor: '#8B5CF6',
  },
  otherVoiceCard: {
    backgroundColor: '#F3F4F6',
  },
  voiceContent: {
    padding: 8,
  },
  voiceControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    minWidth: 200,
  },
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  playButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  voiceInfo: {
    flex: 1,
    flexShrink: 1,
    minWidth: 100,
  },
  voiceLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
    flexWrap: 'nowrap',
  },
  ownVoiceLabel: {
    color: '#FFFFFF',
  },
  otherVoiceLabel: {
    color: '#1F2937',
  },
  durationLabel: {
    fontSize: 12,
    opacity: 0.8,
    flexWrap: 'nowrap',
  },
  ownDurationLabel: {
    color: '#FFFFFF',
  },
  otherDurationLabel: {
    color: '#6B7280',
  },
  progressContainer: {
    marginBottom: 6,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  timeText: {
    fontSize: 12,
    textAlign: 'right',
  },
  ownTimeText: {
    color: '#FFFFFF',
    opacity: 0.8,
  },
  otherTimeText: {
    color: '#6B7280',
  },
  waveContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 16,
  },
  waveBar: {
    width: 2,
    height: 12, // Reduced height for thinner appearance
    backgroundColor: '#FFFFFF',
    marginHorizontal: 1,
    borderRadius: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    textAlign: 'center',
    marginTop: 8,
  },
  transcriptionContainer: {
    marginLeft: 16,
    marginTop: 4,
  },
  transcriptionCard: {
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
    borderRadius: 8,
  },
  transcribingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  transcribingText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  transcriptionText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  translateButton: {
    paddingHorizontal: 0,
    marginTop: 8,
  },
  translateButtonText: {
    color: '#8B5CF6',
    fontSize: 12,
  },
  translationContainer: {
    marginLeft: 16,
    marginTop: 4,
  },
  translationCard: {
    backgroundColor: '#F9FAFB',
    borderLeftWidth: 3,
    borderLeftColor: '#8B5CF6',
    borderRadius: 8,
  },
  translationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  translationLabel: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  mockIndicator: {
    fontSize: 10,
    color: '#F59E0B',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 2,
  },
  translatedText: {
    fontSize: 13,
    color: '#374151',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  translationControls: {
    marginTop: 8,
  },
  toggleButton: {
    paddingHorizontal: 0,
  },
  toggleButtonText: {
    color: '#8B5CF6',
    fontSize: 12,
  },
});
