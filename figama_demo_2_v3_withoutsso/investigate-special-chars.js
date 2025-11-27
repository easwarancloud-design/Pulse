/**
 * Test script to check what content is actually being returned by the API
 * This will help us identify the source of the special characters
 */

const BASE_URL = 'https://workforceagent.elevancehealth.com';
const DOMAIN_ID = 'AG04333';

async function investigateSpecialCharacters() {
  console.log('🔍 Investigating special characters in conversation content...');
  
  try {
    // First, let's get the list of conversations to see if any titles have special chars
    console.log('\n📋 Step 1: Checking conversation list...');
    const listResponse = await fetch(`${BASE_URL}/api/conversations/user/${DOMAIN_ID}?limit=10&offset=0`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (listResponse.ok) {
      const conversations = await listResponse.json();
      console.log(`✅ Found ${conversations.length} conversations`);
      
      // Check each conversation for special characters
      for (const conv of conversations.slice(0, 3)) { // Check first 3
        console.log(`\n🔍 Conversation: "${conv.title}" (ID: ${conv.id})`);
        console.log(`  Title chars:`, Array.from(conv.title).map(c => `'${c}' (${c.charCodeAt(0)})`).join(', '));
        
        // Now get the full conversation to check message content
        const detailResponse = await fetch(`${BASE_URL}/api/conversations/${conv.id}?domain_id=${DOMAIN_ID}&include_messages=true`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (detailResponse.ok) {
          const fullConv = await detailResponse.json();
          console.log(`  Messages: ${fullConv.messages?.length || 0}`);
          
          if (fullConv.messages && fullConv.messages.length > 0) {
            fullConv.messages.forEach((msg, i) => {
              console.log(`  Message ${i + 1} (${msg.message_type}):`);
              console.log(`    Content: "${msg.content}"`);
              console.log(`    Content chars:`, Array.from(msg.content.substring(0, 50)).map(c => `'${c}' (${c.charCodeAt(0)})`).join(', '));
              
              // Check for common problematic characters
              const problematicChars = [];
              for (let char of msg.content) {
                const code = char.charCodeAt(0);
                if (code < 32 || code > 126) { // Non-printable or non-ASCII
                  if (char !== '\n' && char !== '\r' && char !== '\t') { // Ignore normal whitespace
                    problematicChars.push(`'${char}' (${code})`);
                  }
                }
              }
              
              if (problematicChars.length > 0) {
                console.log(`    ⚠️ Found special chars:`, problematicChars.slice(0, 10).join(', '));
              } else {
                console.log(`    ✅ No special characters detected`);
              }
            });
          }
        } else {
          console.log(`  ❌ Failed to get details: ${detailResponse.status}`);
        }
      }
    }
    
    // Test 2: Create a clean conversation to see if the issue is with new vs old data
    console.log('\n📝 Step 2: Creating new clean conversation...');
    const createResponse = await fetch(`${BASE_URL}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domain_id: DOMAIN_ID,
        title: 'Clean Test Conversation',
        summary: 'Testing for special characters',
        metadata: {
          test_type: 'special_char_investigation'
        }
      })
    });
    
    if (createResponse.ok) {
      const newConv = await createResponse.json();
      console.log('✅ Created clean conversation:', newConv.id);
      
      // Add a clean message
      const messageResponse = await fetch(`${BASE_URL}/api/conversations/${newConv.id}/messages?domain_id=${DOMAIN_ID}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message_type: 'user',
          content: 'Hello! This is a clean test message without special characters.',
          chat_id: 'clean-test-1'
        })
      });
      
      if (messageResponse.ok) {
        console.log('✅ Added clean message');
        
        // Now retrieve and check
        const retrieveResponse = await fetch(`${BASE_URL}/api/conversations/${newConv.id}?domain_id=${DOMAIN_ID}&include_messages=true`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        if (retrieveResponse.ok) {
          const retrieved = await retrieveResponse.json();
          console.log('\n🔍 Clean conversation retrieved:');
          console.log(`  Title: "${retrieved.title}"`);
          if (retrieved.messages && retrieved.messages.length > 0) {
            console.log(`  Message content: "${retrieved.messages[0].content}"`);
            console.log(`  Message chars:`, Array.from(retrieved.messages[0].content).map(c => `'${c}' (${c.charCodeAt(0)})`).join(', '));
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Investigation failed:', error);
  }
}

// Run the investigation
investigateSpecialCharacters();