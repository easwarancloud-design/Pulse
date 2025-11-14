# Pulse Application - Documentation Index

Welcome to the Pulse application documentation. This index will help you find the information you need quickly.

## 📚 Documentation Files

### 1. [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)
**Start here if you want to understand what was changed**
- Overview of refactoring work completed
- Before/after comparisons
- Benefits and improvements
- Quick migration guide

### 2. [ARCHITECTURE.md](./ARCHITECTURE.md)
**Complete architecture documentation**
- Project structure explanation
- Layer-by-layer breakdown
- Service descriptions
- Usage examples
- Best practices

### 3. [API_REFERENCE.md](./API_REFERENCE.md)
**Quick reference for all API endpoints**
- All API URLs in one place
- Request/response examples
- Authentication details
- Error handling
- Troubleshooting

## 🚀 Quick Start

### For New Developers

1. Read [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) to understand recent changes
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the structure
3. Keep [API_REFERENCE.md](./API_REFERENCE.md) handy for API details

### For Existing Developers

1. Check [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) for migration guide
2. Use [API_REFERENCE.md](./API_REFERENCE.md) for endpoint references
3. Follow patterns in [ARCHITECTURE.md](./ARCHITECTURE.md) for new code

## 📁 Project Structure

```
src/
├── config/              # Configuration files
│   ├── api.js          # API endpoints and headers
│   └── constants.js    # Application constants
│
├── services/           # Business logic layer
│   ├── tokenService.js
│   ├── workforceAgentService.js
│   └── liveAgentService.js
│
├── components/         # React components
├── context/           # React contexts
├── utils/             # Utility functions
│   └── messageFormatter.js
│
└── ...
```

## 🔑 Key Files

### Configuration
- **`src/config/api.js`** - All API endpoints
- **`src/config/constants.js`** - All constants

### Services
- **`src/services/tokenService.js`** - Token management
- **`src/services/workforceAgentService.js`** - Chat API
- **`src/services/liveAgentService.js`** - WebSocket/Live Agent

### Utilities
- **`src/utils/messageFormatter.js`** - Text formatting
- **`src/utils/workforceAgentUtils.js`** - Helper functions

## 💡 Common Tasks

### I need to...

#### Add a new API endpoint
1. Open `src/config/api.js`
2. Add to `API_ENDPOINTS` object
3. Use via import: `import { API_ENDPOINTS } from '../config/api'`
4. See: [ARCHITECTURE.md - Adding New Endpoints](./ARCHITECTURE.md#adding-new-endpoints)

#### Change an existing URL
1. Open `src/config/api.js`
2. Update in `API_ENDPOINTS` or `API_BASE_URLS`
3. Change propagates automatically
4. See: [API_REFERENCE.md - Environment Configuration](./API_REFERENCE.md#environment-configuration)

#### Make an API call
1. Import appropriate service
2. Call service method
3. Handle callbacks
4. See: [ARCHITECTURE.md - Usage Examples](./ARCHITECTURE.md#usage-examples)

#### Add a new constant
1. Open `src/config/constants.js`
2. Add to appropriate section
3. Import where needed
4. See: [ARCHITECTURE.md - Constants](./ARCHITECTURE.md#constants)

#### Format message text
1. Use `messageFormatter.js` utilities
2. Import formatting functions
3. See: [ARCHITECTURE.md - Message Formatting](./ARCHITECTURE.md#message-formatting)

## 📖 Documentation Sections

### REFACTORING_SUMMARY.md
- [x] What was changed
- [x] Why it was changed
- [x] How to use the changes
- [x] Migration guide
- [x] Code statistics

### ARCHITECTURE.md
- [x] Project structure
- [x] Architecture layers
- [x] Service layer details
- [x] Configuration management
- [x] Usage examples
- [x] Best practices
- [x] Future improvements

### API_REFERENCE.md
- [x] All API endpoints
- [x] Authentication methods
- [x] Request/response formats
- [x] Error handling
- [x] Testing guidelines
- [x] Troubleshooting

## 🎯 Design Principles

This refactoring follows these principles:

1. **Separation of Concerns** - Each file has a single responsibility
2. **DRY (Don't Repeat Yourself)** - No code duplication
3. **Single Source of Truth** - One place for each piece of information
4. **Explicit over Implicit** - Clear, obvious code
5. **Maintainability** - Easy to update and extend

## 🛠️ Development Workflow

### Making Changes

```
1. Check existing structure (this index)
   ↓
2. Identify appropriate layer (config/service/component)
   ↓
3. Follow existing patterns (see ARCHITECTURE.md)
   ↓
4. Use services for API calls (see examples)
   ↓
5. Update documentation if needed
```

### Adding Features

```
1. Define constants in constants.js
   ↓
2. Add API endpoints in api.js (if needed)
   ↓
3. Create/update service (if needed)
   ↓
4. Use service in component
   ↓
5. Test and document
```

## 🔍 Finding Information

### I want to know...

- **What APIs are available?** → [API_REFERENCE.md](./API_REFERENCE.md)
- **How to use a service?** → [ARCHITECTURE.md - Usage Examples](./ARCHITECTURE.md#usage-examples)
- **What changed in refactoring?** → [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md)
- **Where to put new code?** → [ARCHITECTURE.md - Project Structure](./ARCHITECTURE.md#project-structure)
- **How to handle errors?** → [API_REFERENCE.md - Error Handling](./API_REFERENCE.md#error-handling)
- **Best practices?** → [ARCHITECTURE.md - Best Practices](./ARCHITECTURE.md#best-practices)

## 📝 Quick Reference

### Import Statements

```javascript
// Configuration
import { API_ENDPOINTS, API_BASE_URLS, API_HEADERS } from '../config/api';
import { DOMAIN_CONFIG, STORAGE_KEYS, TIMING, ERROR_MESSAGES } from '../config/constants';

// Services
import { tokenService } from '../services/tokenService';
import { workforceAgentService } from '../services/workforceAgentService';
import { liveAgentService } from '../services/liveAgentService';

// Utilities
import { formatTextWithLinks, extractReferenceLinks } from '../utils/messageFormatter';
import { uuidv4, cleanStreamText } from '../utils/workforceAgentUtils';
```

### Common Patterns

```javascript
// Get token
const token = await tokenService.getToken('AG04333');

// Send chat message
await workforceAgentService.sendMessage(question, domainId, onChunk, onComplete, onError);

// Connect to live agent
await liveAgentService.routeToAgent(groupName, domainId, callbacks);

// Use API endpoint
fetch(API_ENDPOINTS.WORKFORCE_CHAT, ...);

// Use constant
const timeout = TIMING.INACTIVITY_LIMIT;
```

## 📞 Support

For questions or issues:

1. Check the relevant documentation file
2. Review code examples in ARCHITECTURE.md
3. Look at service implementation for details
4. Check API_REFERENCE.md for endpoint specifics

## 🔄 Updates

This documentation was created as part of the code refactoring on **November 9, 2025**.

Keep documentation updated when:
- Adding new services
- Changing API endpoints
- Modifying constants
- Adding new patterns

---

**Last Updated**: November 9, 2025

**Maintained by**: Development Team
