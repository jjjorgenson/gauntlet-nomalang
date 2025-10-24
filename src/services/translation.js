import LanguageService from './language';

class TranslationService {
  constructor() {
    this.mockMode = process.env.MOCK_TRANSLATION === 'true' || process.env.EXPO_PUBLIC_MOCK_TRANSLATION === 'true';
    this.cache = new Map(); // In-memory cache for translations
  }

  /**
   * Detect the language of the given text using LanguageService
   * @param {string} text - Text to analyze
   * @returns {string} - Language code (e.g., 'en', 'es', 'fr')
   */
  detectLanguage(text) {
    try {
      const detection = LanguageService.detectLanguage(text);
      return detection; // Return the full detection object
    } catch (error) {
      console.error('Error detecting language:', error);
      return {
        language: 'en',
        confidence: 0,
        isReliable: false
      };
    }
  }

  /**
   * Determine if a message should be translated
   * @param {string} messageLanguage - Detected language of the message
   * @param {string} userLanguage - User's preferred language
   * @param {boolean} autoTranslateEnabled - Whether auto-translate is enabled
   * @returns {boolean} - Whether translation is needed
   */
  shouldTranslate(messageLanguage, userLanguage, autoTranslateEnabled) {
    // Handle both string and object formats for backward compatibility
    const language = typeof messageLanguage === 'string' ? messageLanguage : messageLanguage.language;
    
    // Don't translate if languages match
    if (language === userLanguage) {
      return false;
    }
    
    // Only translate if auto-translate is enabled
    return autoTranslateEnabled;
  }

  /**
   * Translate text from source language to target language
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language code (e.g., 'en', 'es')
   * @param {string} sourceLanguage - Source language code (e.g., 'en', 'es')
   * @returns {Promise<Object>} - Translation result with text, confidence, etc.
   */
  async translateText(text, targetLanguage, sourceLanguage) {
    // Check cache first
    const cacheKey = `${text}_${sourceLanguage}_${targetLanguage}`;
    if (this.cache.has(cacheKey)) {
      console.log('Translation cache hit:', cacheKey);
      return this.cache.get(cacheKey);
    }

    let result;

    if (this.mockMode) {
      result = this.getMockTranslation(text, targetLanguage, sourceLanguage);
    } else {
      result = await this.callRealTranslationAPI(text, targetLanguage, sourceLanguage);
    }

    // Cache the result
    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Get mock translation for development/testing
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language
   * @param {string} sourceLanguage - Source language
   * @returns {Object} - Mock translation result
   */
  getMockTranslation(text, targetLanguage, sourceLanguage) {
    const mockTranslations = {
      'en': `[MOCK EN] ${text}`,
      'es': `[MOCK ES] ${text}`,
      'fr': `[MOCK FR] ${text}`,
      'de': `[MOCK DE] ${text}`,
      'it': `[MOCK IT] ${text}`,
      'pt': `[MOCK PT] ${text}`,
      'ru': `[MOCK RU] ${text}`,
      'ja': `[MOCK JA] ${text}`,
      'ko': `[MOCK KO] ${text}`,
      'zh': `[MOCK ZH] ${text}`,
      'ar': `[MOCK AR] ${text}`,
      'hi': `[MOCK HI] ${text}`
    };

    return {
      translatedText: mockTranslations[targetLanguage] || `[MOCK ${targetLanguage.toUpperCase()}] ${text}`,
      sourceLanguage,
      targetLanguage,
      confidence: 0.95,
      isMock: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Call real translation API (to be implemented in Phase 3)
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language
   * @param {string} sourceLanguage - Source language
   * @returns {Promise<Object>} - Real translation result
   */
  async callRealTranslationAPI(text, targetLanguage, sourceLanguage) {
    // TODO: Implement in Phase 3
    throw new Error('Real translation API not implemented yet. Use mock mode for development.');
  }

  /**
   * Get language name from code
   * @param {string} code - Language code (e.g., 'en', 'es')
   * @returns {string} - Language name (e.g., 'English', 'Spanish')
   */
  getLanguageName(code) {
    return LanguageService.getLanguageName(code);
  }

  /**
   * Clear translation cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} - Cache stats
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      mockMode: this.mockMode
    };
  }
}

// Export singleton instance
export default new TranslationService();
