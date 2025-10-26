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

    const apiUrl = Config.getEndpoint('explain-slang');
    
    if (!apiUrl) {
      throw new Error('Slang explanation API endpoint not configured');
    }

    try {
      console.log('🔍 Explaining slang:', text);
      
      const response = await this.fetchWithRetry(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          targetLanguage
        }),
        timeout: Config.getApiConfig().timeout
      });

      const result = await response.json();
      
      // Validate response format
      if (!result.meaning) {
        throw new Error('Invalid slang API response format');
      }

      // Cache the result
      this.cache.set(cacheKey, result);
      
      console.log('✅ Slang explained:', result);
      return result;

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
