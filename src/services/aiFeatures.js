import Config from '../lib/config';

/**
 * AI Features Service
 * Handles slang detection and formality adjustment using backend APIs
 */
class AIFeaturesService {
  constructor() {
    this.config = Config;
  }

  /**
   * Explain slang terms using backend API
   * @param {string} text - Text containing slang
   * @param {string} context - Context of the conversation
   * @returns {Promise<Object>} - Slang explanation result
   */
  async explainSlang(text, context = 'casual conversation') {
    const apiUrl = this.config.getEndpoint('slang');
    
    if (!apiUrl) {
      throw new Error('Slang API endpoint not configured');
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          context
        }),
        timeout: this.config.getApiConfig().timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Slang API error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        explanation: result.explanation,
        formality: result.formality || 'casual',
        alternatives: result.alternatives || [],
        timestamp: result.timestamp || new Date().toISOString()
      };

    } catch (error) {
      console.error('Slang API error:', error);
      return {
        success: false,
        error: error.message || 'Slang explanation failed',
        explanation: null
      };
    }
  }

  /**
   * Adjust formality level using backend API
   * @param {string} text - Text to adjust
   * @param {string} level - Target formality level (casual, neutral, formal)
   * @param {string} language - Language code
   * @returns {Promise<Object>} - Formality adjustment result
   */
  async adjustFormality(text, level, language = 'en') {
    const apiUrl = this.config.getEndpoint('formality');
    
    if (!apiUrl) {
      throw new Error('Formality API endpoint not configured');
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          level,
          language
        }),
        timeout: this.config.getApiConfig().timeout
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Formality API error: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        adjustedText: result.adjustedText,
        originalLevel: result.originalLevel || 'neutral',
        newLevel: result.newLevel || level,
        timestamp: result.timestamp || new Date().toISOString()
      };

    } catch (error) {
      console.error('Formality API error:', error);
      return {
        success: false,
        error: error.message || 'Formality adjustment failed',
        adjustedText: null
      };
    }
  }

  /**
   * Check if AI features are enabled
   * @returns {boolean} - Whether AI features are enabled
   */
  isEnabled() {
    return this.config.isFeatureEnabled('enableSlang') && 
           this.config.isFeatureEnabled('enableFormality');
  }

  /**
   * Get available formality levels
   * @returns {Array} - Available formality levels
   */
  getFormalityLevels() {
    return ['casual', 'neutral', 'formal'];
  }

  /**
   * Get feature status
   * @returns {Object} - Feature status information
   */
  getStatus() {
    return {
      slangEnabled: this.config.isFeatureEnabled('enableSlang'),
      formalityEnabled: this.config.isFeatureEnabled('enableFormality'),
      backendConfigured: !!this.config.getEndpoint('slang') && !!this.config.getEndpoint('formality')
    };
  }
}

// Export singleton instance
export default new AIFeaturesService();
