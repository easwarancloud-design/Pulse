const API_BASE = 'https://workforceagent.elevancehealth.com/api';

async function createAndDebugConversation() {
    try {
        console.log('🆕 Creating a fresh test conversation...');
        
        // Step 1: Create a new conversation
        let response = await fetch(`${API_BASE}/conversations/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: 'test_user',
                domain_id: 'test_user',
                title: 'Multi-Message Debug Test'
            })
        });

        if (!response.ok) {
            console.error('❌ Failed to create conversation:', response.status, await response.text());
            return;
        }

        const convData = await response.json();
        const convId = convData.id;
        console.log('✅ Created conversation:', convId);

        // Step 2: Add multiple messages
        const messages = [
            { message: 'First question?', type: 'user' },
            { message: 'First response.', type: 'assistant' },
            { message: 'Second question?', type: 'user' },
            { message: 'Second response.', type: 'assistant' },
            { message: 'Third question?', type: 'user' },
            { message: 'Third response.', type: 'assistant' }
        ];

        for (let i = 0; i < messages.length; i++) {
            const msg = messages[i];
            console.log(`📝 Adding message ${i + 1}: ${msg.type} - ${msg.message}`);
            
            const msgResponse = await fetch(`${API_BASE}/conversations/${convId}/messages?domain_id=test_user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: msg.message,
                    message_type: msg.type,
                    user_id: 'test_user'
                })
            });

            if (!msgResponse.ok) {
                console.error(`❌ Failed to add message ${i + 1}:`, msgResponse.status, await msgResponse.text());
                return;
            }

            await msgResponse.json();
        }

        console.log('✅ Added all 6 messages to conversation');

        // Step 3: Now test the get conversation endpoint
        console.log('🔍 Testing API response for conversation:', convId);
        
        response = await fetch(`${API_BASE}/conversations/${convId}?include_messages=true&domain_id=test_user`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        console.log('📡 Response status:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', response.status, errorText);
            return;
        }

        const data = await response.json();
        
        console.log('📋 API Response Structure:');
        console.log('- Keys:', Object.keys(data));
        console.log('- Title:', data.title);
        console.log('- Messages array length:', data.messages?.length || 'NO MESSAGES ARRAY');
        console.log('- Conversation array length:', data.conversation?.length || 'NO CONVERSATION ARRAY');
        
        if (data.messages) {
            console.log('\n📝 Messages structure:');
            data.messages.forEach((msg, index) => {
                console.log(`  Message ${index + 1}:`);
                console.log(`    - Keys: ${Object.keys(msg)}`);
                console.log(`    - Type: ${msg.message_type || msg.type || 'UNKNOWN'}`);
                console.log(`    - Content preview: ${(msg.content || msg.message_text || msg.text || 'NO CONTENT').substring(0, 50)}...`);
            });
        }
        
        if (data.conversation) {
            console.log('\n💬 Conversation structure:');
            data.conversation.forEach((msg, index) => {
                console.log(`  Message ${index + 1}:`);
                console.log(`    - Keys: ${Object.keys(msg)}`);
                console.log(`    - Type: ${msg.type}`);
                console.log(`    - Text preview: ${(msg.text || 'NO TEXT').substring(0, 50)}...`);
            });
        }
        
        console.log('\n🔧 Full API Response:');
        console.log(JSON.stringify(data, null, 2));
        
        return convId;
        
    } catch (error) {
        console.error('💥 Error testing API:', error);
    }
}

// Run the test
createAndDebugConversation().then((convId) => {
    console.log(`\n✅ API response debug completed for conversation: ${convId}`);
});