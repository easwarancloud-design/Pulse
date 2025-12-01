/**
 * API Compatibility Service
 * Handles differences between local and remote backend APIs
 * Provides fallback mechanisms for API compatibility issues
 */

import { API_ENDPOINTS } from '../config/api';

class APICompatibilityService {
  constructor() {
    this.isRemoteAPI = true; // Assuming remote by default
    this.checkedCompatibility = false;
    this.supportedFeatures = {
      messagePagination: false,
      conversationOrdering: false,
      bulkMessages: false,
      searchConversations: false,
      userSessions: false
    };
  }

  /**
   * Check API compatibility by testing health endpoint
   */
  async checkAPICompatibility() {
    if (this.checkedCompatibility) {
      return this.supportedFeatures;
    }

    try {
      console.log('🔧 Checking API compatibility...');
      
      // Test basic health endpoint
      const healthResponse = await fetch(API_ENDPOINTS.CONVERSATION_HEALTH, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });

      if (healthResponse.ok) {
        console.log('✅ API health check passed');
        
        // Test if it's the full conversation API or basic API
        await this.testFeatureSupport();
        
      } else {
        console.warn('⚠️ API health check failed, using compatibility mode');
        this.enableCompatibilityMode();
      }

    } catch (error) {
      console.warn('⚠️ API compatibility check failed:', error.message);
      this.enableCompatibilityMode();
    }

    this.checkedCompatibility = true;
    return this.supportedFeatures;
  }

  /**
   * Test individual feature support
   */
  async testFeatureSupport() {
    try {
      // Test user conversations endpoint only if we have a domainId in localStorage
      let testUserId = null;
      try {
        const info = JSON.parse(localStorage.getItem('userInfo') || '{}');
        testUserId = info.domainId || info.domain_id || null;
      } catch {}
      if (testUserId) {
        const userConvResponse = await fetch(
          `${API_ENDPOINTS.USER_CONVERSATIONS(testUserId)}?limit=1`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        );

        if (userConvResponse.ok) {
          this.supportedFeatures.searchConversations = true;
          console.log('✅ User conversations endpoint supported');
        }
      } else {
        console.log('ℹ️ Skipping user conversations test: no domainId available yet');
      }

      // Test conversation search endpoint
      if (testUserId) {
        const searchResponse = await fetch(
          `${API_ENDPOINTS.CONVERSATION_SEARCH}?user_id=${testUserId}&query=test&limit=1`,
          { method: 'GET', headers: { 'Content-Type': 'application/json' } }
        );

        if (searchResponse.ok) {
          this.supportedFeatures.searchConversations = true;
          console.log('✅ Conversation search endpoint supported');
        }
      }

    } catch (error) {
      console.warn('⚠️ Feature support test failed:', error.message);
    }
  }

  /**
   * Enable compatibility mode (fallback to basic functionality)
   */
  enableCompatibilityMode() {
    this.supportedFeatures = {
      messagePagination: false,
      conversationOrdering: false,
      bulkMessages: false,
      searchConversations: false,
      userSessions: false
    };
    console.log('🔧 Enabled API compatibility mode');
  }

  /**
   * Check if specific feature is supported
   */
  isFeatureSupported(feature) {
    return this.supportedFeatures[feature] || false;
  }

  /**
   * Get compatible API URL with fallback parameters
   */
  getCompatibleURL(endpoint, params = {}) {
    const url = new URL(endpoint);
    
    // Only add supported parameters
    Object.entries(params).forEach(([key, value]) => {
      if (this.isParameterSupported(key)) {
        url.searchParams.set(key, value.toString());
      }
    });

    return url.toString();
  }

  /**
   * Check if parameter is supported by the API
   */
  isParameterSupported(parameter) {
    const supportedParams = {
      'user_id': true,
      'include_messages': true,
      'limit': this.supportedFeatures.searchConversations,
      'offset': this.supportedFeatures.searchConversations,
      'order_by': this.supportedFeatures.conversationOrdering,
      'order_direction': this.supportedFeatures.conversationOrdering,
      'message_offset': this.supportedFeatures.messagePagination,
      'message_limit': this.supportedFeatures.messagePagination,
      'query': this.supportedFeatures.searchConversations
    };

    return supportedParams[parameter] || false;
  }

  /**
   * Get error-safe API call wrapper
   */
  async safeAPICall(apiCall, fallbackValue = null, retries = 2) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const result = await apiCall();
        return result;
      } catch (error) {
        console.warn(`⚠️ API call attempt ${attempt} failed:`, error.message);
        
        if (attempt === retries) {
          console.warn('⚠️ All API attempts failed, returning fallback value');
          return fallbackValue;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  /**
   * Format API response to handle different response structures
   */
  normalizeAPIResponse(response, expectedFormat = 'array') {
    if (!response) {
      return expectedFormat === 'array' ? [] : null;
    }

    // Handle different response wrapping formats
    if (response.data) {
      return this.normalizeAPIResponse(response.data, expectedFormat);
    }
    
    if (response.conversations) {
      return this.normalizeAPIResponse(response.conversations, expectedFormat);
    }

    if (response.results) {
      return this.normalizeAPIResponse(response.results, expectedFormat);
    }

    // If it's already in expected format, return as-is
    if (expectedFormat === 'array' && Array.isArray(response)) {
      return response;
    }

    if (expectedFormat === 'object' && typeof response === 'object') {
      return response;
    }

    // Fallback
    console.warn('⚠️ Unexpected API response format:', response);
    return expectedFormat === 'array' ? [] : null;
  }
}

// Create singleton instance
export const apiCompatibilityService = new APICompatibilityService();
export default apiCompatibilityService;