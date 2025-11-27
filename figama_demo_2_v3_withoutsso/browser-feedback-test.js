/**
 * Browser Console Test for Feedback Functionality
 * 
 * Instructions:
 * 1. Open your chat application in the browser
 * 2. Open Developer Console (F12)
 * 3. Copy and paste this entire script
 * 4. Click some like/dislike buttons and watch the logs
 */

console.log('🧪 Loading Feedback Test Script...');

// Test function for chat_id approach
window.testChatFeedback = async () => {
    console.log('\n🚀 Testing Chat Feedback API Directly');
    console.log('=====================================');
    
    const API_BASE = 'https://workforceagent.elevancehealth.com/api';
    const DOMAIN_ID = 'AG04333';
    
    try {
        // Get a recent conversation
        console.log('📋 Getting conversations...');
        const convResponse = await fetch(`${API_BASE}/conversations/user/${DOMAIN_ID}?limit=1`);
        const conversations = await convResponse.json();
        
        if (conversations.length > 0) {
            const convId = conversations[0].id;
            console.log('✅ Found conversation:', convId);
            
            // Get conversation details
            const conv = await fetch(`${API_BASE}/conversations/${convId}?domain_id=${DOMAIN_ID}`).then(r => r.json());
            
            if (conv.messages.length > 0) {
                const message = conv.messages[0];
                console.log('📝 Testing with message:', {
                    id: message.id,
                    chat_id: message.chat_id,
                    content: message.content.substring(0, 50) + '...'
                });
                
                // Test 1: Try message_id approach (should fail with 404)
                console.log('\n1️⃣ Testing message_id approach (expecting 404)...');
                const messageUrl = `${API_BASE}/conversations/${convId}/messages/${message.id}/feedback?domain_id=${DOMAIN_ID}`;
                console.log('URL:', messageUrl);
                
                try {
                    const messageResult = await fetch(messageUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ liked: 1, feedback_text: 'Message ID test' })
                    });
                    console.log('Message ID result:', messageResult.status, await messageResult.text());
                } catch (error) {
                    console.log('Message ID error (expected):', error.message);
                }
                
                // Test 2: Try chat_id approach (should work)
                if (message.chat_id) {
                    console.log('\n2️⃣ Testing chat_id approach (should work)...');
                    const chatUrl = `${API_BASE}/conversations/${convId}/chat/${message.chat_id}/feedback?domain_id=${DOMAIN_ID}`;
                    console.log('URL:', chatUrl);
                    
                    try {
                        const chatResult = await fetch(chatUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ liked: 1, feedback_text: 'Chat ID test success!' })
                        });
                        
                        if (chatResult.ok) {
                            const data = await chatResult.json();
                            console.log('✅ Chat ID SUCCESS:', data);
                            console.log('🎉 The chat_id approach works! Your feedback should now work in the UI.');
                        } else {
                            console.log('❌ Chat ID failed:', chatResult.status, await chatResult.text());
                        }
                    } catch (error) {
                        console.log('❌ Chat ID error:', error.message);
                    }
                } else {
                    console.log('⚠️ No chat_id available for this message');
                }
            } else {
                console.log('⚠️ No messages found in conversation');
            }
        } else {
            console.log('⚠️ No conversations found');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
};

// Monitor feedback button clicks
window.monitorFeedbackClicks = () => {
    console.log('\n👆 Monitoring feedback button clicks...');
    console.log('Click like/dislike buttons and watch the console!');
    
    document.addEventListener('click', function(e) {
        const button = e.target.closest('button, [role="button"]');
        if (button) {
            const buttonText = button.textContent || button.getAttribute('aria-label') || button.title || '';
            
            if (buttonText.toLowerCase().includes('like') || 
                button.className.includes('like') || 
                button.className.includes('thumb')) {
                
                console.log('🎯 Feedback button clicked:', {
                    element: button,
                    text: buttonText,
                    classes: button.className,
                    timestamp: new Date().toISOString()
                });
            }
        }
    }, true);
};

// Instructions
console.log('\n🔧 Feedback Testing Tools Ready!');
console.log('================================');
console.log('Available commands:');
console.log('1. testChatFeedback() - Test API endpoints directly');
console.log('2. monitorFeedbackClicks() - Monitor button clicks');
console.log('');
console.log('Quick test: Run this command:');
console.log('testChatFeedback()');
console.log('');
console.log('Then click some feedback buttons in your chat and watch for:');
console.log('• "🔍 Like/Dislike Feedback attempt" logs');
console.log('• "✅ feedback stored via chat_id" success messages');
console.log('• No more 404 errors!');

// Auto-start click monitoring
window.monitorFeedbackClicks();

console.log('✅ Test script loaded! Run testChatFeedback() to test the API.');