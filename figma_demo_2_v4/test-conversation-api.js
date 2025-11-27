/**
 * Test script to check conversation API endpoints
 */

const BASE_URL = 'https://workforceagent.elevancehealth.com';
const DOMAIN_ID = 'AG04333';

async function testConversationAPI() {
  console.log('🧪 Testing Conversation API...');
  
  try {
    // Test 1: Create a new conversation
    console.log('\n📝 Test 1: Creating new conversation...');
    const createResponse = await fetch(`${BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain_id: DOMAIN_ID,
        title: 'Test Conversation',
        summary: null,
        metadata: {
          created_from: 'api_test'
        }
      })
    });
    
    if (!createResponse.ok) {
      console.error('❌ Create failed:', createResponse.status, await createResponse.text());
      return;
    }
    
    const newConversation = await createResponse.json();
    console.log('✅ Created conversation:', newConversation.id);
    console.log('📋 Full conversation object:', newConversation);
    
    // Test 2: Retrieve the conversation
    console.log('\n📖 Test 2: Retrieving conversation...');
    const getResponse = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}?domain_id=${DOMAIN_ID}&include_messages=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!getResponse.ok) {
      console.error('❌ Get failed:', getResponse.status, await getResponse.text());
      console.log('🔍 Response headers:', Object.fromEntries(getResponse.headers.entries()));
    } else {
      const retrievedConversation = await getResponse.json();
      console.log('✅ Retrieved conversation:', retrievedConversation);
    }
    
    // Test 3: List user conversations
    console.log('\n📋 Test 3: Listing user conversations...');
    const listResponse = await fetch(`${BASE_URL}/api/conversations/user/${DOMAIN_ID}?limit=10&offset=0`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!listResponse.ok) {
      console.error('❌ List failed:', listResponse.status, await listResponse.text());
    } else {
      const conversations = await listResponse.json();
      console.log('✅ Listed conversations:', conversations.length, 'found');
      console.log('📋 Conversations:', conversations.map(c => ({ id: c.id, title: c.title })));
    }
    
  } catch (error) {
    console.error('❌ API Test failed:', error);
  }
}

// Run the test
testConversationAPI();