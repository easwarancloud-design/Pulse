# Figma Hero Package - Integration Guide

## 📁 Clean Package Structure

```
figma-export-package/
├── index.js                 # Main export file
├── FigmaHeroApp.jsx        # Complete standalone app
├── App.css                 # Required styles
├── index.css               # Required styles
├── package.json            # Dependencies
├── pages/
│   ├── FigmaHeroPage.jsx   # "Good morning" main page
│   └── FigmaResultsPage.jsx # Chat/results page
├── components/
│   ├── ChatIcon.jsx
│   ├── JiraIcon.jsx
│   ├── ServiceNowIcon.jsx
│   └── AISearchHero.jsx
├── context/
│   └── ThemeContext.jsx    # Theme management
└── MenuSidebar.jsx         # Chat sidebar component
```

## 🚀 Quick Integration

### Method 1: Complete App Integration (Recommended)

```javascript
// In your cloud app's App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import FigmaHeroApp from './figma-export-package/FigmaHeroApp';

// Your existing components
import YourMainPage from './YourMainPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<YourMainPage />} />
        <Route path="/figma-hero" element={<FigmaHeroApp username="John" />} />
      </Routes>
    </Router>
  );
}

export default App;
```

### Method 2: Individual Component Integration

```javascript
// Import specific components
import { 
  FigmaHeroPage, 
  FigmaResultsPage, 
  ThemeProvider 
} from './figma-export-package';

function MyApp() {
  const [currentPage, setCurrentPage] = useState('hero');
  
  return (
    <ThemeProvider>
      {currentPage === 'hero' ? (
        <FigmaHeroPage 
          onSearch={(query) => {
            console.log('Search:', query);
            setCurrentPage('results');
          }}
          username="John"
        />
      ) : (
        <FigmaResultsPage 
          onBack={() => setCurrentPage('hero')}
          // ... other props
        />
      )}
    </ThemeProvider>
  );
}
```

## 📋 Required Dependencies

Add these to your cloud app's package.json:

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "react-router-dom": "^6.0.0",
    "lucide-react": "^0.500.0"
  }
}
```

## 🎨 CSS Integration

### Option 1: Import Styles Directly
```javascript
// In your main App.js
import './figma-export-package/App.css';
import './figma-export-package/index.css';
```

### Option 2: Copy Styles to Your Main CSS Files
Copy the contents of `figma-export-package/App.css` and `index.css` into your existing CSS files.

## ⚙️ Configuration Options

### FigmaHeroApp Props

```javascript
<FigmaHeroApp 
  username="John Doe"           // Display name in greeting
  onNavigateAway={handleNav}    // Optional: Called when navigating away
  theme="dark"                  // Optional: Force theme
/>
```

### FigmaHeroPage Props

```javascript
<FigmaHeroPage 
  username="John Doe"           // Display name
  onSearch={(query) => {}}      // Handle search submissions
/>
```

### FigmaResultsPage Props

```javascript
<FigmaResultsPage 
  userQuestion="Initial query"   // Starting question
  onBack={() => {}}             // Handle back navigation
  isDarkMode={false}            // Theme setting
  onToggleTheme={() => {}}      // Theme toggle handler
  // ... other chat-related props
/>
```

## 🔧 Advanced Integration

### With Existing Theme System

```javascript
// Wrap with your existing theme provider
import { YourThemeProvider } from './your-theme-context';
import { FigmaHeroApp } from './figma-export-package';

function App() {
  return (
    <YourThemeProvider>
      <FigmaHeroApp username={user.name} />
    </YourThemeProvider>
  );
}
```

### With Authentication

```javascript
import { FigmaHeroApp } from './figma-export-package';

function ProtectedFigmaHero() {
  const { user, isAuthenticated } = useAuth();
  
  if (!isAuthenticated) {
    return <LoginPage />;
  }
  
  return (
    <FigmaHeroApp 
      username={user.firstName || user.email}
    />
  );
}
```

## 🌐 URL Structure

After integration, your app will have:
- `your-domain.com/` - Your main app
- `your-domain.com/figma-hero` - Figma Hero interface

## 🎯 Features Included

✅ **Complete Figma Hero Interface**
- "Good morning" greeting with dynamic username
- Gradient background with SVG effects
- Search input with AI icon
- Rotating question suggestions
- Enterprise-focused content

✅ **Chat/Results System**
- Full chat interface
- Message history
- Thread management
- Dark/light theme support

✅ **Theme Management**
- Built-in theme context
- Dark/light mode toggle
- Consistent styling

✅ **Responsive Design**
- Mobile-friendly
- Proper scaling
- Touch interactions

## 🔍 Testing Integration

1. **Copy the package** to your cloud app's `src` folder
2. **Install dependencies**: `npm install lucide-react react-router-dom`
3. **Add route** to your App.js
4. **Import styles** (App.css, index.css)
5. **Test navigation** to `/figma-hero`

## 🆘 Troubleshooting

### Theme Not Working
- Ensure CSS files are imported
- Check for conflicting CSS classes
- Verify ThemeProvider is wrapping components

### Icons Not Showing
- Install lucide-react: `npm install lucide-react`
- Check import paths for custom icons

### Routing Issues
- Install react-router-dom
- Ensure BrowserRouter wraps your app
- Check route paths match exactly

### Styling Conflicts
- Use CSS modules or styled-components
- Namespace CSS classes with `.figma-hero-`
- Import Figma styles after your main styles

## 📞 Support

For integration issues:
1. Check dependencies are installed
2. Verify import paths are correct
3. Ensure styles are loaded
4. Test with minimal setup first

---

**Ready to integrate!** 🎉
Copy the `figma-export-package` folder to your cloud app and follow the Quick Integration guide above.