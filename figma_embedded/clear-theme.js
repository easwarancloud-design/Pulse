// Clear theme from localStorage and refresh
console.log('Clearing theme localStorage...');
localStorage.removeItem('theme');
console.log('Theme cleared. The page should now use the default theme set by the component.');
console.log('Current localStorage theme:', localStorage.getItem('theme'));
// Optionally refresh the page
// window.location.reload();