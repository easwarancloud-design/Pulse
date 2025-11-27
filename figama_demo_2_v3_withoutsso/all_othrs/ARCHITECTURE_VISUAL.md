# Architecture Visual Guide

## System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         PULSE APPLICATION                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      PRESENTATION LAYER                          │
│                     (React Components)                           │
├─────────────────────────────────────────────────────────────────┤
│  App.js  │  ChatPage.jsx  │  MainPage.jsx  │  Components/      │
│          │                │                 │  - ButtonRow      │
│          │                │                 │  - Header         │
│          │                │                 │  - MenuSidebar    │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                       SERVICE LAYER                              │
│                    (Business Logic)                              │
├─────────────────────────────────────────────────────────────────┤
│  tokenService          │  workforceAgentService  │  liveAgent   │
│  - getToken()          │  - sendMessage()        │  Service     │
│  - clearToken()        │  - streaming            │  - route()   │
│  - caching             │  - cleanup              │  - WebSocket │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                     CONFIGURATION LAYER                          │
│                   (Constants & Config)                           │
├─────────────────────────────────────────────────────────────────┤
│  api.js                │  constants.js                           │
│  - API_ENDPOINTS       │  - DOMAIN_CONFIG                        │
│  - API_HEADERS         │  - TIMING                               │
│  - API_BASE_URLS       │  - ERROR_MESSAGES                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                      UTILITY LAYER                               │
│                   (Helper Functions)                             │
├─────────────────────────────────────────────────────────────────┤
│  messageFormatter      │  workforceAgentUtils                    │
│  - formatText()        │  - uuidv4()                             │
│  - extractLinks()      │  - cleanStreamText()                    │
│  - renderMessage()     │  - generateSessionId()                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓ ↑
┌─────────────────────────────────────────────────────────────────┐
│                      EXTERNAL APIS                               │
├─────────────────────────────────────────────────────────────────┤
│  Workforce Agent API   │  ServiceNow    │  WebSocket (Live)     │
│  - Token               │  - HR Catalog  │  - Live Agent         │
│  - Chat                │                │  - Real-time msgs     │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

### Chat Message Flow

```
User Input (ChatPage)
        │
        ↓
    Component validates input
        │
        ↓
workforceAgentService.sendMessage()
        │
        ↓
    tokenService.getToken()
        │
        ├─→ Cache hit? → Return cached token
        │
        └─→ Cache miss → Fetch new token from API
        │
        ↓
    Make API request with token
        │
        ↓
    Stream response chunks
        │
        ├─→ onChunk() → Update UI with partial text
        │
        └─→ onComplete() → Mark as complete
        │
        ↓
    Format text (messageFormatter)
        │
        ↓
    Display to User (ChatPage)
```

### Live Agent Flow

```
User clicks Live Agent button (ButtonRow)
        │
        ↓
liveAgentService.routeToAgent()
        │
        ├─→ Create routing payload
        │
        ├─→ POST to /user/to/agent/servicenow
        │
        └─→ Get requestId
        │
        ↓
liveAgentService.connectWebSocket(requestId)
        │
        ├─→ Open WebSocket connection
        │
        ├─→ Setup message handlers
        │
        └─→ Start inactivity timer
        │
        ↓
    WebSocket.onmessage
        │
        ├─→ Parse message
        │
        ├─→ Check for termination signals
        │
        ├─→ Reset inactivity timer
        │
        └─→ Call onMessage() callback
        │
        ↓
    Display message (ChatPage)
        │
        ↓
    User sends message
        │
        ↓
liveAgentService.sendMessage()
        │
        └─→ WebSocket.send()
```

## File Organization

```
src/
│
├── config/                         # ⚙️ Configuration
│   ├── api.js                     # 🔗 All API endpoints
│   └── constants.js               # 📋 All constants
│
├── services/                       # 🛠️ Business Logic
│   ├── tokenService.js            # 🔑 Token management
│   ├── workforceAgentService.js   # 💬 Chat API
│   └── liveAgentService.js        # 👤 Live agent WebSocket
│
├── utils/                          # 🧰 Utilities
│   ├── messageFormatter.js        # 📝 Text formatting
│   ├── workforceAgentUtils.js     # 🔧 Helper functions
│   └── localChatHistory.js        # 💾 Chat persistence
│
├── components/                     # 🎨 UI Components
│   ├── AISearchHero.jsx
│   ├── ButtonRow.jsx              # ♻️ Uses liveAgentService
│   ├── Header.jsx
│   ├── MenuSidebarDark.jsx
│   ├── NewsFeed.jsx
│   ├── RightSidebar.jsx
│   └── UseToken.js                # ♻️ Uses tokenService
│
├── context/                        # 🌐 React Context
│   └── ThemeContext.jsx
│
├── App.js                          # 📱 Main App
├── ChatPage.jsx                    # 💭 Chat Interface
├── MainPage.jsx                    # 🏠 Landing Page
└── examples.js                     # 📚 Usage Examples
```

