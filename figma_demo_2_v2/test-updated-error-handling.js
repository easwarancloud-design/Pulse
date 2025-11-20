/**
 * Test the updated error handling for conversation loading
 */

const API_BASE = 'https://workforceagent.elevancehealth.com';

async function testUpdatedErrorHandling() {
  console.log('🧪 Testing Updated Error Handling...');
  
  try {
    // Try to get a conversation that has the database schema issue
    const conversationId = 'conv_32edacbf-87df-4944-9bbf-28956af8db00';
    console.log(`\n📡 Testing conversation with schema error: ${conversationId}`);
    
    const response = await fetch(`${API_BASE}/api/conversations/${conversationId}?user_id=AG04333&include_messages=true`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    console.log('📊 Response Status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error Response:', errorText);
      
      // Check what type of error this is
      if (errorText.includes('Unknown column')) {
        console.log('✅ Detected: Database schema error (Unknown column)');
        console.log('📝 This should trigger the database_error handling');
      } else if (errorText.includes('validation errors')) {
        console.log('✅ Detected: Validation error');
        console.log('📝 This should trigger the validation_error handling');
      } else {
        console.log('❓ Unknown error type');
      }
      
      return;
    }

    const data = await response.json();
    console.log('✅ Unexpected success:', data);

  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

console.log('🔧 This test helps verify that the error detection logic will work correctly');
testUpdatedErrorHandling();