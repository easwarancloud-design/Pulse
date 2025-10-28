import React, { useState } from 'react';
import Mainpage from './Mainpage';
import ChatPage from './ChatPage'; // Light mode
import { ThemeProvider, useTheme } from './context/ThemeContext';
import './App.css';

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
    
    // Create a new thread for the question from main page
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
      <div className="FigmaApp">
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
    <div className="FigmaApp">
      <Mainpage onSearch={navigateToResults} onNewChat={handleNewChat} />
    </div>
  );
}

function FigmaApp() {
  return (
    <ThemeProvider>
      <FigmaAppContent />
    </ThemeProvider>
  );
}

export default FigmaApp;