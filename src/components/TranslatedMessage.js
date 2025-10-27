import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Text, Card, Button, ActivityIndicator, IconButton } from 'react-native-paper';
import TranslationService from '../services/translation';
import LanguageService from '../services/language';
import SlangService from '../services/slang';
import DatabaseService from '../services/database';
import SlangExplanationModal from './SlangExplanationModal';

function TranslatedMessage({ 
  message, 
  userLanguage, 
  autoTranslateEnabled, 
  onTranslationComplete 
}) {
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslation, setShowTranslation] = useState(false);
  const [translationError, setTranslationError] = useState(null);
  const [translation, setTranslation] = useState(null);
  
  // Slang detection state
  const [showSlangModal, setShowSlangModal] = useState(false);
  const [slangExplanation, setSlangExplanation] = useState(null);
  const [isExplainingSlang, setIsExplainingSlang] = useState(false);
  const [slangError, setSlangError] = useState(null);

  // Animation state
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // State for language detection
  const [messageLanguage, setMessageLanguage] = useState(null);
  const [needsTranslation, setNeedsTranslation] = useState(false);
  const [languageConfidence, setLanguageConfidence] = useState(0);

  // Detect message language once on mount
  useEffect(() => {
    const detectLanguage = () => {
      const languageDetection = TranslationService.detectLanguage(message.content);
      const detectedLanguage = LanguageService.toISO6391(languageDetection.language);
      const translationNeeded = TranslationService.needsTranslation(detectedLanguage, userLanguage);
      
      setMessageLanguage(detectedLanguage);
      setNeedsTranslation(translationNeeded);
      setLanguageConfidence(languageDetection.confidence);
      
      console.log('🔍 TranslatedMessage initialized:', {
        messageLanguage: detectedLanguage,
        userLanguage,
        needsTranslation: translationNeeded,
        messageId: message.id
      });
    };
    
    detectLanguage();
  }, [message.content, userLanguage, message.id]);

  // Check database for existing translation
  useEffect(() => {
    const checkExistingTranslation = async () => {
      if (needsTranslation && !translation && message.id) {
        try {
          // Check database first
          const { data } = await DatabaseService.getTranslation(
            message.id, 
            userLanguage
          );
          
          if (data?.translated_content) {
            console.log('✅ Found existing translation in database');
            setTranslation({
              translatedText: data.translated_content,
              isMock: false,
              fromCache: true
            });
          } else if (autoTranslateEnabled) {
            // Only call API if not in database
            console.log('🔄 No existing translation, calling API');
            handleTranslate();
          }
        } catch (error) {
          console.error('Error checking existing translation:', error);
          if (autoTranslateEnabled) {
            handleTranslate();
          }
        }
      }
    };
    
    checkExistingTranslation();
  }, [message.id, needsTranslation, autoTranslateEnabled, userLanguage]);

  // Animate translation when it appears
  useEffect(() => {
    if (translation) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [translation, fadeAnim]);

  const handleTranslate = async () => {
    if (isTranslating) return;
    
    setIsTranslating(true);
    setTranslationError(null);
    
    try {
      const result = await TranslationService.translateText(
        message.content,
        userLanguage,
        messageLanguage
      );
      
      setTranslation(result);
      setShowTranslation(true);
      
      // Save to database for future use
      if (message.id && result.translatedText) {
        try {
          await DatabaseService.saveTranslation(
            message.id,
            userLanguage,
            result.translatedText
          );
          console.log('✅ Translation saved to database');
        } catch (dbError) {
          console.error('Error saving translation to database:', dbError);
          // Don't fail the translation if database save fails
        }
      }
      
      // Notify parent component
      if (onTranslationComplete) {
        onTranslationComplete(result);
      }
    } catch (error) {
      console.error('Translation error:', error);
      setTranslationError('Translation failed. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const toggleTranslation = () => {
    setShowTranslation(!showTranslation);
  };

  const handleExplainSlang = async () => {
    if (isExplainingSlang) return;
    
    setIsExplainingSlang(true);
    setSlangError(null);
    setShowSlangModal(true);
    
    try {
      const explanation = await SlangService.explainSlang(message.content, userLanguage);
      setSlangExplanation(explanation);
    } catch (error) {
      console.error('Slang explanation error:', error);
      setSlangError('Failed to explain slang. Please try again.');
    } finally {
      setIsExplainingSlang(false);
    }
  };

  const dismissSlangModal = () => {
    setShowSlangModal(false);
    setSlangExplanation(null);
    setSlangError(null);
  };

  const renderOriginalMessage = () => (
    <Card style={styles.originalMessage}>
      <Card.Content>
        <Text style={styles.messageText}>{message.content}</Text>
        <View style={styles.messageFooter}>
          <View style={styles.languageInfo}>
            <Text style={styles.languageBadge}>
              {TranslationService.getLanguageName(messageLanguage)}
            </Text>
            {languageConfidence > 0 && (
              <Text style={styles.confidenceBadge}>
                {Math.round(languageConfidence * 100)}%
              </Text>
            )}
            <IconButton
              icon="help-circle-outline"
              size={16}
              iconColor="#8B5CF6"
              onPress={handleExplainSlang}
              style={styles.slangButton}
            />
          </View>
          <Text style={styles.timestamp}>
            {new Date(message.timestamp).toLocaleTimeString()}
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  const renderTranslationBubble = () => {
    if (!translation) return null;

    return (
      <Animated.View style={[styles.translationContainer, { opacity: fadeAnim }]}>
        <Card style={styles.translationBubble}>
          <Card.Content>
            <View style={styles.translationHeader}>
              <Text style={styles.translationLabel}>
                🔄 {TranslationService.getLanguageName(translation.targetLanguage)}
              </Text>
              {translation.isMock && (
                <Text style={styles.mockIndicator}>MOCK</Text>
              )}
            </View>
            <Text style={styles.translatedText}>
              {translation.translatedText}
            </Text>
            {translation.confidence && (
              <Text style={styles.confidence}>
                Confidence: {Math.round(translation.confidence * 100)}%
              </Text>
            )}
          </Card.Content>
        </Card>
      </Animated.View>
    );
  };

  const renderTranslateButton = () => {
    if (autoTranslateEnabled || translation) return null;
    
    return (
      <View style={styles.translateButtonContainer}>
        <Button
          mode="outlined"
          onPress={handleTranslate}
          loading={isTranslating}
          disabled={isTranslating}
          style={styles.translateButton}
          labelStyle={styles.translateButtonText}
        >
          {isTranslating ? 'Translating...' : 'Translate'}
        </Button>
      </View>
    );
  };

  const renderLoadingState = () => {
    if (!isTranslating) return null;
    
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#8B5CF6" />
        <Text style={styles.loadingText}>Translating...</Text>
      </View>
    );
  };

  const renderError = () => {
    if (!translationError) return null;
    
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{translationError}</Text>
        <Button
          mode="text"
          onPress={handleTranslate}
          style={styles.retryButton}
        >
          Retry
        </Button>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderOriginalMessage()}
      
      {renderLoadingState()}
      {renderError()}
      
      {translation && showTranslation && renderTranslationBubble()}
      
      {needsTranslation && !autoTranslateEnabled && !translation && renderTranslateButton()}
      
      {translation && (
        <View style={styles.toggleContainer}>
          <Button
            mode="text"
            onPress={toggleTranslation}
            style={styles.toggleButton}
            labelStyle={styles.toggleButtonText}
          >
            {showTranslation ? 'Hide Translation' : 'Show Translation'}
          </Button>
        </View>
      )}
      
      <SlangExplanationModal
        visible={showSlangModal}
        onDismiss={dismissSlangModal}
        slangText={message.content}
        explanation={slangExplanation}
        isLoading={isExplainingSlang}
        error={slangError}
        language={userLanguage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  originalMessage: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    marginBottom: 8,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#1F2937',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  languageBadge: {
    fontSize: 12,
    color: '#6B7280',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  confidenceBadge: {
    fontSize: 10,
    color: '#8B5CF6',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    fontWeight: '600',
  },
  timestamp: {
    fontSize: 12,
    color: '#6B7280',
  },
  translationContainer: {
    marginLeft: 16,
    marginTop: 4,
  },
  translationBubble: {
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
    fontSize: 15,
    lineHeight: 20,
    color: '#374151',
    fontStyle: 'italic',
  },
  confidence: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 4,
  },
  translateButtonContainer: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  translateButton: {
    borderColor: '#8B5CF6',
  },
  translateButtonText: {
    color: '#8B5CF6',
    fontSize: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginLeft: 16,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#6B7280',
  },
  errorContainer: {
    marginTop: 8,
    marginLeft: 16,
    alignItems: 'flex-start',
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginBottom: 4,
  },
  retryButton: {
    paddingHorizontal: 0,
  },
  toggleContainer: {
    marginTop: 4,
    alignItems: 'flex-start',
  },
  toggleButton: {
    paddingHorizontal: 0,
  },
  toggleButtonText: {
    color: '#8B5CF6',
    fontSize: 12,
  },
  slangButton: {
    margin: 0,
    padding: 0,
    marginLeft: 4,
  },
});

// Memoize component to prevent unnecessary re-renders
export default React.memo(TranslatedMessage, (prevProps, nextProps) => {
  // Only re-render if essential props change
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.userLanguage === nextProps.userLanguage &&
    prevProps.autoTranslateEnabled === nextProps.autoTranslateEnabled &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.isOwn === nextProps.message.isOwn
  );
});
