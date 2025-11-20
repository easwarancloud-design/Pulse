/**
 * Test Complete Conversation Persistence Fix
 * 
 * This test verifies that when loading conversations from API,
 * ALL messages are stored to local storage for future instant loading
 */

// Test the local conversation manager
import { LocalConversationManager } from './src/services/localConversationManager.js';

const manager = new LocalConversationManager();

console.log('🧪 Testing Complete Conversation Persistence Fix');
console.log('='.repeat(50));

// Test 1: Save a complete conversation from "API"
console.log('\n1️⃣ Testing saveCompleteConversation()...');

const testConversationId = 'conv_12345';
const testMessages = [
  {
    id: 1,
    type: 'user',
    text: 'Hello, I need help with my account',
    message_type: 'user',
    content: 'Hello, I need help with my account'
  },
  {
    id: 2,
    type: 'assistant',
    text: 'I\'d be happy to help with your account. What specific issue are you experiencing?',
    message_type: 'assistant',
    content: 'I\'d be happy to help with your account. What specific issue are you experiencing?'
  },
  {
    id: 3,
    type: 'user',
    text: 'I can\'t log into the system',
    message_type: 'user',
    content: 'I can\'t log into the system'
  },
  {
    id: 4,
    type: 'assistant',
    text: 'Let me help you troubleshoot the login issue. Can you tell me what error message you\'re seeing?',
    message_type: 'assistant',
    content: 'Let me help you troubleshoot the login issue. Can you tell me what error message you\'re seeing?'
  }
];

// Save complete conversation (simulating API load)
const savedConversation = manager.saveCompleteConversation(
  testConversationId,
  'Account Login Help',
  testMessages
);

if (savedConversation) {
  console.log('✅ Successfully saved complete conversation');
  console.log(`   📊 Messages saved: ${savedConversation.messages.length}`);
  console.log(`   📝 Title: ${savedConversation.title}`);
} else {
  console.log('❌ Failed to save conversation');
}

// Test 2: Retrieve the conversation
console.log('\n2️⃣ Testing retrieval after save...');
const retrievedConversation = manager.getLocalConversation(testConversationId);

if (retrievedConversation) {
  console.log('✅ Successfully retrieved conversation');
  console.log(`   📊 Messages retrieved: ${retrievedConversation.messages.length}`);
  console.log(`   📝 Title: ${retrievedConversation.title}`);
  console.log(`   🏷️ Source: ${retrievedConversation.source}`);
  
  // Verify all messages are present
  console.log('\n   📋 Message Summary:');
  retrievedConversation.messages.forEach((msg, index) => {
    console.log(`     ${index + 1}. [${msg.type}]: ${msg.text.substring(0, 30)}...`);
  });
} else {
  console.log('❌ Failed to retrieve conversation');
}

// Test 3: Format for ChatPage
console.log('\n3️⃣ Testing ChatPage formatting...');
const chatPageFormat = manager.formatForChatPage(retrievedConversation);

if (chatPageFormat) {
  console.log('✅ Successfully formatted for ChatPage');
  console.log(`   📊 Conversation length: ${chatPageFormat.conversation.length}`);
  console.log(`   📝 Title: ${chatPageFormat.title}`);
  
  // Check if all messages are properly formatted
  const hasAllMessages = chatPageFormat.conversation.length === testMessages.length;
  console.log(`   ✅ All messages preserved: ${hasAllMessages ? 'YES' : 'NO'}`);
} else {
  console.log('❌ Failed to format for ChatPage');
}

// Test 4: Simulate the exact scenario user reported
console.log('\n4️⃣ Testing user scenario simulation...');
console.log('   Scenario: Load conversation → Ask question → Switch away → Come back');

// Step 1: "Load" conversation from API (already done above)
console.log('   ✅ Step 1: Loaded conversation from "API" (4 messages)');

// Step 2: Add new message (simulating user asking follow-up)
manager.saveMessageLocally(testConversationId, {
  type: 'user',
  text: 'The error says "Invalid credentials"'
});

manager.saveMessageLocally(testConversationId, {
  type: 'assistant',
  text: 'Thank you for that detail. Let me help you reset your password. Please click on "Forgot Password" on the login page.'
});

console.log('   ✅ Step 2: Added 2 new messages (user question + response)');

// Step 3: "Switch away" and "come back" (retrieve conversation)
const finalConversation = manager.getLocalConversation(testConversationId);
console.log(`   ✅ Step 3: Retrieved conversation - now has ${finalConversation.messages.length} messages`);

// Verify we have ALL messages (original 4 + new 2 = 6)
const expectedTotalMessages = 6;
const actualTotalMessages = finalConversation.messages.length;
const allMessagesPresent = actualTotalMessages === expectedTotalMessages;

console.log(`\n🎯 FINAL RESULT:`);
console.log(`   Expected messages: ${expectedTotalMessages}`);
console.log(`   Actual messages: ${actualTotalMessages}`);
console.log(`   All messages preserved: ${allMessagesPresent ? '✅ YES' : '❌ NO'}`);

if (allMessagesPresent) {
  console.log('\n🎉 SUCCESS: Complete conversation persistence is working!');
  console.log('   Users will now see ALL messages when switching between conversations.');
} else {
  console.log('\n💥 FAILURE: Messages are still being lost!');
  console.log('   The fix needs more work.');
}

// Cleanup
console.log('\n🧹 Cleaning up test data...');
manager.deleteLocalConversation(testConversationId);
console.log('✅ Test cleanup complete');

console.log('\n' + '='.repeat(50));
console.log('🧪 Test Complete!');