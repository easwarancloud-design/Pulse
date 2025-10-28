// Export the main FigmaApp component and all required dependencies
import FigmaApp from './FigmaApp';

// Export components individually if needed
export { default as FigmaApp } from './FigmaApp';
export { default as MainPage } from './Mainpage';
export { default as ChatPage } from './ChatPage';
export { default as MenuSidebar } from './MenuSidebar';
export { default as AISearchHero } from './components/AISearchHero';
export { default as Header } from './components/Header';
export { default as NewsFeed } from './components/NewsFeed';
export { default as RightSidebar } from './components/RightSidebar';
export { ThemeProvider, useTheme } from './context/ThemeContext';

// Default export is the main app
export default FigmaApp;