/**
 * Conversation Storage Service
 * Handles all conversation storage, retrieval, and search operations with local FastAPI server
 */

import { API_ENDPOINTS, API_HEADERS } from '../config/api';

export class ConversationStorageService {
  constructor() {
    this.baseURL = API_ENDPOINTS.CONVERSATIONS;
    this.defaultUserId = 'AG04333'; // Default domain ID - will be updated when setUserId is called
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
        console.log('🏥 Conversation API Health:', data);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('⚠️ Local conversation API not available, falling back to localStorage');
      return false;
    }
  }

  /**
   * Create a new conversation
   */
  async createConversation(title, summary = null, metadata = {}) {
    try {
      const conversationData = {
        user_id: this.defaultUserId,
        title: title || 'New Conversation',
        summary: summary,
        metadata: {
          created_from: 'chat_interface',
          ...metadata
        }
      };

      console.log('🌐 Making createConversation API request...');
      console.log('URL:', API_ENDPOINTS.CONVERSATIONS);
      console.log('Method: POST');
      console.log('Headers:', API_HEADERS.JSON);
      console.log('Payload:', JSON.stringify(conversationData, null, 2));

      const response = await fetch(API_ENDPOINTS.CONVERSATIONS, {
        method: 'POST',
        headers: API_HEADERS.JSON,
        body: JSON.stringify(conversationData)
      });

      console.log('📡 createConversation Response status:', response.status);
      console.log('📡 createConversation Response headers:', [...response.headers]);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const conversation = await response.json();
      console.log('✅ Created conversation successfully:', conversation);
      return conversation;

    } catch (error) {
      console.error('❌ Failed to create conversation:', error);
      throw error;
    }
  }

  /**
   * Get a conversation by ID with all messages
   */
  async getConversation(conversationId, includeMessages = true) {
    try {
      const url = `${API_ENDPOINTS.CONVERSATION_BY_ID(conversationId)}?include_messages=${includeMessages}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const conversation = await response.json();
      console.log('📖 Retrieved conversation:', conversation.title);
      return conversation;

    } catch (error) {
      console.error('❌ Failed to get conversation:', error);
      throw error;
    }
  }

  /**
   * Update a conversation
   */
  async updateConversation(conversationId, updates) {
    try {
      const response = await fetch(API_ENDPOINTS.CONVERSATION_BY_ID(conversationId), {
        method: 'PUT',
        headers: API_HEADERS.JSON,
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const updatedConversation = await response.json();
      console.log('✏️ Updated conversation:', conversationId);
      return updatedConversation;

    } catch (error) {
      console.error('❌ Failed to update conversation:', error);
      throw error;
    }
  }

  /**
   * Add a message to a conversation
   */
  async addMessage(conversationId, messageType, content, metadata = {}, referenceLinks = []) {
    try {
      console.log('🔄 NETWORK: Preparing to add message to conversation');
      console.log('📝 Message details:', {
        conversationId,
        messageType,
        content: content.substring(0, 100) + '...',
        metadata
      });
      
      const messageData = {
        conversation_id: conversationId,
        message_type: messageType, // 'user' or 'assistant'
        content: content,
        metadata: {
          timestamp: new Date().toISOString(),
          ...metadata
        },
        token_count: this.estimateTokenCount(content),
        reference_links: referenceLinks
      };

      const url = API_ENDPOINTS.CONVERSATION_MESSAGES(conversationId);
      console.log('🌐 NETWORK: Making POST request to:', url);
      console.log('📤 NETWORK: Request payload:', JSON.stringify(messageData, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers: API_HEADERS.JSON,
        body: JSON.stringify(messageData)
      });

      console.log('📥 NETWORK: Response status:', response.status);
      console.log('📥 NETWORK: Response headers:', [...response.headers.entries()]);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ NETWORK: Error response body:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
      }

      const message = await response.json();
      console.log('💬 Added message to conversation:', conversationId);
      console.log('✅ NETWORK: Success response:', message);
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
          token_count: this.estimateTokenCount(msg.content),
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
      console.log('📦 Added bulk messages:', result.created_messages.length);
      return result;

    } catch (error) {
      console.error('❌ Failed to add bulk messages:', error);
      throw error;
    }
  }

  /**
   * Search conversations by title
   */
  async searchConversations(searchQuery, limit = 20) {
    try {
      const params = new URLSearchParams({
        user_id: this.defaultUserId,
        query: searchQuery,
        limit: limit.toString()
      });

      const response = await fetch(`${API_ENDPOINTS.CONVERSATION_SEARCH}?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const searchResults = await response.json();
      console.log(`🔍 Found ${searchResults.conversations.length} conversations matching: "${searchQuery}"`);
      return searchResults;

    } catch (error) {
      console.error('❌ Failed to search conversations:', error);
      throw error;
    }
  }

  /**
   * Get all conversations for the current user
   */
  async getUserConversations(limit = 50, offset = 0) {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });

      const response = await fetch(`${API_ENDPOINTS.USER_CONVERSATIONS(this.defaultUserId)}?${params}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const conversations = await response.json();
      console.log(`👤 Retrieved ${conversations.length} conversations for user`);
      return conversations;

    } catch (error) {
      console.error('❌ Failed to get user conversations:', error);
      throw error;
    }
  }

  /**
   * Update user session with active conversation
   */
  async updateUserSession(activeConversationId, metadata = {}) {
    try {
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
      console.log('🔐 Updated user session');
      return session;

    } catch (error) {
      console.error('❌ Failed to update user session:', error);
      throw error;
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(conversationId) {
    try {
      const response = await fetch(`${API_ENDPOINTS.CONVERSATION_BY_ID(conversationId)}?user_id=${this.defaultUserId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log('🗑️ Deleted conversation:', conversationId);
      return true;

    } catch (error) {
      console.error('❌ Failed to delete conversation:', error);
      throw error;
    }
  }

  /**
   * Save a complete chat interaction (question + response)
   */
  async saveChatInteraction(questionText, responseText, metadata = {}) {
    try {
      // Extract or generate conversation title from question
      const title = questionText.length > 50 
        ? questionText.substring(0, 50) + '...' 
        : questionText;

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

      console.log('💾 Saved complete chat interaction');
      return conversation;

    } catch (error) {
      console.error('❌ Failed to save chat interaction:', error);
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
   */
  formatConversationForDisplay(conversation) {
    return {
      id: conversation.id,
      title: conversation.title,
      summary: conversation.summary,
      messageCount: conversation.message_count || conversation.messages?.length || 0,
      lastUpdated: conversation.updated_at,
      createdAt: conversation.created_at,
      isActive: conversation.status === 'active'
    };
  }

  /**
   * Get recent conversations with formatted display data
   */
  async getRecentConversations(limit = 20) {
    try {
      const conversations = await this.getUserConversations(limit, 0);
      return conversations.map(conv => this.formatConversationForDisplay(conv));
    } catch (error) {
      console.error('❌ Failed to get recent conversations:', error);
      return [];
    }
  }
}

// Create singleton instance
export const conversationStorage = new ConversationStorageService();
export default conversationStorage;