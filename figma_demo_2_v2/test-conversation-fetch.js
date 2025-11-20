/**
 * Test script to check conversation fetching API
 */

const API_BASE = 'https://workforceagent.elevancehealth.com';

async function testConversationAPI() {
  console.log('🧪 Testing Conversation API...');
  
  try {
    // First, get the list of conversations to find a valid ID
    console.log('\n1. Getting conversation list...');
    const listResponse = await fetch(`${API_BASE}/api/conversations/user/AG04333`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!listResponse.ok) {
      throw new Error(`List API failed: ${listResponse.status}`);
    }

    const conversations = await listResponse.json();
    console.log('✅ Conversations list:', conversations);
    
    if (conversations.length === 0) {
      console.log('❌ No conversations found to test');
      return;
    }

    // Test fetching the first conversation
    const firstConversation = conversations[0];
    console.log(`\n2. Testing fetch for conversation: ${firstConversation.id} - "${firstConversation.title}"`);
    
    const conversationResponse = await fetch(`${API_BASE}/api/conversations/${firstConversation.id}?user_id=AG04333&include_messages=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('📡 Response status:', conversationResponse.status);
    console.log('📡 Response headers:', Object.fromEntries(conversationResponse.headers.entries()));

    if (!conversationResponse.ok) {
      const errorText = await conversationResponse.text();
      throw new Error(`Conversation API failed: ${conversationResponse.status} - ${errorText}`);
    }

    const conversationData = await conversationResponse.json();
    console.log('\n✅ Conversation data structure:');
    console.log('- ID:', conversationData.id);
    console.log('- Title:', conversationData.title);
    console.log('- Messages count:', conversationData.messages?.length || 'No messages array');
    console.log('- Messages structure:');
    
    if (conversationData.messages && Array.isArray(conversationData.messages)) {
      conversationData.messages.forEach((msg, index) => {
        console.log(`  Message ${index + 1}:`);
        console.log(`    - Type/Role: ${msg.message_type || msg.type || msg.role || 'unknown'}`);
        console.log(`    - Content: ${(msg.content || msg.message_text || msg.text || 'no content').substring(0, 100)}...`);
        console.log(`    - Keys: ${Object.keys(msg).join(', ')}`);
      });
    } else {
      console.log('  ❌ No messages array found');
    }

    console.log('\n📊 Full conversation object keys:', Object.keys(conversationData));
    console.log('\n📋 Full conversation data:', JSON.stringify(conversationData, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('❌ Error details:', error);
  }
}

testConversationAPI();