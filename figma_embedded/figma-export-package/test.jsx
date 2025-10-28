import React from 'react';
import { createRoot } from 'react-dom/client';

// Import the main app components
import {
  FigmaApp,
  FigmaHeroAppWithRouting,
  FigmaHeroPageWithRouting,
  FigmaMainPage,
  FigmaChatPage,
  FigmaMenuSidebar,
  FigmaAISearchHero,
  FigmaThemeProvider,
  useFigmaTheme
} from './FigmaApp';

// Test component to demonstrate usage
function TestApp() {
  return (
    <div>
      <h1>Figma Export Package Test</h1>
      <div style={{ margin: '20px 0' }}>
        <h2>Available Components:</h2>
        <ul>
          <li>✅ FigmaApp - Main application with routing</li>
          <li>✅ FigmaHeroAppWithRouting - Hero page with full routing to results</li>
          <li>✅ FigmaHeroPageWithRouting - Standalone hero page</li>
          <li>✅ FigmaMainPage - Main page component</li>
          <li>✅ FigmaChatPage - Chat interface</li>
          <li>✅ FigmaMenuSidebar - Left navigation sidebar</li>
          <li>✅ FigmaAISearchHero - AI search hero section</li>
          <li>✅ FigmaThemeProvider - Theme context provider</li>
          <li>✅ useFigmaTheme - Theme hook</li>
        </ul>
      </div>
      
      <div style={{ margin: '20px 0' }}>
        <h2>Usage Examples:</h2>
        <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '5px' }}>
{`// For full application with routing:
import { FigmaApp } from './FigmaApp';
<FigmaApp />

// For hero page with routing to results:
import { FigmaHeroAppWithRouting } from './FigmaApp';
<FigmaHeroAppWithRouting />

// For standalone hero page:
import { FigmaHeroPageWithRouting } from './FigmaApp';
<FigmaHeroPageWithRouting onSearch={(query, options) => {
  console.log('Search:', query, options);
}} />

// For individual components:
import { FigmaMainPage, FigmaThemeProvider } from './FigmaApp';
<FigmaThemeProvider>
  <FigmaMainPage onSearch={(query) => console.log(query)} />
</FigmaThemeProvider>`}
        </pre>
      </div>

      <div style={{ margin: '20px 0' }}>
        <h2>Hero Page with Full Application Interface (/figma-hero route):</h2>
        <FigmaHeroAppWithRouting />
      </div>
    </div>
  );
}

// Only render if this is being run as a standalone test
if (typeof window !== 'undefined' && window.document) {
  const container = document.getElementById('root');
  if (container) {
    const root = createRoot(container);
    root.render(<TestApp />);
  }
}

export default TestApp;