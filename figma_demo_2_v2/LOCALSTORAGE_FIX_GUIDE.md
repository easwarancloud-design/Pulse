# Conversation Loading Fix - localStorage + API Integration

## Requirements Summary

1. **On page refresh**: Clear localStorage → Load from API → Save to localStorage (including feedback & reference links)
2. **On title click**: Load from localStorage ONLY (instant load, no API call) 
3. **localStorage must include**: Messages, like/dislike feedback, reference links, metadata
4. **When loading from API**: Automatically save to localStorage for future use

## Changes Needed

### 1. Update localConversationManager.js

Add new method to save conversation WITH feedback data:

```javascript
/**
 * Save complete conversation with feedback and reference links
 */
saveCompleteConversationWithFeedback(conversationId, title, messages, feedbackData) {
  try {
    console.log('💾 Saving complete conversation with feedback to localStorage:', {
      conversationId,
      title,
      messageCount: messages?.length || 0,
      feedbackData
    });

    // Convert messages to localStorage format (already includes referenceLinks, liked, etc.)
    const localMessages = messages?.map((message) => ({
      id: message.id,
      type: message.type,
      text: message.text,
      timestamp: message.timestamp,
      chat_id: message.chat_id,
      referenceLinks: message.referenceLinks || [],  // Include reference links
      metadata: message.metadata || {},
      liked: message.liked || 0,  // Include feedback
      feedback_text: message.feedback_text || null,
      feedback_at: message.feedback_at || null,
      completed: message.completed !== undefined ? message.completed : true
    })) || [];

    const conversation = {
      id: conversationId,
      title: title || 'Conversation',
      messages: localMessages,
      lastUpdated: Date.now(),
      source: 'api',  // Mark as coming from API
      feedback: feedbackData || {  // Store feedback data separately too
        likedMessages: [],
        dislikedMessages: []
      }
    };

    localStorage.setItem(
      this.storagePrefix + conversationId,
      JSON.stringify(conversation)
    );

    console.log('✅ Complete conversation with feedback saved to localStorage');
    return conversation;
  } catch (error) {
    console.error('❌ Failed to save complete conversation with feedback:', error);
    return null;
  }
}

/**
 * Delete conversation from localStorage
 */
deleteLocalConversation(conversationId) {
  try {
    localStorage.removeItem(this.storagePrefix + conversationId);
    console.log('🗑️ Deleted conversation from localStorage:', conversationId);
    return true;
  } catch (error) {
    console.error('❌ Failed to delete from localStorage:', error);
    return false;
  }
}
```

### 2. Update ChatPage.jsx - Page Refresh Logic

In the `loadConversationFromUrl` function (line ~1443):

**CHANGE THIS LINE**:
```javascript
const conversation = await conversationLoader.loadConversation(urlConversationId, {
  forceRefresh: false,  // Use cache if available  ← WRONG
```

**TO THIS**:
```javascript
// CLEAR localStorage for this conversation on page refresh
console.log('🔄 Page refresh detected - clearing localStorage and loading from API');
localConversationManager.deleteLocalConversation(urlConversationId);

// Load fresh data from API
const conversation = await conversationLoader.loadConversation(urlConversationId, {
  forceRefresh: true,   // Force fresh data from API on page load ← CORRECT
```

**AFTER loading from API, ADD THIS** (after line ~1505 where it saves feedback):
```javascript
// Save to localStorage for persistence
saveFeedbackToStorage('liked', likedSet);
saveFeedbackToStorage('disliked', dislikedSet);

// SAVE complete conversation to localStorage (including feedback & reference links)
console.log('💾 Saving API data to localStorage for future instant load');
localConversationManager.saveCompleteConversationWithFeedback(
  urlConversationId,
  conversation.title || 'Conversation',
  uiMessages,  // Already includes referenceLinks, feedback, metadata
  {
    likedMessages: [...likedSet],
    dislikedMessages: [...dislikedSet]
  }
);
```

### 3. Add Function to Load from localStorage

Add this NEW function in ChatPage.jsx (around line ~1400, before loadConversationFromUrl):

