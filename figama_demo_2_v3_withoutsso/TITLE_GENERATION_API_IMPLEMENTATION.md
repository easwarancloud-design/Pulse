# Title Generation API Implementation

## Overview
Updated the conversation title generation to use an external API endpoint instead of simple text truncation. The system now calls `https://workforceagent.elevancehealth.com/api/generate_title` to generate intelligent conversation titles based on the user's first question.

## Changes Made

### 1. New Service: `titleGenerationService.js`
Created a new service to handle title generation via API with automatic fallback.

**Location:** `src/services/titleGenerationService.js`

**Features:**
- Calls the title generation API with `domainid` and `user_query`
- Automatic fallback to first 50 characters if API fails
- Handles various response formats (JSON or plain text)
- Comprehensive error handling and logging

**API Endpoint:** `POST https://workforceagent.elevancehealth.com/api/generate_title`

**Request Format:**
```json
{
  "domainid": "AG04333",
  "user_query": "What is the process for employees to access HR policies?"
}
```

**Functions:**
- `generateConversationTitle(userQuery, domainId)` - Async function that calls API with fallback
- `generateFallbackTitle(userQuery)` - Sync function for immediate fallback title (first 50 chars)

### 2. Updated: `ChatPage.jsx`
Replaced all hardcoded title truncation logic with API calls.

**Changes:**
- Added import: `import { generateConversationTitle, generateFallbackTitle } from './services/titleGenerationService';`
- Line ~176: Changed from simple truncation to API call when creating new conversations
- Line ~240: Changed from simple truncation to API call when updating "New Chat" titles

**Before:**
```javascript
const conversationTitle = inputText.length > 50 ? 
  inputText.substring(0, 50) + '...' : inputText;
```

**After:**
```javascript
const conversationTitle = await generateConversationTitle(inputText, conversationStorage.defaultUserId);
```

### 3. Updated: `conversationStorageService.js`
Updated the `saveChatInteraction` method to use API-generated titles.

**Changes:**
- Added import: `import { generateConversationTitle } from './titleGenerationService';`
- Line ~510: Changed title generation in `saveChatInteraction()` method to use API

**Before:**
```javascript
const title = questionText.length > 50 
  ? questionText.substring(0, 50) + '...' 
  : questionText;
```

**After:**
```javascript
const title = await generateConversationTitle(questionText, this.defaultUserId);
```

## Behavior

### Normal Operation (API Success)
1. User sends first message
2. System calls `generate_title` API with domain ID and user query
3. API returns intelligent title
4. Title is used for conversation in backend, sidebar, and localStorage

### Fallback Operation (API Failure)
1. User sends first message
2. System calls `generate_title` API
3. API fails (network error, timeout, 404, 500, etc.)
4. System automatically falls back to first 50 characters of the question + "..."
5. Fallback title is used for conversation
6. Error is logged but doesn't disrupt user experience

## Logging
The implementation includes comprehensive console logging:
- `🎯 Generating title via API for query:` - When API call starts
- `✅ Successfully generated title via API:` - When API succeeds
- `⚠️ Title API returned status XXX, using fallback title` - When API returns non-OK status
- `⚠️ API returned empty title, using fallback` - When API returns empty response
- `❌ Failed to generate title via API:` - When API call throws error
- `🔄 Using fallback title (first 50 chars)` - When fallback is used

## Testing Recommendations

### Test Cases:
1. **Normal Flow:** Send first message and verify API-generated title appears in sidebar
2. **API Failure:** Disconnect network or block API endpoint, verify fallback works
3. **Empty Response:** Test with API returning empty/null, verify fallback
4. **Special Characters:** Test with questions containing special characters
5. **Long Questions:** Test with questions > 50 chars to ensure fallback works
6. **Multiple Conversations:** Create multiple conversations, verify each gets unique title

### How to Test:
1. Start the React app
2. Open browser console to see logs
3. Click "New Chat"
4. Type a question and send
5. Watch console logs for title generation
6. Check sidebar for the generated title

## Domain ID
Currently using: `AG04333` (from `conversationStorage.defaultUserId`)

Can be changed via `conversationStorage.setUserId(newDomainId)` if needed.

## Error Handling
- Network errors: Caught and logged, fallback used
- API errors (4xx, 5xx): Logged with status code, fallback used
- Parse errors: Logged, fallback used
- Timeout: Uses browser's default fetch timeout
- All errors are non-blocking - conversation continues with fallback title

## Files Modified
1. ✅ `src/services/titleGenerationService.js` (NEW)
2. ✅ `src/ChatPage.jsx` (UPDATED - 2 locations)
3. ✅ `src/services/conversationStorageService.js` (UPDATED - 1 location)

## Benefits
1. **Intelligent Titles:** API can generate context-aware, concise titles
2. **Reliability:** Automatic fallback ensures no disruption
3. **Maintainability:** Centralized title generation logic
4. **Debugging:** Comprehensive logging for troubleshooting
5. **Scalability:** Easy to update API endpoint or add features
