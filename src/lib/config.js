/**
 * Application Configuration
 * Centralized configuration for API endpoints and environment settings
 */

class Config {
  constructor() {
    // Backend API Configuration
    this.backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';
    
    // API Endpoints
    this.endpoints = {
      translate: `${this.backendUrl}/api/translate`,
      transcribe: `${this.backendUrl}/api/transcribe-voice`,
      slang: `${this.backendUrl}/api/explain-slang`,
      formality: `${this.backendUrl}/api/adjust-formality`
    };
    
    // Feature Flags
    this.features = {
      mockTranslation: process.env.EXPO_PUBLIC_MOCK_TRANSLATION === 'true' || 
                      process.env.MOCK_TRANSLATION === 'true',
      enableVoice: true,
      enableSlang: true,
      enableFormality: true
    };
    
    // API Configuration
    this.api = {
      timeout: 30000, // 30 seconds
      retryAttempts: 3,
      retryDelay: 1000 // 1 second
    };
  }
  
  /**
   * Get API endpoint URL
   * @param {string} endpoint - Endpoint name (translate, transcribe, slang, formality)
   * @returns {string} - Full API URL
   */
  getEndpoint(endpoint) {
    return this.endpoints[endpoint] || null;
  }
  
  /**
   * Check if feature is enabled
   * @param {string} feature - Feature name
   * @returns {boolean} - Whether feature is enabled
   */
  isFeatureEnabled(feature) {
    return this.features[feature] || false;
  }
  
  /**
   * Get API configuration
   * @returns {Object} - API configuration object
   */
  getApiConfig() {
    return this.api;
  }
  
  /**
   * Check if running in mock mode
   * @returns {boolean} - Whether mock mode is enabled
   */
  isMockMode() {
    return this.features.mockTranslation;
  }
  
  /**
   * Get backend URL
   * @returns {string} - Backend base URL
   */
  getBackendUrl() {
    return this.backendUrl;
  }
}

// Export singleton instance
export default new Config();
