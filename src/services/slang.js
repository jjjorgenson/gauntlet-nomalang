import Config from '../lib/config';

class SlangService {
  constructor() {
    this.cache = new Map(); // In-memory cache for slang explanations
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
          console.log(`🔄 Slang API retry ${i + 1}/${maxRetries} after ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (error) {
        if (i === maxRetries - 1) throw error;
      }
    }
  }

  /**
   * Explain slang text
   * @param {string} text - Slang text to explain
   * @param {string} targetLanguage - User's language for explanation
   * @returns {Promise<Object>} - Slang explanation
   */
  async explainSlang(text, targetLanguage = 'en') {
    // Check cache
    const cacheKey = `${text}_${targetLanguage}`;
    if (this.cache.has(cacheKey)) {
      console.log('✅ Slang cache hit:', cacheKey);
      return this.cache.get(cacheKey);
    }

    const apiUrl = Config.getEndpoint('slang');
    
    if (!apiUrl) {
      throw new Error('Slang explanation API endpoint not configured');
    }

    try {
      console.log('🔍 Explaining slang:', text, 'in language:', targetLanguage);
      
      const response = await this.fetchWithRetry(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          targetLanguage,
          context: 'casual conversation'
        }),
        timeout: Config.getApiConfig().timeout
      });

      const result = await response.json();
      
      // Validate response format - backend returns {has_slang: boolean, terms: array}
      if (result.has_slang === undefined) {
        throw new Error('Invalid slang API response format');
      }

      // If no slang detected, return appropriate response in target language
      if (!result.has_slang) {
        const noSlangMessages = {
          'en': {
            meaning: 'No slang detected in this text.',
            context: 'The text appears to be in standard language.',
            example: null
          },
          'es': {
            meaning: 'No se detectó jerga en este texto.',
            context: 'El texto parece estar en lenguaje estándar.',
            example: null
          },
          'fr': {
            meaning: 'Aucun argot détecté dans ce texte.',
            context: 'Le texte semble être en langage standard.',
            example: null
          },
          'de': {
            meaning: 'Kein Slang in diesem Text erkannt.',
            context: 'Der Text scheint in Standardsprache zu sein.',
            example: null
          }
        };
        
        return noSlangMessages[targetLanguage] || noSlangMessages['en'];
      }

      // If slang detected, format the response for the UI
      if (!result.terms || result.terms.length === 0) {
        throw new Error('Slang detected but no terms provided');
      }

      // Combine all slang terms into a single explanation
      const slangTerms = result.terms.map(term => term.term).join(', ');
      const explanations = result.terms.map(term => term.explanation).join('; ');
      const contexts = result.terms.map(term => term.context).join('; ');

      const formattedResult = {
        meaning: explanations,
        context: contexts,
        example: slangTerms,
        terms: result.terms // Keep original terms for detailed view
      };

      // Cache the formatted result
      this.cache.set(cacheKey, formattedResult);
      
      console.log('✅ Slang explained:', formattedResult);
      return formattedResult;

    } catch (error) {
      console.error('❌ Slang API error:', error);
      
      // Provide better error messages
      let errorMessage = 'Failed to explain slang. Please try again.';
      
      if (error.message.includes('Client error')) {
        errorMessage = 'Slang service temporarily unavailable.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request took too long. Please try again.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'No internet connection. Please try again.';
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Clear slang cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size
    };
  }
}

// Export singleton instance
export default new SlangService();
