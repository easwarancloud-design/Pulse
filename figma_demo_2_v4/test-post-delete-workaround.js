/**
 * Test POST Delete Workaround
 * Tests the new POST method with action=delete parameter to bypass Akamai EdgeSuite blocking
 */

const API_BASE = 'https://workforceagent.elevancehealth.com';
const TEST_USER_ID = 'test_user';

async function testPostDeleteWorkaround() {
  console.log('='.repeat(80));
  console.log('POST DELETE WORKAROUND TEST');
  console.log('Testing API routing workaround at:', API_BASE);
  console.log('='.repeat(80));
  console.log();

  // Test 1: Create a test conversation first (to have something to delete)
  console.log('1. Creating test conversation...');
  try {
    const createResponse = await fetch(`${API_BASE}/api/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: TEST_USER_ID,
        title: 'Test Conversation for Delete Workaround',
        summary: 'This is a test conversation to verify the POST delete workaround',
        metadata: {
          test: true,
          created_for: 'post_delete_test'
        }
      })
    });

    if (createResponse.ok) {
      const conversation = await createResponse.json();
      console.log(`   ✓ Created test conversation: ${conversation.id}`);
      console.log(`   Title: "${conversation.title}"`);
      
      // Test 2: Try POST delete workaround
      console.log('\n2. Testing POST delete workaround...');
      const deleteUrl = `${API_BASE}/api/conversations/${conversation.id}?user_id=${TEST_USER_ID}&action=delete`;
      console.log(`   POST URL: ${deleteUrl}`);
      
      const deleteResponse = await fetch(deleteUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log(`   Response Status: ${deleteResponse.status} ${deleteResponse.statusText}`);
      
      if (deleteResponse.ok) {
        try {
          const deleteResult = await deleteResponse.json();
          console.log('   ✅ POST DELETE SUCCESS!');
          console.log('   Response:', JSON.stringify(deleteResult, null, 2));
          
          // Test 3: Verify deletion by trying to fetch the conversation
          console.log('\n3. Verifying deletion...');
          const verifyResponse = await fetch(`${API_BASE}/api/conversations/${conversation.id}?user_id=${TEST_USER_ID}`);
          
          if (verifyResponse.status === 404) {
            console.log('   ✅ VERIFICATION SUCCESS: Conversation not found (correctly deleted)');
          } else if (verifyResponse.status === 200) {
            const verifyData = await verifyResponse.json();
            if (verifyData.status === 'archived' || verifyData.is_archived) {
              console.log('   ✅ VERIFICATION SUCCESS: Conversation archived (soft deleted)');
            } else {
              console.log('   ⚠️ WARNING: Conversation still active after delete');
            }
          } else {
            console.log(`   ❓ Verification unclear: Status ${verifyResponse.status}`);
          }
          
        } catch (parseError) {
          console.log('   ✅ POST DELETE SUCCESS (non-JSON response)');
          console.log('   Response Text:', await deleteResponse.text());
        }
      } else {
        const errorText = await deleteResponse.text();
        console.log('   ❌ POST DELETE FAILED');
        console.log('   Error:', errorText);
        
        // If POST fails, also test the headers to see what's allowed
        console.log('\n   Checking allowed methods...');
        if (deleteResponse.headers.get('allow')) {
          console.log(`   Allowed Methods: ${deleteResponse.headers.get('allow')}`);
        }
        
        // Test if it's a 501 like the original DELETE
        if (deleteResponse.status === 501) {
          console.log('   ⚠️ POST method also blocked by infrastructure');
        }
      }
      
    } else {
      console.log(`   ❌ Failed to create test conversation: ${createResponse.status}`);
      const errorText = await createResponse.text();
      console.log('   Error:', errorText);
    }
    
  } catch (error) {
    console.log(`   ❌ Network error: ${error.message}`);
  }

  // Test 4: Compare with original DELETE method (expect 501)
  console.log('\n4. Testing original DELETE method (expect 501)...');
  try {
    const deleteOriginalUrl = `${API_BASE}/api/conversations/test123?user_id=${TEST_USER_ID}`;
    const deleteOriginalResponse = await fetch(deleteOriginalUrl, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log(`   DELETE Response: ${deleteOriginalResponse.status} ${deleteOriginalResponse.statusText}`);
    
    if (deleteOriginalResponse.status === 501) {
      console.log('   ✓ Confirmed: DELETE method still blocked (expected)');
    } else {
      console.log('   ❓ Unexpected: DELETE method not blocked');
    }
    
  } catch (error) {
    console.log(`   ❌ DELETE test error: ${error.message}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('TEST COMPLETE');
  console.log('='.repeat(80));
  console.log('\nSUMMARY:');
  console.log('- If POST delete worked: ✅ Workaround successful');
  console.log('- If POST delete failed: ❌ Need alternative approach');
  console.log('- DELETE method should still return 501 (Akamai block)');
  console.log('\nNOTE: If tests fail due to authentication, that\'s normal for this endpoint');
}

// Run the test
testPostDeleteWorkaround().catch(console.error);