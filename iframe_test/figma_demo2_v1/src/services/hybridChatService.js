/**
 * Hybrid Chat Service
 * Combines local conversation storage with live response generation
 * Preserves original backend for live chat while storing conversations locally
 */

import { conversationStorage } from './conversationStorageService';
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
    console.log('🆔 Updated user ID for conversation storage:', userId);
  }

  /**
   * Initialize service and check API availability
   */
  async initializeService() {
    try {
      console.log('🔄 Initializing hybrid chat service...');
      console.log('🔧 Initial settings:', {
        localAPI: this.isLocalStorageEnabled,
        fallback: this.fallbackToLocal
      });
      
      const healthCheck = await conversationStorage.checkHealth();
      console.log('🏥 Health check result:', healthCheck);
      
      // Always keep API enabled for testing
      this.isLocalStorageEnabled = true; 
      
      console.log('🚀 Chat service initialized:', {
        localAPI: this.isLocalStorageEnabled,
        fallback: this.fallbackToLocal,
        healthCheckPassed: healthCheck
      });
    } catch (error) {
      console.error('❌ API initialization error:', error);
      // Still keep API enabled to see failed attempts
      this.isLocalStorageEnabled = true;
      console.log('🚀 Chat service initialized with forced API mode for debugging');
    }
  }

  /**
   * Start a new conversation
   */
  async startNewConversation(title) {
    try {
      if (this.isLocalStorageEnabled) {
        console.log('🔄 Attempting to create new conversation via API:', title);
        const conversation = await conversationStorage.createConversation(title);
        this.currentConversationId = conversation.id;
        console.log('✅ New conversation created via API:', conversation.id);
        return conversation.id;
      } else if (this.fallbackToLocal) {
        // Use localStorage as fallback
        const conversationId = `local_${Date.now()}`;
        this.currentConversationId = conversationId;
        console.log('💾 New conversation created locally:', conversationId);
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
  async saveUserQuestion(questionText, metadata = {}) {
    try {
      // If no active conversation, create one
      if (!this.currentConversationId) {
        const title = questionText.length > 50 
          ? questionText.substring(0, 50) + '...' 
          : questionText;
        await this.startNewConversation(title);
      }

      if (this.isLocalStorageEnabled) {
        // Save to API
        console.log('🔄 Attempting to save user question to API:', questionText.substring(0, 50) + '...');
        await conversationStorage.addMessage(
          this.currentConversationId,
          'user',
          questionText,
          { ...metadata, timestamp: new Date().toISOString() }
        );
        console.log('💬 User question saved to API');
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
      const response = await fetch(API_ENDPOINTS.WORKFORCE_AGENT, {
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
      console.log('🤖 Received live response from original backend');
      return data;

    } catch (error) {
      console.error('❌ Failed to get live response:', error);
      throw error;
    }
  }

  /**
   * Save assistant response (after receiving from live API)
   */
  async saveAssistantResponse(responseText, questionText = null, metadata = {}) {
    try {
      if (this.isLocalStorageEnabled && this.currentConversationId) {
        // Save to API
        console.log('🔄 Attempting to save assistant response to API:', responseText.substring(0, 50) + '...');
        await conversationStorage.addMessage(
          this.currentConversationId,
          'assistant',
          responseText,
          { ...metadata, timestamp: new Date().toISOString() }
        );
        console.log('🤖 Assistant response saved to API');
      }
    } catch (error) {
      console.error('❌ Failed to save assistant response:', error);
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

      console.log('✅ Complete chat interaction processed');
      return responseData;

    } catch (error) {
      console.error('❌ Failed to handle chat interaction:', error);
      throw error;
    }
  }

  /**
   * Search conversation history
   */
  async searchConversationHistory(searchQuery, limit = 20) {
    try {
      if (this.isLocalStorageEnabled) {
        // Search via API
        const results = await conversationStorage.searchConversations(searchQuery, limit);
        console.log(`🔍 API search found ${results.conversations.length} conversations`);
        return results.conversations;
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to search conversation history:', error);
      // API-only mode - no localStorage fallback
      return [];
    }
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(limit = 50) {
    try {
      if (this.isLocalStorageEnabled) {
        // Get from API
        console.log('🔄 Attempting to fetch conversations from API...');
        const conversations = await conversationStorage.getRecentConversations(limit);
        console.log(`📚 Retrieved ${conversations.length} conversations from API`);
        return conversations;
      }
      return [];
    } catch (error) {
      console.error('❌ Failed to get conversation history from API:', error);
      // API-only mode - no localStorage fallback
      return [];
    }
  }

  /**
   * Get specific conversation with messages
   */
  async getConversation(conversationId) {
    try {
      if (this.isLocalStorageEnabled && !conversationId.startsWith('local_')) {
        // Get from API
        const conversation = await conversationStorage.getConversation(conversationId, true);
        console.log(`📖 Retrieved conversation from API: ${conversation.title}`);
        return conversation;
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to get conversation:', error);
      // API-only mode - no localStorage fallback
      return null;
    }
  }

  /**
   * Update an existing conversation
   */
  async updateConversation(conversationId, updates) {
    try {
      if (this.isLocalStorageEnabled) {
        console.log('🔄 Attempting to update conversation via API:', conversationId);
        const updatedConversation = await conversationStorage.updateConversation(
          conversationId, 
          updates
        );
        console.log('✅ Conversation updated via API');
        return updatedConversation;
      } else if (this.fallbackToLocal) {
        // For localStorage, we'd need to implement thread update logic
        console.log('💾 Conversation update stored locally');
        return { id: conversationId, ...updates };
      }
    } catch (error) {
      console.error('❌ Failed to update conversation via API:', error);
      throw error;
    }
  }

  /**
   * Set active conversation
   */
  setActiveConversation(conversationId) {
    this.currentConversationId = conversationId;
    console.log(`🎯 Set active conversation: ${conversationId}`);
  }

  /**
   * Get current conversation ID
   */
  getCurrentConversationId() {
    return this.currentConversationId;
  }

  /**
   * Check service status
   */
  getServiceStatus() {
    return {
      localAPIAvailable: this.isLocalStorageEnabled,
      fallbackEnabled: this.fallbackToLocal,
      currentConversation: this.currentConversationId,
      initialized: true
    };
  }
}

// Create singleton instance
export const hybridChatService = new HybridChatService();
export default hybridChatService;