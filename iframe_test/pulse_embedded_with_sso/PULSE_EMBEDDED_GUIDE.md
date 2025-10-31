# Pulse Embedded Component - Integration Guide

## Overview

The Pulse Embedded component (`/pulseembedded`) is a standalone version of the AI search interface that can be embedded as an iframe in external applications. It contains only the blue gradient search container with full functionality, optimized for iframe integration.

## Features

- ✅ AI-powered search interface with star icon
- ✅ Predefined question buttons with refresh functionality
- ✅ Search suggestions dropdown with previous conversations
- ✅ Voice input button (UI ready)
- ✅ "Learn More About AI" expandable information
- ✅ Responsive design optimized for iframe embedding
- ✅ PostMessage API for parent-child communication
- ✅ No external navigation dependencies

## Usage

### Basic Integration

```html
<iframe 
  src="http://your-pulse-app.com/pulseembedded"
  width="100%"
  height="600"
  frameborder="0"
  title="Pulse AI Search">
</iframe>
```

### Recommended Iframe Styling

```css
.pulse-iframe {
  width: 100%;
  height: 600px;
  border: 2px solid #ddd;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

### Message Handling

The embedded component communicates with the parent window using the PostMessage API. Listen for messages like this:

```javascript
window.addEventListener('message', function(event) {
  // Verify origin in production
  if (event.origin !== 'http://your-pulse-app.com') return;
  
  if (event.data.type === 'PULSE_SEARCH') {
    const { query, type, conversationId } = event.data.data;
    
    switch(type) {
      case 'manual':
        // User typed and submitted a query
        handleManualSearch(query);
        break;
        
      case 'predefined':
        // User clicked a predefined question button
        handlePredefinedQuestion(query);
        break;
        
      case 'thread':
        // User selected a previous conversation
        loadConversation(conversationId, query);
        break;
    }
  }
});

function handleManualSearch(query) {
  // Redirect to search results or open modal
  window.location.href = `/search?q=${encodeURIComponent(query)}`;
}

function handlePredefinedQuestion(query) {
  // Handle predefined questions - maybe open in new tab
  window.open(`/chat?q=${encodeURIComponent(query)}`, '_blank');
}

function loadConversation(conversationId, title) {
  // Load existing conversation
  window.location.href = `/conversations/${conversationId}`;
}
```

## Message Data Structure

All messages sent from the embedded component follow this structure:

```javascript
{
  type: 'PULSE_SEARCH',
  data: {
    query: string,           // The search query or question
    type: string,            // 'manual' | 'predefined' | 'thread'
    conversationId?: string  // Only present for type 'thread'
  }
}
```

### Message Types

1. **`manual`**: User typed a query and pressed Enter or clicked send
2. **`predefined`**: User clicked one of the predefined question buttons
3. **`thread`**: User selected a previous conversation from suggestions

## Responsive Behavior

The component is fully responsive and will adapt to different iframe sizes:

- **Desktop** (≥768px): Full layout with 3 question buttons side by side
- **Tablet** (768px-480px): Responsive text scaling, maintained layout
- **Mobile** (≤480px): Stacked question buttons, optimized spacing

## Customization Options

### Environment Variables

You can customize certain aspects through environment variables:

```bash
# Customize the welcome message
REACT_APP_PULSE_WELCOME_MESSAGE="Welcome, [Name]!"

# Customize predefined questions (comma-separated)
REACT_APP_PULSE_QUESTIONS="Custom question 1,Custom question 2,Custom question 3"
```

### Iframe Parameters

Pass parameters through the iframe src URL:

```html
<iframe src="http://your-pulse-app.com/pulseembedded?user=Jane&theme=dark">
```

## Security Considerations

1. **Origin Verification**: Always verify the origin of PostMessage events in production
2. **Content Security Policy**: Configure CSP headers to allow iframe embedding
3. **HTTPS**: Use HTTPS in production for secure iframe communication

```javascript
// Example origin verification
window.addEventListener('message', function(event) {
  const allowedOrigins = [
    'https://your-main-app.com',
    'https://your-subdomain.company.com'
  ];
  
  if (!allowedOrigins.includes(event.origin)) {
    console.warn('Ignored message from unauthorized origin:', event.origin);
    return;
  }
  
  // Process the message...
});
```

## Testing

Use the included `pulse-iframe-demo.html` file to test the integration:

1. Start your React app: `npm start`
2. Open `pulse-iframe-demo.html` in a browser
3. Interact with the embedded component
4. Observe messages in the demo's message log

## Browser Support

- ✅ Chrome 60+
- ✅ Firefox 55+
- ✅ Safari 12+
- ✅ Edge 79+

## Performance Notes

- The component loads independently of the main application
- Minimal JavaScript bundle size (~150KB gzipped)
- Optimized for fast iframe loading
- No external dependencies beyond React

## Troubleshooting

### Common Issues

1. **Iframe not loading**: Check that the React app is running and accessible
2. **No messages received**: Verify PostMessage listener is set up correctly
3. **Styling issues**: Ensure iframe dimensions are adequate (minimum 400x300)

### Debug Mode

Add `?debug=true` to the iframe URL to enable console logging:

```html
<iframe src="http://your-pulse-app.com/pulseembedded?debug=true">
```

## Production Deployment

### Headers Configuration

Configure your server to allow iframe embedding:

```
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: frame-ancestors 'self' https://trusted-parent.com
```

### CORS Configuration

If the iframe and parent are on different domains:

```javascript
// In your Express.js server
app.use(cors({
  origin: ['https://trusted-parent.com'],
  credentials: true
}));
```