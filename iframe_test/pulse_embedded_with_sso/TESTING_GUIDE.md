# Testing Guide for Pulse Embedded Form-based POST Implementation

## Overview
This document outlines how to test the new form-based POST implementation that allows the PulseEmbedded component to break out of iframes and navigate to the full result page.

## Implementation Summary

### What We Built:
1. **Form-based POST submission** from PulseEmbedded component
2. **SessionStorage workaround** for client-side POST data handling  
3. **Enhanced ChatPage** that handles POST data, URL params, and props
4. **Iframe breakout functionality** using `target="_top"`

### Key Components:
- `PulseEmbedded.jsx` - Updated with FormSubmitter component
- `App.js` - Enhanced with POST data extraction and routing
- `ChatPage.jsx` - Multi-source data initialization
- `utils/postDataUtils.js` - Utility functions for data handling

## Testing Scenarios

### 1. Manual Search Test
**Steps:**
1. Open `pulse-iframe-demo.html` in browser
2. Type a question in the search field (e.g., "How do I reset my password?")
3. Press Enter or click send button

**Expected Result:**
- Iframe breaks out to full page
- Shows `/resultpage` with the question and AI response
- Left sidebar shows the conversation in thread list

### 2. Predefined Question Test
**Steps:**
1. Open `pulse-iframe-demo.html` in browser
2. Click one of the blue predefined question buttons
3. Observe the result

**Expected Result:**
- Iframe breaks out to full page
- Shows `/resultpage` with question pre-filled in input field
- User can continue the conversation

### 3. Previous Thread Test
**Steps:**
1. First, create some conversations by using the main app
2. Navigate to `/pulseembedded` in iframe
3. Start typing in search field to see suggestions
4. Click on a previous conversation suggestion

**Expected Result:**
- Iframe breaks out to full page
- Shows `/resultpage` with the selected conversation loaded
- All previous messages displayed correctly

### 4. Direct URL Access Test
**Steps:**
1. Navigate directly to `http://localhost:3000/resultpage`
2. Test with URL parameters: `/resultpage?question=test&type=manual`

**Expected Result:**
- Page loads correctly without POST data
- Handles URL parameters as fallback
- No errors in console

### 5. Standalone Embedded Component Test
**Steps:**
1. Navigate directly to `http://localhost:3000/pulseembedded`
2. Test all functionality outside of iframe

**Expected Result:**
- All features work correctly
- Form submissions navigate to result page in same window

## Test Data Flow

### Manual Search Flow:
```
PulseEmbedded Input → FormSubmitter → sessionStorage → 
GET /resultpage → ChatPage → Display Response
```

### Predefined Question Flow:
```
PulseEmbedded Button → FormSubmitter → sessionStorage → 
GET /resultpage → ChatPage → Pre-fill Input
```

### Thread Selection Flow:
```
PulseEmbedded Suggestion → FormSubmitter → sessionStorage → 
GET /resultpage → ChatPage → Load Conversation
```

## Debug Information

### Console Logs to Check:
```javascript
// In ChatPage.jsx
console.log('Processing POST data:', postData);
console.log('ChatPage useState - postData:', postData);

// In App.js
console.log('Initialization mode:', initMode);

// In PulseEmbedded.jsx
console.log('Form data to submit:', data);
```

### SessionStorage Data:
Check browser dev tools → Application → Session Storage → `pulsePostData`

### URL Parameters:
Look for `?fromPost=true&t=timestamp` in result page URL

## Expected POST Data Formats

### Manual Search:
```json
{
  "action": "search",
  "type": "manual", 
  "question": "User typed question",
  "userQuestion": "",
  "timestamp": 1699123456789,
  "source": "pulseembedded"
}
```

### Predefined Question:
```json
{
  "action": "search",
  "type": "predefined",
  "question": "What required learning do I have?",
  "userQuestion": "What required learning do I have?",
  "timestamp": 1699123456789,
  "source": "pulseembedded"
}
```

### Thread Selection:
```json
{
  "action": "loadThread",
  "type": "thread",
  "threadId": "lw1",
  "threadTitle": "Can you create a service IT ticket for me ...",
  "threadData": "{\"id\":\"lw1\",\"title\":\"...\"}",
  "conversation": "[{\"type\":\"user\",\"text\":\"...\"}]",
  "timestamp": 1699123456789,
  "source": "pulseembedded"
}
```

## Troubleshooting

### Common Issues:

1. **Iframe not breaking out**
   - Check console for form submission errors
   - Verify `target="_top"` is set correctly
   - Ensure sessionStorage has data

2. **POST data not found**
   - Check sessionStorage in browser dev tools
   - Verify data is being stored before navigation
   - Check URL for `fromPost=true` parameter

3. **Thread not loading correctly**
   - Verify JSON parsing in `createThreadFromPostData`
   - Check conversation data format
   - Look for parsing errors in console

4. **Predefined questions not pre-filling**
   - Check userInput useState logic
   - Verify POST data type is 'predefined'
   - Ensure onFirstMessage is being called

### Dev Tools Checklist:
- [ ] No console errors
- [ ] SessionStorage contains expected data
- [ ] URL contains `fromPost=true` parameter
- [ ] Network tab shows successful navigation
- [ ] React DevTools shows correct props/state

## Performance Notes

- SessionStorage data is automatically cleared after use
- Form submissions are cleaned up after 100ms
- No memory leaks from dynamic form creation
- Minimal performance impact on iframe breakout

## Browser Compatibility

Tested on:
- ✅ Chrome 118+
- ✅ Firefox 119+  
- ✅ Safari 17+
- ✅ Edge 118+

## Security Considerations

- No sensitive data in URL parameters
- SessionStorage is domain-restricted
- Form submissions use standard browser security
- No cross-origin vulnerabilities introduced