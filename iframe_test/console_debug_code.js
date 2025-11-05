// Paste this in console for comprehensive form debugging
(function() {
  console.log('🔧 Setting up comprehensive form debugging...');
  
  // 1. Mutation observer for form creation
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName === 'FORM') {
          console.group('🏗️ FORM CREATED');
          console.log('Form element:', node);
          console.log('HTML:', node.outerHTML);
          console.log('Attributes:', {
            method: node.method,
            action: node.action,
            target: node.target
          });
          console.groupEnd();
        }
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
  
  // 2. Form submit interceptor
  const originalSubmit = HTMLFormElement.prototype.submit;
  HTMLFormElement.prototype.submit = function() {
    console.group('📤 FORM SUBMISSION');
    console.log('Form:', this);
    
    const formData = new FormData(this);
    console.log('Data being sent:');
    for (let [key, value] of formData.entries()) {
      console.log(`  📋 ${key}: ${value}`);
    }
    
    console.log('⏰ Delaying submission for inspection...');
    console.groupEnd();
    
    setTimeout(() => {
      console.log('🚀 Submitting form now!');
      originalSubmit.call(this);
    }, 3000);
  };
  
  console.log('✅ Form debugging setup complete!');
})();
