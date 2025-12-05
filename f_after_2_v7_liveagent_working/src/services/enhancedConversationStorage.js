/**
 * Enhanced Conversation Storage Service
 * Implements local-first storage with API persistence
 * Optimized for chat applications requiring instant response
 */

export class EnhancedConversationStorage {
  constructor() {
    this.maxLocalMessages = 10; // 5 Q&A pairs per conversation
    this.syncInterval = 30000; // 30 seconds
    this.maxAge = 24 * 60 * 60 * 1000; // 24 hours
    this.pendingSync = new Set();
    
    this.startBackgroundSync();
  }

  // === WRITE OPERATIONS ===
  
  /**
   * Save message with dual storage pattern
   * Returns immediately after local save, syncs in background
   */
  async saveMessage(conversationId, message) {
    try {
      // 1. IMMEDIATE: Save to localStorage for instant UI update
      await this.saveToLocal(conversationId, message);
      console.log('✅ Message saved locally:', message.type);
      
      // 2. BACKGROUND: Queue for API sync (non-blocking)
      this.queueForSync(conversationId, message);
      
      return { success: true, local: true };
    } catch (error) {
      console.error('❌ Failed to save message locally:', error);
      // Even if local fails, try API directly
      return await this.saveToAPI(conversationId, message);
    }
  }

  /**
   * Save to localStorage with smart limits
   */
  async saveToLocal(conversationId, message) {
    const key = `pulse_conv_${conversationId}`;
    const existing = this.getLocalConversation(conversationId) || {
      id: conversationId,
      messages: [],
      lastUpdated: Date.now(),
      pendingSync: [],
      lastAPISync: 0
    };
    
    // Add new message
    existing.messages.push({
      ...message,
      localId: `local_${Date.now()}_${Math.random()}`,
      timestamp: Date.now(),
      synced: false
    });
    
    // Keep only last N messages to manage storage
    if (existing.messages.length > this.maxLocalMessages) {
      existing.messages = existing.messages.slice(-this.maxLocalMessages);
    }
    
    existing.lastUpdated = Date.now();
    existing.pendingSync.push(message);
    
    localStorage.setItem(key, JSON.stringify(existing));
    
    // Schedule cleanup of old conversations
    this.scheduleCleanup();
  }

  /**
   * Queue message for API sync
   */
  queueForSync(conversationId, message) {
    this.pendingSync.add(conversationId);
    
    // Try immediate sync (non-blocking)
    this.syncConversation(conversationId).catch(error => {
      console.log('⏳ Immediate sync failed, will retry in background:', error.message);
    });
  }

  // === READ OPERATIONS ===
  
