/**
 * Debug Search Issue
 * 
 * Add this to browser console to debug the search functionality
 */

// Test function to debug the search issue
async function debugSearch() {
  console.log('🔍 Debugging Search Issue');
  console.log('='.repeat(50));
  
  // Check if the search function exists
  const sidebar = document.querySelector('[class*="sidebar"]') || document.querySelector('[class*="menu"]');
  console.log('📋 Sidebar element found:', !!sidebar);
  
  // Test the API directly
  try {
    console.log('\n1️⃣ Testing API directly...');
    const response = await fetch('https://workforceagent.elevancehealth.com/api/conversations/search/?domain_id=AG04333&query=test&limit=20');
    const data = await response.json();
    console.log('API Response:', data);
    console.log(`Conversations found: ${data.conversations?.length || 0}`);
    
    if (data.conversations && data.conversations.length > 0) {
      console.log('Sample conversation titles:');
      data.conversations.slice(0, 3).forEach((conv, i) => {
        console.log(`  ${i + 1}. ${conv.title}`);
      });
    }
  } catch (error) {
    console.error('API Error:', error);
  }
  
  console.log('\n2️⃣ Checking search input...');
  const searchInput = document.querySelector('input[type="text"]');
  console.log('Search input found:', !!searchInput);
  console.log('Search input value:', searchInput?.value);
  
  console.log('\n3️⃣ Checking conversation items...');
  const conversationItems = document.querySelectorAll('[class*="conversation"], [class*="thread"], [role="button"]');
  console.log(`Found ${conversationItems.length} conversation-like elements`);
  
  // Check text content of visible items
  const visibleTexts = Array.from(conversationItems).slice(0, 10).map(item => item.textContent?.trim()).filter(text => text && text.length > 0);
  console.log('Visible conversation texts:', visibleTexts);
  
  console.log('\n4️⃣ Manual search test...');
  if (searchInput) {
    console.log('Triggering search manually...');
    searchInput.value = 'test';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    
    // Wait a bit and check again
    setTimeout(() => {
      const newConversationItems = document.querySelectorAll('[class*="conversation"], [class*="thread"], [role="button"]');
      console.log(`After search: ${newConversationItems.length} conversation elements`);
      
      const newVisibleTexts = Array.from(newConversationItems).slice(0, 10).map(item => item.textContent?.trim()).filter(text => text && text.length > 0);
      console.log('After search visible texts:', newVisibleTexts);
      
      const hasTestInResults = newVisibleTexts.some(text => text.toLowerCase().includes('test'));
      console.log(`Results contain 'test': ${hasTestInResults}`);
      
      if (!hasTestInResults && newVisibleTexts.length > 0) {
        console.log('❌ ISSUE: Search results do not contain "test" but show other conversations');
        console.log('This confirms the search filtering is not working properly');
      } else if (hasTestInResults) {
        console.log('✅ Search filtering appears to be working');
      } else {
        console.log('🤔 No conversations visible at all');
      }
    }, 1000);
  }
  
  console.log('\n💡 To test further:');
  console.log('1. Open browser console');
  console.log('2. Type: debugSearch()');
  console.log('3. Check the output');
  
  console.log('\n' + '='.repeat(50));
}

// Make it available globally
window.debugSearch = debugSearch;

console.log('🔧 Search Debug Tool Loaded');
console.log('Run: debugSearch() in browser console to test');

// Auto-run if we're in a browser environment
if (typeof window !== 'undefined' && window.location) {
  debugSearch();
}