## Component Dependencies

```
ChatPage.jsx
    │
    ├─→ workforceAgentService      (Send messages)
    ├─→ liveAgentService           (Live agent connection)
    ├─→ messageFormatter           (Format responses)
    ├─→ UseToken hook              (Get auth token)
    └─→ ButtonRow                  (Live agent routing)
            │
            └─→ liveAgentService   (Route to agent)

ButtonRow.jsx
    │
    ├─→ liveAgentService           (Connect to agent)
    └─→ API_ENDPOINTS              (ServiceNow URL)

UseToken.js (Hook)
    │
    └─→ tokenService               (Token operations)
```

## API Endpoint Organization

```
API_BASE_URLS
    ├── WORKFORCE_AGENT
    │   └── https://workforceagent.elevancehealth.com
    │
    ├── SERVICE_NOW
    │   └── https://elevancehealth.service-now.com
    │
    └── OKTA
        └── https://portalssoqa.elevancehealth.com

API_ENDPOINTS
    ├── TOKEN
    │   └── POST /token
    │
    ├── WORKFORCE_CHAT
    │   └── GET /workforceagent/chat
    │
    ├── USER_TO_AGENT
    │   └── POST /user/to/agent/servicenow
    │
    ├── WEBSOCKET(requestId)
    │   └── WS /ws/{requestId}
    │
    └── SERVICENOW_HR_CATALOG
        └── GET /esc?id=elevance_health_hrsd_catalog
```

## State Management

```
┌────────────────────────────────────┐
│       Component State              │
├────────────────────────────────────┤
│  - UI state (loading, focused)     │
│  - User input                      │
│  - Display state                   │
└────────────────────────────────────┘
            ↓ ↑
┌────────────────────────────────────┐
│       Service State                │
├────────────────────────────────────┤
│  - Token cache (in-memory)         │
│  - WebSocket connection            │
│  - Inactivity timers               │
└────────────────────────────────────┘
            ↓ ↑
┌────────────────────────────────────┐
│       LocalStorage                 │
├────────────────────────────────────┤
│  - Token + expiry                  │
│  - Chat threads                    │
│  - User preferences                │
└────────────────────────────────────┘
```

## Error Handling Flow

```
API Call
    │
    ├─→ Network Error
    │   └─→ ERROR_MESSAGES.NETWORK_ERROR
    │
    ├─→ 401 Unauthorized
    │   └─→ ERROR_MESSAGES.AUTH_FAILED
    │
    ├─→ 403 Forbidden
    │   └─→ ERROR_MESSAGES.ACCESS_DENIED
    │
    ├─→ 500 Server Error
    │   └─→ ERROR_MESSAGES.SERVER_ERROR
    │
    ├─→ 503 Service Unavailable
    │   └─→ ERROR_MESSAGES.SERVICE_UNAVAILABLE
    │
    └─→ Other Error
        └─→ ERROR_MESSAGES.DEFAULT_ERROR
            │
            ↓
        Display to User
```

## Key Interactions

### 1. Token Management
```
Component → UseToken Hook → tokenService → API
                ↓                              ↓
          Return token ← Cache check ← Response
```

### 2. Chat Message
```
User Input → ChatPage → workforceAgentService → API
                ↓              ↓ (streaming)      ↓
         Update UI ← onChunk() ← Stream chunks ← Response
```

### 3. Live Agent
```
Button Click → ButtonRow → liveAgentService → API
                                    ↓            ↓
                           WebSocket ← requestId ← POST
                                    ↓
                           Messages ← WS connection
                                    ↓
                              ChatPage (display)
```

## Benefits Summary

```
┌──────────────────────────────────────────────────┐
│              BEFORE REFACTORING                  │
├──────────────────────────────────────────────────┤
│  ❌ Hardcoded URLs in 10+ files                 │
│  ❌ Duplicate token logic                       │
│  ❌ Complex WebSocket in components             │
│  ❌ Mixed business logic with UI                │
│  ❌ Magic strings/numbers everywhere            │
└──────────────────────────────────────────────────┘
                       ↓ REFACTORED
┌──────────────────────────────────────────────────┐
│              AFTER REFACTORING                   │
├──────────────────────────────────────────────────┤
│  ✅ All URLs in config/api.js                   │
│  ✅ Centralized token service                   │
│  ✅ Encapsulated WebSocket service              │
│  ✅ Clear separation of concerns                │
│  ✅ Named constants in config/constants.js      │
└──────────────────────────────────────────────────┘
```

---

This visual guide provides a high-level overview of the refactored architecture.
For detailed usage, see ARCHITECTURE.md and API_REFERENCE.md.