  /**
   * Get conversation with local-first strategy
   */
  async getConversation(conversationId, forceRefresh = false) {
    try {
      if (!forceRefresh) {
        // 1. Try local first (instant response)
        const localData = this.getLocalConversation(conversationId);
        if (localData && localData.messages.length > 0) {
          console.log('📱 Serving from local storage:', localData.messages.length, 'messages');
          
          // Background sync to check for updates
          this.syncConversation(conversationId).catch(console.warn);
          
          return this.formatForUI(localData);
        }
      }
      
      // 2. Fallback to API if no local data or force refresh
      console.log('🌐 Fetching from API...');
      const apiData = await this.getFromAPI(conversationId);
      
      if (apiData && apiData.messages) {
        // Save API data locally for next time
        await this.cacheAPIResponse(conversationId, apiData);
        return this.formatForUI(apiData);
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to get conversation:', error);
      
      // Last resort: return any local data we have
      const localData = this.getLocalConversation(conversationId);
      return localData ? this.formatForUI(localData) : null;
    }
  }

  /**
   * Get conversation from localStorage
   */
  getLocalConversation(conversationId) {
    try {
      const key = `pulse_conv_${conversationId}`;
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.warn('⚠️ Failed to parse local conversation:', error);
      return null;
    }
  }

  // === SYNC OPERATIONS ===
  
  /**
   * Sync specific conversation with API
   */
  async syncConversation(conversationId) {
    if (!navigator.onLine) {
      console.log('📴 Offline - skipping sync for:', conversationId);
      return;
    }

    try {
      const localData = this.getLocalConversation(conversationId);
      if (!localData || localData.pendingSync.length === 0) {
        return; // Nothing to sync
      }

      console.log('🔄 Syncing conversation:', conversationId, `(${localData.pendingSync.length} pending)`);
      
      // Sync pending messages to API
      for (const message of localData.pendingSync) {
        await this.saveToAPI(conversationId, message);
      }
      
      // Clear pending sync and update timestamp
      localData.pendingSync = [];
      localData.lastAPISync = Date.now();
      localStorage.setItem(`pulse_conv_${conversationId}`, JSON.stringify(localData));
      
      this.pendingSync.delete(conversationId);
      console.log('✅ Sync completed for:', conversationId);
      
    } catch (error) {
      console.error('❌ Sync failed for:', conversationId, error);
      // Keep in pending sync for retry
    }
  }

  /**
   * Background sync worker
   */
  startBackgroundSync() {
    setInterval(() => {
      if (this.pendingSync.size > 0) {
        console.log('🔄 Background sync for', this.pendingSync.size, 'conversations');
        
        Array.from(this.pendingSync).forEach(conversationId => {
          this.syncConversation(conversationId);
        });
      }
    }, this.syncInterval);

    // Sync when page gains focus
    window.addEventListener('focus', () => {
      if (this.pendingSync.size > 0) {
        console.log('👁️ Page focused - syncing pending conversations');
        this.syncAllPending();
      }
    });

    // Sync before page unload
    window.addEventListener('beforeunload', () => {
      this.syncAllPendingSync();
    });
  }

  // === FEEDBACK OPERATIONS ===
  
  /**
   * Save feedback (like/dislike) with dual storage
   */
  async saveFeedback(conversationId, messageId, feedback) {
    // 1. Update locally immediately
    const localData = this.getLocalConversation(conversationId);
    if (localData) {
      const message = localData.messages.find(m => 
        m.id === messageId || m.localId === messageId
      );
      if (message) {
        message.feedback = feedback;
        message.feedbackTimestamp = Date.now();
        message.feedbackSynced = false;
        localStorage.setItem(`pulse_conv_${conversationId}`, JSON.stringify(localData));
      }
    }

    // 2. Queue for API sync
    this.queueForSync(conversationId, { 
      type: 'feedback', 
      messageId, 
      feedback 
    });

    return { success: true, local: true };
  }

  // === DELETE OPERATIONS ===
  
  /**
   * Delete conversation with dual storage
   */
  async deleteConversation(conversationId) {
    // 1. Remove from localStorage immediately
    const key = `pulse_conv_${conversationId}`;
    localStorage.removeItem(key);
    console.log('🗑️ Conversation removed from local storage:', conversationId);

    // 2. Remove from pending sync
    this.pendingSync.delete(conversationId);

    // 3. Call API to delete (background)
    try {
      await this.deleteFromAPI(conversationId);
      console.log('✅ Conversation deleted from API:', conversationId);
    } catch (error) {
      console.error('❌ Failed to delete from API (will retry):', error);
      // Could queue for retry, but deletion is usually final
    }

    return { success: true };
  }

  // === UTILITY METHODS ===
  
  /**
   * Clean up old conversations from localStorage
   */
  scheduleCleanup() {
    // Debounce cleanup calls
    clearTimeout(this.cleanupTimeout);
    this.cleanupTimeout = setTimeout(() => {
      this.cleanupOldConversations();
    }, 60000); // 1 minute delay
  }

  cleanupOldConversations() {
    try {
      const keys = Object.keys(localStorage);
      const convKeys = keys.filter(key => key.startsWith('pulse_conv_'));
      
      convKeys.forEach(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key));
          const age = Date.now() - data.lastUpdated;
          
          if (age > this.maxAge) {
            localStorage.removeItem(key);
            console.log('🧹 Cleaned up old conversation:', key);
          }
        } catch (error) {
          // Remove corrupted data
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('⚠️ Cleanup failed:', error);
    }
  }

  /**
   * Format conversation data for UI consumption
   */
  formatForUI(conversationData) {
    return {
      id: conversationData.id,
      title: conversationData.title || 'Conversation',
      messages: conversationData.messages.map((msg, index) => ({
        id: msg.localId || msg.id || index + 1,
        type: msg.message_type || msg.type,
        text: msg.content || msg.text,
        timestamp: msg.timestamp || msg.created_at,
        feedback: msg.feedback,
        synced: msg.synced !== false
      })),
      lastUpdated: conversationData.lastUpdated,
      hasPendingSync: conversationData.pendingSync?.length > 0
    };
  }

  // === API INTEGRATION (implement based on your existing API) ===
  
  async saveToAPI(conversationId, message) {
    // Implement your existing API calls here
    // This is just the interface
    throw new Error('Implement saveToAPI method');
  }

  async getFromAPI(conversationId) {
    // Implement your existing API calls here  
    throw new Error('Implement getFromAPI method');
  }

  async deleteFromAPI(conversationId) {
    // Implement your existing API calls here
    throw new Error('Implement deleteFromAPI method');
  }
}

// Export singleton instance
export const enhancedConversationStorage = new EnhancedConversationStorage();