/**
 * Conversation Loader Service
 * Manages intelligent loading of conversations with cache integration,
 * pagination support, and optimized API usage
 */

import { conversationStorage } from './conversationStorageService';
import { conversationCacheService } from './conversationCacheService';

export class ConversationLoaderService {
  constructor() {
    this.defaultUserId = null;
    this.defaultMessageLimit = 50;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  /**
   * Set the current user ID for all operations
   */
  setUserId(userId) {
    this.defaultUserId = userId;
    conversationStorage.setUserId(userId);
  }

  /**
   * Load conversation with intelligent caching and pagination
   * @param {string} conversationId - Conversation identifier
   * @param {Object} options - Loading options
   * @returns {Promise<Object|null>} Conversation data or null
   */
  async loadConversation(conversationId, options = {}) {
    const {
      forceRefresh = false,      // Skip cache and force API call
      messageOffset = 0,         // Starting message position
      messageLimit = this.defaultMessageLimit, // Number of messages to load
      includeMessages = true,    // Include message content
      retries = this.maxRetries  // Number of retry attempts
    } = options;

    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh && conversationCacheService.has(conversationId)) {
        const cacheInfo = conversationCacheService.getCacheInfo(conversationId);
        const needsMoreMessages = conversationCacheService.needsMoreMessages(
          conversationId, 
          messageOffset, 
          messageLimit
        );

        if (!needsMoreMessages) {
          // We can serve entirely from cache
          const cachedConversation = conversationCacheService.get(conversationId);
          const result = this.sliceMessages(cachedConversation, messageOffset, messageLimit);
          
          console.log(`✅ Served from cache: ${conversationId} (${messageOffset}-${messageOffset + messageLimit})`);
          return result;
        } else {
          // We need to fetch additional messages and merge with cache
          return await this.loadAndMergeWithCache(conversationId, messageOffset, messageLimit, includeMessages);
        }
      }

      // Load fresh from API with enhanced error handling
      try {
        const conversation = await this.fetchConversationFromAPI(
          conversationId, 
          messageOffset, 
          messageLimit, 
          includeMessages,
          retries
        );

        if (conversation) {
          // Cache the result
          this.cacheConversation(conversationId, conversation, messageOffset, messageLimit);
          return conversation;
        }

        return null;
      } catch (apiError) {
        console.error(`❌ API Error for conversation ${conversationId}:`, apiError.message);
        
        // Handle specific API errors that should not break the UI
        if (apiError.message.includes('500') && apiError.message.includes('validation errors')) {
          console.log('⚠️ Server validation error detected - returning special error object');
          return {
            error: 'validation_error',
            message: 'Conversation exists but has data format issues',
            id: conversationId,
            canContinue: true
          };
        }
        
        if (apiError.message.includes('500') && apiError.message.includes('Unknown column')) {
          console.log('⚠️ Database schema error detected - returning special error object');
          return {
            error: 'database_error', 
            message: 'Database schema mismatch',
            id: conversationId,
            canContinue: true
          };
        }
        
        if (apiError.message.includes('404') || apiError.message.includes('not found')) {
          console.log('📝 Conversation not found on server');
          return {
            error: 'not_found',
            message: 'Conversation not found',
            id: conversationId,
            canContinue: false
          };
        }
        
        // For other errors, also return error object for graceful degradation
        console.log('⚠️ API error - returning error object for graceful fallback');
        return {
          error: 'api_error',
          message: 'Unable to load conversation',
          id: conversationId,
          canContinue: true
        };
      }

    } catch (error) {
      console.error(`❌ Failed to load conversation ${conversationId}:`, error);
      
      // Try to return cached version as fallback (even if stale)
      if (conversationCacheService.has(conversationId)) {
        console.log('🔄 Using stale cache as fallback');
        const cachedConversation = conversationCacheService.get(conversationId);
        return this.sliceMessages(cachedConversation, messageOffset, messageLimit);
      }

      // Return null instead of throwing to allow graceful degradation
      console.log('⚠️ No cache available - returning null for graceful degradation');
      return null;
    }
  }

  /**
   * Load additional messages and merge with existing cache
   * @param {string} conversationId - Conversation identifier
   * @param {number} messageOffset - Starting message position
   * @param {number} messageLimit - Number of messages to load
   * @param {boolean} includeMessages - Include message content
   * @returns {Promise<Object>} Updated conversation data
   */
  async loadAndMergeWithCache(conversationId, messageOffset, messageLimit, includeMessages) {
    try {
      const cachedConversation = conversationCacheService.get(conversationId);
      const currentMessageCount = cachedConversation?.messages?.length || 0;

      // Calculate what we need to fetch
      const neededOffset = Math.max(currentMessageCount, messageOffset);
      const neededLimit = Math.max(messageLimit, messageOffset + messageLimit - currentMessageCount);

      // Fetch additional messages from API
      const additionalData = await this.fetchConversationFromAPI(
        conversationId,
        neededOffset,
        neededLimit,
        includeMessages
      );

      if (additionalData && additionalData.messages) {
        // Merge new messages with cache
        const isFullyCached = additionalData.messages.length < neededLimit;
        
        conversationCacheService.appendMessages(
          conversationId,
          additionalData.messages,
          { fullyCached: isFullyCached }
        );

        // Return the updated conversation from cache
        const updatedConversation = conversationCacheService.get(conversationId);
        return this.sliceMessages(updatedConversation, messageOffset, messageLimit);
      }

      // If no additional data, return what we have in cache
      return this.sliceMessages(cachedConversation, messageOffset, messageLimit);

    } catch (error) {
      console.error('❌ Failed to merge with cache:', error);
      // Fallback to cached data
      const cachedConversation = conversationCacheService.get(conversationId);
      return this.sliceMessages(cachedConversation, messageOffset, messageLimit);
    }
  }

  /**
   * Fetch conversation data from API with retry logic
   * @param {string} conversationId - Conversation identifier
   * @param {number} messageOffset - Starting message position
   * @param {number} messageLimit - Number of messages to load
   * @param {boolean} includeMessages - Include message content
   * @param {number} retries - Remaining retry attempts
   * @returns {Promise<Object>} Conversation data from API
   */
  async fetchConversationFromAPI(conversationId, messageOffset = 0, messageLimit = 50, includeMessages = true, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        // Use the conversationStorage service directly to maintain compatibility
        const conversation = await conversationStorage.getConversation(
          conversationId, 
          includeMessages,
          messageOffset,
          messageLimit
        );
        
        if (conversation) {
          return conversation;
        } else {
          console.warn(`⚠️ No conversation returned for ID: ${conversationId}`);
          return null;
        }

      } catch (error) {
        console.error(`❌ API attempt ${attempt} failed:`, error.message);
        
        // Don't retry for 404 errors - the conversation simply doesn't exist
        if (error.message.includes('404') || error.message.includes('not found')) {
          console.log(`🔍 Conversation ${conversationId} not found on server (404)`);
          throw new Error(`Conversation not found: ${conversationId}`);
        }
        
        // Don't retry for 400 errors either - bad request won't get better
        if (error.message.includes('400') || error.message.includes('Bad Request')) {
          console.log(`❌ Bad request for conversation ${conversationId} (400)`);
          throw new Error(`Invalid request for conversation: ${conversationId}`);
        }
        
        // Don't retry for 500 validation errors - they won't resolve with retries
        if (error.message.includes('500') && error.message.includes('validation errors')) {
          console.log(`❌ Server validation error for conversation ${conversationId} (500) - data format issue`);
          throw new Error(`Server validation error: ${conversationId}`);
        }
        
        // Don't retry for database schema errors - they won't resolve with retries
        if (error.message.includes('500') && error.message.includes('Unknown column')) {
          console.log(`❌ Database schema error for conversation ${conversationId} (500) - schema mismatch`);
          throw new Error(`Database schema error: ${conversationId}`);
        }
        
        if (attempt === retries) {
          throw new Error(`Failed to fetch conversation after ${retries} attempts: ${error.message}`);
        }
        
        // Wait before retry (exponential backoff) - only for retryable errors
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        console.log(`⏳ Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Cache conversation data intelligently
   * @param {string} conversationId - Conversation identifier
   * @param {Object} conversation - Conversation data
   * @param {number} messageOffset - Message offset used for fetching
   * @param {number} messageLimit - Message limit used for fetching
   */
  cacheConversation(conversationId, conversation, messageOffset, messageLimit) {
    try {
      const messageCount = conversation.messages?.length || 0;
      const isFullyCached = messageCount < messageLimit; // If we got fewer messages than requested, we have all messages
      
      const cacheOptions = {
        fullyCached: isFullyCached,
        maxMessageOffset: messageOffset + messageCount,
        metadata: {
          title: conversation.title,
          userId: conversation.user_id,
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at,
          messageCount: messageCount,
          loadedAt: new Date().toISOString()
        }
      };

      const success = conversationCacheService.set(conversationId, conversation, cacheOptions);
      
      if (success) {
        }

      return success;
    } catch (error) {
      console.error('❌ Failed to cache conversation:', error);
      return false;
    }
  }

  /**
   * Slice messages from conversation for pagination
   * @param {Object} conversation - Full conversation data
   * @param {number} offset - Starting message index
   * @param {number} limit - Maximum number of messages
   * @returns {Object} Conversation with sliced messages
   */
  sliceMessages(conversation, offset = 0, limit = 50) {
    if (!conversation || !conversation.messages) {
      return conversation;
    }

    const slicedMessages = conversation.messages.slice(offset, offset + limit);
    
    return {
      ...conversation,
      messages: slicedMessages,
      pagination: {
        offset: offset,
        limit: limit,
        total: conversation.messages.length,
        hasMore: (offset + limit) < conversation.messages.length,
        isSliced: offset > 0 || slicedMessages.length < conversation.messages.length
      }
    };
  }

  /**
   * Preload multiple conversations for better performance
   * @param {Array<string>} conversationIds - Array of conversation IDs
   * @param {Object} options - Loading options
   * @returns {Promise<Object>} Results object with success/failure counts
   */
  async preloadConversations(conversationIds, options = {}) {
    const {
      messageLimit = 20, // Smaller limit for preloading
      concurrency = 3,   // Number of concurrent loads
      includeMessages = true
    } = options;

    const results = {
      loaded: 0,
      failed: 0,
      cached: 0,
      errors: []
    };

    // Process in batches to avoid overwhelming the API
    for (let i = 0; i < conversationIds.length; i += concurrency) {
      const batch = conversationIds.slice(i, i + concurrency);
      
      const batchPromises = batch.map(async (conversationId) => {
        try {
          // Check if already cached
          if (conversationCacheService.has(conversationId)) {
            results.cached++;
            return;
          }

          await this.loadConversation(conversationId, {
            forceRefresh: false,
            messageOffset: 0,
            messageLimit,
            includeMessages
          });
          
          results.loaded++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            conversationId,
            error: error.message
          });
          console.error(`❌ Failed to preload conversation ${conversationId}:`, error.message);
        }
      });

      await Promise.all(batchPromises);
    }

    return results;
  }

  /**
   * Get loader statistics
   * @returns {Object} Loader statistics including cache stats
   */
  getStats() {
    return {
      cache: conversationCacheService.getStats(),
      loader: {
        defaultUserId: this.defaultUserId,
        defaultMessageLimit: this.defaultMessageLimit,
        retrySettings: {
          maxRetries: this.maxRetries,
          retryDelay: this.retryDelay
        }
      }
    };
  }

  /**
   * Clear all cached data and reset
   */
  clearCache() {
    conversationCacheService.clear();
    }

  /**
   * Refresh a conversation in cache
   * @param {string} conversationId - Conversation identifier
   * @param {Object} options - Refresh options
   * @returns {Promise<Object|null>} Refreshed conversation data
   */
  async refreshConversation(conversationId, options = {}) {
    // Remove from cache first
    conversationCacheService.remove(conversationId);
    
    // Load fresh from API
    return await this.loadConversation(conversationId, {
      forceRefresh: true,
      ...options
    });
  }
}

// Create singleton instance
export const conversationLoader = new ConversationLoaderService();
export default conversationLoader;
