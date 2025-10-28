import React, { useState } from 'react';
import Mainpage from './Mainpage';
import PulseMain from './PulseMain';
import ChatPage from './ChatPage'; // Light mode
import { ThemeProvider, useTheme } from './context/ThemeContext';
import './App.css';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('main');
  const [originPage, setOriginPage] = useState('main'); // Track where user came from
  const [userQuestion, setUserQuestion] = useState('');
  const [currentThread, setCurrentThread] = useState(null);
  const [isNewChat, setIsNewChat] = useState(false);
  const [isNewChatActive, setIsNewChatActive] = useState(false);
  const { isDarkMode, toggleTheme } = useTheme();

  // Check if we're on the PulseMain page based on URL
  React.useEffect(() => {
    if (window.location.pathname === '/pulsemain') {
      setCurrentPage('pulsemain');
      setOriginPage('pulsemain'); // Set pulsemain as origin when directly accessing /pulsemain
    } else {
      setOriginPage('main'); // Default to main for root path
    }
  }, []);

  const navigateToResults = (question, origin = 'main') => {
    setUserQuestion(question);
    setCurrentPage('results');
    setOriginPage(origin); // Store where we came from
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
    setCurrentPage(originPage); // Return to the origin page (main or pulsemain)
    setUserQuestion('');
    setCurrentThread(null);
    setIsNewChat(false);
    setIsNewChatActive(false);
    
    // Update URL based on origin page
    const url = originPage === 'pulsemain' ? '/pulsemain' : '/';
    window.history.pushState({}, '', url);
  };

  const handleNewChat = () => {
    // Create a new thread immediately when "New Chat" is clicked
    const newThread = {
      id: 'thread_' + Date.now(),
      title: 'New Chat',
      conversation: []
    };
    
    setCurrentPage('results');
    setIsNewChat(true);
    setIsNewChatActive(true);
    setCurrentThread(newThread);
    setUserQuestion('');
    
    // Save the new thread to localStorage in the grouped format
    try {
      const stored = localStorage.getItem('chatThreads');
      let threadsData;
      
      if (stored) {
        threadsData = JSON.parse(stored);
        // Ensure the structure exists
        if (!threadsData.today) threadsData.today = [];
        if (!threadsData.lastWeek) threadsData.lastWeek = [];
        if (!threadsData.last30Days) threadsData.last30Days = [];
      } else {
        // Create the initial structure if none exists
        threadsData = {
          today: [],
          lastWeek: [],
          last30Days: []
        };
      }
      
      // Add the new thread to today's category
      threadsData.today.unshift(newThread);
      
      localStorage.setItem('chatThreads', JSON.stringify(threadsData));
    } catch (error) {
      console.error('Error saving new thread to localStorage:', error);
    }
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
      <div className="App">
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

  if (currentPage === 'pulsemain') {
    return (
      <div className="App">
        <PulseMain onSearch={(question) => navigateToResults(question, 'pulsemain')} onNewChat={handleNewChat} />
      </div>
    );
  }

  return (
    <div className="App">
      <Mainpage onSearch={(question) => navigateToResults(question, 'main')} onNewChat={handleNewChat} />
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;
