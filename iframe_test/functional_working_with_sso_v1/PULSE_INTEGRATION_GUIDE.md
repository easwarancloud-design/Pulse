# Pulse iframe Integration Package

This package provides two integration options for embedding the Pulse search component.

## 🚀 Quick Start

### Option 1: Enhanced Integration (Recommended)
Full functionality with dropdown breakout and seamless user experience.

### Option 2: Basic Integration (Fallback)
Simple iframe embed with internal dropdown (no additional code required).

---

## 📦 Enhanced Integration Implementation

### Step 1: Add the iframe to your page

```html
<div class="pulse-iframe-container">
    <iframe 
        src="YOUR_PULSE_DOMAIN/pulseembedded" 
        width="100%" 
        height="400px"
        frameborder="0"
        id="pulseIframe"
        name="pulseIframe">
    </iframe>
</div>

<!-- Dropdown overlay container (required) -->
<div id="pulseDropdownOverlay" class="pulse-dropdown-overlay"></div>
```

### Step 2: Add CSS Styles

```css
/* Pulse Dropdown Overlay Styles */
.pulse-dropdown-overlay {
    position: fixed;
    z-index: 10000;
    background: linear-gradient(115deg, #122F65 2.06%, #00123C 97.35%);
    border: 2px solid #2861BB;
    border-radius: 16px;
    padding: 12px 16px;
    box-shadow: 0px 8px 32px 0px rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(15px);
    max-height: 320px;
    overflow-y: auto;
    min-width: 300px;
    display: none;
    animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.pulse-dropdown-header {
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 12px;
    padding-bottom: 8px;
    font-size: 13px;
    font-family: 'Elevance Sans', -apple-system, Roboto, Helvetica, sans-serif;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.pulse-dropdown-item {
    display: flex;
    align-items: center;
    padding: 10px 6px;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-bottom: 2px;
    min-height: 36px;
    border-radius: 6px;
}

.pulse-dropdown-item:hover {
    background: rgba(255, 255, 255, 0.15);
    transform: translateX(2px);
}

.pulse-dropdown-icon {
    width: 16px;
    height: 16px;
    margin-right: 12px;
    flex-shrink: 0;
}

.pulse-dropdown-text {
    color: white;
    font-size: 14px;
    line-height: 18px;
    font-family: 'Elevance Sans', -apple-system, Roboto, Helvetica, sans-serif;
    font-weight: 500;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
}
```

### Step 3: Add JavaScript Integration

```javascript
// Pulse iframe Integration Script
(function() {
    'use strict';
    
    const dropdownOverlay = document.getElementById('pulseDropdownOverlay');
    const iframe = document.getElementById('pulseIframe');
    let currentActiveIframe = null;
    
    if (!dropdownOverlay || !iframe) {
        console.warn('Pulse integration: Required elements not found');
        return;
    }
    
    // Listen for messages from Pulse iframe
    window.addEventListener('message', function(event) {
        // Replace YOUR_PULSE_DOMAIN with actual domain
        if (event.origin !== 'YOUR_PULSE_DOMAIN') return;
        
        const { type, data } = event.data;
        
        if (type === 'PULSE_SHOW_DROPDOWN') {
            showDropdown(data, event.source);
        } else if (type === 'PULSE_HIDE_DROPDOWN') {
            hideDropdown();
        }
    });
    
    function showDropdown(data, iframeWindow) {
        const { suggestions, position } = data;
        currentActiveIframe = iframeWindow;
        
        // Calculate position relative to iframe
        const iframeRect = iframe.getBoundingClientRect();
        const dropdownX = iframeRect.left + position.x;
        const dropdownY = iframeRect.top + position.y + 8;
        
        // Clear existing content
        dropdownOverlay.innerHTML = '';
        
        // Create header
        const header = document.createElement('div');
        header.className = 'pulse-dropdown-header';
        header.textContent = 'Previous Conversations';
        dropdownOverlay.appendChild(header);
        
        // Create dropdown items
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'pulse-dropdown-item';
            
            // Chat icon
            const icon = document.createElement('div');
            icon.className = 'pulse-dropdown-icon';
            icon.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 2H4C2.9 2 2 2.9 2 4V18L6 14H20C21.1 14 22 13.1 22 12V4C22 2.9 21.1 2 20 2Z" fill="#87D2F7"/>
                </svg>
            `;
            
            // Text content
            const text = document.createElement('div');
            text.className = 'pulse-dropdown-text';
            text.textContent = suggestion.title;
            
            item.appendChild(icon);
            item.appendChild(text);
            
            // Click handler
            item.addEventListener('click', function() {
                currentActiveIframe.postMessage({
                    type: 'PULSE_DROPDOWN_SELECTION',
                    data: suggestion
                }, 'YOUR_PULSE_DOMAIN');
                
                hideDropdown();
            });
            
            dropdownOverlay.appendChild(item);
        });
        
        // Position dropdown with boundary checking
        const maxX = window.innerWidth - 320;
        const maxY = window.innerHeight - 320;
        
        const finalX = Math.min(dropdownX, maxX);
        const finalY = Math.min(dropdownY, maxY);
        
        dropdownOverlay.style.left = finalX + 'px';
        dropdownOverlay.style.top = finalY + 'px';
        dropdownOverlay.style.width = Math.max(position.width, 300) + 'px';
        dropdownOverlay.style.display = 'block';
    }
    
    function hideDropdown() {
        dropdownOverlay.style.display = 'none';
        currentActiveIframe = null;
    }
    
    // Event listeners for hiding dropdown
    document.addEventListener('click', function(event) {
        if (!dropdownOverlay.contains(event.target)) {
            const iframeRect = iframe.getBoundingClientRect();
            const clickedOnIframe = event.clientX >= iframeRect.left && 
                                  event.clientX <= iframeRect.right &&
                                  event.clientY >= iframeRect.top && 
                                  event.clientY <= iframeRect.bottom;
            
            if (!clickedOnIframe) {
                hideDropdown();
            }
        }
    });
    
    window.addEventListener('scroll', hideDropdown);
    window.addEventListener('resize', hideDropdown);
    
    console.log('✅ Pulse iframe integration loaded successfully');
})();
```

### Step 4: Replace Domain Placeholder

Replace `YOUR_PULSE_DOMAIN` with your actual Pulse domain (e.g., `https://your-pulse-domain.com`).

---

## 🔧 Basic Integration (No Additional Code)

If you cannot implement the enhanced integration, simply use:

```html
<iframe 
    src="YOUR_PULSE_DOMAIN/pulseembedded" 
    width="100%" 
    height="400px"
    frameborder="0">
</iframe>
```

The iframe will automatically detect the lack of parent support and use an internal dropdown.

---

## 📋 Integration Checklist

### Enhanced Integration:
- [ ] Add iframe HTML
- [ ] Add dropdown overlay container
- [ ] Include CSS styles
- [ ] Add JavaScript integration script
- [ ] Replace domain placeholder
- [ ] Test dropdown functionality

### Basic Integration:
- [ ] Add iframe HTML
- [ ] Test basic functionality

---

## 🧪 Testing

1. **Load the page** with the iframe
2. **Focus the search input** in the iframe
3. **Type to filter** or see suggestions
4. **Verify dropdown** appears outside iframe (Enhanced) or inside (Basic)
5. **Click suggestions** to test selection
6. **Test search** to verify result page navigation

---

## 🆘 Support

If you encounter issues:
1. Check browser console for errors
2. Verify domain configuration
3. Ensure all required elements are present
4. Test with both integration methods

## 🔒 Security Note

The postMessage integration includes origin verification for security. Make sure to set the correct domain in the JavaScript code.