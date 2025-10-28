# Figma Hero Page - Iframe Integration Guide

## Overview
The Figma Hero Page is a standalone component that contains only the AI search interface (hero section) and is optimized for iframe embedding in other applications.

## Available Routes

### 1. Full Figma App
- **URL**: `http://localhost:3002/figma`
- **Purpose**: Complete application with chat interface and full functionality

### 2. Hero Page Only (for iframe)
- **URL**: `http://localhost:3002/figma-hero`
- **Purpose**: Just the search interface, optimized for embedding

## Iframe Integration

### Basic Iframe Usage

```html
<!-- Embed in your application -->
<iframe 
  src="http://your-domain.com/figma-hero" 
  width="100%" 
  height="400px"
  frameborder="0"
  title="Figma AI Search">
</iframe>
```

### Responsive Iframe

```html
<div style="position: relative; width: 100%; height: 400px;">
  <iframe 
    src="http://your-domain.com/figma-hero" 
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
    title="Figma AI Search">
  </iframe>
</div>
```

### Full-Screen Iframe

```html
<iframe 
  src="http://your-domain.com/figma-hero" 
  style="width: 100vw; height: 100vh; border: none; margin: 0; padding: 0;"
  title="Figma AI Search">
</iframe>
```

## Message Communication

The hero page supports postMessage API for communication with parent applications:

### Listening for Search Events

```javascript
// In your parent application
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'FIGMA_SEARCH') {
    const searchQuery = event.data.query;
    console.log('User searched for:', searchQuery);
    
    // Handle the search - redirect to full app, open modal, etc.
    handleFigmaSearch(searchQuery);
  }
});

function handleFigmaSearch(query) {
  // Option 1: Redirect to full Figma app
  window.location.href = `/figma?q=${encodeURIComponent(query)}`;
  
  // Option 2: Open in new tab
  window.open(`/figma?q=${encodeURIComponent(query)}`, '_blank');
  
  // Option 3: Handle internally in your app
  // Your custom search handling logic here
}
```

### Custom Integration Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App with Figma Integration</title>
  <style>
    .figma-container {
      width: 100%;
      height: 500px;
      border: 1px solid #ddd;
      border-radius: 8px;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <h1>Welcome to My Application</h1>
  
  <div class="figma-container">
    <iframe 
      id="figma-hero"
      src="http://localhost:3002/figma-hero" 
      width="100%" 
      height="100%"
      frameborder="0">
    </iframe>
  </div>

  <script>
    window.addEventListener('message', function(event) {
      if (event.data && event.data.type === 'FIGMA_SEARCH') {
        // Replace iframe with full app
        const iframe = document.getElementById('figma-hero');
        iframe.src = `http://localhost:3002/figma?q=${encodeURIComponent(event.data.query)}`;
        
        // Or expand to full screen
        iframe.style.position = 'fixed';
        iframe.style.top = '0';
        iframe.style.left = '0';
        iframe.style.width = '100vw';
        iframe.style.height = '100vh';
        iframe.style.zIndex = '9999';
      }
    });
  </script>
</body>
</html>
```

## Features Included in Hero Page

✅ **AI Search Input** - Large search bar with star icon
✅ **Rotating Questions** - 3 sets of 3 questions with refresh button
✅ **Visual Design** - Exact match to Figma design with gradients
✅ **Responsive Layout** - Adapts to different container sizes
✅ **Message API** - Communicates search queries to parent
✅ **No Navigation** - Clean interface without extra UI elements

## Styling & Customization

### CSS Variables for Theming
You can override styles by targeting the iframe content:

```css
/* These styles would need to be injected into the hero page */
:root {
  --primary-blue: #2861BB;
  --accent-blue: #44B8F3;
  --gradient-start: #122F65;
  --gradient-end: #00123C;
}
```

### URL Parameters (Future Enhancement)
You could extend the hero page to accept URL parameters:

```
/figma-hero?theme=light&company=YourCompany&greeting=Welcome
```

## Deployment Notes

### For Production
1. Replace `localhost:3002` with your production domain
2. Ensure CORS is configured for iframe embedding
3. Set up HTTPS for secure iframe communication
4. Consider CSP (Content Security Policy) headers

### Security Considerations
- Validate message origins in postMessage listeners
- Use HTTPS for production deployments
- Consider iframe sandbox attributes if needed
- Implement proper CORS headers

## Testing

### Local Testing
1. Start the development server: `npm start`
2. Test hero page: `http://localhost:3002/figma-hero`
3. Test full app: `http://localhost:3002/figma`

### Iframe Testing
Create a simple HTML file to test iframe integration:

```html
<!DOCTYPE html>
<html>
<body>
  <h1>Iframe Test</h1>
  <iframe 
    src="http://localhost:3002/figma-hero" 
    width="1200" 
    height="600"
    style="border: 1px solid #ccc;">
  </iframe>
</body>
</html>
```

## Support & Maintenance

The hero page is designed to be:
- **Self-contained** - No external dependencies beyond React
- **Lightweight** - Only includes necessary components
- **Stable** - Minimal API surface for better compatibility
- **Responsive** - Works across different screen sizes

For updates or customizations, modify the `FigmaHeroPage.jsx` component.