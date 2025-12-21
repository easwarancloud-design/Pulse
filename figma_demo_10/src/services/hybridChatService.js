/**
 * Hybrid Chat Service
 * Combines local conversation storage with live response generation
 * Preserves original backend for live chat while storing conversations locally
 * Now enhanced with intelligent caching and optimized loading
 */

import { conversationStorage } from './conversationStorageService';
import { conversationLoader } from './conversationLoaderService';
import { conversationCacheService } from './conversationCacheService';
import { apiCompatibilityService } from './apiCompatibilityService';
import { API_ENDPOINTS } from '../config/api';

export class HybridChatService {
  constructor() {
    this.isLocalStorageEnabled = true; // Always use API
    this.fallbackToLocal = false; // No localStorage fallback
    this.currentConversationId = null;
    this.currentUserId = null; // Will be set when domain ID is provided
    this.initializeService();
  }

  /**
   * Set the current user ID (domain ID) for all operations
   */
  setUserId(userId) {
    this.currentUserId = userId;
    conversationStorage.setUserId(userId);
    conversationLoader.setUserId(userId);
    }

  /**
   * Initialize service and check API availability
   */
  async initializeService() {
    try {
      // Check API compatibility first
      await apiCompatibilityService.checkAPICompatibility();
      
      const healthCheck = await apiCompatibilityService.safeAPICall(
        () => conversationStorage.checkHealth(),
        false
      );
      
      // Always keep API enabled for testing
      this.isLocalStorageEnabled = true; 
      
      } catch (error) {
      console.error('❌ API initialization error:', error);
      // Still keep API enabled to see failed attempts
      this.isLocalStorageEnabled = true;
      }
  }

  /**
   * Start a new conversation
   */
  async startNewConversation(title) {
    try {
      if (this.isLocalStorageEnabled) {
        const conversation = await conversationStorage.createConversation(title);
        this.currentConversationId = conversation.id;
        return conversation.id;
      } else if (this.fallbackToLocal) {
        // Use localStorage as fallback
        const conversationId = `local_${Date.now()}`;
        this.currentConversationId = conversationId;
        return conversationId;
      }
    } catch (error) {
      console.error('❌ Failed to start new conversation:', error);
      // Fallback to localStorage
      const conversationId = `local_${Date.now()}`;
      this.currentConversationId = conversationId;
      return conversationId;
    }
  }

  /**
   * Save user question (immediately when user submits)
   */
  async saveUserQuestion(questionText, metadata = {}, chatId = null) {
    try {
      // ❌ REMOVED AUTO-CREATION - Conversation should already exist from ChatPage
      // If no active conversation at this point, log warning but don't create
      if (!this.currentConversationId) {
        console.warn('⚠️ No active conversation ID when saving user question. This should not happen!');
        console.warn('Question:', questionText.substring(0, 50) + '...');
        console.warn('Skipping save to avoid creating duplicate conversation');
        return; // Don't save if no conversation exists
      }

      if (this.isLocalStorageEnabled) {
        // Save to API using unified storage function
        console.log('🔄 Attempting to save user question to API:', questionText.substring(0, 50) + '...');
        await conversationStorage.storeConversationData('question', this.currentConversationId, questionText, {
          chatId,
          metadata: { ...metadata, timestamp: new Date().toISOString() },
          isNewConversation: false // Never true since conversation already exists
        });
        }
    } catch (error) {
      console.error('❌ Failed to save user question:', error);
      // API-only mode - no localStorage fallback
    }
  }

  /**
   * Get live response from original backend (unchanged)
   * This preserves the existing live response functionality
   */
  async getLiveResponse(questionText, sessionId) {
    try {
      // Use original API endpoints for live responses
      // Append doc_id from URL if present alongside codeName/codename and title
      let chatEndpointUrl = API_ENDPOINTS.WORKFORCE_CHAT;
      try {
        const u = new URL(window.location.href);
        const id = u.searchParams.get('id');
        const code = u.searchParams.get('codeName') || u.searchParams.get('codename');
        const title = u.searchParams.get('title');
        if (id && code && title) {
          const sep = chatEndpointUrl.includes('?') ? '&' : '?';
          chatEndpointUrl = `${chatEndpointUrl}${sep}doc_id=${encodeURIComponent(id)}`;
        }
      } catch {}

      const response = await fetch(chatEndpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: questionText,
          session_id: sessionId,
          use_ai: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('❌ Failed to get live response:', error);
      throw error;
    }
  }

  /**
   * Save assistant response (after receiving from live API)
   */
  async saveAssistantResponse(responseText, questionText = null, metadata = {}, chatId = null) {
    try {
      if (!this.currentConversationId) {
        console.error('❌ No currentConversationId available for saving assistant response');
        return;
      }

      if (this.isLocalStorageEnabled && this.currentConversationId) {
        // Save to API using unified storage function
        console.log('🔄 Attempting to save assistant response to API:', responseText.substring(0, 50) + '...');
        
        const result = await conversationStorage.storeConversationData('response', this.currentConversationId, responseText, {
          chatId,
          metadata: { ...metadata, timestamp: new Date().toISOString() },
          questionText
        });
        
        } else {
        console.warn('⚠️ LocalStorage disabled or no conversation ID, skipping API save');
      }
    } catch (error) {
      console.error('❌ Failed to save assistant response:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        conversationId: this.currentConversationId
      });
      // API-only mode - no localStorage fallback
    }
  }

