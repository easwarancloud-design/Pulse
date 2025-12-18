/**
 * Local Storage Manager for Conversations
 * Works alongside existing API - adds local storage for instant UI response
 */

export class LocalConversationManager {
  constructor() {
    this.maxMessagesPerConversation = 10; // 5 Q&A pairs
    this.storagePrefix = 'pulse_conv_';
    this.maxAge = 24 * 60 * 60 * 1000; // 24 hours
  }

  // === SAVE TO LOCAL STORAGE ===

  /**
   * Save message to local storage immediately (for instant UI)
   * Call this BEFORE or AFTER your existing API calls
   */
  saveMessageLocally(conversationId, message) {
    try {
      const conversation = this.getLocalConversation(conversationId) || {
        id: conversationId,
        title: '',
        messages: [],
        lastUpdated: Date.now()
      };

      // Add the new message
      const localMessage = {
        id: message.id || `local_${Date.now()}_${Math.random()}`,
        type: message.type || message.message_type,
        text: message.text || message.content,
        timestamp: Date.now(),
        chat_id: message.chat_id,
        feedback: message.feedback || null,
        isWelcome: message.isWelcome || false,
        showTable: message.showTable || false
      };

      conversation.messages.push(localMessage);

      // Keep only last N messages to prevent localStorage bloat
      if (conversation.messages.length > this.maxMessagesPerConversation) {
        conversation.messages = conversation.messages.slice(-this.maxMessagesPerConversation);
      }

      conversation.lastUpdated = Date.now();

      // Save to localStorage
      localStorage.setItem(
        this.storagePrefix + conversationId, 
        JSON.stringify(conversation)
      );

      console.log('💾 Message saved to local storage:', localMessage.type);
      return true;
    } catch (error) {
      console.error('❌ Failed to save to local storage:', error);
      return false;
    }
  }

  /**
   * Save complete conversation from API to local storage
   * Use this when loading existing conversations from API
   */
  saveCompleteConversation(conversationId, title, messages) {
    try {
      console.log('💾 Saving complete conversation to local storage:', {
        conversationId,
        title,
        messageCount: messages?.length || 0
      });

      // Convert API messages to local storage format
      const localMessages = messages?.map((message, index) => ({
        id: message.id || `api_${Date.now()}_${index}`,
        type: message.type || message.message_type || 'user',
        text: message.text || message.content || message.message_text || '',
        timestamp: message.timestamp || Date.now(),
        originalData: message // Keep original for debugging
      })) || [];

      const conversation = {
        id: conversationId,
        title: title || 'Conversation',
        messages: localMessages,
        lastUpdated: Date.now(),
        source: 'api' // Mark as coming from API
      };

      localStorage.setItem(
        this.storagePrefix + conversationId,
        JSON.stringify(conversation)
      );

      console.log('✅ Complete conversation saved to local storage:', {
        conversationId,
        messageCount: localMessages.length,
        title
      });

      return conversation;
    } catch (error) {
      console.error('❌ Failed to save complete conversation to local storage:', error);
      return null;
    }
  }

  /**
   * Update conversation title in local storage
   */
  updateConversationTitle(conversationId, title) {
    try {
      const conversation = this.getLocalConversation(conversationId);
      if (conversation) {
        conversation.title = title;
        conversation.lastUpdated = Date.now();
        localStorage.setItem(
          this.storagePrefix + conversationId,
          JSON.stringify(conversation)
        );
        console.log('💾 Title updated in local storage:', title);
      }
    } catch (error) {
      console.error('❌ Failed to update title in local storage:', error);
    }
  }

  // === READ FROM LOCAL STORAGE ===

