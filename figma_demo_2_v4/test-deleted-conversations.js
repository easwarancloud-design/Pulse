/**
 * Test script to check if deleted conversations are being returned
 */

const BASE_URL = 'https://workforceagent.elevancehealth.com';
const DOMAIN_ID = 'AG04333';

async function testDeletedConversations() {
  console.log('🧪 Testing deleted conversation filtering...');
  
  try {
    // Test 1: Create a new conversation
    console.log('\n📝 Step 1: Creating new conversation...');
    const createResponse = await fetch(`${BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain_id: DOMAIN_ID,
        title: 'Test Conversation for Deletion',
        summary: null,
        metadata: {
          created_from: 'delete_test'
        }
      })
    });
    
    if (!createResponse.ok) {
      console.error('❌ Create failed:', createResponse.status, await createResponse.text());
      return;
    }
    
    const newConversation = await createResponse.json();
    console.log('✅ Created conversation:', newConversation.id);
    
    // Test 2: List conversations (should include the new one)
    console.log('\n📋 Step 2: List conversations before deletion...');
    const listBefore = await fetch(`${BASE_URL}/api/conversations/user/${DOMAIN_ID}?limit=50&offset=0`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (listBefore.ok) {
      const conversationsBefore = await listBefore.json();
      console.log('✅ Conversations before deletion:', conversationsBefore.length);
      const ourConv = conversationsBefore.find(c => c.id === newConversation.id);
      console.log('🔍 Our conversation found:', ourConv ? 'YES' : 'NO');
    }
    
    // Test 3: Delete the conversation
    console.log('\n🗑️ Step 3: Deleting conversation...');
    const deleteResponse = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}/delete?domain_id=${DOMAIN_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    });
    
    if (!deleteResponse.ok) {
      console.error('❌ Delete failed:', deleteResponse.status, await deleteResponse.text());
    } else {
      console.log('✅ Conversation deleted successfully');
    }
    
    // Test 4: List conversations again (should exclude the deleted one)
    console.log('\n📋 Step 4: List conversations after deletion...');
    const listAfter = await fetch(`${BASE_URL}/api/conversations/user/${DOMAIN_ID}?limit=50&offset=0`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (listAfter.ok) {
      const conversationsAfter = await listAfter.json();
      console.log('✅ Conversations after deletion:', conversationsAfter.length);
      const deletedConv = conversationsAfter.find(c => c.id === newConversation.id);
      console.log('🔍 Deleted conversation still found:', deletedConv ? 'YES (❌ PROBLEM!)' : 'NO (✅ GOOD)');
      
      if (deletedConv) {
        console.log('⚠️ Deleted conversation details:', {
          id: deletedConv.id,
          title: deletedConv.title,
          status: deletedConv.status || 'NO STATUS FIELD'
        });
      }
    }
    
    // Test 5: Try to retrieve the deleted conversation directly
    console.log('\n🔍 Step 5: Try to retrieve deleted conversation directly...');
    const getDeletedResponse = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}?domain_id=${DOMAIN_ID}&include_messages=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (getDeletedResponse.ok) {
      const deletedConversation = await getDeletedResponse.json();
      console.log('⚠️ Deleted conversation still retrievable!', {
        id: deletedConversation.id,
        status: deletedConversation.status || 'NO STATUS FIELD'
      });
    } else {
      console.log('✅ Deleted conversation not retrievable (good):', getDeletedResponse.status);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDeletedConversations();