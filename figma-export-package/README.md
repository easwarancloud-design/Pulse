# Figma Export Package

This package contains all the necessary components and dependencies for the Figma UI application, including the full application interface with routing capabilities.

## 📁 Package Structure

```
figma-export-package/
├── App.css                           # Main application styles
├── index.css                         # Global styles with Tailwind
├── assets/                           # Image assets
├── components/                       # Reusable UI components
│   ├── AISearchHero.jsx             # AI search hero section
│   ├── ChatIcon.jsx                 # Chat icon component
│   ├── JiraIcon.jsx                 # Jira integration icon
│   └── ServiceNowIcon.jsx           # ServiceNow integration icon
├── context/
│   └── ThemeContext.jsx             # Theme management (light/dark mode)
├── ChatPage.jsx                     # Full chat interface
├── Mainpage.js                      # Main page with hero and news feed
├── MenuSidebar.jsx                  # Left navigation sidebar
├── FigmaApp.jsx                     # Main app wrapper with exports
├── FigmaHeroPageWithRouting.jsx     # Standalone hero page
├── FigmaHeroAppWithRouting.jsx      # Hero app with full routing
└── test.jsx                         # Test/demo file
```

## 🚀 Available Components

### Main Applications

#### `FigmaApp`
Complete application with main page, chat functionality, and navigation.
```jsx
import { FigmaApp } from './FigmaApp';
<FigmaApp />
```

#### `FigmaHeroAppWithRouting` 
**Full application interface for `/figma-hero` route** - Hero page with complete routing to results page.
```jsx
import { FigmaHeroAppWithRouting } from './FigmaApp';
<FigmaHeroAppWithRouting />
```

#### `FigmaHeroPageWithRouting`
Standalone hero page with form submission and routing capabilities.
```jsx
import { FigmaHeroPageWithRouting } from './FigmaApp';
<FigmaHeroPageWithRouting onSearch={(query, options) => {
  console.log('Search submitted:', query, options);
  // Handle form submission with POST method, type: 'new'
}} />
```

### Individual Components

- `FigmaMainPage` - Main page component
- `FigmaChatPage` - Chat interface
- `FigmaMenuSidebar` - Left navigation sidebar
- `FigmaAISearchHero` - AI search hero section
- `FigmaThemeProvider` - Theme context provider
- `useFigmaTheme` - Theme management hook

## 🎨 Features

### ✅ UI Improvements Included
- Dark mode chat window input styling with `border-radius: 999px`, `border: 2px solid #2861BB`
- Background: `linear-gradient(115deg, #122F65 2.06%, #00123C 97.35%)`
- Center-aligned layout and responsive design
- White text/icons in sidebar for better contrast
- Improved button styling and hover effects

### ✅ Rotating Questions Feature
- 9 questions organized in 3 rotating sets
- Click refresh button to cycle through question sets
- Click any question to auto-submit with form routing

### ✅ Form Submission & Routing
- **POST method** form submission with **type: "new"**
- Enter key and send button support
- Automatic routing to results page after submission
- iframe communication via postMessage API

### ✅ Theme Management
- Light/dark mode support with `defaultTheme` prop
- Theme persistence in localStorage
- Context-based theme switching

## 🔧 Dependencies Required

Install these dependencies in your project:

```bash
npm install react react-dom lucide-react
# For styling (if not using CDN)
npm install tailwindcss
```

## 📋 Usage Examples

### For Figma Plugin/Integration:
```jsx
import { FigmaHeroAppWithRouting } from './figma-export-package/FigmaApp';

function FigmaPlugin() {
  return (
    <div style={{ width: '800px', height: '600px' }}>
      <FigmaHeroAppWithRouting />
    </div>
  );
}
```

### For Standalone Deployment:
```jsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { FigmaApp } from './figma-export-package/FigmaApp';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<FigmaApp />);
```

### For Custom Integration:
```jsx
import { 
  FigmaHeroPageWithRouting, 
  FigmaThemeProvider 
} from './figma-export-package/FigmaApp';

function CustomApp() {
  const handleSearch = (query, options) => {
    // Handle search with POST method, type: 'new'
    console.log('Search:', query, options);
    // Your custom routing logic here
  };

  return (
    <FigmaThemeProvider defaultTheme="light">
      <FigmaHeroPageWithRouting onSearch={handleSearch} />
    </FigmaThemeProvider>
  );
}
```

## 🌟 Key Features for `/figma-hero` Route

The `FigmaHeroAppWithRouting` component provides the **full application interface** as requested:

1. **Complete Hero Page**: Search input with gradient styling, rotating questions
2. **Form Submission**: POST method with type "new" parameter
3. **Full Routing**: Seamless navigation to results page
4. **Chat Interface**: Complete chat functionality with sidebar
5. **Theme Support**: Light mode default with dark mode toggle
6. **iframe Communication**: PostMessage API for plugin integration

## 🔗 Integration Notes

- All components are self-contained with dependencies included
- CSS files must be imported for proper styling
- Theme context should wrap components for theme functionality
- Form submissions automatically route to results page
- Compatible with React 18+ and modern build tools

## 🧪 Testing

Run the test file to verify all components work correctly:
```jsx
import TestApp from './figma-export-package/test';
// See test.jsx for usage examples and verification
```

---

This export package provides everything needed for independent deployment and integration with Figma or other platforms, including the complete `/figma-hero` route with full application interface and form submission routing functionality.