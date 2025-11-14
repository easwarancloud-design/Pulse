// Local storage utility for workforce agent chat history
export class LocalChatHistory {
  constructor() {
    this.storageKey = 'workforceAgentHistory';
    this.maxEntries = 100;
  }

  // Save a chat entry
  saveChatEntry(entry) {
    try {
      const history = this.getHistory();
      const chatEntry = {
        chat_id: entry.chat_id || this.generateUUID(),
        session_id: entry.session_id || Date.now().toString(),
        domain_id: entry.domain_id || 'AG40333',
        question_text: entry.question_text || '',
        response_text: entry.response_text || '',
        chat_type: entry.chat_type || 'bot', // 'bot', 'agent', 'system'
        feedback_score: entry.feedback_score || 0,
        timestamp: entry.timestamp || new Date().toISOString(),
        title: entry.title || (entry.question_text?.length > 50 ? entry.question_text.substring(0, 50) + '...' : entry.question_text),
        category: this.getTimeCategory(entry.timestamp)
      };

      history.unshift(chatEntry);
      
      // Keep only max entries
      if (history.length > this.maxEntries) {
        history.splice(this.maxEntries);
      }

      localStorage.setItem(this.storageKey, JSON.stringify(history));
      return chatEntry;
    } catch (error) {
      console.error('Error saving chat entry:', error);
      return null;
    }
  }

  // Get all chat history
  getHistory() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error retrieving chat history:', error);
      return [];
    }
  }

  // Get history grouped by time categories
  getGroupedHistory() {
    const history = this.getHistory();
    const grouped = {
      today: [],
      yesterday: [],
      lastWeek: [],
      last30Days: [],
      older: []
    };

    history.forEach(entry => {
      const category = this.getTimeCategory(entry.timestamp);
      if (grouped[category]) {
        grouped[category].push(entry);
      } else {
        grouped.older.push(entry);
      }
    });

    return grouped;
  }

  // Get history by session ID
  getSessionHistory(sessionId) {
    const history = this.getHistory();
    return history.filter(entry => entry.session_id === sessionId);
  }

  // Search history by text
  searchHistory(searchText) {
    const history = this.getHistory();
    const lowercaseSearch = searchText.toLowerCase();
    
    return history.filter(entry => 
      entry.question_text?.toLowerCase().includes(lowercaseSearch) ||
      entry.response_text?.toLowerCase().includes(lowercaseSearch) ||
      entry.title?.toLowerCase().includes(lowercaseSearch)
    );
  }

  // Delete specific chat entry
  deleteChatEntry(chatId) {
    try {
      const history = this.getHistory();
      const filteredHistory = history.filter(entry => entry.chat_id !== chatId);
      localStorage.setItem(this.storageKey, JSON.stringify(filteredHistory));
      return true;
    } catch (error) {
      console.error('Error deleting chat entry:', error);
      return false;
    }
  }

  // Clear all history
  clearHistory() {
    try {
      localStorage.removeItem(this.storageKey);
      return true;
    } catch (error) {
      console.error('Error clearing history:', error);
      return false;
    }
  }

  // Update feedback score for a chat
  updateFeedback(chatId, feedbackScore) {
    try {
      const history = this.getHistory();
      const entry = history.find(entry => entry.chat_id === chatId);
      if (entry) {
        entry.feedback_score = feedbackScore;
        localStorage.setItem(this.storageKey, JSON.stringify(history));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error updating feedback:', error);
      return false;
    }
  }

  // Helper: Determine time category
  getTimeCategory(timestamp) {
    const now = new Date();
    const entryDate = new Date(timestamp);
    const diffTime = Math.abs(now - entryDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (this.isToday(entryDate, now)) {
      return 'today';
    } else if (this.isYesterday(entryDate, now)) {
      return 'yesterday';
    } else if (diffDays <= 7) {
      return 'lastWeek';
    } else if (diffDays <= 30) {
      return 'last30Days';
    } else {
      return 'older';
    }
  }

  // Helper: Check if date is today
  isToday(date, now = new Date()) {
    return date.toDateString() === now.toDateString();
  }

  // Helper: Check if date is yesterday
  isYesterday(date, now = new Date()) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return date.toDateString() === yesterday.toDateString();
  }

  // Helper: Generate UUID
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Export history as JSON
  exportHistory() {
    return JSON.stringify(this.getHistory(), null, 2);
  }

  // Import history from JSON
  importHistory(jsonData) {
    try {
      const importedHistory = JSON.parse(jsonData);
      if (Array.isArray(importedHistory)) {
        localStorage.setItem(this.storageKey, jsonData);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error importing history:', error);
      return false;
    }
  }
}

// Create singleton instance
export const localChatHistory = new LocalChatHistory();
export default localChatHistory;