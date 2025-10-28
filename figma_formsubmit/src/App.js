import React, { useState } from 'react';
import Mainpage from './Mainpage';
import PulseMain from './PulseMain';
import ChatPage from './ChatPage';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import './App.css';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('main');
  const [originPage, setOriginPage] = useState('main');
  const [userQuestion, setUserQuestion] = useState('');
  const [responseData, setResponseData] = useState(null); // Store form response
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

  // NEW: Form submission handler
  const handleFormSubmission = async (question, origin = 'main') => {
    try {
      // Create form data
      const formData = new FormData();
      formData.append('question', question);
      formData.append('origin', origin);
      formData.append('timestamp', Date.now().toString());

      // Option A: Submit to backend and get redirect URL
      const response = await fetch('/api/chat/submit', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        
        // If backend returns a results page URL
        if (result.redirectUrl) {
          window.location.href = result.redirectUrl; // Navigate to results page
          return;
        }
        
        // Or if backend returns a thread ID, navigate to that thread
        if (result.threadId) {
          window.location.href = `/results/${result.threadId}`;
          return;
        }

        // Otherwise use the data to set state and navigate
        setResponseData(result);
        setUserQuestion(question);
        setCurrentPage('results');
        setOriginPage(origin);
        
        const newThread = {
          id: result.threadId || 'thread_' + Date.now(),
          title: question.length > 50 ? question.substring(0, 50) + '...' : question,
          conversation: result.conversation || []
        };
        setCurrentThread(newThread);
        
        // Update URL to show results page
        window.history.pushState({}, '', `/results/${newThread.id}`);
        return;
      }

    } catch (error) {
      console.error('API call failed, using mock response:', error);
    }

    // Option B: Mock form submission (fallback when API fails)
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockThreadId = 'thread_' + Date.now();
    const mockResponse = {
      success: true,
      threadId: mockThreadId,
      question: question,
      response: 'Based on the latest records, this is currently where your team members stand in regards to the Do The Right Thing: Cyber Security Training 2025:',
      redirectUrl: `/results/${mockThreadId}`, // Mock redirect URL
      data: [
        { name: 'Deepl, Priya', employeeId: 'AGT23456', email: 'Priya.Deepl@elevancehealth.com', status: 'Not Started' },
        { name: 'Garcia, Sophia', employeeId: 'AGT23456', email: 'Sophia.Garcia@elevancehealth.com', status: 'Not Started' }
      ],
      conversation: [
        { id: 1, type: 'user', text: question },
        { id: 2, type: 'assistant', text: 'Based on the latest records...', showTable: true }
      ]
    };

    setResponseData(mockResponse);
    setUserQuestion(question);
    setCurrentPage('results');
    setOriginPage(origin);
    setIsNewChat(false);
    setIsNewChatActive(false);
    
    const newThread = {
      id: mockResponse.threadId,
      title: question.length > 50 ? question.substring(0, 50) + '...' : question,
      conversation: mockResponse.conversation
    };
    setCurrentThread(newThread);

    // Navigate to results page URL
    window.history.pushState({}, '', `/results/${mockThreadId}`);
  };

  // Keep existing method as fallback

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
          responseData={responseData} // Pass form response data
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
        <PulseMain onSearch={(question) => handleFormSubmission(question, 'pulsemain')} onNewChat={handleNewChat} />
      </div>
    );
  }

  return (
    <div className="App">
      <Mainpage onSearch={(question) => handleFormSubmission(question, 'main')} onNewChat={handleNewChat} />
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
