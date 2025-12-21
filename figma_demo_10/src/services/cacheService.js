/**
 * Cache Management Service
 * Provides utilities for clearing backend Redis cache
 */

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000';

class CacheService {
  /**
   * Clear Redis cache for a specific domain user
   * @param {string} domainId - Domain ID to clear cache for
   * @returns {Promise<Object>} Response with cache clear results
   */
  async clearUserCache(domainId) {
    try {
      console.log(`🗑️ Clearing cache for domain: ${domainId}`);
      
      const response = await fetch(`${API_BASE_URL}/api/cache/clear/${domainId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to clear cache: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Cache cleared successfully:', result);
      
      return result;
    } catch (error) {
      console.error('❌ Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Clear cache for the current logged-in user
   * Retrieves domain ID from localStorage
   * @returns {Promise<Object>} Response with cache clear results
   */
  async clearCurrentUserCache() {
    try {
      // Get domain ID from Okta user info
      const oktaUser = JSON.parse(localStorage.getItem('userInfo') || '{}');
      const domainId = oktaUser.domainId || oktaUser.domain_id;
      
      if (!domainId) {
        throw new Error('No domain ID found in user info');
      }

      return await this.clearUserCache(domainId);
    } catch (error) {
      console.error('❌ Failed to clear current user cache:', error);
      throw error;
    }
  }
}

// Export singleton instance
const cacheService = new CacheService();
export default cacheService;
