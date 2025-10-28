import React, { useState } from 'react';
import FigmaHeroPageWithRouting from './FigmaHeroPageWithRouting';
import ChatPage from './ChatPage';
import { ThemeProvider, useTheme } from './context/ThemeContext';

// Import styles
import './App.css';
import './index.css';

function FigmaHeroAppWithRoutingContent() {
  const [currentPage, setCurrentPage] = useState('hero');
  const [userQuestion, setUserQuestion] = useState('');
  const [currentThread, setCurrentThread] = useState(null);
  const [isNewChat, setIsNewChat] = useState(false);
  const [isNewChatActive, setIsNewChatActive] = useState(false);

  const handleSearch = (question, options = {}) => {
    setUserQuestion(question);
    setCurrentPage('results');
    setIsNewChat(true);
    setIsNewChatActive(true);
    
    // Create new thread for the search
    const newThread = {
      id: 'thread_' + Date.now(),
      title: question.length > 50 ? question.substring(0, 50) + '...' : question,
      conversation: [],
      type: options.type || 'new',
      method: options.method || 'POST'
    };
    setCurrentThread(newThread);

    // Send message to parent if in iframe
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'FIGMA_SEARCH',
        query: question,
        options: options
      }, '*');
    }
  };

  const navigateToHero = () => {
    setCurrentPage('hero');
    setUserQuestion('');
    setCurrentThread(null);
    setIsNewChat(false);
    setIsNewChatActive(false);
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

  // Results page with light theme
  if (currentPage === 'results') {
    return (
      <ThemeProvider defaultTheme="light">
        <ResultsPageContent
          userQuestion={userQuestion}
          currentThread={currentThread}
          isNewChat={isNewChat}
          isNewChatActive={isNewChatActive}
          onBack={navigateToHero}
          onNewChat={handleNewChat}
          onThreadSelect={handleThreadSelect}
          onFirstMessage={handleFirstMessage}
        />
      </ThemeProvider>
    );
  }

  // Hero page with dark theme
  return (
    <ThemeProvider defaultTheme="dark">
      <div className="FigmaHeroApp" style={{ minHeight: '100vh' }}>
        <FigmaHeroPageWithRouting onSearch={handleSearch} />
      </div>
    </ThemeProvider>
  );
}

// Separate component for results page to use light theme
function ResultsPageContent({ 
  userQuestion, 
  currentThread, 
  isNewChat, 
  isNewChatActive, 
  onBack, 
  onNewChat, 
  onThreadSelect, 
  onFirstMessage 
}) {
  const { isDarkMode, toggleTheme } = useTheme();
  
  return (
    <div className="FigmaHeroApp" style={{ height: '100vh', overflow: 'hidden' }}>
      <ChatPage 
        onBack={onBack} 
        userQuestion={userQuestion}
        onToggleTheme={toggleTheme}
        isDarkMode={isDarkMode}
        currentThread={currentThread}
        isNewChat={isNewChat}
        isNewChatActive={isNewChatActive}
        onNewChat={onNewChat}
        onThreadSelect={onThreadSelect}
        onFirstMessage={onFirstMessage}
      />
    </div>
  );
}

// Main component - no wrapper ThemeProvider needed since each page has its own
function FigmaHeroAppWithRouting() {
  return <FigmaHeroAppWithRoutingContent />;
}

export default FigmaHeroAppWithRouting;