// Main Export File for Figma Hero Package
// Use this file to import the Figma Hero components into your application

// Main Components
export { default as FigmaHeroPage } from './pages/FigmaHeroPage';
export { default as FigmaResultsPage } from './pages/FigmaResultsPage';
export { default as FigmaHeroApp } from './FigmaHeroApp';

// UI Components
export { default as MenuSidebar } from './components/MenuSidebar';
export { default as ChatIcon } from './components/ChatIcon';
export { default as JiraIcon } from './components/JiraIcon';
export { default as ServiceNowIcon } from './components/ServiceNowIcon';
export { default as AISearchHero } from './components/AISearchHero';

// Context
export { ThemeProvider, useTheme } from './context/ThemeContext';

// Styles (import these in your main app)
export const styles = {
  appCss: './App.css',
  indexCss: './index.css'
};