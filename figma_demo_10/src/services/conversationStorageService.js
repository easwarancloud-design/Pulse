/**
 * Conversation Storage Service
 * Handles all conversation storage, retrieval, and search operations with local FastAPI server
 */

import { API_ENDPOINTS, API_HEADERS } from '../config/api';
import { generateConversationTitle } from './titleGenerationService';

export class ConversationStorageService {
  constructor() {
    this.baseURL = API_ENDPOINTS.CONVERSATIONS;
    this.defaultUserId = null; // Must be set via setUserId from Okta domainId
  }

  /**
   * Set the current user ID for all operations
   */
  setUserId(userId) {
    this.defaultUserId = userId;
  }

  /**
   * Check if the conversation API is healthy
   */
  async checkHealth() {
    try {
      const response = await fetch(API_ENDPOINTS.CONVERSATION_HEALTH);
      if (response.ok) {
        const data = await response.json();
        return true;
      }
      return false;
    } catch (error) {
      console.warn('⚠️ Local conversation API not available');
      return false;
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(title, summary = null, metadata = {}) {
    try {
      if (!this.defaultUserId) {
        throw new Error('domainId_not_set');
      }
      // Defensive: never allow backend to receive a placeholder title
      let safeTitle = title;
      if (!safeTitle || (typeof safeTitle === 'string' && safeTitle.trim().toLowerCase() === 'new chat')) {
        console.warn('⚠️ createConversation received placeholder title. Coercing to generic title.');
        safeTitle = 'Conversation';
      }
      const conversationData = {
        domain_id: this.defaultUserId,
        title: safeTitle || 'New Conversation',
        summary: summary,
        metadata: {
          created_from: 'chat_interface',
          ...metadata
        }
      };

      console.log('Payload:', JSON.stringify(conversationData, null, 2));

      const response = await fetch(API_ENDPOINTS.CONVERSATIONS, {
        method: 'POST',
        headers: API_HEADERS.JSON,
        body: JSON.stringify(conversationData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Create conversation failed:`, response.status, errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }

      const conversation = await response.json();
      console.log('✅ Successfully created conversation:', {
        id: conversation.id,
        title: conversation.title,
        domain_id: conversation.domain_id
      });
      return conversation;

    } catch (error) {
      console.error('❌ Failed to create conversation:', error);
      throw error;
    }
  }

  /**
   * Get a conversation by ID with optional message pagination
   * Compatible with remote EKS backend API
   */
  async getConversation(conversationId, includeMessages = true, messageOffset = 0, messageLimit = 50) {
    try {
      if (!this.defaultUserId) {
        throw new Error('domainId_not_set');
      }
      // 🚫 Guard: never attempt remote fetch for temporary client-only placeholder IDs
      // These are generated in AppContent as 'thread_<timestamp>' before the backend issues a real 'conv_<uuid>' id.
      // Attempting to GET them from the server produces guaranteed 404 noise and wasted network.
      if (conversationId && /^thread_\d+/.test(conversationId)) {
        console.log('🛑 Skipping remote fetch for temporary placeholder conversationId:', conversationId);
        return null; // Treat as not yet persisted; caller can rely on local state.
      }
      // Build base parameters that are definitely supported by the remote API
      const params = new URLSearchParams({
        domain_id: this.defaultUserId,
        include_messages: includeMessages.toString()
      });
      
      // Only add pagination parameters if the remote API supports them
      // For now, let's test without pagination first to see if basic loading works
      const url = `${API_ENDPOINTS.CONVERSATION_BY_ID(conversationId)}?${params}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error Response:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }

      const conversation = await response.json();
      return conversation;

    } catch (error) {
      console.error('❌ Failed to get conversation:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Update a conversation
   * Enhanced with error handling and fallback for 501/500 errors
   */
  async updateConversation(conversationId, updates) {
    try {
      // Defensive: avoid overwriting a good title with a placeholder
      let sanitizedUpdates = { ...(updates || {}) };
      if (sanitizedUpdates && Object.prototype.hasOwnProperty.call(sanitizedUpdates, 'title')) {
        const t = sanitizedUpdates.title;
        if (!t || (typeof t === 'string' && t.trim().toLowerCase() === 'new chat')) {
          console.warn(`⚠️ updateConversation received placeholder title for ${conversationId}. Dropping title field to preserve existing.`);
          // Prefer dropping the title field so backend keeps the current value
          delete sanitizedUpdates.title;
          sanitizedUpdates.metadata = {
            ...(sanitizedUpdates.metadata || {}),
            title_sanitized: true,
          };
        }
      }
      const params = new URLSearchParams({
        domain_id: this.defaultUserId
      });
      
      console.log('🛠️ UPDATE conversation request:', {
        conversationId,
        updates: sanitizedUpdates
      });

      const response = await fetch(`${API_ENDPOINTS.CONVERSATION_UPDATE(conversationId)}?${params}`, {
        method: 'POST',
        headers: API_HEADERS.JSON,
        body: JSON.stringify(sanitizedUpdates)
      });

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 501) {
          console.warn(`⚠️ Update not implemented on server for conversation ${conversationId}. Skipping update.`);
          // Return a mock success response to prevent frontend errors
          return {
            success: true,
            message: 'Update skipped - not implemented on server',
            data: { 
              id: conversationId, 
              ...updates,
              updated_at: new Date().toISOString()
            }
          };
        } else if (response.status === 500) {
          console.warn(`⚠️ Server error updating conversation ${conversationId}. Continuing without update.`);
          // Return a mock success to prevent UI breakage
          return {
            success: true,
            message: 'Update skipped due to server error',
            data: { 
              id: conversationId, 
              ...updates,
              updated_at: new Date().toISOString()
            }
          };
        }
        
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedConversation = await response.json();
      return updatedConversation;

    } catch (error) {
      console.error('❌ Failed to update conversation:', error);
      
      // For network errors, also provide fallback
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        console.warn(`⚠️ Network error updating conversation ${conversationId}. Continuing without update.`);
        return {
          success: false,
          message: 'Network error - update skipped',
          data: { 
            id: conversationId, 
            ...updates,
            updated_at: new Date().toISOString()
          }
        };
      }
      
      throw error;
    }
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(conversationId, messageType, content, metadata = {}, referenceLinks = [], chatId = null) {
    try {
      if (!this.defaultUserId) {
        throw new Error('domainId_not_set');
      }
      
      const messageData = {
        message_type: messageType, // 'user' or 'assistant'
        content: content,
        chat_id: chatId, // Frontend chat bubble ID for feedback mapping
        metadata: {
          timestamp: new Date().toISOString(),
          ...metadata
        },
        reference_links: referenceLinks
      };

      // Add user_id as query parameter (required by backend)
      const url = `${API_ENDPOINTS.CONVERSATION_MESSAGES(conversationId)}?domain_id=${this.defaultUserId}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: API_HEADERS.JSON,
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ NETWORK: Error response body:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const message = await response.json();
      return message;

    } catch (error) {
      console.error('❌ Failed to add message:', error);
      throw error;
    }
  }

  /**
   * Add multiple messages at once (bulk operation)
   */
  async addBulkMessages(conversationId, messages) {
    try {
      const bulkData = {
        conversation_id: conversationId,
        messages: messages.map(msg => ({
          message_type: msg.type,
          content: msg.content,
          metadata: {
            timestamp: new Date().toISOString(),
            ...msg.metadata
          },
          reference_links: msg.referenceLinks || []
        }))
      };

      const response = await fetch(API_ENDPOINTS.CONVERSATION_MESSAGES_BULK(conversationId), {
        method: 'POST',
        headers: API_HEADERS.JSON,
        body: JSON.stringify(bulkData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('❌ Failed to add bulk messages:', error);
      throw error;
    }
  }

  /**
   * Update existing message content (for regenerated responses)
   */
  async updateMessageContent(conversationId, chatId, newContent, metadata = {}) {
    try {
      if (!this.defaultUserId) {
        throw new Error('domainId_not_set');
      }
      console.log('🔄 Updating message content:', {
        conversationId,
        chatId,
        contentPreview: newContent.substring(0, 100) + '...',
        metadata
      });

      const messageData = {
        message_type: 'assistant', // Regenerated messages are always assistant responses
        content: newContent,
        metadata: {
          timestamp: new Date().toISOString(),
          regenerated: true,
          ...metadata
        }
      };

      const url = `${API_ENDPOINTS.CONVERSATION_MESSAGE_UPDATE(conversationId, chatId)}?domain_id=${this.defaultUserId}`;
      console.log('📤 UPDATE REQUEST:', url);

      const response = await fetch(url, {
        method: 'POST',
        headers: API_HEADERS.JSON,
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Update error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const updatedMessage = await response.json();
      console.log('✅ Message updated successfully:', updatedMessage);
      return updatedMessage;

    } catch (error) {
      console.error('❌ Failed to update message content:', error);
      throw error;
    }
  }

  /**
   * Search conversations by title
   */
  async searchConversations(searchQuery, limit = 20) {
    try {
      if (!this.defaultUserId) {
        throw new Error('domainId_not_set');
      }
      const params = new URLSearchParams({
        domain_id: this.defaultUserId,
        query: searchQuery,
        limit: limit.toString()
      });

      const response = await fetch(`${API_ENDPOINTS.CONVERSATION_SEARCH}?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const searchResults = await response.json();
      return searchResults;

    } catch (error) {
      console.error('❌ Failed to search conversations:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for the current user with pagination
   * Compatible with remote EKS backend API
   */
  async getUserConversations(limit = 50, offset = 0, orderBy = 'updated_at', orderDirection = 'DESC') {
    try {
      if (!this.defaultUserId) {
        throw new Error('domainId_not_set');
      }
      // Build basic parameters first
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });

      // Only add ordering parameters if they're supported by remote API
      // For now, let's test without ordering to ensure basic functionality works
      const url = `${API_ENDPOINTS.USER_CONVERSATIONS(this.defaultUserId)}?${params}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ API Error Response:`, errorText);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorText}`);
      }

      const conversations = await response.json();
      
      // Handle different response formats
      let conversationArray = conversations;
      if (conversations && conversations.conversations) {
        conversationArray = conversations.conversations;
      } else if (conversations && conversations.data) {
        conversationArray = conversations.data;
      }
      
      if (!Array.isArray(conversationArray)) {
        console.warn('⚠️ Unexpected response format:', conversations);
        return [];
      }

      console.log(`👤 Retrieved ${conversationArray.length} conversations for user (offset: ${offset}, limit: ${limit})`);
      return conversationArray;

    } catch (error) {
      console.error('❌ Failed to get user conversations:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Update user session with active conversation
   */
  async updateUserSession(activeConversationId, metadata = {}) {
    try {
      if (!this.defaultUserId) {
        throw new Error('domainId_not_set');
      }
      const sessionData = {
        active_conversation_id: activeConversationId,
        metadata: {
          last_updated: new Date().toISOString(),
          ...metadata
        }
      };

      const response = await fetch(API_ENDPOINTS.USER_SESSION(this.defaultUserId), {
        method: 'PUT',
        headers: API_HEADERS.JSON,
        body: JSON.stringify(sessionData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const session = await response.json();
      return session;

    } catch (error) {
      console.error('❌ Failed to update user session:', error);
      throw error;
    }
  }

  /**
   * Delete a conversation
   * Uses POST with action=delete as workaround for Akamai EdgeSuite blocking DELETE method
   */
  async deleteConversation(conversationId) {
    try {
      if (!this.defaultUserId) {
        throw new Error('domainId_not_set');
      }
      console.log('🗑️ DELETE API: Deleting conversation:', conversationId);
      console.log('🗑️ DELETE API: Using domain_id:', this.defaultUserId);
      
      // Use new POST delete endpoint for better compatibility
      const deleteUrl = `${API_ENDPOINTS.CONVERSATION_DELETE(conversationId)}?domain_id=${this.defaultUserId}`;
      console.log('🗑️ DELETE API: POST delete URL:', deleteUrl);
      
      const response = await fetch(deleteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('🗑️ DELETE API: POST response status:', response.status);
        
      if (response.ok) {
        const result = await response.json();
        console.log('✅ DELETE API: POST success response:', result);
        return {
          success: true,
          conversationId: conversationId,
          message: result.message || 'Conversation deleted successfully'
        };
      } else {
        const errorText = await response.text();
        console.error('❌ DELETE API: POST method failed:', errorText);
        throw new Error(`Delete failed with status ${response.status}: ${errorText}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to delete conversation:', error);
      return {
        success: false,
        error: error.message,
        conversationId: conversationId
      };
    }
  }

  /**
   * Save a complete chat interaction (question + response)
   */
  async saveChatInteraction(questionText, responseText, metadata = {}) {
    try {
      // 🎯 Generate conversation title via API (with fallback to first 50 chars if API fails)
      const title = await generateConversationTitle(questionText, this.defaultUserId);

      // Create conversation
      const conversation = await this.createConversation(title, null, metadata);

      // Add user question
      await this.addMessage(
        conversation.id, 
        'user', 
        questionText, 
        { ...metadata, type: 'user_question' }
      );

      // Add assistant response
      await this.addMessage(
        conversation.id, 
        'assistant', 
        responseText, 
        { ...metadata, type: 'assistant_response' }
      );

      // Update user session to track this as the active conversation
      await this.updateUserSession(conversation.id, { last_interaction: 'chat' });

      return conversation;

    } catch (error) {
      console.error('❌ Failed to save chat interaction:', error);
      throw error;
    }
  }

  /**
   * Update message feedback (like/dislike/text)
   * @param {string} conversationId - The conversation ID
   * @param {string} messageId - The message ID
   * @param {Object} feedbackData - Feedback data
   * @param {number} feedbackData.liked - Feedback value (-1=dislike, 0=neutral, 1=like)
   * @param {string} [feedbackData.feedback_text] - Optional feedback text
   */
  async updateMessageFeedback(conversationId, messageId, feedbackData) {
    try {
      if (!this.defaultUserId) {
        throw new Error('domainId_not_set');
      }
      // Skip API call for local conversations
      if (conversationId && conversationId.startsWith('local_')) {
        return { 
          success: true, 
          message: 'Local conversation feedback noted - not persisted beyond session',
          local: true,
          conversationId,
          messageId,
          feedbackData
        };
      }

      const url = `${API_ENDPOINTS.MESSAGE_FEEDBACK(conversationId, messageId)}?domain_id=${this.defaultUserId}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: API_HEADERS.JSON,
        body: JSON.stringify(feedbackData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', response.status, errorText);
        throw new Error(`Failed to update message feedback: ${response.status} ${errorText}`);
      }

      const result = await response.json();
      
      return result;

    } catch (error) {
      console.error('❌ Failed to update message feedback:', error);
      throw error;
    }
  }

  /**
   * Update message feedback with better fallback handling
   * @param {string} conversationId - The conversation ID
   * @param {string} messageId - The message ID (could be db ID or chat_id)
   * @param {Object} feedbackData - Feedback data
   * @param {string} [chatId] - Optional chat_id for fallback
   */
  async updateMessageFeedbackImproved(conversationId, messageId, feedbackData, chatId = null) {
    try {
      if (!this.defaultUserId) {
        throw new Error('domainId_not_set');
      }
      // Skip API call for local conversations
      if (conversationId && conversationId.startsWith('local_')) {
        return { 
          success: true, 
          message: 'Local conversation feedback noted - not persisted beyond session',
          local: true,
          conversationId,
          messageId,
          feedbackData
        };
      }

      // Try message ID endpoint first
      try {
        const url = `${API_ENDPOINTS.MESSAGE_FEEDBACK(conversationId, messageId)}?domain_id=${this.defaultUserId}`;
        
        console.log('🔄 Trying message feedback API:', url);
        
        const response = await fetch(url, {
          method: 'POST',
          headers: API_HEADERS.JSON,
          body: JSON.stringify(feedbackData)
        });

        if (response.ok) {
          const result = await response.json();
          console.log('✅ Message feedback API success:', result);
          return result;
        }
        
        console.warn('⚠️ Message feedback failed:', response.status);
        throw new Error(`Message API failed: ${response.status}`);
        
      } catch (messageApiError) {
        console.warn('⚠️ Message API failed, trying chat API...', messageApiError.message);
        
        // If message API failed and we have a chat_id, try chat API
        if (chatId) {
          const chatUrl = `${API_ENDPOINTS.CHAT_FEEDBACK(conversationId, chatId)}?domain_id=${this.defaultUserId}`;
          
          console.log('🔄 Trying chat feedback API:', chatUrl);
          
          const chatResponse = await fetch(chatUrl, {
            method: 'POST',
            headers: API_HEADERS.JSON,
            body: JSON.stringify(feedbackData)
          });

          if (chatResponse.ok) {
            const result = await chatResponse.json();
            console.log('✅ Chat feedback API success:', result);
            return result;
          } else {
            const errorText = await chatResponse.text();
            throw new Error(`Both APIs failed. Chat API: ${chatResponse.status} ${errorText}`);
          }
        }
        
        // If no chat_id available, throw the original error
        throw messageApiError;
      }

    } catch (error) {
      console.error('❌ Failed to update feedback (all attempts):', error);
      throw error;
    }
  }

  /**
   * Helper: Estimate token count (simple approximation)
   */
  estimateTokenCount(text) {
    if (!text) return 0;
    // Rough approximation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Helper: Format conversation for display
   * Compatible with different database schemas (handles missing columns)
   */
  formatConversationForDisplay(conversation) {
    return {
      id: conversation.id,
      title: conversation.title || 'Untitled Conversation',
      summary: conversation.summary || null,
      messageCount: conversation.message_count || conversation.messages?.length || 0,
      // Use created_at as fallback if updated_at doesn't exist
      lastUpdated: conversation.updated_at || conversation.created_at || new Date().toISOString(),
      createdAt: conversation.created_at || new Date().toISOString(),
      isActive: conversation.status === 'active' || true // Default to active if status field doesn't exist
    };
  }

  /**
   * Get recent conversations with formatted display data and optional pagination
   * Compatible with remote EKS backend API
   */
  async getRecentConversations(limit = 20, offset = 0, includeMessageCount = true) {
    try {
      const conversations = await this.getUserConversations(limit, offset, 'updated_at', 'DESC');
      
      if (!Array.isArray(conversations)) {
        console.warn('⚠️ API returned non-array response:', conversations);
        return [];
      }
      
      const formatted = conversations.map(conv => {
        try {
          const formatted = this.formatConversationForDisplay(conv);
          
          // Add pagination info if this is not the first page
          if (offset > 0) {
            formatted.isLoadMore = true;
            formatted.offset = offset;
          }
          
          return formatted;
        } catch (error) {
          console.error('❌ Failed to format conversation:', conv, error);
          return null;
        }
      }).filter(conv => conv !== null); // Remove any failed formatting attempts
      
      return formatted;
    } catch (error) {
      console.error('❌ Failed to get recent conversations:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      return [];
    }
  }

  /**
   * Unified storage function for questions and responses
   * Handles both question and response storage with appropriate payloads
   */
  async storeConversationData(type, conversationId, content, options = {}) {
    try {
      const {
        chatId = null,
        metadata = {},
        referenceLinks = [],
        isNewConversation = false,
        questionText = null
      } = options;

      let messageType, messageMetadata;

      switch (type) {
        case 'question':
        case 'user_question':
          messageType = 'user';
          messageMetadata = {
            source: 'user_input',
            timestamp: new Date().toISOString(),
            is_first_message: isNewConversation,
            ...metadata
          };
          break;

        case 'response':
        case 'assistant_response':
          messageType = 'assistant';
          messageMetadata = {
            source: 'ai_assistant',
            timestamp: new Date().toISOString(),
            question_context: questionText,
            response_type: 'complete',
            ...metadata
          };
          break;

        default:
          throw new Error(`Unsupported storage type: ${type}`);
      }

      // Use the existing addMessage function for actual storage
      const result = await this.addMessage(
        conversationId,
        messageType,
        content,
        messageMetadata,
        referenceLinks,
        chatId
      );

      console.log(`✅ Successfully stored ${type}:`, { conversationId, chatId });
      return result;

    } catch (error) {
      console.error(`❌ Failed to store ${type}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
export const conversationStorage = new ConversationStorageService();
export default conversationStorage;
