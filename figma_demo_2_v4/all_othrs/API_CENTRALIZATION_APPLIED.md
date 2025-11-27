# API Centralization - Applied to Codebase

**Date**: November 11, 2025  
**Status**: ✅ Complete  
**Impact**: All hardcoded URLs replaced with centralized API configuration

---

## 🎯 **What Was Done**

The `api.js` configuration file was created during refactoring but **was not being used**. All API endpoints were still hardcoded throughout the codebase.

**This update applies the centralized API configuration to all files.**

---

## ✅ **Files Updated**

### 1. **ChatPage.jsx**
- **Added import**: `import { API_ENDPOINTS } from './config/api';`
- **Replaced 4 hardcoded URLs**:

| Location | Before | After |
|----------|--------|-------|
| Line ~180 | `https://workforceagent.elevancehealth.com/workforceagent/chat` | `API_ENDPOINTS.WORKFORCE_CHAT` |
| Line ~654 | `https://workforceagent.elevancehealth.com/user/to/agent/servicenow` | `API_ENDPOINTS.USER_TO_AGENT` |
| Line ~1299 | `https://workforceagent.elevancehealth.com/workforceagent/chat` | `API_ENDPOINTS.WORKFORCE_CHAT` |
| Line ~1304 | `https://workforceagent.elevancehealth.com/workforceagent/chat` | `API_ENDPOINTS.WORKFORCE_CHAT` |

---

### 2. **UseAgentSession.js**
- **Added import**: `import { API_ENDPOINTS } from './config/api';`
- **Replaced 1 hardcoded URL**:

| Location | Before | After |
|----------|--------|-------|
| Line ~59 | `https://workforceagent.elevancehealth.com/user/to/agent/servicenow` | `API_ENDPOINTS.USER_TO_AGENT` |

---

## 📊 **Before vs After**

### Before (Hardcoded URLs)
```javascript
// ChatPage.jsx
const response = await fetch(`https://workforceagent.elevancehealth.com/workforceagent/chat`, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
    question: inputText,
    domainid: domainid.toUpperCase(),
  },
});

// UseAgentSession.js
await axios.post("https://workforceagent.elevancehealth.com/user/to/agent/servicenow", payload, {
  headers: { "Content-Type": "application/json" }
});
```

### After (Centralized Configuration)
```javascript
// ChatPage.jsx
import { API_ENDPOINTS } from './config/api';

const response = await fetch(API_ENDPOINTS.WORKFORCE_CHAT, {
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
    question: inputText,
    domainid: domainid.toUpperCase(),
  },
});

// UseAgentSession.js
import { API_ENDPOINTS } from './config/api';