  /**
   * Get conversation from local storage
   * Use this to show instant results while API loads
   */
  getLocalConversation(conversationId) {
    try {
      const data = localStorage.getItem(this.storagePrefix + conversationId);
      if (data) {
        const conversation = JSON.parse(data);
        
        // Check if data is too old
        const age = Date.now() - conversation.lastUpdated;
        if (age > this.maxAge) {
          this.deleteLocalConversation(conversationId);
          return null;
        }
        
        return conversation;
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to read from local storage:', error);
      return null;
    }
  }

  /**
   * Get all conversation IDs from local storage (for sidebar)
   */
  getLocalConversationList() {
    try {
      const conversations = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.storagePrefix)) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            if (data && data.id) {
              conversations.push({
                id: data.id,
                title: data.title || 'Conversation',
                lastUpdated: data.lastUpdated,
                messageCount: data.messages?.length || 0
              });
            }
          } catch (parseError) {
            // Remove corrupted data
            localStorage.removeItem(key);
          }
        }
      }
      
      // Sort by last updated (newest first)
      return conversations.sort((a, b) => b.lastUpdated - a.lastUpdated);
    } catch (error) {
      console.error('❌ Failed to get conversation list:', error);
      return [];
    }
  }

  // === FEEDBACK OPERATIONS ===

  /**
   * Save feedback (like/dislike) to local storage
   */
  saveFeedbackLocally(conversationId, messageId, feedback) {
    try {
      const conversation = this.getLocalConversation(conversationId);
      if (conversation) {
        const message = conversation.messages.find(
          msg => msg.id === messageId || msg.chat_id === messageId
        );
        
        if (message) {
          message.feedback = feedback;
          message.feedbackTimestamp = Date.now();
          
          localStorage.setItem(
            this.storagePrefix + conversationId,
            JSON.stringify(conversation)
          );
          
          console.log('💾 Feedback saved locally:', feedback);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to save feedback locally:', error);
      return false;
    }
  }

  // === DELETE OPERATIONS ===

  /**
   * Delete conversation from local storage
   */
  deleteLocalConversation(conversationId) {
    try {
      localStorage.removeItem(this.storagePrefix + conversationId);
      console.log('🗑️ Conversation deleted from local storage:', conversationId);
      return true;
    } catch (error) {
      console.error('❌ Failed to delete from local storage:', error);
      return false;
    }
  }
  
  // Alias for convenience
  deleteConversation(conversationId) {
    return this.deleteLocalConversation(conversationId);
  }

  // === UTILITY METHODS ===

  /**
   * Clear old conversations from localStorage (call on app start)
   */
  cleanupOldConversations() {
    try {
      let cleaned = 0;
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.storagePrefix)) {
          try {
            const data = JSON.parse(localStorage.getItem(key));
            const age = Date.now() - data.lastUpdated;
            
            if (age > this.maxAge) {
              localStorage.removeItem(key);
              cleaned++;
            }
          } catch (parseError) {
            // Remove corrupted data
            localStorage.removeItem(key);
            cleaned++;
          }
        }
      }
      
      if (cleaned > 0) {
        console.log('🧹 Cleaned up', cleaned, 'old conversations from local storage');
      }
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }

  /**
   * Get storage usage info
   */
  getStorageInfo() {
    try {
      let totalSize = 0;
      let conversationCount = 0;
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.storagePrefix)) {
          const value = localStorage.getItem(key);
          totalSize += key.length + (value?.length || 0);
          conversationCount++;
        }
      }
      
      return {
        conversationCount,
        totalSizeKB: Math.round(totalSize / 1024),
        maxSizeKB: Math.round(this.maxMessagesPerConversation * conversationCount * 0.5) // Rough estimate
      };
    } catch (error) {
      return { conversationCount: 0, totalSizeKB: 0, maxSizeKB: 0 };
    }
  }

  /**
   * Format local conversation for ChatPage (same format as API)
   */
  formatForChatPage(localConversation) {
    if (!localConversation) return null;

    return {
      id: localConversation.id,
      title: localConversation.title,
      conversation: localConversation.messages.map((msg, index) => ({
        id: msg.id || (index + 1),
        type: msg.type,
        text: msg.text,
        chat_id: msg.chat_id,
        showTable: msg.showTable || false,
        isWelcome: msg.isWelcome || false,
        isError: false,
        errorType: null,
        feedback: msg.feedback
      })),
      lastUpdated: localConversation.lastUpdated,
      isLocal: true // Flag to indicate this came from local storage
    };
  }
}

// Export singleton instance
export const localConversationManager = new LocalConversationManager();