```javascript
/**
 * Load conversation from localStorage (instant load, no API call)
 * Used when clicking on conversation title
 */
const loadConversationFromLocalStorage = async (conversationId) => {
  try {
    console.log('💾 Loading conversation from localStorage (instant):', conversationId);
    
    // Get from localStorage
    const localConv = localConversationManager.getLocalConversation(conversationId);
    
    if (!localConv || !localConv.messages || localConv.messages.length === 0) {
      console.warn('⚠️ No localStorage data found, falling back to API');
      // If no localStorage data, navigate to URL (which will trigger API load)
      window.location.href = `/?conversationId=${conversationId}`;
      return;
    }
    
    console.log('✅ Found in localStorage:', {
      messageCount: localConv.messages.length,
      title: localConv.title,
      hasFeedback: !!localConv.feedback
    });
    
    // Set active conversation
    hybridChatService.setActiveConversation(conversationId);
    
    // Extract feedback data
    const likedSet = new Set();
    const dislikedSet = new Set();
    
    // Convert localStorage messages to UI format
    const uiMessages = localConv.messages.map((msg, index) => {
      // Extract feedback
      if (msg.liked === 1) {
        likedSet.add(msg.id);
      } else if (msg.liked === -1) {
        dislikedSet.add(msg.id);
      }
      
      return {
        id: msg.id,
        type: msg.type,
        text: msg.text,
        chat_id: msg.chat_id,
        completed: msg.completed !== undefined ? msg.completed : true,
        timestamp: msg.timestamp,
        referenceLinks: msg.referenceLinks || [],  // Include reference links
        metadata: msg.metadata || {},
        liked: msg.liked || 0,
        feedback_text: msg.feedback_text || null,
        feedback_at: msg.feedback_at || null
      };
    });
    
    // Update UI state
    setMessages(uiMessages);
    setLikedMessages(likedSet);
    setDislikedMessages(dislikedSet);
    
    // Set reference links from last assistant message
    const lastAssistantMessage = uiMessages
      .filter(msg => msg.type === 'assistant')
      .pop();
    
    if (lastAssistantMessage?.referenceLinks?.length > 0) {
      setCurrentReferenceLinks(lastAssistantMessage.referenceLinks);
    }
    
    console.log('✅ Conversation loaded from localStorage:', {
      messageCount: uiMessages.length,
      likedCount: likedSet.size,
      dislikedCount: dislikedSet.size,
      hasReferenceLinks: lastAssistantMessage?.referenceLinks?.length > 0
    });
    
  } catch (error) {
    console.error('❌ Failed to load from localStorage:', error);
    // Fallback to API
    window.location.href = `/?conversationId=${conversationId}`;
  }
};
```

### 4. Update App.js - Title Click Handler

In App.js, find the conversation title click handler (around line ~330):

**CHANGE FROM** (calls API):
```javascript
const handleChatClick = async (thread) => {
  // Currently calls API or uses local data
  const localData = localConversationManager.getLocalConversation(thread.id);
  // ... complex logic ...
};
```

**TO** (just navigate, ChatPage will load from localStorage):
```javascript
const handleChatClick = (thread) => {
  console.log('📌 Conversation title clicked:', thread.id);
  
  // Just navigate - ChatPage will load from localStorage (instant)
  // If localStorage not found, ChatPage will fallback to API
  navigate(`/?conversationId=${thread.id}`);
};
```

## Implementation Steps

### Step 1: Update localConversationManager.js
Add the two new methods:
- `saveCompleteConversationWithFeedback()`
- `deleteLocalConversation()`

### Step 2: Update ChatPage.jsx
1. Add `loadConversationFromLocalStorage()` function
2. Modify `loadConversationFromUrl()` to:
   - Clear localStorage on page load
   - Force API refresh
   - Save API data to localStorage
3. Add logic to check if URL has `conversationId` but should load from localStorage

### Step 3: Update App.js
Simplify the title click handler to just navigate (let ChatPage handle the loading)

### Step 4: Test Flow

**Test 1: Page Refresh**
1. Open conversation: `/?conversationId=conv_abc`
2. Page loads → Should see console: "🔄 Page refresh detected - clearing localStorage"
3. Loads from API → Should see console: "💾 Saving API data to localStorage"
4. Messages should include feedback and reference links

**Test 2: Title Click (second time)**
1. Click on conversation title in sidebar
2. Should load INSTANTLY from localStorage
3. Should see console: "💾 Loading conversation from localStorage (instant)"
4. Should include like/dislike feedback and reference links
5. Network tab should show NO API call

**Test 3: First Time Title Click (no localStorage)**
1. Click on conversation never opened before
2. Falls back to API
3. Saves to localStorage for next time

## Benefits

✅ **Instant load on title click** - No API delay
✅ **Fresh data on page refresh** - Always up-to-date
✅ **Includes feedback** - Like/dislike state preserved
✅ **Includes reference links** - All data available offline
✅ **Fallback to API** - If localStorage missing/corrupted
✅ **Reduces server load** - Fewer API calls

## File Locations

- `src/services/localConversationManager.js` - Add new methods
- `src/ChatPage.jsx` - Modify load logic (lines 1443-1550)
- `src/App.js` - Simplify title click handler (line ~330)

---

**Implementation Note**: Since the changes span multiple functions with Unicode characters causing tool issues, it's recommended to:
1. Make these changes manually following the code snippets above
2. Test each step incrementally
3. Use browser console to verify localStorage operations
