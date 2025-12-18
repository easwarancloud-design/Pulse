/**
 * Conversation Cache Service
 * Implements LRU (Least Recently Used) cache for conversation data
 * Provides fast access to frequently accessed conversations and reduces API calls
 */

export class ConversationCacheService {
  constructor(maxSize = 50) {
    this.cache = new Map(); // Using Map for LRU implementation
    this.maxSize = maxSize;
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0
    };
  }

  /**
   * Set a conversation in the cache
   * @param {string} conversationId - Unique conversation identifier
   * @param {Object} conversation - Conversation data
   * @param {Object} options - Additional options
   */
  set(conversationId, conversation, options = {}) {
    try {
      // Remove existing entry if it exists (for LRU repositioning)
      if (this.cache.has(conversationId)) {
        this.cache.delete(conversationId);
      }

      // Implement LRU eviction if cache is full
      if (this.cache.size >= this.maxSize) {
        const firstKey = this.cache.keys().next().value;
        this.cache.delete(firstKey);
        this.stats.evictions++;
        }

      // Create cache entry with metadata
      const cacheEntry = {
        data: conversation,
        cachedAt: Date.now(),
        accessCount: 1,
        lastAccessed: Date.now(),
        fullyCached: options.fullyCached || false,
        messageCount: conversation.messages?.length || 0,
        maxMessageOffset: options.maxMessageOffset || (conversation.messages?.length || 0),
        metadata: {
          title: conversation.title,
          userId: conversation.user_id,
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at,
          ...options.metadata
        }
      };

      this.cache.set(conversationId, cacheEntry);
      this.stats.sets++;

      console.log(`📦 Cached conversation: ${conversationId} (${cacheEntry.messageCount} messages)`);
      return true;
    } catch (error) {
      console.error('❌ Failed to cache conversation:', error);
      return false;
    }
  }

  /**
   * Get a conversation from cache
   * @param {string} conversationId - Conversation identifier
   * @returns {Object|null} Cached conversation data or null
   */
  get(conversationId) {
    try {
      if (!this.cache.has(conversationId)) {
        this.stats.misses++;
        return null;
      }

      // Get and update access metadata (LRU behavior)
      const entry = this.cache.get(conversationId);
      entry.lastAccessed = Date.now();
      entry.accessCount++;

      // Move to end (most recently used)
      this.cache.delete(conversationId);
      this.cache.set(conversationId, entry);

      this.stats.hits++;
      console.log(`📦 Cache hit: ${conversationId} (accessed ${entry.accessCount} times)`);

      return entry.data;
    } catch (error) {
      console.error('❌ Failed to get from cache:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Check if conversation exists in cache
   * @param {string} conversationId - Conversation identifier
   * @returns {boolean} True if conversation is cached
   */
  has(conversationId) {
    return this.cache.has(conversationId);
  }

  /**
   * Get cache metadata for a conversation
   * @param {string} conversationId - Conversation identifier
   * @returns {Object|null} Cache metadata or null
   */
  getCacheInfo(conversationId) {
    if (!this.cache.has(conversationId)) {
      return null;
    }

    const entry = this.cache.get(conversationId);
    return {
      cachedAt: entry.cachedAt,
      lastAccessed: entry.lastAccessed,
      accessCount: entry.accessCount,
      messageCount: entry.messageCount,
      fullyCached: entry.fullyCached,
      maxMessageOffset: entry.maxMessageOffset,
      metadata: entry.metadata,
      ageMinutes: Math.floor((Date.now() - entry.cachedAt) / (1000 * 60))
    };
  }

  /**
   * Check if we need more messages for pagination
   * @param {string} conversationId - Conversation identifier
   * @param {number} requestedOffset - Requested message offset
   * @param {number} requestedLimit - Requested message limit
   * @returns {boolean} True if we need to fetch more messages
   */
  needsMoreMessages(conversationId, requestedOffset, requestedLimit) {
    if (!this.cache.has(conversationId)) {
      return true;
    }

    const entry = this.cache.get(conversationId);
    const requestedEnd = requestedOffset + requestedLimit;

    // If conversation is fully cached, we have all messages
    if (entry.fullyCached) {
      return false;
    }

    // Check if we have enough cached messages for the requested range
    return requestedEnd > entry.maxMessageOffset;
  }

  /**
   * Update cache entry with additional messages (for pagination)
   * @param {string} conversationId - Conversation identifier
   * @param {Array} newMessages - Additional messages to append
   * @param {Object} options - Update options
   */
  appendMessages(conversationId, newMessages, options = {}) {
    if (!this.cache.has(conversationId)) {
      console.warn(`📦 Cannot append messages: conversation ${conversationId} not in cache`);
      return false;
    }

    try {
      const entry = this.cache.get(conversationId);
      
      // Append new messages
      if (!entry.data.messages) {
        entry.data.messages = [];
      }
      
      entry.data.messages = [...entry.data.messages, ...newMessages];
      entry.messageCount = entry.data.messages.length;
      entry.maxMessageOffset = Math.max(entry.maxMessageOffset, entry.messageCount);
      entry.lastAccessed = Date.now();
      
      // Update fully cached status
      if (options.fullyCached !== undefined) {
        entry.fullyCached = options.fullyCached;
      }

      // Update cache with modified entry
      this.cache.delete(conversationId);
      this.cache.set(conversationId, entry);

      return true;
    } catch (error) {
      console.error('❌ Failed to append messages to cache:', error);
      return false;
    }
  }

  /**
   * Remove a conversation from cache
   * @param {string} conversationId - Conversation identifier
   * @returns {boolean} True if removed successfully
   */
  remove(conversationId) {
    const removed = this.cache.delete(conversationId);
    if (removed) {
      }
    return removed;
  }

  /**
   * Clear all cached conversations
   */
  clear() {
    const size = this.cache.size;
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      sets: 0
    };
    console.log(`📦 Cleared cache (${size} entries removed)`);
  }

  /**
   * Clear user-specific cache (conversations list cache)
   */
  clearUserCache(userId) {
    if (!userId) return;
    
    // Clear user conversations cache key
    const userCacheKey = `user_conversations:${userId}`;
    const userTitlesKey = `user_titles:${userId}`;
    
    // Remove from internal cache if we're using a unified cache
    // This assumes user data might be cached with specific keys
    let removedCount = 0;
    
    // Note: This is a simple implementation. In a more complex system,
    // you might want to track user-specific keys separately
    for (const [key, entry] of this.cache) {
      if (key.includes(userId) || (entry.conversation && entry.conversation.user_id === userId)) {
        this.cache.delete(key);
        removedCount++;
      }
    }
    
    console.log(`📦 Cleared user cache for ${userId}: ${removedCount} entries removed`);
    return removedCount;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage of cache
   * @returns {string} Estimated memory usage
   */
  estimateMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache) {
      // Rough estimation: key + entry object size
      totalSize += key.length * 2; // Unicode characters
      totalSize += JSON.stringify(entry).length * 2;
    }
    
    // Convert bytes to readable format
    const kb = totalSize / 1024;
    if (kb < 1024) {
      return `${kb.toFixed(2)} KB`;
    } else {
      return `${(kb / 1024).toFixed(2)} MB`;
    }
  }

  /**
   * Get all cached conversation IDs
   * @returns {Array} Array of conversation IDs
   */
  getAllConversationIds() {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache entries sorted by access time (most recent first)
   * @returns {Array} Array of {id, metadata} objects
   */
  getRecentConversations(limit = 10) {
    const entries = Array.from(this.cache.entries())
      .map(([id, entry]) => ({
        id,
        metadata: entry.metadata,
        lastAccessed: entry.lastAccessed,
        accessCount: entry.accessCount,
        messageCount: entry.messageCount
      }))
      .sort((a, b) => b.lastAccessed - a.lastAccessed)
      .slice(0, limit);

    return entries;
  }

  /**
   * Update an existing conversation in the cache
   * @param {string} conversationId - Conversation ID
   * @param {Object} updates - Updates to apply
   */
  updateConversation(conversationId, updates) {
    try {
      const entry = this.cache.get(conversationId);
      if (!entry) {
        return false;
      }

      // Update the conversation data
      const updatedConversation = {
        ...entry.data,
        ...updates,
        updated_at: updates.updated_at || new Date().toISOString()
      };

      // Update the cache entry
      const updatedEntry = {
        ...entry,
        data: updatedConversation,
        lastAccessed: Date.now(),
        accessCount: entry.accessCount + 1
      };

      // Re-insert to maintain LRU order
      this.cache.delete(conversationId);
      this.cache.set(conversationId, updatedEntry);

      return true;
    } catch (error) {
      console.error(`❌ Failed to update conversation cache: ${error.message}`);
      return false;
    }
  }

  /**
   * Cleanup old entries based on age or access patterns
   * @param {Object} options - Cleanup options
   */
  cleanup(options = {}) {
    const {
      maxAgeMinutes = 60, // Remove entries older than 1 hour
      minAccessCount = 1,  // Remove entries accessed less than this
      force = false       // Force cleanup regardless of cache size
    } = options;

    if (!force && this.cache.size < this.maxSize * 0.8) {
      return 0;
    }

    const now = Date.now();
    const maxAgeMs = maxAgeMinutes * 60 * 1000;
    let removedCount = 0;

    for (const [conversationId, entry] of this.cache) {
      const age = now - entry.cachedAt;
      const shouldRemove = (
        (age > maxAgeMs && entry.accessCount < minAccessCount) ||
        entry.accessCount === 0
      );

      if (shouldRemove) {
        this.cache.delete(conversationId);
        removedCount++;
      }
    }

    if (removedCount > 0) {
      }

    return removedCount;
  }
}

// Create singleton instance
export const conversationCacheService = new ConversationCacheService(50);
export default conversationCacheService;
