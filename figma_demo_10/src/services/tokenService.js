/**
 * Token Service
 * Handles authentication token management and caching
 */

import { API_ENDPOINTS, API_HEADERS } from '../config/api';
import { STORAGE_KEYS, TIMING } from '../config/constants';

class TokenService {
  constructor() {
    this.tokenMap = {};
  }

  /**
   * Get access token for a domain ID
   * @param {string} domainId - Domain ID to get token for
   * @param {boolean} forceReal - Force real API call, skip cache
   * @returns {Promise<string>} Access token
   */
  async getToken(domainId, forceReal = false) {
    const expiryKey = STORAGE_KEYS.ACCESS_EXPIRY(domainId);
    const tokenKey = STORAGE_KEYS.ACCESS_TOKEN(domainId);
    const expiry = localStorage.getItem(expiryKey);

    // If forcing real API, skip cache check
    if (!forceReal && this.tokenMap[domainId] && expiry && Date.now() < Number(expiry)) {
      return this.tokenMap[domainId];
    }

    try {
      console.log('🔑 Fetching token for domain:', domainId, forceReal ? '(forcing real API)' : '');
      
      const response = await fetch(API_ENDPOINTS.TOKEN, {
        method: 'POST',
        headers: API_HEADERS.TOKEN_AUTH,
        body: JSON.stringify({ domainid: domainId })
      });

      console.log('🔑 Token response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Token fetch error:', response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const json = await response.json();
      const newToken = json.access_token;
      
      console.log('✅ Token received successfully');

      // Cache token
      const expiryTime = Date.now() + TIMING.TOKEN_EXPIRY;
      localStorage.setItem(tokenKey, newToken);
      localStorage.setItem(expiryKey, expiryTime.toString());
      this.tokenMap[domainId] = newToken;

      return newToken;
      
    } catch (error) {
      console.error('🚫 Token API failed:', error.message);
      throw error;
    }
  }

  /**
   * Clear cached token for domain ID
   * @param {string} domainId - Domain ID to clear token for
   */
  clearToken(domainId) {
    const expiryKey = STORAGE_KEYS.ACCESS_EXPIRY(domainId);
    const tokenKey = STORAGE_KEYS.ACCESS_TOKEN(domainId);
    
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(expiryKey);
    delete this.tokenMap[domainId];
  }

  /**
   * Clear all cached tokens
   */
  clearAllTokens() {
    this.tokenMap = {};
    // Clear from localStorage
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('access_token_') || key.startsWith('access_expiry_')) {
        localStorage.removeItem(key);
      }
    });
  }
}

// Export singleton instance
export const tokenService = new TokenService();

export default tokenService;
