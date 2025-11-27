/**
 * Test script to simulate the multi-message conversation issue
 */

const BASE_URL = 'https://workforceagent.elevancehealth.com';
const DOMAIN_ID = 'AG04333';

async function testMultiMessageConversation() {
  console.log('🧪 Testing multi-message conversation flow...');
  
  try {
    // Step 1: Create a new conversation
    console.log('\n📝 Step 1: Creating new conversation...');
    const createResponse = await fetch(`${BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain_id: DOMAIN_ID,
        title: 'Multi-Message Test Conversation',
        summary: 'Testing multiple message flow',
        metadata: {
          test_type: 'multi_message_flow'
        }
      })
    });
    
    if (!createResponse.ok) {
      console.error('❌ Create failed:', createResponse.status, await createResponse.text());
      return;
    }
    
    const newConversation = await createResponse.json();
    console.log('✅ Created conversation:', newConversation.id);
    
    // Step 2: Add first user message
    console.log('\n💬 Step 2: Adding first user message...');
    const message1Response = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}/messages?domain_id=${DOMAIN_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message_type: 'user',
        content: 'What is the weather today?',
        chat_id: 'user-1',
        metadata: { message_order: 1 }
      })
    });
    
    if (message1Response.ok) {
      console.log('✅ Added first user message');
    }
    
    // Step 3: Add first assistant response
    console.log('\n🤖 Step 3: Adding first assistant response...');
    const response1Response = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}/messages?domain_id=${DOMAIN_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message_type: 'assistant',
        content: 'I can help you with weather information. Today looks sunny and warm.',
        chat_id: 'assistant-1',
        metadata: { message_order: 2 }
      })
    });
    
    if (response1Response.ok) {
      console.log('✅ Added first assistant response');
    }
    
    // Step 4: Add second user message (follow-up)
    console.log('\n💬 Step 4: Adding follow-up user message...');
    const message2Response = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}/messages?domain_id=${DOMAIN_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message_type: 'user',
        content: 'What about tomorrow?',
        chat_id: 'user-2',
        metadata: { message_order: 3 }
      })
    });
    
    if (message2Response.ok) {
      console.log('✅ Added follow-up user message');
    }
    
    // Step 5: Add second assistant response
    console.log('\n🤖 Step 5: Adding follow-up assistant response...');
    const response2Response = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}/messages?domain_id=${DOMAIN_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message_type: 'assistant',
        content: 'Tomorrow is expected to be cloudy with a chance of rain.',
        chat_id: 'assistant-2',
        metadata: { message_order: 4 }
      })
    });
    
    if (response2Response.ok) {
      console.log('✅ Added follow-up assistant response');
    }
    
    // Step 6: Add third user message (another follow-up)
    console.log('\n💬 Step 6: Adding third user message...');
    const message3Response = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}/messages?domain_id=${DOMAIN_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message_type: 'user',
        content: 'Should I bring an umbrella?',
        chat_id: 'user-3',
        metadata: { message_order: 5 }
      })
    });
    
    if (message3Response.ok) {
      console.log('✅ Added third user message');
    }
    
    // Step 7: Add third assistant response
    console.log('\n🤖 Step 7: Adding third assistant response...');
    const response3Response = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}/messages?domain_id=${DOMAIN_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message_type: 'assistant',
        content: 'Yes, I would recommend bringing an umbrella tomorrow just in case.',
        chat_id: 'assistant-3',
        metadata: { message_order: 6 }
      })
    });
    
    if (response3Response.ok) {
      console.log('✅ Added third assistant response');
    }
    
    // Step 8: Retrieve the full conversation (simulating clicking on title)
    console.log('\n🔍 Step 8: Retrieving full conversation...');
    const retrieveResponse = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}?domain_id=${DOMAIN_ID}&include_messages=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (retrieveResponse.ok) {
      const fullConversation = await retrieveResponse.json();
      console.log('\n✅ Retrieved conversation details:');
      console.log(`   Title: "${fullConversation.title}"`);
      console.log(`   Total messages: ${fullConversation.messages?.length || 0}`);
      
      if (fullConversation.messages && fullConversation.messages.length > 0) {
        console.log('\n📝 Messages in conversation:');
        fullConversation.messages.forEach((msg, index) => {
          console.log(`   ${index + 1}. [${msg.message_type}] ${msg.content.substring(0, 50)}${msg.content.length > 50 ? '...' : ''}`);
          console.log(`      Chat ID: ${msg.chat_id}, Created: ${msg.created_at}`);
        });
        
        // Check if all 6 messages are there
        if (fullConversation.messages.length === 6) {
          console.log('\n✅ SUCCESS: All 6 messages are returned by the API');
        } else {
          console.log(`\n❌ ISSUE: Expected 6 messages, but API returned ${fullConversation.messages.length}`);
          console.log('   This indicates a backend pagination or retrieval issue');
        }
      } else {
        console.log('\n❌ CRITICAL ISSUE: No messages returned at all');
      }
      
    } else {
      console.error('❌ Failed to retrieve conversation:', retrieveResponse.status, await retrieveResponse.text());
    }
    
    console.log('\n🌐 Test completed! You can now test in browser:');
    console.log(`   Conversation ID: ${newConversation.id}`);
    console.log('   Look for: "Multi-Message Test Conversation"');
    console.log('   Expected: 6 messages (3 user, 3 assistant)');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testMultiMessageConversation();