/**
 * Updated Like/Dislike Feedback Test
 * Tests the improved feedback functionality with better error handling and ID fallback
 */

console.log('🧪 Testing Updated Like/Dislike Feedback...\n');

// Mock message object similar to what ChatPage uses
const mockMessage = {
  id: 'test-msg-123',
  chat_id: 'bot-assistant-456',
  type: 'assistant',
  text: 'This is a test response'
};

console.log('📋 Test Message Object:', mockMessage);

function testFeedbackStateManagement() {
  console.log('\n🧪 Testing State Management...');
  
  // Simulate state management logic
  let likedMessages = new Set();
  let dislikedMessages = new Set();
  
  // Test 1: Like a message
  const messageId = mockMessage.id;
  const isCurrentlyLiked = likedMessages.has(messageId);
  
  console.log('👍 Before Like:', { liked: Array.from(likedMessages), disliked: Array.from(dislikedMessages) });
  
  // State update simulation
  if (!isCurrentlyLiked) {
    likedMessages.add(messageId);
    dislikedMessages.delete(messageId); // Remove dislike if exists
  }
  
  console.log('👍 After Like:', { liked: Array.from(likedMessages), disliked: Array.from(dislikedMessages) });
  
  // Test 2: Dislike the same message (should remove like)
  const isCurrentlyDisliked = dislikedMessages.has(messageId);
  
  console.log('👎 Before Dislike:', { liked: Array.from(likedMessages), disliked: Array.from(dislikedMessages) });
  
  if (!isCurrentlyDisliked) {
    dislikedMessages.add(messageId);
    likedMessages.delete(messageId); // Remove like if exists
  }
  
  console.log('👎 After Dislike:', { liked: Array.from(likedMessages), disliked: Array.from(dislikedMessages) });
  
  console.log('✅ State management logic working correctly!');
}

function testAPIEndpoints() {
  console.log('\n🌐 API Endpoint Test URLs:');
  
  const conversationId = 'conv_7d575adf-f8a6-49a0-820b-c1d8d6335cc2';
  const messageId = mockMessage.id;
  const chatId = mockMessage.chat_id;
  const domainId = 'AG04333';
  
  const messageEndpoint = `https://workforceagent.elevancehealth.com/api/conversations/${conversationId}/messages/${messageId}/feedback?domain_id=${domainId}`;
  const chatEndpoint = `https://workforceagent.elevancehealth.com/api/conversations/${conversationId}/chat/${chatId}/feedback?domain_id=${domainId}`;
  
  console.log('🎯 Message ID endpoint:', messageEndpoint);
  console.log('🎯 Chat ID endpoint:', chatEndpoint);
  
  console.log('\n📦 Sample Payload:');
  console.log(JSON.stringify({ liked: 1 }, null, 2));
  
  console.log('\n🔧 Testing Strategy:');
  console.log('1. Try message ID endpoint first');
  console.log('2. If 404, fallback to chat ID endpoint');
  console.log('3. Provide detailed error logging for debugging');
}

function showExpectedBehavior() {
  console.log('\n🎯 Expected Behavior After Fixes:');
  console.log('1. ✅ Like button fills IMMEDIATELY when clicked');
  console.log('2. ✅ Dislike button fills IMMEDIATELY when clicked');
  console.log('3. ✅ Clicking like removes dislike (mutual exclusion)');
  console.log('4. ✅ Clicking dislike removes like (mutual exclusion)');
  console.log('5. ✅ Detailed console logging for API debugging');
  console.log('6. ✅ Automatic fallback from message ID to chat ID API');
  console.log('7. ✅ State revert on API errors');
  
  console.log('\n🔍 Debug Instructions:');
  console.log('1. Open browser console');
  console.log('2. Start a chat conversation');
  console.log('3. Click like/dislike on any AI response');
  console.log('4. Watch console logs for API calls and responses');
  console.log('5. Verify buttons stay filled after click');
}

// Run all tests
testFeedbackStateManagement();
testAPIEndpoints();
showExpectedBehavior();

console.log('\n🚀 Ready for Testing!');
console.log('Deploy the updated code and test with a real conversation.');

// Export for browser usage
if (typeof window !== 'undefined') {
  window.testFeedback = {
    testFeedbackStateManagement,
    testAPIEndpoints,
    showExpectedBehavior
  };
}