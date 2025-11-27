/**
 * Test script to validate backend fixes before deployment
 */

const BASE_URL = 'https://workforceagent.elevancehealth.com';
const DOMAIN_ID = 'AG04333';

async function testBackendFixes() {
  console.log('🧪 Testing backend fixes...');
  
  try {
    // Test 1: Create conversation with message (to trigger validation)
    console.log('\n📝 Test 1: Creating conversation with message...');
    const createResponse = await fetch(`${BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain_id: DOMAIN_ID,
        title: 'Backend Fix Test',
        summary: 'Testing Pydantic validation fix',
        metadata: {
          test_type: 'backend_fix_validation',
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
    
    // Test 2: Add a message to trigger the validation path
    console.log('\n💬 Test 2: Adding message (creates validation scenario)...');
    const messageResponse = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}/messages?domain_id=${DOMAIN_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message_type: 'user',
        content: 'This is a test message to trigger Pydantic validation',
        chat_id: 'test-user-1',
        metadata: {
          test: true
        }
      })
    });
    
    if (messageResponse.ok) {
      console.log('✅ Message added successfully');
    } else {
      console.log('⚠️ Message add failed:', messageResponse.status);
    }
    
    // Test 3: Try to load the conversation (this was failing with 500 error)
    console.log('\n🔍 Test 3: Loading conversation (the critical test)...');
    const loadResponse = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}?domain_id=${DOMAIN_ID}&include_messages=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    console.log('📡 Load response status:', loadResponse.status);
    
    if (loadResponse.ok) {
      const loadedConversation = await loadResponse.json();
      console.log('✅ SUCCESS! Conversation loaded without validation error:', {
        title: loadedConversation.title,
        messageCount: loadedConversation.messages?.length || 0,
        status: loadedConversation.status,
        firstMessageType: loadedConversation.messages?.[0]?.message_type
      });
      console.log('🎉 PYDANTIC VALIDATION FIX WORKING!');
    } else {
      const errorText = await loadResponse.text();
      console.log('❌ Still getting error:', loadResponse.status, errorText);
      console.log('🔧 Backend deployment needed for validation fix');
    }
    
    // Test 4: Test deletion and cache invalidation
    console.log('\n🗑️ Test 4: Testing deletion and cache invalidation...');
    const deleteResponse = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}/delete?domain_id=${DOMAIN_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    if (deleteResponse.ok) {
      console.log('✅ Delete request successful');
      
      // Immediately check if cache is invalidated
      const listResponse = await fetch(`${BASE_URL}/api/conversations/user/${DOMAIN_ID}?limit=10&offset=0`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (listResponse.ok) {
        const conversations = await listResponse.json();
        const deletedStillThere = conversations.find(c => c.id === newConversation.id);
        
        if (deletedStillThere) {
          console.log('❌ Cache invalidation NOT working - conversation still in list');
          console.log('🔧 Backend deployment needed for cache fix');
        } else {
          console.log('✅ SUCCESS! Cache invalidation working - conversation removed from list');
        }
      }
    } else {
      console.log('❌ Delete failed:', deleteResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testBackendFixes();