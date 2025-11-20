/**
 * Test script to create a conversation with special characters to verify the fix
 */

const BASE_URL = 'https://workforceagent.elevancehealth.com';
const DOMAIN_ID = 'AG04333';

async function testSpecialCharacterFix() {
  console.log('🧪 Testing special character fixes...');
  
  try {
    // Create a conversation with various text that might trigger formatting
    console.log('\n📝 Creating conversation with special formatting...');
    const createResponse = await fetch(`${BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain_id: DOMAIN_ID,
        title: 'Special Character Test',
        summary: 'Testing special character formatting',
        metadata: {
          test_type: 'special_character_fix'
        }
      })
    });
    
    if (!createResponse.ok) {
      console.error('❌ Create failed:', createResponse.status, await createResponse.text());
      return;
    }
    
    const newConversation = await createResponse.json();
    console.log('✅ Created conversation:', newConversation.id);
    
    // Add a message that would typically have formatting applied
    const messageResponse = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}/messages?domain_id=${DOMAIN_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message_type: 'assistant',
        content: 'Hello! Here are some options:\n\n- **Option 1**: First choice\n- **Option 2**: Second choice\n   - Sub-item with dash\n\n**Important**: This text should be bold.',
        chat_id: 'special-char-test-1'
      })
    });
    
    if (messageResponse.ok) {
      console.log('✅ Added formatted message');
      
      // Get the conversation to see how it's processed
      const retrieveResponse = await fetch(`${BASE_URL}/api/conversations/${newConversation.id}?domain_id=${DOMAIN_ID}&include_messages=true`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (retrieveResponse.ok) {
        const retrieved = await retrieveResponse.json();
        console.log('\n✅ Retrieved conversation successfully');
        console.log('Message content:', retrieved.messages[0].content);
        console.log('\n🌐 You can now test this in the browser at:');
        console.log(`   http://localhost:3002/resultpage`);
        console.log('\n📋 Look for the conversation: "Special Character Test"');
        console.log('   Click on it to see if the special characters are fixed');
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testSpecialCharacterFix();