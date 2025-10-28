# Figma App Integration Guide

## Overview
This Figma application has been packaged as a reusable React component that can be integrated into any other React application as a single route.

## Files for Integration

### Core Files to Copy
1. **`src/figma-export.js`** - Main export file (use this in your app)
2. **`src/FigmaApp.jsx`** - Standalone wrapper component
3. **All source files in `src/` directory**
4. **All CSS files** (`src/App.css`, `src/index.css`)

### Required Dependencies
```json
{
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "lucide-react": "^0.263.1",
  "react-router-dom": "^6.8.1"
}
```

## Integration in Your Cloud App

### Method 1: As a Route Component

```jsx
// In your main App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { FigmaApp } from './path/to/figma-export';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<YourHomePage />} />
        <Route path="/figma/*" element={<FigmaApp />} />
        <Route path="/other-routes" element={<OtherComponents />} />
      </Routes>
    </Router>
  );
}

export default App;
```

### Method 2: As a Standalone Component

```jsx
// In any component
import React from 'react';
import { FigmaApp } from './path/to/figma-export';

function MyPage() {
  return (
    <div>
      <h1>My Application</h1>
      <FigmaApp />
    </div>
  );
}
```

### Method 3: Conditional Rendering

```jsx
// Based on URL or state
import React, { useState } from 'react';
import { FigmaApp } from './path/to/figma-export';

function App() {
  const [showFigma, setShowFigma] = useState(false);
  
  if (showFigma) {
    return <FigmaApp />;
  }
  
  return (
    <div>
      <button onClick={() => setShowFigma(true)}>
        Open Figma App
      </button>
      {/* Your other content */}
    </div>
  );
}
```

## File Structure to Copy

```
your-app/
├── src/
│   ├── figma-app/                    # Create this folder
│   │   ├── figma-export.js          # Main export (REQUIRED)
│   │   ├── FigmaApp.jsx             # Wrapper component
│   │   ├── App.css                  # Styles (REQUIRED)
│   │   ├── index.css               # Base styles (REQUIRED)
│   │   ├── Mainpage.js             # Main page component
│   │   ├── ChatPage.jsx            # Chat interface
│   │   ├── MenuSidebar.jsx         # Sidebar component
│   │   ├── context/
│   │   │   └── ThemeContext.jsx    # Theme provider
│   │   └── components/
│   │       ├── AISearchHero.jsx    # Search component
│   │       ├── Header.jsx          # Header component
│   │       ├── NewsFeed.jsx        # News feed
│   │       ├── RightSidebar.jsx    # Right sidebar
│   │       ├── JiraIcon.jsx        # Icon components
│   │       └── ServiceNowIcon.jsx  # Icon components
│   └── App.js                      # Your main app
```

## Quick Setup Steps

1. **Copy Files**: Copy the entire `src/` directory from this project to your cloud app
2. **Install Dependencies**: 
   ```bash
   npm install lucide-react react-router-dom
   ```
3. **Import in your App.js**:
   ```jsx
   import { FigmaApp } from './figma-app/figma-export';
   ```
4. **Add Route**:
   ```jsx
   <Route path="/figma/*" element={<FigmaApp />} />
   ```

## Testing Locally

The app is now configured to run on `/figma` route:
- Visit: `http://localhost:3002/figma`
- Root URL automatically redirects to `/figma`

## Features Included

✅ **AI Search Interface** - Main search page with rotating questions
✅ **Chat Interface** - Full chat functionality with dark/light modes
✅ **Responsive Design** - Works on desktop and mobile
✅ **Theme Support** - Light and dark mode toggle
✅ **Sidebar Navigation** - Collapsible sidebar with threads
✅ **State Management** - Complete state handling for chat and navigation

## Customization

### Styling
- Modify `App.css` and `index.css` for custom styling
- Theme colors can be adjusted in the component files

### Configuration
- Update company name, logos, and branding in component files
- Modify questions in `AISearchHero.jsx`
- Customize agent types in `MenuSidebar.jsx`

## Important Notes

1. **CSS Dependencies**: Make sure to include the CSS files or the styling will break
2. **Router Context**: If using as a route, ensure it's within a Router context
3. **Height Management**: The component manages its own height (`100vh`)
4. **Theme Persistence**: Theme state is maintained within the component scope

## Production Deployment

When deploying to your cloud application:
1. Ensure all dependencies are installed
2. Build process includes the figma app files
3. Routing is configured at the server level if using client-side routing
4. Static assets (images, icons) are properly served

## Support

The component is self-contained and should work independently of your main application's state management or routing, making it easy to integrate without conflicts.