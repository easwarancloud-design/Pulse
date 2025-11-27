/**
 * Feedback API Diagnostic Test
 * Tests the feedback functionality to identify database storage issues
 */

const TEST_CONFIG = {
  BASE_URL: 'https://workforceagent.elevancehealth.com/api',
  DOMAIN_ID: 'AG04333', // Update this with your actual domain ID
};

// Simple diagnostic test
async function diagnoseFeedbackAPI() {
    console.log('🔍 Diagnosing Feedback API Issues...\n');

    try {
        // Test 1: Check health
        console.log('1️⃣ Testing API health...');
        const healthResponse = await fetch(`${TEST_CONFIG.BASE_URL}/conversations/health`);
        
        if (healthResponse.ok) {
            const healthData = await healthResponse.json();
            console.log('✅ API is healthy:', healthData.message);
        } else {
            console.log('❌ API health check failed:', healthResponse.status);
            const errorText = await healthResponse.text();
            console.log('   Error:', errorText);
            return;
        }

        // Test 2: Get existing conversations to find one to test with
        console.log('\n2️⃣ Finding existing conversations...');
        const conversationsResponse = await fetch(
            `${TEST_CONFIG.BASE_URL}/conversations/user/${TEST_CONFIG.DOMAIN_ID}?limit=5`
        );
        
        let conversations = [];
        if (conversationsResponse.ok) {
            conversations = await conversationsResponse.json();
            console.log(`✅ Found ${conversations.length} conversations`);
            
            if (conversations.length === 0) {
                console.log('⚠️ No existing conversations found. Creating a test conversation...');
                
                // Create a test conversation
                const createResponse = await fetch(`${TEST_CONFIG.BASE_URL}/conversations`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        domain_id: TEST_CONFIG.DOMAIN_ID,
                        title: 'Feedback Test Conversation',
                        summary: 'Testing feedback functionality'
                    })
                });
                
                if (createResponse.ok) {
                    const newConv = await createResponse.json();
                    conversations = [{ id: newConv.id, title: newConv.title }];
                    console.log('✅ Created test conversation:', newConv.id);
                } else {
                    console.log('❌ Failed to create test conversation:', createResponse.status);
                    return;
                }
            }
        } else {
            console.log('❌ Failed to get conversations:', conversationsResponse.status);
            return;
        }

        // Test 3: Get conversation details and find a message to test
        const testConversation = conversations[0];
        console.log(`\n3️⃣ Testing with conversation: ${testConversation.id}`);
        
        const convResponse = await fetch(
            `${TEST_CONFIG.BASE_URL}/conversations/${testConversation.id}?domain_id=${TEST_CONFIG.DOMAIN_ID}`
        );
        
        let conversationData;
        if (convResponse.ok) {
            conversationData = await convResponse.json();
            console.log(`✅ Conversation loaded with ${conversationData.messages.length} messages`);
            
            if (conversationData.messages.length === 0) {
                console.log('⚠️ No messages found. Adding a test message...');
                
                // Add a test message
                const msgResponse = await fetch(
                    `${TEST_CONFIG.BASE_URL}/conversations/${testConversation.id}/messages?domain_id=${TEST_CONFIG.DOMAIN_ID}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            message_type: 'assistant',
                            content: 'This is a test message for feedback testing',
                            chat_id: 'test-feedback-msg-1'
                        })
                    }
                );
                
                if (msgResponse.ok) {
                    const newMsg = await msgResponse.json();
                    conversationData.messages = [newMsg];
                    console.log('✅ Added test message:', newMsg.id);
                } else {
                    console.log('❌ Failed to add test message:', msgResponse.status);
                    return;
                }
            }
        } else {
            console.log('❌ Failed to load conversation:', convResponse.status);
            return;
        }

        // Test 4: Test feedback API with the first message
        const testMessage = conversationData.messages[0];
        console.log(`\n4️⃣ Testing feedback with message: ${testMessage.id}`);
        console.log(`   Chat ID: ${testMessage.chat_id || 'none'}`);
        console.log(`   Current feedback: liked=${testMessage.liked || 0}, text="${testMessage.feedback_text || 'none'}"`);

        // Test feedback by message ID
        const feedbackUrl = `${TEST_CONFIG.BASE_URL}/conversations/${testConversation.id}/messages/${testMessage.id}/feedback?domain_id=${TEST_CONFIG.DOMAIN_ID}`;
        console.log(`\n📡 Testing feedback URL: ${feedbackUrl}`);
        
        const feedbackData = {
            liked: 1,
            feedback_text: `Test feedback at ${new Date().toISOString()}`
        };
        
        console.log('📤 Sending feedback data:', feedbackData);
        
        const feedbackResponse = await fetch(feedbackUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(feedbackData)
        });
        
        if (feedbackResponse.ok) {
            const result = await feedbackResponse.json();
            console.log('✅ Feedback API call successful:', result);
        } else {
            const errorText = await feedbackResponse.text();
            console.log('❌ Feedback API call failed:', feedbackResponse.status);
            console.log('   Error response:', errorText);
            
            // Try to parse error response
            try {
                const errorData = JSON.parse(errorText);
                console.log('   Parsed error:', errorData);
            } catch {
                console.log('   Raw error text:', errorText);
            }
        }

        // Test 5: Verify feedback was stored by re-fetching the conversation
        console.log('\n5️⃣ Verifying feedback was stored...');
        
        const verifyResponse = await fetch(
            `${TEST_CONFIG.BASE_URL}/conversations/${testConversation.id}?domain_id=${TEST_CONFIG.DOMAIN_ID}`
        );
        
        if (verifyResponse.ok) {
            const updatedConv = await verifyResponse.json();
            const updatedMessage = updatedConv.messages.find(m => m.id === testMessage.id);
            
            if (updatedMessage) {
                console.log('✅ Message after feedback update:');
                console.log(`   Message ID: ${updatedMessage.id}`);
                console.log(`   Liked: ${updatedMessage.liked}`);
                console.log(`   Feedback text: "${updatedMessage.feedback_text || 'none'}"`);
                console.log(`   Feedback at: ${updatedMessage.feedback_at || 'none'}`);
                
                if (updatedMessage.liked === feedbackData.liked && 
                    updatedMessage.feedback_text === feedbackData.feedback_text) {
                    console.log('🎉 SUCCESS: Feedback was stored correctly!');
                } else {
                    console.log('⚠️ WARNING: Feedback values do not match what was sent');
                    console.log('   Expected:', feedbackData);
                    console.log('   Actual:', { liked: updatedMessage.liked, feedback_text: updatedMessage.feedback_text });
                }
            } else {
                console.log('❌ Could not find the test message in updated conversation');
            }
        } else {
            console.log('❌ Failed to verify feedback storage:', verifyResponse.status);
        }

    } catch (error) {
        console.error('🚨 Test failed with error:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

// Run the diagnostic
console.log('Starting Feedback API Diagnostic Test...\n');
diagnoseFeedbackAPI().then(() => {
    console.log('\n✅ Diagnostic test completed!');
}).catch(error => {
    console.error('\n❌ Diagnostic test failed:', error);
});