/**
 * Test script to check if the backend is actually updated with cache invalidation
 */

const BASE_URL = 'https://workforceagent.elevancehealth.com';
const DOMAIN_ID = 'AG04333';

async function testCacheInvalidation() {
  console.log('🧪 Testing if backend has cache invalidation fix...');
  
  try {
    // Test the health endpoint first
    console.log('\n💓 Step 1: Check backend health...');
    const healthResponse = await fetch(`${BASE_URL}/api/conversations/health?domain_id=${DOMAIN_ID}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (healthResponse.ok) {
      const health = await healthResponse.json();
      console.log('✅ Backend is healthy:', health.message);
    } else {
      console.log('⚠️ Backend health check failed:', healthResponse.status);
    }
    
    // Create a test conversation
    console.log('\n📝 Step 2: Creating test conversation...');
    const createResponse = await fetch(`${BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain_id: DOMAIN_ID,
        title: 'Cache Test Conversation',
        summary: 'Testing cache invalidation',
        metadata: {
          test_type: 'cache_invalidation',
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
    
    // Add a small delay to ensure it's cached
    console.log('\n⏳ Step 3: Waiting 2 seconds for cache to populate...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get the conversation to potentially cache it
    console.log('\n📖 Step 4: Retrieve conversation (to populate cache)...');
    const getResponse = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}?domain_id=${DOMAIN_ID}&include_messages=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (getResponse.ok) {
      console.log('✅ Conversation retrieved successfully (cached)');
    }
    
    // List conversations to potentially cache them
    console.log('\n📋 Step 5: List conversations (to populate cache)...');
    const listResponse = await fetch(`${BASE_URL}/api/conversations/user/${DOMAIN_ID}?limit=50&offset=0`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (listResponse.ok) {
      const conversations = await listResponse.json();
      console.log(`✅ Listed ${conversations.length} conversations (cached)`);
    }
    
    // Now delete the conversation
    console.log('\n🗑️ Step 6: Deleting conversation (testing cache invalidation)...');
    const deleteResponse = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}/delete?domain_id=${DOMAIN_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    if (!deleteResponse.ok) {
      console.error('❌ Delete failed:', deleteResponse.status, await deleteResponse.text());
      return;
    }
    
    console.log('✅ Conversation deletion request successful');
    
    // CRITICAL TEST: Check if it's immediately filtered from list 
    console.log('\n🔍 Step 7: IMMEDIATE list check (testing cache invalidation)...');
    const immediateListResponse = await fetch(`${BASE_URL}/api/conversations/user/${DOMAIN_ID}?limit=50&offset=0`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (immediateListResponse.ok) {
      const immediateConversations = await immediateListResponse.json();
      const deletedStillThere = immediateConversations.find(c => c.id === newConversation.id);
      
      if (deletedStillThere) {
        console.log('❌ CACHE NOT INVALIDATED: Deleted conversation still in list immediately');
        console.log('   This means the backend is using old code WITHOUT cache invalidation');
      } else {
        console.log('✅ CACHE INVALIDATED: Deleted conversation properly removed from list immediately');
        console.log('   This means the backend has been updated with cache invalidation');
      }
    }
    
    // Also test direct retrieval
    console.log('\n🔍 Step 8: IMMEDIATE retrieval check (testing cache invalidation)...');
    const immediateGetResponse = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}?domain_id=${DOMAIN_ID}&include_messages=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (immediateGetResponse.ok) {
      console.log('❌ CACHE NOT INVALIDATED: Deleted conversation still retrievable immediately');
      console.log('   This confirms the backend is using old code WITHOUT cache invalidation');
    } else {
      console.log('✅ CACHE INVALIDATED: Deleted conversation properly returns 404 immediately');
      console.log('   Response status:', immediateGetResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testCacheInvalidation();