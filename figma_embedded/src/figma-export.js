/**
 * Figma App Export Package
 * 
 * This file exports the complete Figma application as a single component
 * that can be imported and used as a route in another React application.
 * 
 * Usage in your main app:
 * 
 * import { FigmaApp } from './path/to/figma-export';
 * 
 * // In your routing:
 * <Route path="/figma/*" element={<FigmaApp />} />
 * 
 * Or as a standalone component:
 * <FigmaApp />
 */

import React, { useState } from 'react';

// Core App Logic
import Mainpage from './Mainpage';
import ChatPage from './ChatPage';
import { ThemeProvider, useTheme } from './context/ThemeContext';

// Components
import MenuSidebar from './MenuSidebar';
import AISearchHero from './components/AISearchHero';
import Header from './components/Header';
import NewsFeed from './components/NewsFeed';
import RightSidebar from './components/RightSidebar';

// Styles - Make sure these are included
import './App.css';
import './index.css';

// Main Figma App Component
function FigmaAppContent() {
  const [currentPage, setCurrentPage] = useState('main');
  const [userQuestion, setUserQuestion] = useState('');
  const [currentThread, setCurrentThread] = useState(null);
  const [isNewChat, setIsNewChat] = useState(false);
  const [isNewChatActive, setIsNewChatActive] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  const navigateToResults = (question) => {
    setUserQuestion(question);
    setCurrentPage('results');
    setIsNewChat(false);
    setIsNewChatActive(false);
    
    const newThread = {
      id: 'thread_' + Date.now(),
      title: question.length > 50 ? question.substring(0, 50) + '...' : question,
      conversation: []
    };
    setCurrentThread(newThread);
  };

  const navigateToMain = () => {
    setCurrentPage('main');
    setUserQuestion('');
    setCurrentThread(null);
    setIsNewChat(false);
  };

  const handleNewChat = () => {
    setCurrentPage('results');
    setIsNewChat(true);
    setIsNewChatActive(true);
    setCurrentThread(null);
    setUserQuestion('');
  };

  const handleThreadSelect = (thread) => {
    setCurrentPage('results');
    setCurrentThread(thread);
    setIsNewChat(false);
    setIsNewChatActive(false);
    setUserQuestion('');
  };

  const handleFirstMessage = (newThread) => {
    setIsNewChatActive(false);
    setCurrentThread(newThread);
  };

  if (currentPage === 'results') {
    return (
      <div className="FigmaApp" style={{ height: '100vh', overflow: 'hidden' }}>
        <ChatPage 
          onBack={navigateToMain} 
          userQuestion={userQuestion}
          onToggleTheme={toggleTheme}
          isDarkMode={isDarkMode}
          currentThread={currentThread}
          isNewChat={isNewChat}
          isNewChatActive={isNewChatActive}
          onNewChat={handleNewChat}
          onThreadSelect={handleThreadSelect}
          onFirstMessage={handleFirstMessage}
        />
      </div>
    );
  }

  return (
    <div className="FigmaApp" style={{ minHeight: '100vh' }}>
      <Mainpage onSearch={navigateToResults} onNewChat={handleNewChat} />
    </div>
  );
}

// Wrapped component with theme provider
function FigmaApp() {
  return (
    <ThemeProvider>
      <FigmaAppContent />
    </ThemeProvider>
  );
}

// Export individual components if needed
export {
  FigmaApp,
  Mainpage as FigmaMainPage,
  ChatPage as FigmaChatPage,
  MenuSidebar as FigmaMenuSidebar,
  AISearchHero as FigmaAISearchHero,
  Header as FigmaHeader,
  NewsFeed as FigmaNewsFeed,
  RightSidebar as FigmaRightSidebar,
  ThemeProvider as FigmaThemeProvider,
  useTheme as useFigmaTheme
};

// Export the standalone hero page
export { default as FigmaHeroPage } from './FigmaHeroPage';
export { default as FigmaHeroApp } from './FigmaHeroApp';

// Export the new hero page with routing functionality
export { default as FigmaHeroPageWithRouting } from './FigmaHeroPageWithRouting';
export { default as FigmaHeroAppWithRouting } from './FigmaHeroAppWithRouting';

// Default export
export default FigmaApp;