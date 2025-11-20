// Test the local storage integration
console.log('🧪 Testing Local Storage Integration');

// Test the local conversation manager
import { localConversationManager } from '../src/services/localConversationManager.js';

// Test conversation data
const testConvId = 'test_conv_123';
const testMessages = [
  {
    type: 'user',
    text: 'Hello, this is a test question',
    chat_id: 'user_123',
    timestamp: Date.now()
  },
  {
    type: 'assistant', 
    text: 'Hello! This is a test response',
    chat_id: 'bot_123',
    timestamp: Date.now()
  }
];

console.log('💾 Testing save to local storage...');

// Test saving messages
testMessages.forEach((msg, index) => {
  const result = localConversationManager.saveMessageLocally(testConvId, msg);
  console.log(`Message ${index + 1} saved:`, result);
});

// Test reading from local storage
console.log('📖 Testing read from local storage...');
const retrievedConv = localConversationManager.getLocalConversation(testConvId);
console.log('Retrieved conversation:', retrievedConv);

// Test formatting for ChatPage
console.log('🎨 Testing format for ChatPage...');
const formatted = localConversationManager.formatForChatPage(retrievedConv);
console.log('Formatted for ChatPage:', formatted);

// Test conversation list
console.log('📋 Testing conversation list...');
const convList = localConversationManager.getLocalConversationList();
console.log('Conversation list:', convList);

// Test storage info
console.log('📊 Testing storage info...');
const storageInfo = localConversationManager.getStorageInfo();
console.log('Storage info:', storageInfo);

// Test cleanup (don't clean the test data)
console.log('🧹 Testing cleanup (dry run)...');
console.log('Cleanup would run, but skipping for test data');

console.log('✅ Local Storage Integration Test Complete!');