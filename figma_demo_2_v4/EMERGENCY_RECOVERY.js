/**
 * EMERGENCY RECOVERY SCRIPT
 * Run this in browser console if conversations disappeared from sidebar
 */

// 1. Check what's in localStorage
console.log('🔍 Checking localStorage for conversations...');
const conversationKeys = Object.keys(localStorage).filter(k => k.startsWith('pulse_conv_'));
console.log('Found', conversationKeys.length, 'conversations in localStorage');
conversationKeys.forEach(key => {
  const data = JSON.parse(localStorage.getItem(key));
  console.log(`  - ${key}: "${data.title}" (${data.messages?.length || 0} messages)`);
});

// 2. Check if any conversations are corrupted
console.log('\n🔧 Checking for corrupted conversations...');
let corruptedCount = 0;
conversationKeys.forEach(key => {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    if (!data.id || !data.title || !Array.isArray(data.messages)) {
      console.error('❌ Corrupted:', key, data);
      corruptedCount++;
    }
  } catch (error) {
    console.error('❌ Parse error:', key, error);
    localStorage.removeItem(key);
    corruptedCount++;
  }
});
console.log(corruptedCount === 0 ? '✅ All conversations valid' : `⚠️ Found ${corruptedCount} corrupted conversations`);

// 3. Fix missing fields
console.log('\n🔧 Fixing conversations...');
conversationKeys.forEach(key => {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    let fixed = false;
    
    // Ensure lastUpdated exists
    if (!data.lastUpdated) {
      data.lastUpdated = Date.now();
      fixed = true;
    }
    
    // Ensure messages array exists
    if (!Array.isArray(data.messages)) {
      data.messages = [];
      fixed = true;
    }
    
    // Ensure each message has required fields
    data.messages = data.messages.map((msg, index) => {
      if (!msg.id) msg.id = `fixed_${Date.now()}_${index}`;
      if (!msg.type) msg.type = 'user';
      if (!msg.text) msg.text = '';
      if (!msg.timestamp) msg.timestamp = Date.now();
      return msg;
    });
    
    if (fixed) {
      localStorage.setItem(key, JSON.stringify(data));
      console.log('✅ Fixed:', key);
    }
  } catch (error) {
    console.error('❌ Cannot fix:', key, error);
  }
});

// 4. Trigger sidebar refresh
console.log('\n🔄 Refreshing sidebar...');
window.dispatchEvent(new StorageEvent('storage', {
  key: 'pulse_conversations_updated',
  newValue: Date.now().toString(),
  url: window.location.href
}));

console.log('\n✅ Recovery complete! Refresh the page if needed.');
