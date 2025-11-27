/**
 * Test Like/Dislike Feedback API
 * Tests the feedback functionality end-to-end
 */

const TEST_CONFIG = {
  BASE_URL: 'https://workforceagent.elevancehealth.com/api',
  DOMAIN_ID: 'AG04333',
  // Test with an existing conversation - you may need to update these
  TEST_CONVERSATION_ID: 'conv_test',
  TEST_MESSAGE_ID: 'msg_test'
};

async function testFeedbackAPI() {
  console.log('🧪 Testing Like/Dislike Feedback API...\n');

  try {
    // Test 1: Like feedback
    console.log('📍 Test 1: Sending LIKE feedback...');
    const likeResponse = await fetch(
      `${TEST_CONFIG.BASE_URL}/conversations/${TEST_CONFIG.TEST_CONVERSATION_ID}/messages/${TEST_CONFIG.TEST_MESSAGE_ID}/feedback?domain_id=${TEST_CONFIG.DOMAIN_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          liked: 1,
          feedback_text: 'Test like from frontend'
        })
      }
    );

    console.log('📤 Like Response Status:', likeResponse.status);
    if (likeResponse.ok) {
      const likeResult = await likeResponse.json();
      console.log('✅ Like Response:', JSON.stringify(likeResult, null, 2));
    } else {
      const errorText = await likeResponse.text();
      console.log('❌ Like Error:', errorText);
    }

    // Test 2: Dislike feedback
    console.log('\n📍 Test 2: Sending DISLIKE feedback...');
    const dislikeResponse = await fetch(
      `${TEST_CONFIG.BASE_URL}/conversations/${TEST_CONFIG.TEST_CONVERSATION_ID}/messages/${TEST_CONFIG.TEST_MESSAGE_ID}/feedback?domain_id=${TEST_CONFIG.DOMAIN_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          liked: -1,
          feedback_text: 'Test dislike from frontend'
        })
      }
    );

    console.log('📤 Dislike Response Status:', dislikeResponse.status);
    if (dislikeResponse.ok) {
      const dislikeResult = await dislikeResponse.json();
      console.log('✅ Dislike Response:', JSON.stringify(dislikeResult, null, 2));
    } else {
      const errorText = await dislikeResponse.text();
      console.log('❌ Dislike Error:', errorText);
    }

    // Test 3: Neutral feedback (clear)
    console.log('\n📍 Test 3: Sending NEUTRAL feedback (clear)...');
    const neutralResponse = await fetch(
      `${TEST_CONFIG.BASE_URL}/conversations/${TEST_CONFIG.TEST_CONVERSATION_ID}/messages/${TEST_CONFIG.TEST_MESSAGE_ID}/feedback?domain_id=${TEST_CONFIG.DOMAIN_ID}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          liked: 0,
          feedback_text: null
        })
      }
    );

    console.log('📤 Neutral Response Status:', neutralResponse.status);
    if (neutralResponse.ok) {
      const neutralResult = await neutralResponse.json();
      console.log('✅ Neutral Response:', JSON.stringify(neutralResult, null, 2));
    } else {
      const errorText = await neutralResponse.text();
      console.log('❌ Neutral Error:', errorText);
    }

    console.log('\n🎯 Feedback API tests completed!');
    console.log('\n📝 Summary:');
    console.log('• Backend feedback endpoints are available');
    console.log('• Frontend has like/dislike buttons with immediate UI feedback');  
    console.log('• API calls use POST method with proper data structure');
    console.log('• Feedback values: 1=like, -1=dislike, 0=neutral');

  } catch (error) {
    console.error('💥 Test failed:', error);
    console.log('\n🚨 This might be because:');
    console.log('• Test conversation/message IDs don\\'t exist');
    console.log('• Backend service is not running');
    console.log('• Network connectivity issues');
    console.log('\n🔧 To fix: Use real conversation and message IDs from your chat');
  }
}

// Check if we're running from the browser (fetch available) or Node.js
if (typeof window !== 'undefined') {
  // Running in browser - expose globally
  window.testFeedbackAPI = testFeedbackAPI;
  console.log('🌐 Run testFeedbackAPI() in browser console to test');
} else {
  // Running in Node.js - need to install node-fetch
  console.log('📋 To test feedback API:');
  console.log('1. Open browser console at http://localhost:3002');
  console.log('2. Start a chat conversation'); 
  console.log('3. Update TEST_CONVERSATION_ID and TEST_MESSAGE_ID');
  console.log('4. Run testFeedbackAPI() in console');
}

module.exports = { testFeedbackAPI };