  /**
   * Complete chat interaction (question + live response + storage)
   * This is the main method to use in the chat interface
   */
  async handleChatInteraction(questionText, sessionId, metadata = {}) {
    try {
      // 1. Save user question immediately
      await this.saveUserQuestion(questionText, metadata);

      // 2. Get live response from original backend
      const responseData = await this.getLiveResponse(questionText, sessionId);

      // 3. Save assistant response
      if (responseData && responseData.answer) {
        await this.saveAssistantResponse(
          responseData.answer, 
          questionText, 
          { 
            ...metadata, 
            response_type: 'live_api',
            session_id: sessionId,
            reference_links: responseData.reference_links || []
          }
        );
      }

      return responseData;

    } catch (error) {
      console.error('❌ Failed to handle chat interaction:', error);
      throw error;
    }
  }

  /**
   * Search conversation history with caching
   */
  async searchConversationHistory(searchQuery, limit = 20) {
    try {
      if (this.isLocalStorageEnabled) {
        // First check if any cached conversations match
        const cachedIds = conversationCacheService.getAllConversationIds();
        const cachedMatches = [];
        
        for (const conversationId of cachedIds) {
          const cacheInfo = conversationCacheService.getCacheInfo(conversationId);
          if (cacheInfo?.metadata?.title?.toLowerCase().includes(searchQuery.toLowerCase())) {
            const conversation = conversationCacheService.get(conversationId);
            if (conversation) {
              cachedMatches.push({
                id: conversation.id,
                title: conversation.title,
                updated_at: conversation.updated_at,
                created_at: conversation.created_at,
                message_count: conversation.messages?.length || 0,
                summary: conversation.summary,
                user_id: conversation.user_id,
                fromCache: true
              });
            }
          }
        }
        
        // Search via API
        const apiResults = await conversationStorage.searchConversations(searchQuery, limit);
        
        // Combine and deduplicate results (prefer API results)
        const allResults = [...(apiResults.conversations || [])];
        const apiIds = new Set(allResults.map(conv => conv.id));
        
        // Add cached results that weren't in API results
        for (const cachedMatch of cachedMatches) {
          if (!apiIds.has(cachedMatch.id)) {
            allResults.push(cachedMatch);
          }
        }
        
        // Sort by updated_at and limit
        const sortedResults = allResults
          .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
          .slice(0, limit);
        
        console.log(`🔍 Search results for "${searchQuery}": ${sortedResults.length} conversations (${cachedMatches.length} from cache)`);
        return sortedResults;
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to search conversation history:', error);
      // Fallback to cache-only search
      const cachedIds = conversationCacheService.getAllConversationIds();
      const fallbackResults = [];
      
      for (const conversationId of cachedIds) {
        const cacheInfo = conversationCacheService.getCacheInfo(conversationId);
        if (cacheInfo?.metadata?.title?.toLowerCase().includes(searchQuery.toLowerCase())) {
          const conversation = conversationCacheService.get(conversationId);
          if (conversation) {
            fallbackResults.push({
              id: conversation.id,
              title: conversation.title,
              updated_at: conversation.updated_at,
              created_at: conversation.created_at,
              message_count: conversation.messages?.length || 0,
              summary: conversation.summary,
              user_id: conversation.user_id,
              fromCache: true
            });
          }
        }
      }
      
      return fallbackResults.slice(0, limit);
    }
  }

  /**
   * Get conversation history with intelligent caching
   */
  async getConversationHistory(limit = 50, offset = 0, useCache = true) {
    try {
      if (this.isLocalStorageEnabled) {
        // For first page, check if we have cached recent conversations
        if (offset === 0 && useCache) {
          const cachedRecent = conversationCacheService.getRecentConversations(Math.min(limit, 10));
          if (cachedRecent.length > 0) {
            // Convert cached entries to conversation list format
            const cachedConversations = await Promise.all(
              cachedRecent.map(async (entry) => {
                try {
                  const conversation = conversationCacheService.get(entry.id);
                  return conversation ? {
                    id: conversation.id,
                    title: conversation.title,
                    updated_at: conversation.updated_at,
                    created_at: conversation.created_at,
                    message_count: conversation.messages?.length || 0,
                    summary: conversation.summary,
                    user_id: conversation.user_id,
                    metadata: conversation.metadata || {}
                  } : null;
                } catch (error) {
                  console.warn(`⚠️ Failed to get cached conversation ${entry.id}:`, error);
                  return null;
                }
              })
            );
            
            const validCachedConversations = cachedConversations.filter(conv => conv !== null);
            
            if (validCachedConversations.length >= Math.min(limit, 5)) {
              // We have enough cached conversations, return them
              return validCachedConversations;
            }
          }
        }
        
        // Get from API (with caching for individual conversations)
        const conversations = await conversationStorage.getRecentConversations(limit, offset);
        
        // Preload some conversations into cache for better performance
        // TEMPORARILY DISABLED: Preloading to avoid database schema issues with remote API
        /*
        if (conversations.length > 0 && offset === 0) {
          // Preload first few conversations asynchronously (don't wait)
          const preloadIds = conversations.slice(0, 5).map(conv => conv.id);
          conversationLoader.preloadConversations(preloadIds, { messageLimit: 20 })
            .then(results => {
              })
            .catch(error => {
              console.warn('⚠️ Preload failed (non-critical):', error);
            });
        }
        */
        
        console.log(`📚 Retrieved ${conversations.length} conversations from API (offset: ${offset})`);
        return conversations;
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to get conversation history:', error);
      // Try to return cached conversations as fallback
      if (useCache && offset === 0) {
        const fallbackCached = conversationCacheService.getRecentConversations(limit);
        if (fallbackCached.length > 0) {
          return fallbackCached.map(entry => ({
            id: entry.id,
            title: entry.metadata.title,
            updated_at: entry.metadata.updatedAt,
            created_at: entry.metadata.createdAt,
            message_count: entry.messageCount,
            user_id: entry.metadata.userId
          }));
        }
      }
      return [];
    }
  }

  /**
   * Get specific conversation with messages using intelligent loading
   */
  async getConversation(conversationId, options = {}) {
    const {
      forceRefresh = false,
      messageOffset = 0,
      messageLimit = 50,
      includeMessages = true
    } = options;

    try {
      if (this.isLocalStorageEnabled && !conversationId.startsWith('local_')) {
        const conversation = await conversationLoader.loadConversation(conversationId, {
          forceRefresh,
          messageOffset,
          messageLimit,
          includeMessages
        });
        
        if (conversation) {
          console.log(`📖 Retrieved conversation via loader: ${conversation.title}`, {
            messageCount: conversation.messages?.length || 0,
            fromCache: conversationCacheService.has(conversationId) && !forceRefresh
          });
        }
        
        return conversation;
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get conversation via loader:', error);
      
      // Fallback: try cache only
      if (conversationCacheService.has(conversationId)) {
        const cached = conversationCacheService.get(conversationId);
        
        // Apply message slicing if needed
        if (cached && (messageOffset > 0 || messageLimit < (cached.messages?.length || 0))) {
          return conversationLoader.sliceMessages(cached, messageOffset, messageLimit);
        }
        
        return cached;
      }
      
      return null;
    }
  }

  /**
   * Update an existing conversation
   * Enhanced with graceful error handling for 501/500 responses
   */
  async updateConversation(conversationId, updates) {
    try {
      // Skip API call for local-only or placeholder conversations
      if (conversationId && conversationId.startsWith('local_')) {
        return { 
          id: conversationId, 
          ...updates,
          local: true,
          updated_at: new Date().toISOString(),
          success: true
        };
      }

      if (conversationId && /^thread_\d+/.test(conversationId)) {
        console.warn('⚠️ Skipping conversation update for placeholder thread ID:', conversationId);
        return {
          id: conversationId,
          ...updates,
          placeholder: true,
          updated_at: new Date().toISOString(),
          success: false,
          message: 'Placeholder thread ID - update skipped'
        };
      }

      if (this.isLocalStorageEnabled) {
        const result = await conversationStorage.updateConversation(
          conversationId, 
          updates
        );
        
        // Handle both successful updates and fallback responses
        if (result) {
          if (result.success === false) {
            console.warn('⚠️ Update failed but continuing:', result.message);
          } else {
            }
          
          // Update cache if we have conversation cache service
          if (typeof conversationCacheService !== 'undefined' && result.data) {
            try {
              conversationCacheService.updateConversation(conversationId, result.data);
            } catch (cacheError) {
              console.warn('⚠️ Failed to update conversation cache:', cacheError);
            }
          }
          
          return result.data || result;
        }
        
        return result;
      } else if (this.fallbackToLocal) {
        // For localStorage, we'd need to implement thread update logic
        return { id: conversationId, ...updates };
      }
    } catch (error) {
      console.error('❌ Failed to update conversation via API:', error);
      
      // If we get here and the error is just network/server related, 
      // don't fail the entire operation - just log and continue
      if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
        console.warn('⚠️ Network/Server error during conversation update. Continuing without update.');
        return { 
          id: conversationId, 
          ...updates,
          updated_at: new Date().toISOString(),
          success: false,
          error: error.message
        };
      }
      
      throw error;
    }
  }

  /**
   * Set active conversation
   */
  setActiveConversation(conversationId) {
    this.currentConversationId = conversationId;
  }

  /**
   * Clear active conversation ID (for starting fresh)
   */
  clearActiveConversation() {
    console.log('🗑️ Clearing active conversation ID:', this.currentConversationId);
    this.currentConversationId = null;
  }

  /**
   * Get current conversation ID
   */
  getCurrentConversationId() {
    return this.currentConversationId;
  }

  /**
   * Check service status including cache statistics
   */
  getServiceStatus() {
    const cacheStats = conversationCacheService.getStats();
    const loaderStats = conversationLoader.getStats();
    
    return {
      localAPIAvailable: this.isLocalStorageEnabled,
      fallbackEnabled: this.fallbackToLocal,
      currentConversation: this.currentConversationId,
      initialized: true,
      cache: cacheStats,
      loader: loaderStats,
      performance: {
        cacheHitRate: cacheStats.hitRate,
        cachedConversations: cacheStats.size,
        memoryUsage: cacheStats.memoryUsage
      }
    };
  }

  /**
   * Clear all cached data
   */
  clearCache() {
    conversationCacheService.clear();
    conversationLoader.clearCache();
    }

  /**
   * Refresh a specific conversation
   */
  async refreshConversation(conversationId) {
    return await conversationLoader.refreshConversation(conversationId);
  }

  /**
   * Preload conversations for better performance
   */
  async preloadConversations(conversationIds, options = {}) {
    return await conversationLoader.preloadConversations(conversationIds, options);
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId) {
    try {
      if (!conversationId) {
        throw new Error('Conversation ID is required');
      }

      console.log(`🗑️ HYBRID: Deleting conversation ${conversationId}`);

      // Always clear from frontend first - don't wait for API
      conversationCacheService.remove(conversationId);
      
      // Clear user conversations cache to force refresh
      if (this.currentUserId) {
        conversationCacheService.clearUserCache(this.currentUserId);
      }

      const isPlaceholder = typeof conversationId === 'string' && (conversationId.startsWith('local_') || conversationId.startsWith('thread_'));

      if (isPlaceholder) {
        console.log(`ℹ️ Skipping backend delete for placeholder conversation ${conversationId}`);
        return { frontendSuccess: true, backendSuccess: true, skippedBackend: true };
      }

      let backendSuccess = true;
      try {
        const apiResult = await conversationStorage.deleteConversation(conversationId);
        backendSuccess = !!(apiResult && apiResult.success !== false);
        if (backendSuccess) {
          console.log(`✅ Backend delete successful for ${conversationId}`);
        } else {
          console.warn(`⚠️ Backend delete reported failure for ${conversationId}:`, apiResult);
        }
      } catch (error) {
        backendSuccess = false;
        console.log(`⚠️ Backend delete failed for ${conversationId}, but frontend deletion completed:`, error.message || error);
      }

      console.log(`✅ Frontend deletion completed for conversation ${conversationId}`);
      return { frontendSuccess: true, backendSuccess };
      
    } catch (error) {
      console.error(`❌ HYBRID: Frontend delete failed for ${conversationId}:`, error);
      return { frontendSuccess: false, backendSuccess: false, error: error.message };
    }
  }
}

// Create singleton instance
export const hybridChatService = new HybridChatService();
export default hybridChatService;
