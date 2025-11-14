# Pulse Application - Architecture Documentation

## Overview
This document describes the refactored architecture of the Pulse application, implementing clean code principles with proper separation of concerns.

## Project Structure

```
src/
├── config/               # Configuration files
│   ├── api.js           # API endpoints and headers
│   └── constants.js     # Application constants
│
├── services/            # Business logic and API integrations
│   ├── tokenService.js          # Authentication token management
│   ├── workforceAgentService.js # Workforce agent API calls
│   └── liveAgentService.js      # WebSocket and live agent functionality
│
├── components/          # React components
│   ├── AISearchHero.jsx
│   ├── ButtonRow.jsx
│   ├── Header.jsx
│   ├── MenuSidebarDark.jsx
│   ├── NewsFeed.jsx
│   ├── RightSidebar.jsx
│   ├── UseToken.js      # Token hook (uses tokenService)
│   └── ...
│
├── context/             # React context providers
│   └── ThemeContext.jsx
│
├── utils/               # Utility functions
│   ├── messageFormatter.js      # Text formatting utilities
│   ├── workforceAgentUtils.js   # Helper functions
│   ├── localChatHistory.js      # Chat history management
│   └── mockWorkforceAgent.js
│
├── App.js               # Main application component
├── ChatPage.jsx         # Chat interface
├── MainPage.jsx         # Landing page
└── ...
```

## Architecture Layers

### 1. Configuration Layer (`src/config/`)

Centralized configuration for all API endpoints and application constants.

#### `api.js`
- **Purpose**: Single source of truth for all API URLs
- **Exports**:
  - `API_BASE_URLS`: Base URLs for different services
  - `API_ENDPOINTS`: Complete endpoint URLs
  - `API_HEADERS`: Common HTTP headers
  - `API_OPTIONS`: Request configuration

**Benefits**:
- Easy to update URLs across the entire application
- Environment-specific configuration support
- Type-safe endpoint references

#### `constants.js`
- **Purpose**: Application-wide constants
- **Exports**:
  - `DOMAIN_CONFIG`: Domain-related settings
  - `STORAGE_KEYS`: LocalStorage key names
  - `TIMING`: Timeout and interval values
  - `LIVE_AGENT`: Live agent configuration
  - `MESSAGE_TYPES`: Message type enums
  - `ERROR_MESSAGES`: User-facing error messages

**Benefits**:
- No magic strings/numbers in code
- Consistent values across the application
- Easy to modify application behavior

### 2. Service Layer (`src/services/`)

Business logic and external API integration separated from UI components.

#### `tokenService.js`
**Responsibilities**:
- Fetch authentication tokens
- Cache tokens in memory and localStorage
- Handle token expiration
- Provide token refresh functionality

**Key Methods**:
- `getToken(domainId, forceReal)`: Get or refresh token
- `clearToken(domainId)`: Clear cached token
- `clearAllTokens()`: Clear all tokens

**Benefits**:
- Centralized token management
- Automatic caching and expiration handling
- Singleton pattern ensures consistent state

#### `workforceAgentService.js`
**Responsibilities**:
- Send messages to workforce agent API
- Handle streaming responses
- Detect live agent triggers
- Process and clean response chunks

**Key Methods**:
- `sendMessage(question, domainId, onChunk, onComplete, onError)`: Send message and stream response

**Benefits**:
- Complex streaming logic isolated from UI
- Reusable across different components
- Consistent error handling

#### `liveAgentService.js`
**Responsibilities**:
- Manage WebSocket connections
- Route to live agent groups
- Handle live agent messaging
- Monitor inactivity and timeouts
- Clean up connections

**Key Methods**:
- `routeToAgent(groupName, domainId, callbacks)`: Connect to live agent
- `sendMessage(message, domainId)`: Send message to agent
- `terminate(reason, domainId)`: End session
- `cleanup()`: Clean up resources

**Benefits**:
- WebSocket complexity hidden from components
- Automatic reconnection and timeout handling
- Proper resource cleanup

### 3. Utility Layer (`src/utils/`)

Pure functions and helpers for common operations.

#### `messageFormatter.js`
**Purpose**: Text formatting and rendering utilities

**Key Functions**:
- `formatTextWithLinks(text)`: Format text with HTML rendering
- `extractReferenceLinks(text)`: Extract links from text
- `renderLiveAgentMessage(text, isFirst, agentName, isDarkMode)`: Render agent message

**Benefits**:
- Consistent text formatting across application
- Testable pure functions
- Separation of formatting logic from components

#### `workforceAgentUtils.js`
**Purpose**: Helper functions for workforce agent

**Key Functions**:
- `uuidv4()`: Generate unique IDs
- `generateSessionId()`: Generate session IDs
- `cleanStreamText(msg)`: Clean streaming response text

### 4. Component Layer (`src/components/`)

React components focused on UI and user interaction.

**Updated Components**:
- `ButtonRow.jsx`: Uses `liveAgentService` and `API_ENDPOINTS`
- `UseToken.js`: Uses `tokenService` instead of direct API calls

