# API Endpoints Reference Guide

This document provides a quick reference for all API endpoints used in the Pulse application.

## Quick Access

All endpoints are defined in `src/config/api.js`. Import them using:

```javascript
import { API_ENDPOINTS, API_BASE_URLS, API_HEADERS } from '../config/api';
```

## Base URLs

### Workforce Agent
```
https://workforceagent.elevancehealth.com
```

### ServiceNow
```
https://elevancehealth.service-now.com
```

### Okta
```
https://portalssoqa.elevancehealth.com
```

## API Endpoints

### 1. Token Management

#### Get Access Token
- **Endpoint**: `API_ENDPOINTS.TOKEN`
- **Full URL**: `https://workforceagent.elevancehealth.com/token`
- **Method**: POST
- **Headers**: `API_HEADERS.TOKEN_AUTH`
- **Body**:
  ```json
  {
    "domainid": "AG04333"
  }
  ```
- **Response**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```
- **Service**: `tokenService.getToken(domainId)`

---

### 2. Workforce Agent Chat

#### Send Chat Message
- **Endpoint**: `API_ENDPOINTS.WORKFORCE_CHAT`
- **Full URL**: `https://workforceagent.elevancehealth.com/workforceagent/chat`
- **Method**: GET
- **Headers**: `API_HEADERS.WORKFORCE_AUTH(token, domainId, question)`
  - `Content-Type`: application/json
  - `Authorization`: Bearer {token}
  - `domainid`: {domainId} (uppercase)
  - `question`: {question text}
- **Response**: Streaming text response
- **Service**: `workforceAgentService.sendMessage(question, domainId, ...)`

---

### 3. Live Agent

#### Route to Live Agent
- **Endpoint**: `API_ENDPOINTS.USER_TO_AGENT`
- **Full URL**: `https://workforceagent.elevancehealth.com/user/to/agent/servicenow`
- **Method**: POST
- **Headers**: `API_HEADERS.JSON`
- **Body**:
  ```json
  {
    "requestId": "1699564800000",
    "token": "vaacubed",
    "botToBot": true,
    "clientSessionId": "",
    "silentMessage": false,
    "message": { "text": "First_Message", "typed": true },
    "userId": "AG04333",
    "emailId": "user@elevancehealth.com",
    "username": "User",
    "agent_group": "AgenticHRAdvisor",
    "timestamp": 1699564800000,
    "timezone": "America/New_York",
    "action": "SWITCH",
    "topic": { "name": "AgenticHRAdvisor" }
  }
  ```
- **Service**: `liveAgentService.routeToAgent(groupName, domainId, ...)`

#### WebSocket Connection
- **Endpoint**: `API_ENDPOINTS.WEBSOCKET(requestId)`
- **Full URL**: `wss://workforceagent.elevancehealth.com/ws/{requestId}`
- **Protocol**: WebSocket
- **Service**: `liveAgentService.connectWebSocket(requestId, ...)`

#### End Live Agent Session
- **Endpoint**: `API_ENDPOINTS.USER_TO_AGENT`
- **Method**: POST
- **Body**: Same as routing, but with `action: "END_CONVERSATION"`
- **Service**: `liveAgentService.terminate(reason, domainId, ...)`

---

### 4. ServiceNow

#### HR Service Catalog
- **Endpoint**: `API_ENDPOINTS.SERVICENOW_HR_CATALOG`
- **Full URL**: `https://elevancehealth.service-now.com/esc?id=elevance_health_hrsd_catalog`
- **Method**: Browser navigation (window.open)
- **Usage**: Direct link, no API call
- **Used in**: ButtonRow component

---

### 5. Okta Authentication

#### OAuth Endpoint
- **Endpoint**: `API_ENDPOINTS.OKTA_OAUTH`
- **Full URL**: `https://portalssoqa.elevancehealth.com/oauth2/ausefjy7k3J5S1AXz297`
- **Purpose**: OAuth 2.0 authentication
- **Used in**: SSO configuration

---

## Live Agent Groups

### Available Groups (defined in `constants.js`)

```javascript
LIVE_AGENT.GROUPS = {
  HR_ADVISOR: 'AgenticHRAdvisor',
  CONTACT_CENTER: 'AgenticContactCenter',
}
```

#### AgenticHRAdvisor
- **Purpose**: Manager coaching and corrective actions
- **Use Case**: HR advisory services

#### AgenticContactCenter
- **Purpose**: General HR support
- **Use Case**: All other HR questions

---

## Authentication Headers

