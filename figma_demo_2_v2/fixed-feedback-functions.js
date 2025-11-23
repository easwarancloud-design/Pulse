// Fixed feedback functions for ChatPage.jsx

const handleLike = async (message) => {
  const messageId = message.id;
  const isCurrentlyLiked = likedMessages.has(messageId);
  const newLikedValue = isCurrentlyLiked ? 0 : 1; // Toggle between neutral (0) and like (1)
  
  console.log('👍 Like clicked:', { 
    message, 
    messageId, 
    chatId: message.chat_id, 
    isCurrentlyLiked, 
    newLikedValue,
    conversationId: hybridChatService.getCurrentConversationId()
  });
  
  // Update UI state immediately and persist to localStorage
  const newLikedSet = new Set(likedMessages);
  const newDislikedSet = new Set(dislikedMessages);
  
  if (isCurrentlyLiked) {
    newLikedSet.delete(messageId);
  } else {
    newLikedSet.add(messageId);
    // Remove dislike if exists (mutual exclusion)
    newDislikedSet.delete(messageId);
  }
  
  // Update states
  setLikedMessages(newLikedSet);
  if (!isCurrentlyLiked) {
    setDislikedMessages(newDislikedSet);
  }
  
  // Persist to localStorage immediately
  saveFeedbackToStorage('liked', newLikedSet);
  if (!isCurrentlyLiked) {
    saveFeedbackToStorage('disliked', newDislikedSet);
  }

  // Store feedback in backend (best effort, don't revert UI on failure)
  try {
    const conversationId = hybridChatService.getCurrentConversationId();
    const chatId = message.chat_id;
    
    console.log('🔍 Like Feedback attempt:', {
      conversationId,
      messageId,
      chatId,
      hasConversationStorage: !!conversationStorage
    });
    
    if (conversationStorage && conversationId) {
      // Use chat_id approach if available, otherwise fall back to message_id
      if (chatId) {
        console.log('📡 Using chat_id approach for LIKE:', chatId);
        const result = await conversationStorage.updateMessageFeedbackImproved(
          conversationId,
          messageId, // This will fail but trigger fallback
          { liked: newLikedValue },
          chatId
        );
        console.log('✅ Like feedback stored via chat_id:', result);
      } else {
        console.log('📡 Using message_id approach for LIKE (no chat_id available)');
        const result = await conversationStorage.updateMessageFeedback(
          conversationId,
          messageId,
          { liked: newLikedValue }
        );
        console.log('✅ Like feedback stored via message_id:', result);
      }
    } else {
      console.log('⚠️ Skipping like feedback - missing conversationStorage or conversationId');
    }
  } catch (error) {
    console.error('❌ Failed to store like feedback:', error);
    // Optionally revert UI state on error
    setLikedMessages(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyLiked) {
        newSet.add(messageId);
      } else {
        newSet.delete(messageId);
      }
      return newSet;
    });
  }
};

const handleDislike = async (message) => {
  const messageId = message.id;
  const isCurrentlyDisliked = dislikedMessages.has(messageId);
  const newLikedValue = isCurrentlyDisliked ? 0 : -1; // Toggle between neutral (0) and dislike (-1)
  
  console.log('👎 Dislike clicked:', { 
    message, 
    messageId, 
    chatId: message.chat_id, 
    isCurrentlyDisliked, 
    newLikedValue,
    conversationId: hybridChatService.getCurrentConversationId()
  });
  
  // Update UI state immediately and persist to localStorage
  const newDislikedSet = new Set(dislikedMessages);
  const newLikedSet = new Set(likedMessages);
  
  if (isCurrentlyDisliked) {
    newDislikedSet.delete(messageId);
  } else {
    newDislikedSet.add(messageId);
    // Remove like if exists (mutual exclusion)
    newLikedSet.delete(messageId);
  }
  
  // Update states
  setDislikedMessages(newDislikedSet);
  if (!isCurrentlyDisliked) {
    setLikedMessages(newLikedSet);
  }
  
  // Persist to localStorage immediately
  saveFeedbackToStorage('disliked', newDislikedSet);
  if (!isCurrentlyDisliked) {
    saveFeedbackToStorage('liked', newLikedSet);
  }

  // Store feedback in backend (best effort, don't revert UI on failure)
  try {
    const conversationId = hybridChatService.getCurrentConversationId();
    const chatId = message.chat_id;
    
    console.log('🔍 Dislike Feedback attempt:', {
      conversationId,
      messageId,
      chatId,
      hasConversationStorage: !!conversationStorage
    });
    
    if (conversationStorage && conversationId) {
      // Use chat_id approach if available, otherwise fall back to message_id
      if (chatId) {
        console.log('📡 Using chat_id approach for DISLIKE:', chatId);
        const result = await conversationStorage.updateMessageFeedbackImproved(
          conversationId,
          messageId, // This will fail but trigger fallback
          { liked: newLikedValue },
          chatId
        );
        console.log('✅ Dislike feedback stored via chat_id:', result);
      } else {
        console.log('📡 Using message_id approach for DISLIKE (no chat_id available)');
        const result = await conversationStorage.updateMessageFeedback(
          conversationId,
          messageId,
          { liked: newLikedValue }
        );
        console.log('✅ Dislike feedback stored via message_id:', result);
      }
    } else {
      console.log('⚠️ Skipping dislike feedback - missing conversationStorage or conversationId');
    }
  } catch (error) {
    console.error('❌ Failed to store dislike feedback:', error);
    // Optionally revert UI state on error
    setDislikedMessages(prev => {
      const newSet = new Set(prev);
      if (isCurrentlyDisliked) {
        newSet.add(messageId);
      } else {
        newSet.delete(messageId);
      }
      return newSet;
    });
  }
};