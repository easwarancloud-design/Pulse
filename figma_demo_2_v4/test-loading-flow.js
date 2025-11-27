/**
 * Test script to create a conversation and then immediately try to load it
 * This will test if there are any timing issues with conversation loading
 */

const BASE_URL = 'https://workforceagent.elevancehealth.com';
const DOMAIN_ID = 'AG04333';

async function testConversationLoadingFlow() {
  console.log('🧪 Testing conversation creation -> immediate loading flow...');
  
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
        title: 'Test Loading Flow',
        summary: 'Testing immediate loading after creation',
        metadata: {
          test_type: 'loading_flow',
          timestamp: new Date().toISOString()
        }
      })
    });
    
    if (!createResponse.ok) {
      console.error('❌ Create failed:', createResponse.status, await createResponse.text());
      return;
    }
    
    const newConversation = await createResponse.json();
    console.log('✅ Created conversation:', newConversation.id);
    
    // Step 2: Add a message to the conversation (to simulate user interaction)
    console.log('\n💬 Step 2: Adding message to conversation...');
    const messageResponse = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}/messages?domain_id=${DOMAIN_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message_type: 'user',
        content: 'Hello, this is a test message',
        metadata: {
          test: true
        }
      })
    });
    
    if (messageResponse.ok) {
      console.log('✅ Message added successfully');
    } else {
      console.log('⚠️ Message add failed (but continuing test):', messageResponse.status);
    }
    
    // Step 3: Try to load the conversation immediately (like clicking on it in sidebar)
    console.log('\n🔄 Step 3: Loading conversation immediately (simulating sidebar click)...');
    const loadResponse = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}?domain_id=${DOMAIN_ID}&include_messages=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('📡 Load response status:', loadResponse.status);
    
    if (loadResponse.ok) {
      const loadedConversation = await loadResponse.json();
      console.log('✅ Conversation loaded successfully:', {
        title: loadedConversation.title,
        messageCount: loadedConversation.messages?.length || 0,
        status: loadedConversation.status
      });
    } else {
      const errorText = await loadResponse.text();
      console.log('❌ Conversation failed to load:', loadResponse.status, errorText);
      console.log('🎯 This 404 would trigger our enhanced error handling');
    }
    
    // Step 4: Wait 5 seconds and try again (test caching)
    console.log('\n⏳ Step 4: Waiting 5 seconds and trying again...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    const retryResponse = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}?domain_id=${DOMAIN_ID}&include_messages=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('📡 Retry response status:', retryResponse.status);
    
    if (retryResponse.ok) {
      const retriedConversation = await retryResponse.json();
      console.log('✅ Conversation loaded on retry:', {
        title: retriedConversation.title,
        messageCount: retriedConversation.messages?.length || 0
      });
    } else {
      console.log('❌ Conversation still fails on retry:', retryResponse.status);
    }
    
    // Step 5: List conversations to see if it appears in the list
    console.log('\n📋 Step 5: Checking if conversation appears in list...');
    const listResponse = await fetch(`${BASE_URL}/api/conversations/user/${DOMAIN_ID}?limit=10&offset=0`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (listResponse.ok) {
      const conversations = await listResponse.json();
      const ourConversation = conversations.find(c => c.id === newConversation.id);
      console.log('🔍 Conversation in list:', ourConversation ? 'YES' : 'NO');
      
      if (ourConversation) {
        console.log('📋 Found in list:', {
          title: ourConversation.title,
          status: ourConversation.status
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testConversationLoadingFlow();