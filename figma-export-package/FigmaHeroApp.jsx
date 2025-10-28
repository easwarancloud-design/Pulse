import React, { useState } from 'react';
import FigmaHeroPage from './pages/FigmaHeroPage';
import FigmaResultsPage from './pages/FigmaResultsPage';
import { ThemeProvider, useTheme } from './context/ThemeContext';

// Import styles
import './App.css';
import './index.css';

function FigmaHeroAppContent({ username = "User" }) {
  const [currentPage, setCurrentPage] = useState('hero');
  const [userQuestion, setUserQuestion] = useState('');
  const [currentThread, setCurrentThread] = useState(null);
  const [isNewChat, setIsNewChat] = useState(false);
  const [isNewChatActive, setIsNewChatActive] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  const handleSearch = (question) => {
    setUserQuestion(question);
    setCurrentPage('results');
    setIsNewChat(true);
    setIsNewChatActive(true);
    
    // Create new thread for the search
    const newThread = {
      id: 'thread_' + Date.now(),
      title: question.length > 50 ? question.substring(0, 50) + '...' : question,
      conversation: []
    };
    setCurrentThread(newThread);
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

  if (currentPage === 'results') {
    return (
      <FigmaResultsPage
        userQuestion={userQuestion}
        currentThread={currentThread}
        isNewChat={isNewChat}
        isNewChatActive={isNewChatActive}
        onBack={navigateToHero}
        onNewChat={handleNewChat}
        onThreadSelect={handleThreadSelect}
        onFirstMessage={handleFirstMessage}
        onToggleTheme={toggleTheme}
        isDarkMode={isDarkMode}
      />
    );
  }

  return (
    <FigmaHeroPage 
      onSearch={handleSearch} 
      username={username}
    />
  );
}

function FigmaHeroApp({ username = "User" }) {
  return (
    <ThemeProvider>
      <FigmaHeroAppContent username={username} />
    </ThemeProvider>
  );
}

export default FigmaHeroApp;