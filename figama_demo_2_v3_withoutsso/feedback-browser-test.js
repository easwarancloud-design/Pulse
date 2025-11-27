/**
 * Test script to verify feedback behavior in the current ChatPage implementation
 * This will help us understand why feedback is not being stored
 */

// Open your browser console and run this script while on the chat page
// It will simulate clicking a feedback button and show debug information

function testFeedbackInBrowser() {
    console.log('🧪 Testing Feedback in Browser Environment');
    console.log('===============================================');
    
    // Check if we're in the right page
    if (!window.location.pathname.includes('/chat') && !window.location.pathname.includes('/resultpage')) {
        console.log('❌ Not on chat page. Navigate to the chat page first.');
        return;
    }
    
    // Look for feedback buttons
    const likeButtons = document.querySelectorAll('[data-testid="like-button"], .like-button, button[title*="like"], button[aria-label*="like"]');
    const dislikeButtons = document.querySelectorAll('[data-testid="dislike-button"], .dislike-button, button[title*="dislike"], button[aria-label*="dislike"]');
    
    console.log(`Found ${likeButtons.length} like buttons and ${dislikeButtons.length} dislike buttons`);
    
    // Check for messages
    const messages = document.querySelectorAll('.message, .chat-message, [data-message-id]');
    console.log(`Found ${messages.length} message elements`);
    
    // Check React state (if available)
    if (window.React) {
        console.log('✅ React is available');
        
        // Try to find React components with feedback state
        const reactNodes = document.querySelectorAll('[data-reactroot] *');
        console.log(`Found ${reactNodes.length} React nodes`);
    } else {
        console.log('⚠️ React not found in global scope');
    }
    
    // Check for hybrid chat service
    if (window.hybridChatService) {
        console.log('✅ hybridChatService found');
        console.log('Current conversation ID:', window.hybridChatService.getCurrentConversationId());
    } else {
        console.log('⚠️ hybridChatService not found in global scope');
    }
    
    // Check for conversation storage
    if (window.conversationStorage) {
        console.log('✅ conversationStorage found');
    } else {
        console.log('⚠️ conversationStorage not found in global scope');
    }
    
    // Check localStorage for feedback data
    const feedbackKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('feedback_')) {
            feedbackKeys.push(key);
        }
    }
    
    console.log('Feedback keys in localStorage:', feedbackKeys);
    feedbackKeys.forEach(key => {
        console.log(`  ${key}: ${localStorage.getItem(key)}`);
    });
    
    // Instructions for manual testing
    console.log('\n📋 Manual Testing Instructions:');
    console.log('1. Click a like or dislike button on any message');
    console.log('2. Check the browser console for debug logs');
    console.log('3. Look for "🔍 Feedback API Debug" logs');
    console.log('4. Verify if feedback API calls are being made');
    
    // Add a click listener to capture feedback events
    document.addEventListener('click', function(e) {
        if (e.target.closest('button[title*="like"], button[aria-label*="like"], .like-button, .dislike-button')) {
            console.log('👆 Feedback button clicked:', {
                element: e.target,
                closest: e.target.closest('button'),
                timestamp: new Date().toISOString()
            });
        }
    });
    
    console.log('✅ Feedback test setup complete. Click some feedback buttons and watch the console!');
}

// Also add a simple API test function
function testFeedbackAPIDirectly() {
    console.log('\n🚀 Testing Feedback API Directly');
    console.log('=================================');
    
    // Test configuration
    const API_BASE = 'https://workforceagent.elevancehealth.com/api';
    const DOMAIN_ID = 'AG04333'; // Update this to your actual domain ID
    
    fetch(`${API_BASE}/conversations/user/${DOMAIN_ID}?limit=1`)
        .then(response => response.json())
        .then(conversations => {
            if (conversations.length > 0) {
                const convId = conversations[0].id;
                console.log('Testing with conversation:', convId);
                
                return fetch(`${API_BASE}/conversations/${convId}?domain_id=${DOMAIN_ID}`);
            } else {
                throw new Error('No conversations found');
            }
        })
        .then(response => response.json())
        .then(conv => {
            if (conv.messages.length > 0) {
                const msg = conv.messages[0];
                console.log('Testing feedback on message:', msg.id);
                
                const feedbackData = {
                    liked: 1,
                    feedback_text: 'Direct API test at ' + new Date().toISOString()
                };
                
                return fetch(`${API_BASE}/conversations/${conv.id}/messages/${msg.id}/feedback?domain_id=${DOMAIN_ID}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(feedbackData)
                });
            } else {
                throw new Error('No messages found in conversation');
            }
        })
        .then(response => response.json())
        .then(result => {
            console.log('✅ Direct API test result:', result);
        })
        .catch(error => {
            console.error('❌ Direct API test failed:', error);
        });
}

// Instructions
console.log('🔧 Feedback Debugging Tools Loaded');
console.log('===================================');
console.log('Run these functions in the browser console:');
console.log('1. testFeedbackInBrowser() - Test in current page');
console.log('2. testFeedbackAPIDirectly() - Test API directly');
console.log('');
console.log('Copy and paste one of these function calls:');
console.log('testFeedbackInBrowser()');
console.log('testFeedbackAPIDirectly()');

// Export functions to global scope for easy access
if (typeof window !== 'undefined') {
    window.testFeedbackInBrowser = testFeedbackInBrowser;
    window.testFeedbackAPIDirectly = testFeedbackAPIDirectly;
}