**Benefits**:
- Components focus on rendering and user interaction
- Business logic delegated to services
- Easier to test and maintain

## API Endpoint Management

### All API URLs are now centralized in `src/config/api.js`:

```javascript
// Before (scattered across files):
fetch("https://workforceagent.elevancehealth.com/token", ...)
fetch("https://workforceagent.elevancehealth.com/workforceagent/chat", ...)
window.open("https://elevancehealth.service-now.com/esc?id=...", ...)

// After (centralized):
import { API_ENDPOINTS } from '../config/api';
fetch(API_ENDPOINTS.TOKEN, ...)
fetch(API_ENDPOINTS.WORKFORCE_CHAT, ...)
window.open(API_ENDPOINTS.SERVICENOW_HR_CATALOG, ...)
```

### Adding New Endpoints:

1. Add to `src/config/api.js`:
```javascript
export const API_ENDPOINTS = {
  // ... existing endpoints
  NEW_ENDPOINT: `${API_BASE_URLS.WORKFORCE_AGENT}/new/path`,
};
```

2. Use in services or components:
```javascript
import { API_ENDPOINTS } from '../config/api';
fetch(API_ENDPOINTS.NEW_ENDPOINT, ...);
```

## Usage Examples

### Using Token Service

```javascript
import { tokenService } from '../services/tokenService';

// Get token (with caching)
const token = await tokenService.getToken('AG04333');

// Force fresh token
const freshToken = await tokenService.getToken('AG04333', true);

// Clear token
tokenService.clearToken('AG04333');
```

### Using Workforce Agent Service

```javascript
import { workforceAgentService } from '../services/workforceAgentService';

const result = await workforceAgentService.sendMessage(
  'What is my PTO balance?',
  'AG04333',
  (partialText) => console.log('Streaming:', partialText),
  () => console.log('Complete'),
  (error) => console.error('Error:', error)
);
```

### Using Live Agent Service

```javascript
import { liveAgentService } from '../services/liveAgentService';

const requestId = await liveAgentService.routeToAgent(
  'AgenticHRAdvisor',
  'AG04333',
  (msg) => console.log('Message:', msg),
  () => console.log('Connected'),
  (reason) => console.log('Disconnected:', reason),
  (error) => console.error('Error:', error)
);
```

## Benefits of This Architecture

### 1. **Maintainability**
- Clear separation of concerns
- Easy to locate and update functionality
- Centralized configuration

### 2. **Testability**
- Services can be tested independently
- Utilities are pure functions
- Components focus on UI logic

### 3. **Reusability**
- Services can be used across multiple components
- Utilities are shared across the application
- Configuration is consistent

### 4. **Scalability**
- Easy to add new features
- Clear structure for new developers
- Modular architecture

### 5. **URL Management**
- Single source of truth for all API endpoints
- Easy to switch environments (dev, staging, prod)
- No hardcoded URLs in components

## Migration Guide

### For Existing Code

When working with existing components that need refactoring:

1. **Replace hardcoded URLs**:
   ```javascript
   // Before
   fetch("https://workforceagent.elevancehealth.com/token", ...)
   
   // After
   import { API_ENDPOINTS } from '../config/api';
   fetch(API_ENDPOINTS.TOKEN, ...)
   ```

2. **Use Token Service**:
   ```javascript
   // Before
   const response = await fetch(tokenUrl, { ... });
   const token = await response.json();
   
   // After
   import { tokenService } from '../services/tokenService';
   const token = await tokenService.getToken(domainId);
   ```

3. **Use Service Layer**:
   ```javascript
   // Before
   const response = await fetch(chatUrl, { headers: {...}, ... });
   const reader = response.body.getReader();
   // ... complex streaming logic ...
   
   // After
   import { workforceAgentService } from '../services/workforceAgentService';
   await workforceAgentService.sendMessage(question, domainId, onChunk, onComplete, onError);
   ```

## Best Practices

1. **Always use centralized configuration**
   - Never hardcode URLs or constants
   - Import from `config/` directory

2. **Keep components thin**
   - Delegate business logic to services
   - Focus on rendering and user interaction

3. **Use services for API calls**
   - Don't make fetch calls directly in components
   - Use appropriate service methods

4. **Handle errors consistently**
   - Use error messages from `constants.js`
   - Provide user-friendly feedback

5. **Maintain separation of concerns**
   - Config → Services → Components
   - Each layer has clear responsibilities

## Future Improvements

1. **Environment Configuration**
   - Add `.env` file support
   - Environment-specific API URLs

2. **Type Safety**
   - Add TypeScript for better type checking
   - Interface definitions for services

3. **Error Boundaries**
   - React error boundaries for graceful failures
   - Centralized error logging

4. **Testing**
   - Unit tests for services
   - Integration tests for components
   - E2E tests for critical flows

5. **Performance**
   - Implement request caching strategies
   - Optimize bundle size
   - Lazy loading for services

---

Last Updated: November 9, 2025