### Token Authentication
```javascript
API_HEADERS.TOKEN_AUTH = {
  'Authorization': 'Basic c3JjX3dvcmtmb3JjZV9hZ2VudF91c2VyOnRvcHNlY3JldDEyMw==',
  'Content-Type': 'application/json'
}
```

### Workforce Agent Authentication
```javascript
API_HEADERS.WORKFORCE_AUTH(token, domainId, question) = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${token}`,
  'domainid': domainId.toUpperCase(),
  'question': question  // optional
}
```

---

## Common Request Patterns

### 1. Getting a Token

```javascript
import { tokenService } from './services/tokenService';

const token = await tokenService.getToken('AG04333');
```

### 2. Sending a Chat Message

```javascript
import { workforceAgentService } from './services/workforceAgentService';

const result = await workforceAgentService.sendMessage(
  'What is my PTO balance?',
  'AG04333',
  (chunk) => console.log('Received:', chunk),
  () => console.log('Complete'),
  (error) => console.error('Error:', error)
);
```

### 3. Connecting to Live Agent

```javascript
import { liveAgentService } from './services/liveAgentService';

const requestId = await liveAgentService.routeToAgent(
  'AgenticHRAdvisor',
  'AG04333',
  (msg) => handleMessage(msg),
  () => handleConnect(),
  (reason) => handleDisconnect(reason),
  (error) => handleError(error)
);
```

---

## Error Handling

### Standard Error Messages (from `constants.js`)

```javascript
ERROR_MESSAGES = {
  NETWORK_ERROR: '🌐 Network connection issue. Please check your internet connection and try again.',
  AUTH_FAILED: '🔐 Authentication failed. Please refresh the page and try again.',
  ACCESS_DENIED: '🚫 Access denied. You may not have permission to access this service.',
  SERVER_ERROR: '⚙️ Server error. The service is temporarily unavailable. Please try again later.',
  SERVICE_UNAVAILABLE: '🔧 Service temporarily unavailable. Please try again in a few moments.',
  DEFAULT_ERROR: '⚠️ Unable to fetch response. Please try again.',
}
```

### HTTP Status Code Mapping

| Status Code | Error Message |
|-------------|---------------|
| 401 | AUTH_FAILED |
| 403 | ACCESS_DENIED |
| 500 | SERVER_ERROR |
| 503 | SERVICE_UNAVAILABLE |
| Network Error | NETWORK_ERROR |
| Other | DEFAULT_ERROR |

---

## Environment Configuration

To change environments, update `src/config/api.js`:

```javascript
// Development
export const API_BASE_URLS = {
  WORKFORCE_AGENT: 'https://dev-workforceagent.elevancehealth.com',
  // ...
};

// Production
export const API_BASE_URLS = {
  WORKFORCE_AGENT: 'https://workforceagent.elevancehealth.com',
  // ...
};
```

---

## Rate Limiting & Timeouts

### Token Expiry
- **Default**: 3 hours (10,800,000 ms)
- **Defined in**: `constants.js` → `TIMING.TOKEN_EXPIRY`

### Inactivity Timeout
- **Default**: 19 minutes (1,140,000 ms)
- **Defined in**: `constants.js` → `TIMING.INACTIVITY_LIMIT`

### Request Timeout
- **Default**: 30 seconds (30,000 ms)
- **Defined in**: `api.js` → `API_OPTIONS.DEFAULT_TIMEOUT`

---

## Testing Endpoints

### Manual Testing

```javascript
// Test token endpoint
const response = await fetch('https://workforceagent.elevancehealth.com/token', {
  method: 'POST',
  headers: {
    'Authorization': 'Basic c3JjX3dvcmtmb3JjZV9hZ2VudF91c2VyOnRvcHNlY3JldDEyMw==',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ domainid: 'AG04333' })
});

const data = await response.json();
console.log('Token:', data.access_token);
```

### Using Services (Recommended)

```javascript
import { tokenService } from './services/tokenService';

// Automatic caching, error handling, etc.
const token = await tokenService.getToken('AG04333');
```

---

## Troubleshooting

### Common Issues

1. **Token not working**
   - Check token expiry in localStorage
   - Force refresh: `tokenService.getToken(domainId, true)`

2. **CORS errors**
   - Ensure proper headers are being sent
   - Check API_HEADERS configuration

3. **WebSocket connection fails**
   - Verify requestId is valid
   - Check network connectivity
   - Ensure proper cleanup on disconnect

4. **Streaming response stops**
   - Check for live agent markers in response
   - Verify chunk processing logic
   - Look for network interruptions

---

Last Updated: November 9, 2025
