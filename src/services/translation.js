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
   * Determine if a message needs translation based on language difference
   * @param {string} messageLanguage - Detected language of the message
   * @param {string} userLanguage - User's preferred language
   * @returns {boolean} - Whether translation is needed (languages differ)
   */
  needsTranslation(messageLanguage, userLanguage) {
    // Handle both string and object formats for backward compatibility
    const language = typeof messageLanguage === 'string' ? messageLanguage : messageLanguage.language;
    
    // Normalize both language codes to ISO 639-1 (2-char) for consistent comparison
    const normalizedMessageLanguage = LanguageService.toISO6391(language);
    const normalizedUserLanguage = LanguageService.toISO6391(userLanguage);
    
    console.log('🔍 needsTranslation comparison:', {
      originalMessageLanguage: language,
      originalUserLanguage: userLanguage,
      normalizedMessageLanguage,
      normalizedUserLanguage
    });
    
    // Return true if languages differ (translation needed)
    const needsTranslation = normalizedMessageLanguage !== normalizedUserLanguage;
    console.log('✅ Translation needed:', needsTranslation ? 'YES (languages differ)' : 'NO (same language)');
    return needsTranslation;
  }

  /**
   * Fetch with retry logic and exponential backoff
   * @param {string} url - URL to fetch
   * @param {Object} options - Fetch options
   * @param {number} maxRetries - Maximum number of retries
   * @returns {Promise<Response>} - Fetch response
   */
  async fetchWithRetry(url, options, maxRetries = 3) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok) return response;
        
        // Don't retry on 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`Client error: ${response.status}`);
        }
        
        // Retry on 5xx errors (server errors)
        if (i < maxRetries - 1) {
          const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
          console.log(`🔄 Retry ${i + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        if (i === maxRetries - 1) throw error;
      }
    }
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
      const response = await this.fetchWithRetry(apiUrl, {
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
      
      // Provide better error messages
      let errorMessage = 'Translation failed. Please try again.';
      
      if (error.message.includes('Client error')) {
        errorMessage = 'Translation service temporarily unavailable.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request took too long. Please try again.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'No internet connection. Please try again.';
      }
      
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
