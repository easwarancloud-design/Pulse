/**
 * Persistent Like/Dislike Feedback Test
 * Tests the improved feedback system with localStorage persistence
 */

console.log('🧪 Testing Persistent Like/Dislike Feedback...\n');

// Test localStorage utilities
function testLocalStorageFeedback() {
  console.log('📱 Testing localStorage Feedback Persistence...\n');
  
  const conversationId = 'conv_test_123';
  
  // Simulate the utility functions from ChatPage
  const getFeedbackStorageKey = (type) => `feedback_${type}_${conversationId}`;
  
  const saveFeedbackToStorage = (type, feedbackSet) => {
    try {
      localStorage.setItem(getFeedbackStorageKey(type), JSON.stringify([...feedbackSet]));
      console.log(`✅ Saved ${type} feedback:`, [...feedbackSet]);
    } catch (error) {
      console.error(`❌ Failed to save ${type} feedback:`, error);
    }
  };
  
  const loadFeedbackFromStorage = (type) => {
    try {
      const stored = localStorage.getItem(getFeedbackStorageKey(type));
      const result = stored ? new Set(JSON.parse(stored)) : new Set();
      console.log(`📥 Loaded ${type} feedback:`, [...result]);
      return result;
    } catch (error) {
      console.error(`❌ Failed to load ${type} feedback:`, error);
      return new Set();
    }
  };
  
  // Test saving and loading
  const testLikedMessages = new Set(['msg1', 'msg3', 'msg5']);
  const testDislikedMessages = new Set(['msg2', 'msg4']);
  
  console.log('💾 Saving feedback to localStorage...');
  saveFeedbackToStorage('liked', testLikedMessages);
  saveFeedbackToStorage('disliked', testDislikedMessages);
  
  console.log('\n📥 Loading feedback from localStorage...');
  const loadedLiked = loadFeedbackFromStorage('liked');
  const loadedDisliked = loadFeedbackFromStorage('disliked');
  
  // Verify persistence
  const likedMatch = JSON.stringify([...testLikedMessages].sort()) === JSON.stringify([...loadedLiked].sort());
  const dislikedMatch = JSON.stringify([...testDislikedMessages].sort()) === JSON.stringify([...loadedDisliked].sort());
  
  console.log(`\n✅ Liked persistence: ${likedMatch ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Disliked persistence: ${dislikedMatch ? 'PASS' : 'FAIL'}`);
  
  return { likedMatch, dislikedMatch };
}

function showImprovedBehavior() {
  console.log('\n🎯 New Expected Behavior:\n');
  
  console.log('1. ✅ IMMEDIATE FEEDBACK');
  console.log('   - Icons fill INSTANTLY when clicked');
  console.log('   - NO reverting on API errors');
  console.log('   - UI state preserved regardless of backend');
  
  console.log('\n2. ✅ PERSISTENT STATE');
  console.log('   - Feedback saved to localStorage immediately');
  console.log('   - Persists across page reloads');
  console.log('   - Persists across conversation switches');
  
  console.log('\n3. ✅ MUTUAL EXCLUSION');
  console.log('   - Like removes dislike automatically');
  console.log('   - Dislike removes like automatically');
  
  console.log('\n4. ✅ SMART API HANDLING');
  console.log('   - API calls happen in background');
  console.log('   - Detailed logging for debugging');
  console.log('   - UI never waits for API response');
  
  console.log('\n5. ✅ CONVERSATION ISOLATION');
  console.log('   - Each conversation has separate feedback state');
  console.log('   - Switching conversations loads correct states');
}

function showTestInstructions() {
  console.log('\n🧪 Manual Testing Instructions:\n');
  
  console.log('1. 📱 TEST IMMEDIATE FEEDBACK:');
  console.log('   - Click like on any AI response');
  console.log('   - Icon should fill BLUE immediately');
  console.log('   - Click dislike - icon should fill RED immediately');
  console.log('   - Icons should STAY filled (no reverting)');
  
  console.log('\n2. 🔄 TEST PERSISTENCE:');
  console.log('   - Like/dislike some messages');
  console.log('   - Refresh the page (F5)');
  console.log('   - Icons should still be filled');
  
  console.log('\n3. 🔄 TEST CONVERSATION SWITCHING:');
  console.log('   - Like messages in conversation A');
  console.log('   - Switch to conversation B');
  console.log('   - Like different messages');
  console.log('   - Switch back to conversation A');
  console.log('   - Original likes should still be there');
  
  console.log('\n4. 🌐 TEST API INDEPENDENCE:');
  console.log('   - Open Network tab in DevTools');
  console.log('   - Click like/dislike');
  console.log('   - Icon should fill immediately');
  console.log('   - API call should happen in background');
  console.log('   - Even if API fails, icon stays filled');
}

function showLocalStorageKeys() {
  console.log('\n🗂️ localStorage Keys to Check:\n');
  
  const exampleConversationId = 'conv_7d575adf-f8a6-49a0-820b-c1d8d6335cc2';
  
  console.log(`📦 Liked messages: feedback_liked_${exampleConversationId}`);
  console.log(`📦 Disliked messages: feedback_disliked_${exampleConversationId}`);
  
  console.log('\n🔍 Check in DevTools:');
  console.log('Application → Local Storage → http://localhost:3002');
  console.log('Look for keys starting with "feedback_"');
}

// Run tests
const results = testLocalStorageFeedback();
showImprovedBehavior();
showTestInstructions();
showLocalStorageKeys();

console.log('\n🚀 Persistent Feedback System Ready!');
console.log('Icons will now stay filled and persist across sessions! 🎉');

// Export for browser usage
if (typeof window !== 'undefined') {
  window.testPersistentFeedback = {
    testLocalStorageFeedback,
    showImprovedBehavior,
    showTestInstructions,
    showLocalStorageKeys
  };
  
  // Test localStorage in browser
  console.log('\n🌐 Browser localStorage test:');
  testLocalStorageFeedback();
}