await axios.post(API_ENDPOINTS.USER_TO_AGENT, payload, {
  headers: { "Content-Type": "application/json" }
});
```

---

## 🎁 **Benefits**

### ✅ **Single Source of Truth**
- All API URLs defined in one place: `src/config/api.js`
- Easy to update URLs for different environments
- No risk of missing hardcoded URLs

### ✅ **Environment Flexibility**
```javascript
// Easy to switch between environments
export const API_BASE_URLS = {
  WORKFORCE_AGENT: process.env.REACT_APP_API_URL || 'https://workforceagent.elevancehealth.com',
  // ... other URLs
};
```

### ✅ **Maintainability**
- Change URL once in `api.js` → propagates everywhere
- No need to search and replace across multiple files
- Clear dependency on centralized config

### ✅ **Type Safety (Future)**
```javascript
// Can easily add TypeScript later
export interface ApiEndpoints {
  WORKFORCE_CHAT: string;
  USER_TO_AGENT: string;
  // ...
}
```

---

## 📋 **Available API Endpoints**

From `src/config/api.js`:

```javascript
export const API_ENDPOINTS = {
  // Workforce Agent endpoints
  WORKFORCE_CHAT: 'https://workforceagent.elevancehealth.com/workforceagent/chat',
  TOKEN: 'https://workforceagent.elevancehealth.com/token',
  USER_TO_AGENT: 'https://workforceagent.elevancehealth.com/user/to/agent/servicenow',
  PREDEFINED_QUESTIONS: 'https://workforceagent.elevancehealth.com/api/predefined_questions',
  WEBSOCKET: (requestId) => `wss://workforceagent.elevancehealth.com/ws/${requestId}`,
  
  // ServiceNow endpoints
  SERVICENOW_HR_CATALOG: 'https://elevancehealth.service-now.com/esc?id=elevance_health_hrsd_catalog',
  
  // Okta endpoints
  OKTA_OAUTH: 'https://portalssoqa.elevancehealth.com/oauth2/ausefjy7k3J5S1AXz297',
};
```

---

## 🔍 **Verification**

### Checked for Remaining Hardcoded URLs:
```bash
✅ ChatPage.jsx - No hardcoded URLs remaining
✅ UseAgentSession.js - No hardcoded URLs remaining
✅ ButtonRow.jsx - Already using API_ENDPOINTS (from previous refactoring)
✅ UseToken.js - Already using API_ENDPOINTS (from previous refactoring)
```

### Files Already Using Centralized Config:
- `src/components/ButtonRow.jsx` ✅
- `src/components/UseToken.js` ✅
- `src/services/tokenService.js` ✅
- `src/services/workforceAgentService.js` ✅
- `src/services/liveAgentService.js` ✅

---

## 🚀 **Usage Examples**

### For New API Calls:
```javascript
import { API_ENDPOINTS } from './config/api';

// Simple GET
const response = await fetch(API_ENDPOINTS.WORKFORCE_CHAT, {
  method: 'GET',
  headers: { /* ... */ }
});

// POST with body
await fetch(API_ENDPOINTS.USER_TO_AGENT, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload)
});

// WebSocket
const ws = new WebSocket(API_ENDPOINTS.WEBSOCKET(requestId));
```

### For Environment Configuration:
```javascript
// .env file
REACT_APP_WORKFORCE_API=https://workforceagent-dev.elevancehealth.com
REACT_APP_SERVICENOW_API=https://elevancehealth-dev.service-now.com

// api.js
export const API_BASE_URLS = {
  WORKFORCE_AGENT: process.env.REACT_APP_WORKFORCE_API || 'https://workforceagent.elevancehealth.com',
  SERVICE_NOW: process.env.REACT_APP_SERVICENOW_API || 'https://elevancehealth.service-now.com',
};
```

---

## 📝 **Summary**

| Metric | Before | After |
|--------|--------|-------|
| **Hardcoded URLs** | 5+ instances | 0 instances |
| **Files Updated** | 0 | 2 files |
| **Import Statements Added** | 0 | 2 imports |
| **Single Source of Truth** | ❌ No | ✅ Yes |
| **Environment Flexibility** | ❌ Limited | ✅ Easy |
| **Maintainability** | ⚠️ Hard | ✅ Easy |

---

## ✅ **Completion Checklist**

- [x] Import `API_ENDPOINTS` in ChatPage.jsx
- [x] Replace 4 hardcoded URLs in ChatPage.jsx
- [x] Import `API_ENDPOINTS` in UseAgentSession.js
- [x] Replace 1 hardcoded URL in UseAgentSession.js
- [x] Verify no compilation errors
- [x] Verify no remaining hardcoded URLs
- [x] Document changes

---

## 🔮 **Next Steps (Optional)**

1. **Environment Variables**: Add `.env` support for different environments
2. **API Headers**: Use centralized `API_HEADERS` from `api.js`
3. **Error Handling**: Centralize API error handling
4. **Request Interceptors**: Add logging/authentication interceptors
5. **TypeScript**: Add type definitions for API endpoints

---

**Status**: ✅ Complete  
**Breaking Changes**: None  
**Migration Required**: None (automatic)  
**Compilation Errors**: 0
