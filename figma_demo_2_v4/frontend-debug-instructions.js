// Test opening the fresh conversation in browser
const testConvId = 'conv_a8cc44e9-18f1-433f-9780-50f0da6e89c3';

console.log('🧪 Frontend Test Instructions:');
console.log('================================');
console.log('1. Open your React app in the browser');
console.log('2. Open browser developer console (F12)');
console.log('3. In the console, run this command to simulate selecting the conversation:');
console.log('');
console.log(`   // Set user info to match our test`);
console.log(`   localStorage.setItem('userInfo', JSON.stringify({domainId: 'test_user'}));`);
console.log('');
console.log(`   // Test conversation selection`);
console.log(`   window.testConversation = '${testConvId}';`);
console.log('');
console.log('4. Then navigate to the conversation in your UI or manually call:');
console.log(`   window.location.hash = '#/conversation/${testConvId}';`);
console.log('');
console.log('5. Watch the console for our DEBUG messages to see:');
console.log('   - "📡 GET conversation request" - API call details');
console.log('   - "🔍 DEBUG: Full conversation data" - what App.js receives');
console.log('   - "📋 Converting messages array to conversation format" - normalization');
console.log('   - "🔍 DEBUG: Raw conversation data" - what ChatPage receives');
console.log('   - "🔍 DEBUG: Final threadMessages" - what gets set to state');
console.log('');
console.log('If you see all 6 messages in the debug logs but only 2 in the UI,');
console.log('then we know the issue is in the rendering, not the data flow.');

// Also provide a quick API test
console.log('');
console.log('🔬 Quick API Test (run in browser console):');
console.log('============================================');
console.log(`fetch('https://workforceagent.elevancehealth.com/api/conversations/${testConvId}?domain_id=test_user&include_messages=true')
  .then(r => r.json())
  .then(data => {
    console.log('API Response:', {
      messagesCount: data.messages?.length,
      messages: data.messages?.map(m => ({type: m.message_type, content: m.content}))
    });
  });`);