# Predefined Questions API Integration

## Overview
Replaced hardcoded predefined questions with dynamic API-fetched questions from the Workforce Agent API.

## Changes Made

### 1. API Configuration (`src/config/api.js`)
Added new endpoint for fetching predefined questions:
```javascript
PREDEFINED_QUESTIONS: `${API_BASE_URLS.WORKFORCE_AGENT}/api/predefined_questions`
```

### 2. New Service (`src/services/predefinedQuestionsService.js`)
Created a service to fetch predefined questions from the API:

**API Details:**
- **Endpoint:** `https://workforceagent.elevancehealth.com/api/predefined_questions`
- **Method:** POST
- **Authentication:** Basic Auth (same as token endpoint)
- **Request Body:**
  ```json
  {
    "domainid": "AG04333"
  }
  ```
- **Response Format:**
  ```json
  {
    "role": "Associate",
    "questions": [
      "Question 1",
      "Question 2",
      ...9 questions total
    ]
  }
  ```

**Service Function:**
```javascript
fetchPredefinedQuestions(domainId)
```
- Returns: `Promise<string[]>` - Array of questions
- Fallback: Returns empty array on error (components use fallback questions)

### 3. Updated Components

#### **AISearchHero.jsx** (Main Page)
- ✅ Added `useEffect` import
- ✅ Added service import
- ✅ Changed `allQuestions` from `const` to `useState`
- ✅ Added `useEffect` to fetch questions on mount
- ✅ Uses domain ID: `AG04333` (default)
- ✅ Keeps fallback questions if API fails

#### **PulseEmbedded.jsx** (Embedded Page)
- ✅ Added `useEffect` import
- ✅ Added service import
- ✅ Changed `allQuestions` from `const` to `useState`
- ✅ Added `useEffect` to fetch questions on mount
- ✅ Uses domain ID from `userInfo.domainId` or defaults to `AG04333`
- ✅ Keeps fallback questions if API fails

#### **PulseEmbeddedOld.jsx** (Legacy Embedded Page)
- ✅ Added `useEffect` import
- ✅ Added service import
- ✅ Changed `allQuestions` from `const` to `useState`
- ✅ Added `useEffect` to fetch questions on mount
- ✅ Uses domain ID from `userInfo.domainId` or defaults to `AG04333`
- ✅ Keeps fallback questions if API fails

## Behavior

### On Component Mount:
1. Component renders with fallback questions (hardcoded)
2. `useEffect` triggers API call to fetch questions
3. If API succeeds:
   - Updates `allQuestions` state with API data
   - UI re-renders with new questions
4. If API fails:
   - Keeps fallback questions
   - User sees default questions (seamless fallback)

### Fallback Questions (Used if API fails):
1. Share the latest company updates on AI developments
2. What required learning do I have?
3. Whose in the office today?
4. What are the upcoming project deadlines?
5. Show me my recent performance reviews
6. What are the current company policies?
7. Find available meeting rooms for today
8. What are the latest HR announcements?
9. Show me my vacation balance and requests

## API Request Details

### Authentication
Uses the same Basic Auth as token endpoint:
```
Authorization: Basic c3JjX3dvcmtmb3JjZV9hZ2VudF91c2VyOnRvcHNlY3JldDEyMw==
```
(Base64 of `src_workforce_agent_user:topsecret123`)

### Error Handling
- Network errors → Returns empty array
- HTTP errors → Returns empty array
- Invalid response format → Returns empty array, logs warning
- Components continue with fallback questions

## Testing

### Test Scenarios:
1. **API Success:**
   - Open MainPage or PulseEmbedded
   - Check browser console for API call
   - Verify questions update after component loads
   - Verify 9 questions display (3 per set with refresh)

2. **API Failure:**
   - Block network or use invalid domain ID
   - Verify fallback questions display
   - Verify no errors thrown
   - Verify UI remains functional

3. **Different Domain IDs:**
   - Test with different `userInfo.domainId` values
   - Verify correct domain ID sent to API
   - Verify questions specific to domain display

### Console Logs to Check:
```javascript
// Success
Response: { role: "Associate", questions: [...] }

// Error
Error fetching predefined questions: <error message>

// Warning (unexpected format)
Unexpected predefined questions response format: <data>
```

## Files Modified

1. ✅ `src/config/api.js` - Added PREDEFINED_QUESTIONS endpoint
2. ✅ `src/services/predefinedQuestionsService.js` - New service created
3. ✅ `src/components/AISearchHero.jsx` - Dynamic questions with API
4. ✅ `src/PulseEmbedded.jsx` - Dynamic questions with API
5. ✅ `src/PulseEmbeddedOld.jsx` - Dynamic questions with API

## No Other Changes
✅ No other functionality modified
✅ All existing features preserved
✅ Backward compatible with fallback
✅ No breaking changes

## Benefits

1. **Dynamic Content** - Questions can be updated server-side without code changes
2. **Role-Based** - API can return different questions based on user role
3. **Domain-Specific** - Questions can vary by domain ID
4. **Graceful Degradation** - Fallback ensures UI always works
5. **Centralized Management** - Questions managed in one place (API)

## Next Steps (Optional)

- Add loading state while fetching questions
- Add retry logic for failed API calls
- Cache questions in localStorage
- Display user role from API response
- Add refresh button to re-fetch questions
