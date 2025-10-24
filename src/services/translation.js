import LanguageService from './language';
import Config from '../lib/config';

class TranslationService {
  constructor() {
    this.mockMode = Config.isMockMode();
    this.cache = new Map(); // In-memory cache for translations
    this.config = Config;
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
    // Convert to 2-char codes for API
    const targetLang = LanguageService.toISO6391(targetLanguage);
    const sourceLang = LanguageService.toISO6391(sourceLanguage);
    
    // Check cache with converted codes
    const cacheKey = `${text}_${sourceLang}_${targetLang}`;
    if (this.cache.has(cacheKey)) {
      console.log('Translation cache hit:', cacheKey);
      return this.cache.get(cacheKey);
    }

    let result;

    if (this.mockMode) {
      result = this.getMockTranslation(text, targetLang, sourceLang);
    } else {
      result = await this.callRealTranslationAPI(text, targetLang, sourceLang);
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
   * Call real translation API
   * @param {string} text - Text to translate
   * @param {string} targetLanguage - Target language
   * @param {string} sourceLanguage - Source language
   * @returns {Promise<Object>} - Real translation result
   */
  async callRealTranslationAPI(text, targetLanguage, sourceLanguage) {
    const apiUrl = this.config.getEndpoint('translate');
    
    if (!apiUrl) {
      throw new Error('Translation API endpoint not configured');
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          targetLanguage,
          sourceLanguage
        }),
        timeout: this.config.getApiConfig().timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Translation API error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      
      // Validate response format
      if (!result.translatedText) {
        throw new Error('Invalid translation API response format');
      }

      return {
        translatedText: result.translatedText,
        sourceLanguage: result.sourceLanguage || sourceLanguage,
        targetLanguage: result.targetLanguage || targetLanguage,
        confidence: result.confidence || 0.95,
        isMock: false,
        timestamp: result.timestamp || new Date().toISOString()
      };

    } catch (error) {
      console.error('Translation API error:', error);
      
      // Fallback to mock translation if API fails
      console.warn('Falling back to mock translation due to API error');
      return this.getMockTranslation(text, targetLanguage, sourceLanguage);
    }
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
